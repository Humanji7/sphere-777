# 🌿 SPHERE-777: Organic Life Implementation

**Создано:** 2026-01-10  
**Цель:** Разрушить ощущение "алгоритмичности", создать иллюзию живого существа

---

## 📋 Обзор фич

| # | Название | Приоритет | Статус |
|---|----------|-----------|--------|
| 5 | Рандомизированные "тики" | 🔥 Phase 1 | ⬜ TODO |
| 8 | Пульсация обратной связи | 🔥 Phase 1 | ⬜ TODO |
| 4 | Биолюминесценция | Phase 2 | ⬜ TODO |
| 6 | Неоднородная плотность | Phase 2 | ⬜ TODO |
| 12 | Инициатива от сферы | Phase 2 | ⬜ TODO |

---

# 🔥 PHASE 1: Детальные планы

---

## #5 — Рандомизированные "тики" (Organic Micro-Movements)

### Концепция
Редкие, непредсказуемые микро-движения, не связанные с взаимодействием пользователя.
Как у живого существа — почесаться, вздрогнуть, потянуться, "посмотреть в сторону".

### Философия
> "Жизнь продолжается, даже когда никто не смотрит"

### Типы тиков

| Тик | Описание | Частота | Длительность |
|-----|----------|---------|--------------|
| `twitch` | Микро-вздрагивание поверхности (случайная зона) | 1 раз в 8-15 сек | 150-300ms |
| `stretch` | Лёгкое "потягивание" (выброс одной стороны) | 1 раз в 20-40 сек | 400-700ms |
| `shiver` | Волна мурашек по всей поверхности | 1 раз в 45-90 сек | 500-800ms |
| `glance` | Глаз резко смотрит в случайную точку, потом возвращается | 1 раз в 30-60 сек | 300-500ms |

### Технический план

#### 1. Новый класс `OrganicTicks.js`

```javascript
// src/OrganicTicks.js
export class OrganicTicks {
  constructor(sphere, particleSystem, eye) {
    this.sphere = sphere
    this.particles = particleSystem
    this.eye = eye
    
    // Tick timers (randomized)
    this.nextTwitch = this._randomInterval(8, 15)
    this.nextStretch = this._randomInterval(20, 40)
    this.nextShiver = this._randomInterval(45, 90)
    this.nextGlance = this._randomInterval(30, 60)
    
    // Active tick state
    this.activeTick = null
    this.tickProgress = 0
  }
  
  update(delta, elapsed) {
    // Decrement timers
    // Trigger ticks when timer hits 0
    // Animate active tick
  }
  
  _randomInterval(min, max) {
    return min + Math.random() * (max - min)
  }
  
  _triggerTwitch() { /* ... */ }
  _triggerStretch() { /* ... */ }
  _triggerShiver() { /* ... */ }
  _triggerGlance() { /* ... */ }
}
```

#### 2. Изменения в `ParticleSystem.js`

Добавить uniforms для тиков:
```javascript
// В _createMaterial()
uTickZone: { value: new THREE.Vector3(0, 0, 0) },  // Центр зоны тика
uTickRadius: { value: 0.0 },                        // Радиус влияния
uTickIntensity: { value: 0.0 },                     // 0-1, сила тика
uTickType: { value: 0 }                             // 0=none, 1=twitch, 2=stretch, 3=shiver
```

В vertex shader добавить:
```glsl
// TICK EFFECT
if (uTickIntensity > 0.0) {
  float tickDist = distance(aOriginalPos, uTickZone);
  float tickInfluence = (1.0 - smoothstep(0.0, uTickRadius, tickDist)) * uTickIntensity;
  
  if (uTickType == 1.0) {
    // Twitch: quick outward bump
    pos += dir * tickInfluence * 0.08;
  } else if (uTickType == 2.0) {
    // Stretch: directional pull
    pos += uTickZone * tickInfluence * 0.05;
  } else if (uTickType == 3.0) {
    // Shiver: noise-based displacement
    float shiverNoise = snoise(aOriginalPos * 15.0 + uTime * 5.0);
    pos += dir * shiverNoise * tickInfluence * 0.03;
  }
}
```

#### 3. Изменения в `Eye.js`

Добавить метод `glanceAt(target, duration)`:
```javascript
glanceAt(target, duration = 0.4) {
  // Save current look target
  // Quickly move to random target
  // Return to original after duration
}
```

#### 4. Интеграция в `main.js`

```javascript
const organicTicks = new OrganicTicks(sphere, particleSystem, eye)
// В update loop:
organicTicks.update(delta, elapsed)
```

### Acceptance Criteria
- [ ] Сфера вздрагивает случайно каждые 8-15 секунд
- [ ] Глаз иногда "глядит в сторону" без причины
- [ ] Тики НЕ происходят во время активного взаимодействия (hold, stroke)
- [ ] Ощущение "она живёт своей жизнью"

---

## #8 — Пульсация обратной связи (Living Heartbeat Haptics)

### Концепция
Вибрация телефона синхронизирована с "сердцебиением" сферы.
Не один паттерн, а живой ритм с вариациями, отражающий эмоциональное состояние.

### Философия
> "Ты чувствуешь её пульс через экран"

### Паттерны вибрации

| Фаза | BPM | Ритм | Интенсивность |
|------|-----|------|---------------|
| PEACE | 60-70 | Ровный, глубокий | Мягкая (10-20ms) |
| LISTENING | 70-80 | Ровный, чуть быстрее | Средняя |
| TENSION | 90-110 | Ускоряющийся | Нарастающая |
| BLEEDING | 120-140 | Хаотичный | Сильная + пропуски |
| TRAUMA | 50-60 | Замедленный, тяжёлый | Глухая (длинные паттерны) |
| HEALING | 65-75 | Восстанавливающийся | Постепенно мягче |
| RECOGNITION | 55-65 | Синхронизированный с дыханием | Глубокая |

### Технический план

#### 1. Расширение `HapticManager.js`

```javascript
// src/HapticManager.js
export class HapticManager {
  constructor() {
    this.supported = 'vibrate' in navigator
    this.lastBeat = 0
    this.currentBPM = 65
    this.beatInterval = 60000 / this.currentBPM  // ms between beats
    
    // Rhythm variation
    this.rhythmVariation = 0.1  // ±10% timing variation
    this.intensityBase = 15     // ms base pulse
    this.intensityVariation = 0.2
    
    // State
    this.isActive = false
    this.phase = 'peace'
  }
  
  /**
   * Start continuous heartbeat synchronized with sphere
   */
  startHeartbeat(phase = 'peace') {
    this.isActive = true
    this.phase = phase
    this._updatePhaseParameters(phase)
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    this.isActive = false
  }
  
  /**
   * Update phase parameters
   */
  _updatePhaseParameters(phase) {
    const params = {
      peace:       { bpm: 65,  intensity: 15, variation: 0.08, pattern: 'steady' },
      listening:   { bpm: 75,  intensity: 18, variation: 0.10, pattern: 'steady' },
      tension:     { bpm: 100, intensity: 25, variation: 0.15, pattern: 'accelerating' },
      bleeding:    { bpm: 130, intensity: 35, variation: 0.25, pattern: 'chaotic' },
      trauma:      { bpm: 55,  intensity: 40, variation: 0.05, pattern: 'heavy' },
      healing:     { bpm: 70,  intensity: 20, variation: 0.12, pattern: 'recovering' },
      recognition: { bpm: 60,  intensity: 25, variation: 0.05, pattern: 'synchronized' }
    }
    
    const p = params[phase] || params.peace
    this.currentBPM = p.bpm
    this.beatInterval = 60000 / p.bpm
    this.intensityBase = p.intensity
    this.rhythmVariation = p.variation
    this.pattern = p.pattern
  }
  
  /**
   * Call every frame from Sphere.update()
   */
  update(delta, elapsed, breathPhase) {
    if (!this.isActive || !this.supported) return
    
    const now = performance.now()
    const timeSinceLastBeat = now - this.lastBeat
    
    // Apply rhythm variation
    const variation = 1 + (Math.random() - 0.5) * 2 * this.rhythmVariation
    const currentInterval = this.beatInterval * variation
    
    if (timeSinceLastBeat >= currentInterval) {
      this._beat()
      this.lastBeat = now
    }
  }
  
  /**
   * Single heartbeat pulse
   */
  _beat() {
    // Intensity variation
    const intensityVar = 1 + (Math.random() - 0.5) * 2 * this.intensityVariation
    const duration = Math.floor(this.intensityBase * intensityVar)
    
    // Pattern-specific behavior
    switch (this.pattern) {
      case 'steady':
        navigator.vibrate(duration)
        break
      case 'heavy':
        // Double beat (lub-dub)
        navigator.vibrate([duration, 80, duration * 0.7])
        break
      case 'chaotic':
        // Random skips
        if (Math.random() > 0.15) {
          navigator.vibrate(duration)
        }
        break
      case 'synchronized':
        // Stronger on exhale
        navigator.vibrate([duration, 50, duration * 0.5])
        break
      default:
        navigator.vibrate(duration)
    }
  }
  
  /**
   * Set phase (called from Sphere when phase changes)
   */
  setPhase(phase) {
    if (this.phase !== phase) {
      this.phase = phase
      this._updatePhaseParameters(phase)
    }
  }
  
  // Existing methods...
  softTouch() {
    if (!this.supported) return
    navigator.vibrate(10)
  }
  
  heartbeat(intensity) {
    if (!this.supported) return
    const duration = Math.floor(20 + intensity * 30)
    navigator.vibrate([duration, 100, duration])
  }
}
```

#### 2. Интеграция в `Sphere.js`

```javascript
// В _transitionTo():
_transitionTo(newPhase) {
  // ... existing code ...
  
  // Update haptic phase
  if (this.hapticManager) {
    this.hapticManager.setPhase(newPhase)
  }
}

// В update():
update(delta, elapsed) {
  // ... existing code ...
  
  // Update haptic heartbeat
  if (this.hapticManager) {
    this.hapticManager.update(delta, elapsed, this.particles.breathPhase)
  }
}
```

#### 3. Активация в `main.js`

```javascript
// После первого user interaction:
function onFirstTouch() {
  // ... existing audio unlock ...
  
  // Start haptic heartbeat
  hapticManager.startHeartbeat('peace')
}
```

### Acceptance Criteria
- [ ] Телефон пульсирует в такт "сердцебиению" сферы
- [ ] BPM меняется при смене эмоциональной фазы
- [ ] Ритм НЕ механически ровный — есть вариации
- [ ] В BLEEDING фазе — хаотичные пропуски
- [ ] В TRAUMA — тяжёлый двойной удар (lub-dub)
- [ ] Пульс ощущается как "живой организм"

---

# 📝 PHASE 2: Общие планы (для следующей сессии)

---

## #4 — Биолюминесценция (Inner Glow)

### Суть
Свечение изнутри сферы, которое пульсирует НЕ синхронно с дыханием.
Как второй ритм — "сердце" отдельно от "лёгких".

### Направление реализации
1. Добавить `uInnerGlowPhase` uniform в шейдер
2. Вычислять inner glow с другой частотой (не breathPhase)
3. Fragment shader: частицы ближе к центру светятся ярче
4. Цвет inner glow зависит от эмоциональной фазы
5. Subtle — не должен перебивать основной визуал

### Примерный объём
- ParticleSystem.js: +30-50 строк
- Sphere.js: +10-20 строк для управления фазой

---

## #6 — Неоднородная плотность (Sensitivity Zones)

### Суть
Разные участки поверхности с разной "чувствительностью".
Где-то частицы плотнее и реагируют слабее, где-то мягче и реагируют сильнее.

### Направление реализации
1. Добавить `aSensitivity` атрибут (per-particle)
2. При создании геометрии — назначить sensitivity по noise-map
3. Shader: масштабировать displacement на sensitivity
4. Визуально: более чувствительные зоны чуть ярче/теплее
5. Возможно: зоны медленно "дрейфуют" по поверхности

### Примерный объём
- ParticleSystem.js: +50-80 строк (геометрия + шейдер)
- Возможно: отдельный SensitivityMap класс

---

## #12 — Инициатива от сферы (Autonomous Behavior)

### Суть
Сфера иногда "требует внимания" — не реакция на пользователя, а собственное желание.

### Триггеры инициативы
| Условие | Поведение |
|---------|-----------|
| Idle > 30 сек | Лёгкое "скучающее" покачивание |
| Idle > 60 сек | Глаз "ищет" пользователя |
| Idle > 120 сек | Подкатывается к краю экрана |
| Low trust + idle | "Закрывается" — частицы сжимаются |
| High trust + idle | "Приглашает" — тянется к предполагаемой позиции руки |

### Направление реализации
1. Новый класс `AutonomousBehavior.js`
2. Idle timer в main.js (reset при любом input)
3. State machine для autonomous behaviors
4. Интеграция с Trust системой
5. Звуковые сигналы (soft chime?) при "требовании внимания"

### Примерный объём
- Новый файл: 150-250 строк
- main.js: +20-30 строк интеграции
- Sphere.js: +10-20 строк для поддержки

---

## 🗂️ Следующая сессия

После реализации Phase 1 (#5 + #8):
1. Скинуть этот документ
2. Статус #5 и #8 должен быть ✅ DONE
3. Выбрать порядок для Phase 2

---

**Файл:** `docs/IMPLEMENTATION_ORGANIC_LIFE.md`
