# Full Living Sphere — Design Document

> **Status:** In Progress (design phase)
> **Created:** 2026-01-15

---

## Цель

Добавить "вау" эффект на онбординг и в основной режим — сделать сферу более насыщенной и живой.

## Требования (из brainstorming)

**Что хочет пользователь:**
- ✅ Энергетические потоки внутри
- ✅ Геометрический каркас (икосаэдр)
- ✅ Текучесть поверхности
- ✅ Пульсации/волны от центра
- ✅ Вихри/спирали

**Когда:** Навсегда, но интенсивность зависит от контекста (100% онбординг → 30% idle → 60% interaction).

---

## Экспертное ревью

### Эксперт 1 (system-architect) — Консервативный

**Проблемы оригинального подхода (5 систем):**
- 8+ draw calls = 45-55 fps на мобильных
- Fill rate overdraw +40-50%
- Visual noise — 6 конкурирующих элементов
- Maintenance nightmare

**Рекомендация:** "Subtle Living" — всё через shader модификации, 0 новых draw calls.

### Эксперт 2 (frontend-architect) — Балансированный

**Контраргументы:**
- Performance риск преувеличен для modern GPU (2024+)
- "Subtle Living" не даст реального "вау"
- Visual noise управляем через тайминг и hierarchy

**Рекомендация:** Middle Ground — 3 системы вместо 5.

---

## Выбранный подход: Middle Ground D

### Что реализуем

| Система | Draw Calls | Когда активна |
|---------|------------|---------------|
| **Surface Flow** | +0 (shader) | Всегда |
| **Pulse Waves** | +1 | Всегда |
| **InnerSkeleton** | +1 | Только онбординг (9 сек) |

### Что НЕ реализуем

| Система | Причина |
|---------|---------|
| EnergyStreams | Конкурирует с Surface Flow |
| VortexSystem | Overkill, visual noise |

### Итоговый бюджет

- **Draw calls:** 6 total (было 4)
- **Target FPS:** 55-60 на мобильных
- **Время реализации:** 4-5 часов

---

## Детальный дизайн

### 1. Surface Flow (shader-only)

**Цель:** Частицы плавно "текут" по поверхности.

**Реализация в ParticleSystem vertex shader:**

```glsl
uniform float uFlowSpeed;      // 0-1
uniform float uFlowAmount;     // 0-0.05

// Тангенциальный flow
vec3 tangent = cross(normalize(pos), vec3(0, 1, 0));
vec3 flowOffset = tangent * snoise(pos * 2.0 + uTime * uFlowSpeed);
pos += flowOffset * uFlowAmount;
```

**Поведение по состояниям:**
- Idle/Peace: speed 0.3, amount 0.01
- Interaction: ускоряется к точке касания
- Tension: хаотичнее, разнонаправленный
- Onboarding: speed 1.0, amount 0.03

**API:**
```javascript
particleSystem.setFlowSpeed(0.5)
particleSystem.setFlowAmount(0.02)
```

---

### 2. Pulse Waves (новая геометрия)

**Цель:** Видимые волны расходятся от центра сферы.

**Реализация:**

```javascript
// PulseWaves.js
class PulseWaves {
  constructor(baseRadius) {
    // 8-16 концентрических колец
    this.ringCount = 12
    this.rings = []
    // Каждое кольцо — THREE.RingGeometry или Line
  }

  update(time, breathPhase, intensity) {
    // Волны синхронизированы с дыханием
    // Интенсивность управляет opacity и scale
  }

  setIntensity(value) // 0-1
  pulse() // Триггер одиночной волны
}
```

**Визуал:**
- Тонкие светящиеся кольца
- Расходятся от центра с easing
- Fade out к краям
- Цвет синхронизирован с LivingCore

**Поведение:**
- Peace: медленные, редкие волны
- Tension: частые, яркие
- First Breath (онбординг): драматичная волна

---

### 3. InnerSkeleton (временная геометрия)

**Цель:** Геометрический каркас внутри сферы — видимая структура.

**Реализация:**

```javascript
// InnerSkeleton.js
class InnerSkeleton {
  constructor(radius) {
    // THREE.IcosahedronGeometry(radius * 0.7, 0) — 20 граней
    // Wireframe mode
    // Glow через bloom или alpha gradient
  }

  update(time, assemblyProgress) {
    // Rotation медленный, органичный
    // Opacity зависит от assembly
  }

  setVisible(visible)
  setOpacity(value) // 0-1
}
```

**Поведение:**
- Появляется в PROTO phase (4-5.5 сек)
- Максимум в CRYSTALLIZE (6-6.5 сек)
- Fade out после онбординга
- **НЕ виден в обычном режиме**

---

## Интеграция

### Sphere.js — IntensityController

```javascript
// Добавить в Sphere.js
_updateEffectIntensities() {
  const baseIntensity = this._getBaseIntensity() // 0.3 idle, 0.6 interaction, 1.0 onboarding

  this.particleSystem.setFlowAmount(0.01 + baseIntensity * 0.02)
  this.particleSystem.setFlowSpeed(0.3 + baseIntensity * 0.7)
  this.pulseWaves?.setIntensity(baseIntensity)
}
```

### OnboardingManager.js

```javascript
// В _updateAnamnesis()
if (currentPhase === 'PROTO' || currentPhase === 'CRYSTALLIZE') {
  this.innerSkeleton?.setVisible(true)
  this.innerSkeleton?.setOpacity(phaseProgress)
}

// После онбординга
_exitVoid() {
  this.innerSkeleton?.setVisible(false)
}
```

### main.js

```javascript
// Инициализация
this.pulseWaves = new PulseWaves(this.particleSystem.baseRadius)
this.scene.add(this.pulseWaves.getMesh())

this.innerSkeleton = new InnerSkeleton(this.particleSystem.baseRadius)
this.scene.add(this.innerSkeleton.getMesh())

// Передать в OnboardingManager
this.onboarding = new OnboardingManager({
  // ...existing
  pulseWaves: this.pulseWaves,
  innerSkeleton: this.innerSkeleton,
})
```

---

## План реализации

| # | Задача | Время |
|---|--------|-------|
| 1 | Surface Flow в ParticleSystem shader | 1ч |
| 2 | PulseWaves.js класс | 1.5ч |
| 3 | InnerSkeleton.js класс | 1ч |
| 4 | Интеграция в Sphere.js + OnboardingManager | 1ч |
| 5 | Тестирование + polish | 0.5ч |

**Total:** 5 часов

---

## Открытые вопросы

1. **PulseWaves геометрия:** RingGeometry vs Line? (Ring даёт ширину, Line легче)
2. **InnerSkeleton glow:** Через bloom pass или shader alpha?
3. **Mobile testing:** Какие устройства приоритетны?

---

## Промпт для следующей сессии

```
Реализуй "Full Living Sphere" по дизайн-документу:
docs/plans/2026-01-15-full-living-sphere-design.md

Подход: Middle Ground D
- Surface Flow (shader в ParticleSystem)
- PulseWaves (новый класс)
- InnerSkeleton (новый класс, только онбординг)

Начни с Surface Flow — это shader-only, без новых файлов.
Затем PulseWaves и InnerSkeleton.

Используй superpowers:executing-plans для пошагового выполнения.
```
