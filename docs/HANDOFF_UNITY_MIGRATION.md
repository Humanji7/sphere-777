# Handoff: Unity Migration — День 4 (Visual Improvements)

**Дата:** 2026-01-18
**Статус:** Bloom + HDR цвета добавлены, требуется проверка визуала

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

### День 4: Visual Improvements ✅
| Задача | Статус |
|--------|--------|
| URP Post-processing Volume | ✅ PostProcessingSetup.cs |
| Bloom эффект | ✅ threshold=0.8, intensity=2 |
| Camera post-processing enabled | ✅ |
| HDR материал для Iris | ✅ IrisSpriteHDR.mat |
| HDR материал для частиц | ✅ ParticleEmissive.mat |
| EyeController HDR цвета | ✅ ColorUsage(true, true) |
| SphereParticleController HDR | ✅ MaterialPropertyBlock |

---

## Текущее состояние

### Работает:
- Частицы дышат (радиус пульсирует)
- Цвет меняется с эмоциями (синий → розовый → оранжевый)
- Глаз виден (3 слоя: белый, янтарный, чёрный)
- Зрачок следит за курсором
- Веко моргает автоматически
- **NEW:** Bloom post-processing настроен
- **NEW:** HDR цвета для glow эффекта

### Требуется проверка:
- Визуально проверить Bloom в Game View
- Настроить интенсивность если нужно
- При необходимости создать Shader Graph для радиального градиента iris

---

## Новые файлы

### Скрипты
- `Assets/Scripts/PostProcessingSetup.cs` — программная настройка Bloom

### Материалы
- `Assets/Materials/IrisSpriteHDR.mat` — Sprite-Unlit с HDR цветом
- `Assets/Materials/ParticleEmissive.mat` — Particles/Unlit с HDR
- `Assets/Materials/IrisEmissive.mat` — URP/Lit с emission (backup)

---

## Unity проект

**Путь:** `/Users/admin/projects/My project/`

**Сцена:** `SampleScene`
```
├── Main Camera (post-processing enabled)
├── Global Light 2D
├── PostProcessing (Volume, PostProcessingSetup) ← NEW
├── Sphere (EmotionStateMachine, SphereController)
├── SphereParticles (ParticleSystem, SphereParticleController)
│   └── Material: ParticleEmissive.mat
├── Eye (EyeController, EyeSpriteGenerator)
│   ├── Sclera (SpriteRenderer, sortingOrder 100)
│   ├── Iris (SpriteRenderer, sortingOrder 101)
│   │   └── Material: IrisSpriteHDR.mat
│   ├── Pupil (SpriteRenderer, sortingOrder 102)
│   └── Lid (SpriteRenderer, sortingOrder 103)
├── GameManager (InputHandler, debugMode=true)
├── SphereVFX (не используется)
└── TestSphere (не используется)
```

---

## Настройки Bloom

```
PostProcessingSetup:
  bloomThreshold: 0.8   # Цвета > 0.8 будут светиться
  bloomIntensity: 2.0   # Сила свечения
  bloomScatter: 0.7     # Размер halo
  debugMode: true

Camera → UniversalAdditionalCameraData:
  renderPostProcessing: true
  allowHDR: true
```

---

## Следующие шаги

### Вариант A: Shader Graph для Iris (градиент)
MCP не может создавать Shader Graph ноды напрямую.

**Ручные шаги в Unity:**
1. Assets → Create → Shader Graph → URP → Sprite Unlit Shader Graph
2. Сохранить как `Assets/Shaders/IrisGradient.shadergraph`
3. Добавить ноды:
   - UV → Polar Coordinates (центрированные)
   - Gradient (радиальный amber → dark)
   - Sample Gradient по radius
   - Multiply с HDR Color (>1 для Bloom)
   - Output → Fragment Color

4. Создать материал из шейдера
5. Назначить на Iris через MCP:
```
mcp__mcp-unity__assign_material
  objectPath: "Eye/Iris"
  materialPath: "Assets/Materials/IrisGradient.mat"
```

### Вариант B: Настроить текущий Bloom
Если визуал устраивает, можно настроить параметры:
```csharp
// PostProcessingSetup API
postProcessing.SetBloomIntensity(3f);   // Больше glow
postProcessing.SetBloomThreshold(0.6f); // Раньше начинает светиться
postProcessing.SetBloomScatter(0.8f);   // Шире halo
```

### Вариант C: Build APK
1. Player Settings → Android
2. Build and Run
3. Тест на устройстве

---

## Известные ограничения

| Проблема | Workaround |
|----------|------------|
| MCP не может создавать Shader Graph | Ручное создание + MCP назначает материал |
| MCP не может сохранять в Play mode | Остановить Play, затем сохранить |
| Sprite-Unlit не поддерживает emission map | Используем HDR _Color multiply |

---

## Как продолжить

### 1. Проверить визуал
```
Unity → Play → смотреть Game View
Должен быть виден Bloom на ярких элементах
```

### 2. Остановить и сохранить
```
Stop Play → Ctrl+S для сохранения сцены
```

### 3. Промпт для Claude
```
Продолжаем Unity Migration.

Читай docs/HANDOFF_UNITY_MIGRATION.md

Bloom добавлен. Проверь визуал в Unity.
Если нужно — настрой параметры или создай Shader Graph для iris.
```

---

## Three.js версия

**Статус:** Работает независимо
**Путь:** `/Users/admin/projects/sphere-777/`
**Запуск:** `npm run dev`

Код Three.js не изменялся, Unity — отдельный проект.
