# Handoff: Unity Migration — День 7: GPU Instanced 3D Sphere

**Дата:** 2026-01-18
**Статус:** GPU Instancing реализован, совместим с мобильными

---

## Что сделано

### День 1-5: 2D Visual ✅
- Unity 6.3 LTS + MCP Unity
- EmotionStateMachine, InputHandler, EyeController
- SphereParticleController с дыханием (2D Particle System)
- Bloom post-processing
- Цвета соответствуют Three.js референсу

### День 6: 3D Sphere System (Geometry Shader) ✅
- SphereMesh.cs — Fibonacci distribution
- SphereBreathShader.shader — geometry shader (не работает на мобильных)
- SphereMeshController.cs — emotion integration

### День 7: GPU Instanced 3D Sphere ✅ NEW
| Компонент | Файл | Описание |
|-----------|------|----------|
| SphereMesh.cs | `Assets/Scripts/SphereMesh.cs` | Fibonacci distribution + accessors |
| SphereInstancedShader | `Assets/Shaders/SphereInstancedShader.shader` | Vertex-only billboard, NO geometry shader |
| SphereInstancedRenderer | `Assets/Scripts/SphereInstancedRenderer.cs` | GPU Instancing с batching (1023 per call) |

---

## Проблема и решение

### Проблема
`SphereBreathShader.shader` использует **geometry shader**, который не работает на:
- OpenGL ES 3.0 (большинство Android)
- Metal (iOS без compute)

Результат: чёрные квадраты вместо частиц.

### Решение
**GPU Instanced Quads** через `Graphics.DrawMeshInstanced()`:
- Billboard создаётся в vertex shader
- Batching: 5000 / 1023 = 5 batches
- Совместимость с OpenGL ES 3.0 и Metal

---

## Настройка (автоматическая через MCP)

GameObject `Sphere3D_Instanced` уже создан со всеми компонентами:
- SphereMesh (5000 vertices, radius 1.5)
- SphereInstancedRenderer
- SphereCollider (radius 1.5)
- MeshFilter, MeshRenderer

### Для тестирования:
1. Открыть Unity Editor
2. Нажать **Play**
3. Проверить:
   - [ ] 5000 частиц видны (не чёрные квадраты)
   - [ ] Breathing работает (3-4 сек цикл)
   - [ ] Cursor притягивает частицы
   - [ ] Bloom эффект (HDR colors)

---

## Архитектура GPU Instancing

```
Sphere3D_Instanced (GameObject)
├── SphereMesh              // Fibonacci positions (5000)
├── SphereInstancedRenderer // DrawMeshInstanced batches
│   ├── quadMesh            // 4 vertices billboard
│   ├── batches[5]          // Matrix4x4[1023] each
│   └── mpb                 // MaterialPropertyBlock
├── SphereCollider          // Raycast для cursor
└── MeshRenderer (disabled) // Мы рендерим вручную

SphereInstancedShader.shader
├── Vertex Shader (ONLY)
│   ├── Billboard from camera vectors
│   ├── Breathing displacement
│   ├── Cursor attraction
│   └── Per-instance seed from instanceID
└── Fragment Shader
    ├── Circular particle shape
    ├── Soft edge falloff
    └── HDR color output

NO GEOMETRY SHADER!
```

---

## Breathing Formula (из Three.js)

```hlsl
float CalculateBreathing(float phase, float seed)
{
    // 1. Unified asymmetric curve (sharper peak, longer valley)
    float curve = pow(sin(phase) * 0.5 + 0.5, 1.6);
    float unified = (curve - 0.5) * _BreathAmount * 1.8;

    // 2. Micro-boiling (individual particle activity)
    float boil = sin(phase * 12.0 + seed * 30.0) * 0.006;

    // 3. Heartbeat (80 bpm = 8.4 rad/s)
    float heartbeat = sin(_Time.y * 8.4) * 0.0035;

    return unified + boil + heartbeat;
}
```

---

## Цветовая палитра (HDR)

| Эмоция | RGB HDR | Progress |
|--------|---------|----------|
| Peace | (0.4, 0.8, 1.6) | 0.0 |
| Listening | lerp | 0.1 |
| Tension | (1.5, 1.2, 0.5) | 0.4 |
| Bleeding | (2.0, 0.8, 0.4) | 0.7 |
| Trauma | (0.7, 0.15, 0.15) | 1.0 |
| Healing | (0.6, 1.2, 0.6) | 0.3 |

---

## Файлы

### Новые (День 7)
- `Assets/Scripts/SphereInstancedRenderer.cs`
- `Assets/Shaders/SphereInstancedShader.shader`

### Изменённые
- `Assets/Scripts/SphereMesh.cs` — добавлены `Positions` и `Seeds` accessors

### Можно удалить (после тестирования)
- `Assets/Scripts/SphereMeshController.cs` — заменён SphereInstancedRenderer
- `Assets/Shaders/SphereBreathShader.shader` — заменён SphereInstancedShader

---

## Следующие шаги

### Phase 2: Bleeding Effect
1. Evaporation shader effect
2. Scar memory (permanent offsets)
3. Integration with trauma phase

### День 8: Polish
1. Интегрировать с глазом (EyeController)
2. Mobile optimization тест (build APK)
3. Sound, Haptics

---

## Промпт для следующей сессии

```
Unity 3D Sphere — тестирование и bleeding effect

Текущий статус:
- GPU Instancing реализован ✅
- SphereInstancedRenderer.cs создан ✅
- SphereInstancedShader.shader создан ✅
- Сцена настроена (Sphere3D_Instanced)

Задачи:
1. Войти в Play Mode и проверить визуал
2. Build APK и тест на Android
3. Добавить bleeding эффект (Phase 2)
4. Интегрировать с глазом

Unity проект: /Users/admin/projects/My project/
Документация: docs/HANDOFF_UNITY_MIGRATION.md
```

---

## Three.js референс

**Путь:** `/Users/admin/projects/sphere-777/`

Ключевые файлы:
- `src/ParticleSystem.js` — частицы, дыхание, цвета, bleeding
- `src/Sphere.js` — координация, эмоции
- `src/Eye.js` — глаз, tracking
