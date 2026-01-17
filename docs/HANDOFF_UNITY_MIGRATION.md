# Handoff: Unity Migration — День 3 Complete

**Дата:** 2026-01-18
**Статус:** Базовый прототип работает, визуал требует улучшения

---

## Что сделано

### День 1: Валидация ✅
- Unity 6.3 LTS установлен
- MCP Unity подключен
- 5000 частиц тест: 100-200 FPS

### День 2: Core Systems ✅
| Задача | Статус |
|--------|--------|
| EmotionStateMachine.cs | ✅ |
| InputHandler.cs | ✅ |
| EyeController.cs | ✅ |
| SphereController.cs | ✅ |
| SphereParticleController.cs | ✅ |
| Particle System в сцене | ✅ Дышит |
| Skill unity-sphere-vfx | ✅ Создан |

### День 3: Эмоции + Eye ✅
| Задача | Статус |
|--------|--------|
| Исправлен баг Peace→Tension | ✅ добавлен переход по velocity |
| Цвет частиц меняется | ✅ Peace→Tension→Bleeding→Trauma |
| Eye структура создана | ✅ Sclera/Iris/Pupil/Lid |
| EyeSpriteGenerator.cs | ✅ программные круги |
| Pupil tracking | ✅ следит за курсором |
| Blink | ✅ автоматическое моргание |
| Scale баг исправлен | ✅ сохраняет initial scale |

---

## Текущее состояние

### Работает:
- Частицы дышат (радиус пульсирует)
- Цвет меняется с эмоциями (синий → розовый → оранжевый)
- Глаз виден (3 слоя: белый, янтарный, чёрный)
- Зрачок следит за курсором
- Веко моргает автоматически

### Визуальные проблемы:
- Глаз выглядит "плоско" — нужны градиенты, glow, soft edges
- Нет Bloom эффекта
- Простые круги без шейдеров
- 2D пока, не 3D

---

## Что НЕ сделано из плана

### P0 (День 1-3) — частично
| Задача | Статус |
|--------|--------|
| VFX Graph вместо Particle System | ❌ использовали legacy |
| Fibonacci distribution | ❌ не реализовано |
| Build APK | ❌ не тестировали |

### P1 (День 4-5) — не начато
- ❌ LivingCore (Shader Graph, 3 glow layers)
- ❌ PulseWaves (12 rings)
- ❌ IdleAgency (mood progression)
- ❌ OrganicTicks (twitch, stretch, shiver)
- ❌ BioticNoise в Unity

### P2 (День 6-7) — не начато
- ❌ Sound System
- ❌ Haptic feedback
- ❌ Onboarding sequence
- ❌ UI (Settings, About)

---

## Unity проект

**Путь:** `/Users/admin/projects/My project/`

**Сцена:** `SampleScene`
```
├── Main Camera
├── Global Light 2D
├── Sphere (EmotionStateMachine, SphereController)
├── SphereParticles (ParticleSystem, SphereParticleController)
├── Eye (EyeController, EyeSpriteGenerator)
│   ├── Sclera (SpriteRenderer, sortingOrder 100)
│   ├── Iris (SpriteRenderer, sortingOrder 101)
│   ├── Pupil (SpriteRenderer, sortingOrder 102)
│   └── Lid (SpriteRenderer, sortingOrder 103)
├── GameManager (InputHandler, debugMode=true)
├── SphereVFX (не используется)
└── TestSphere (не используется)
```

**Скрипты:** `Assets/Scripts/`
- EmotionStateMachine.cs
- InputHandler.cs
- EyeController.cs (исправлен scale баг)
- EyeSpriteGenerator.cs (новый)
- SphereController.cs
- SphereParticleController.cs

---

## Следующие шаги

### Вариант A: Улучшить визуал глаза
```
1. Shader Graph для iris (радиальный градиент)
2. Glow эффект для pupil
3. Soft edges для sclera
4. URP Post-processing (Bloom)
```

### Вариант B: Build APK
```
1. Player Settings → Android
2. Build and Run
3. Тест на устройстве
```

### Вариант C: P1 Life Systems
```
1. LivingCore с Shader Graph
2. IdleAgency
3. OrganicTicks
```

---

## Как продолжить

### 1. Открыть Unity
```
Unity Hub → My project
```

### 2. Запустить MCP Server
```
Tools → MCP Unity → Start Server
```

### 3. Промпт для Claude (визуал)
```
Продолжаем Unity Migration.

Читай docs/HANDOFF_UNITY_MIGRATION.md

Текущий статус: базовый прототип работает.
- Частицы дышат и меняют цвет ✅
- Глаз следит за курсором ✅
- Визуал "плоский" — нужны улучшения

Задача: улучшить визуал глаза.
1. Shader Graph для iris — радиальный градиент
2. Glow эффект для pupil
3. Soft edges
4. URP Bloom

Референс: Three.js версия в /Users/admin/projects/sphere-777/
Запусти npm run dev чтобы увидеть как должно выглядеть.
```

---

## Three.js версия

**Статус:** Работает независимо
**Путь:** `/Users/admin/projects/sphere-777/`
**Запуск:** `npm run dev`

Код Three.js не изменялся, Unity — отдельный проект.
