# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-16

> Это единственный living doc. Остальные docs — статичные reference.

---

## Завершённые системы

### BioticNoise (commit d58120b)
Органическая вариативность ритмов — drift ±8%, jitter ±2%, micro-pauses.
- Интегрирован в `LivingCore.js` и `PulseWaves.js`
- Тесты: `src/utils/tests/BioticNoise.test.js`

### Full Living Sphere (commit 96608e7)
| Система | Файл | Описание |
|---------|------|----------|
| Surface Flow | `ParticleSystem.js` | Tangential particle drift via simplex noise |
| PulseWaves | `PulseWaves.js` | 12 концентрических колец с additive glow |
| InnerSkeleton | `InnerSkeleton.js` | Icosahedron wireframe (только онбординг) |

### Anamnesis (commits e8bd8b2, 1d12cc0)
9-секундное рождение сознания с Tier 1/2/3 enhancers.

### Onboarding UI (commit 30624b5)
Компактные модалки Settings/About, EmotionRing.

### Mobile (commit 1404fd4)
Акселерометр, Capacitor setup, APK build.

---

## Unity Migration

> **Handoff:** `docs/HANDOFF_UNITY_MIGRATION.md`
> **План:** `docs/plans/2026-01-15-unity-migration.md`

### День 1: Валидация ✅ COMPLETE

| Тест | Three.js | Unity 6 |
|------|----------|---------|
| 5000 частиц | 30-45 FPS | **100-200 FPS** |
| CPU time | ~30ms | **5-10ms** |

**Unity в 3-6x быстрее.**

### День 2-5: 2D Visual ✅ COMPLETE
- EmotionStateMachine, InputHandler, EyeController
- SphereParticleController (2D Particle System)
- Bloom post-processing, HDR colors

### День 6: 3D Sphere System (Geometry Shader) ✅ COMPLETE
| Компонент | Статус |
|-----------|--------|
| SphereMesh.cs | ✅ Fibonacci distribution |
| SphereBreathShader.shader | ✅ Breathing + HDR + Cursor (НЕ РАБОТАЕТ на мобильных) |
| SphereMeshController.cs | ✅ Emotion integration |

### День 7: GPU Instanced 3D Sphere ✅ COMPLETE
| Компонент | Статус |
|-----------|--------|
| SphereInstancedShader.shader | ✅ Vertex-only billboard, NO geometry shader |
| SphereInstancedRenderer.cs | ✅ DrawMeshInstanced batching (5x1023) |
| Sphere3D_Instanced | ✅ GameObject настроен в сцене |

**Решена проблема:** Geometry shader не работает на OpenGL ES 3.0 / Metal
**Решение:** GPU Instancing с vertex-only billboarding

### День 8: Bleeding Effect (NEXT)
```
□ Evaporation shader effect
□ Scar memory (permanent offsets)
□ Integration with trauma phase
```

### День 8: Polish
- Eye integration
- Mobile optimization test
- Sound, Haptics

---

## Документация

```
docs/
├── NEXT_SESSION.md      # ← ТЫ ЗДЕСЬ (living doc)
├── ARCHITECTURE.md      # Модули, эмоции, жесты
├── VISION.md            # Философия продукта
├── reference/
│   ├── SOUND_DESIGN.md  # Аудио архитектура
│   ├── CAPACITOR.md     # Mobile setup
│   ├── L7_GLITCH.md     # Glitch система
│   └── IOS_SETUP.md     # iOS заметки
└── plans/
    ├── 2026-01-15-biotic-noise-design.md
    └── 2026-01-13-techno-pet-philosophy.md
```

---

## Архитектура (краткая)

```
src/
├── main.js              # Entry, RAF loop
├── Sphere.js            # Эмоции, координация
├── ParticleSystem.js    # GPU, Surface Flow
├── Eye.js               # Глаз
├── LivingCore.js        # 3-слойное свечение + BioticNoise
├── PulseWaves.js        # Кольца + BioticNoise
├── InnerSkeleton.js     # Icosahedron (онбординг)
├── IdleAgency.js        # Инициатива при бездействии
├── OrganicTicks.js      # Микро-движения
├── OnboardingManager.js # Anamnesis
├── utils/
│   └── BioticNoise.js   # Органические ритмы
└── ...                  # См. ARCHITECTURE.md для полного списка
```

---

## Тестирование

```bash
npm run dev -- --host

# Desktop: http://localhost:5173
# Mobile:  http://<your-ip>:5173
# Reset:   http://<your-ip>:5173/?reset
```

---

## Известные ограничения

- **ParticleSystem + BioticNoise** — не интегрированы напрямую (эффект через LivingCore)
- **BeetleShell** — нет Surface Flow
- **Sound** — не синхронизирован с PulseWaves
