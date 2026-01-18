# Handoff: Unity Migration — День 5 Complete

**Дата:** 2026-01-18
**Статус:** Production-ready визуал, готов к 3D переходу

---

## Что сделано

### День 1-4: Core Systems ✅
- Unity 6.3 LTS + MCP Unity
- EmotionStateMachine, InputHandler, EyeController
- SphereParticleController с дыханием
- Bloom post-processing

### День 5: Production Visual ✅
| Элемент | Статус | Описание |
|---------|--------|----------|
| Deep Blue частицы | ✅ | HSL(0.66, 0.60, 0.50) как в Three.js |
| Amber iris gradient | ✅ | IrisGradientController + HDR |
| Cyan lid | ✅ | Teal ring как в референсе |
| Pupil glow | ✅ | Light2D + PupilGlowLight |
| Equator Line | ✅ | Горизонтальная светящаяся линия |
| Spine Particles | ✅ | Amber core частицы |
| Bloom 2.5 | ✅ | Threshold 0.5, scatter 0.8 |

---

## Unity проект

**Путь:** `/Users/admin/projects/My project/`
**Сцена:** `SampleScene`

### Структура сцены
```
SampleScene
├── Main Camera (post-processing: true)
├── Global Light 2D
├── PostProcessing (Bloom: threshold=0.5, intensity=2.5)
├── Sphere (EmotionStateMachine, SphereController)
├── SphereParticles (Deep Blue HDR, дыхание)
├── Eye (EyeController)
│   ├── Sclera
│   ├── Iris (IrisGradientController, amber gradient)
│   ├── Pupil (Light2D, PupilGlowLight)
│   └── Lid (cyan color)
├── GameManager (InputHandler)
├── EquatorLine (горизонтальная линия) ← NEW
└── SpineParticles (amber core) ← NEW
```

### Скрипты
| Скрипт | Назначение |
|--------|------------|
| EmotionStateMachine.cs | FSM эмоций |
| InputHandler.cs | Touch/Mouse input |
| EyeController.cs | Глаз: tracking, blink, colors |
| SphereController.cs | Координация сферы |
| SphereParticleController.cs | Частицы с дыханием |
| PostProcessingSetup.cs | Bloom настройки |
| PupilGlowLight.cs | 2D Light на зрачке |
| IrisGradientController.cs | Градиент iris |
| EquatorLine.cs | Экваториальная линия |
| SpineParticles.cs | Центральные частицы |

### Цветовая палитра (Three.js reference)
```
Particles Peace:  RGB(0.4, 0.8, 1.6) — Deep Blue HDR
Particles Tension: RGB(1.5, 1.2, 0.5) — Warm Gold
Particles Trauma:  RGB(0.7, 0.15, 0.15) — Dark Red

Iris Peace:   RGB(2, 1.5, 0.7) — Amber HDR
Iris Tension: RGB(2.5, 1.3, 0.4) — Hot Orange
Iris Trauma:  RGB(0.5, 0.2, 0.4) — Muted Purple

Lid: RGB(0.3, 0.6, 0.8) — Cyan Teal
Spine: RGB(2, 1.5, 0.8) — Warm Amber
Equator: RGB(0.3, 0.6, 1.5) — Soft Blue Glow
```

---

## Следующий этап: 3D сфера

### Цель
Перейти от 2D Particle System к полноценной 3D сфере с mesh-based частицами.

### Варианты реализации

**Вариант A: VFX Graph (рекомендуется)**
- GPU-based, 10K+ частиц
- Требует Vulkan на Android
- MCP: exposed properties → C# контроль

**Вариант B: Custom Mesh Particles**
- Mesh с 5000 вертексами
- Shader для анимации
- Полный контроль через код

**Вариант C: Hybrid**
- Mesh для структуры
- VFX Graph для эффектов (bleeding, glow)

### Задачи для 3D
1. Создать сферический mesh (5000 вертексов, Fibonacci distribution)
2. Написать shader для breathing animation
3. Добавить cursor attraction в shader
4. Реализовать bleeding эффект (частицы отделяются)
5. Интегрировать с EmotionStateMachine

---

## Известные ограничения MCP

| Ограничение | Workaround |
|-------------|------------|
| VFX Graph ноды | Expose properties → C# |
| Shader Graph ноды | Ручное создание |
| Build APK | File → Build Settings |

---

## Промпт для следующей сессии

```
Unity 3D Sphere — переход от 2D к полноценной 3D сфере.

Читай docs/HANDOFF_UNITY_MIGRATION.md

Текущий статус:
- 2D визуал готов (production quality) ✅
- Все скрипты работают ✅
- Цвета соответствуют Three.js референсу ✅

Цель: создать 3D mesh-based сферу с частицами

Задачи:
1. Создать SphereMesh.cs — генерация mesh с Fibonacci distribution
2. Написать SphereShader — breathing, color transitions, HDR emission
3. Добавить CursorAttraction — частицы реагируют на курсор
4. Реализовать BleedingEffect — частицы отделяются при trauma
5. Интегрировать с существующим EmotionStateMachine

Подход:
- Custom mesh с 5000 вертексов
- Vertex shader для breathing animation
- MaterialPropertyBlock для динамических свойств
- Compute shader для attraction (опционально)

Unity проект: /Users/admin/projects/My project/
Three.js референс: /Users/admin/projects/sphere-777/src/ParticleSystem.js

MCP Unity подключён — можно создавать скрипты и компоненты.
```

---

## Three.js референс

**Путь:** `/Users/admin/projects/sphere-777/`
**Запуск:** `npm run dev`

Ключевые файлы:
- `src/ParticleSystem.js` — частицы, дыхание, цвета
- `src/Sphere.js` — координация, эмоции
- `src/Eye.js` — глаз, tracking

Код Three.js не изменялся.
