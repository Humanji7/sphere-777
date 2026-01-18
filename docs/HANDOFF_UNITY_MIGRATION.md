# Handoff: Unity Migration — День 4 Complete

**Дата:** 2026-01-18
**Статус:** Bloom работает! Готов к улучшению визуала

---

## Что сделано

### День 1: Валидация ✅
- Unity 6.3 LTS установлен
- MCP Unity подключен
- 5000 частиц тест: 100-200 FPS

### День 2: Core Systems ✅
- EmotionStateMachine.cs
- InputHandler.cs
- EyeController.cs
- SphereController.cs
- SphereParticleController.cs
- Particle System дышит

### День 3: Эмоции + Eye ✅
- Peace→Tension→Bleeding→Trauma переходы
- Eye: Sclera/Iris/Pupil/Lid
- Pupil tracking + blink

### День 4: Visual Improvements ✅
| Задача | Статус |
|--------|--------|
| URP Post-processing Volume | ✅ PostProcessingSetup.cs |
| Bloom эффект | ✅ работает! |
| Camera post-processing | ✅ enabled |
| HDR материал Iris | ✅ IrisSpriteHDR.mat |
| HDR материал частиц | ✅ ParticleEmissive.mat |
| Скрипты с MaterialPropertyBlock | ✅ HDR цвета |

---

## Текущее состояние

### Работает:
- Частицы дышат и меняют цвет
- Глаз следит за курсором, моргает
- **Bloom glow на iris и частицах** ✅

### Визуальные улучшения (следующие):
- Shader Graph для iris — радиальный градиент
- Soft edges для sclera/pupil
- Настройка интенсивности Bloom
- Возможно: 2D Light для дополнительного glow

---

## Unity проект

**Путь:** `/Users/admin/projects/My project/`

**Сцена:** `SampleScene`
```
├── Main Camera (post-processing: true)
├── Global Light 2D
├── PostProcessing (Volume, PostProcessingSetup)
├── Sphere (EmotionStateMachine, SphereController)
├── SphereParticles (ParticleEmissive.mat)
├── Eye (EyeController, EyeSpriteGenerator)
│   ├── Sclera
│   ├── Iris (IrisSpriteHDR.mat)
│   ├── Pupil
│   └── Lid
└── GameManager (InputHandler)
```

**Скрипты:** `Assets/Scripts/`
- PostProcessingSetup.cs (NEW)
- EyeController.cs (HDR colors)
- SphereParticleController.cs (HDR colors)
- EmotionStateMachine.cs
- InputHandler.cs
- EyeSpriteGenerator.cs
- SphereController.cs

**Материалы:** `Assets/Materials/`
- IrisSpriteHDR.mat
- ParticleEmissive.mat
- IrisEmissive.mat (backup)

---

## Настройки Bloom

```
PostProcessingSetup:
  bloomThreshold: 0.8
  bloomIntensity: 2.0
  bloomScatter: 0.7
```

---

## Следующие шаги для визуала

### 1. Shader Graph для Iris (градиент)
MCP не может редактировать Shader Graph напрямую.

**Ручные шаги:**
1. Assets → Create → Shader Graph → URP → Sprite Unlit Shader Graph
2. Сохранить как `Assets/Shaders/IrisGradient.shadergraph`
3. Ноды:
   - UV → Polar Coordinates
   - Gradient (amber center → dark edge)
   - Sample Gradient по radius
   - Multiply HDR Color (>1)
   - Output Fragment

4. Создать материал → назначить через MCP

### 2. Soft edges
- Sprite с градиентной альфой для sclera
- Или Shader Graph с smoothstep

### 3. 2D Light для glow
- Point Light 2D на pupil
- Intensity > 1 для Bloom

### 4. Настройка Bloom
```csharp
postProcessing.SetBloomIntensity(3f);
postProcessing.SetBloomThreshold(0.6f);
```

---

## Известные ограничения MCP

| Ограничение | Workaround |
|-------------|------------|
| Shader Graph ноды | Ручное создание |
| VFX Graph ноды | Expose properties → C# |
| Build APK | Ручной процесс |
| Play mode save | Остановить → сохранить |

---

## Промпт для следующей сессии

```
Продолжаем Unity Migration — улучшение визуала сферы.

Читай docs/HANDOFF_UNITY_MIGRATION.md

Текущий статус:
- Bloom работает ✅
- HDR материалы назначены ✅
- Визуал можно улучшить

Задачи:
1. Shader Graph для iris — радиальный градиент (amber → dark)
2. Soft edges для sclera и pupil
3. 2D Light на pupil для дополнительного glow
4. Настроить интенсивность Bloom

Unity проект: /Users/admin/projects/My project/
Three.js референс: npm run dev в /Users/admin/projects/sphere-777/

Ограничения MCP:
- НЕ может редактировать Shader Graph ноды
- Может создавать материалы и назначать их
- Может управлять компонентами через скрипты

Подход: инструкции для ручного создания шейдеров,
контроль параметров через C# и MCP.
```

---

## Three.js версия

**Путь:** `/Users/admin/projects/sphere-777/`
**Запуск:** `npm run dev`

Код Three.js не изменялся.
