# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-15

---

## Последняя сессия: Anamnesis (Phase 1 Core)

### Сделано

**Anamnesis — 9-секундная анимация "рождения сознания"**

Реализованы Core системы (Tasks 1-9 из 13):

| Файл | Что делает |
|------|------------|
| `src/utils/GPUTier.js` | Определение GPU (tier 1-3) для progressive enhancement |
| `src/VoidBackground.js` | Fullscreen shader — живая тьма с туманностью и дыханием |
| `src/CameraBreathing.js` | Камера дышит вместе со сферой |
| `src/ParticleSystem.js` | +assembly uniforms, scattered positions (5-рукавная спираль), ego death |
| `src/Eye.js` | `firstGaze()` — async последовательность (blur → focus → dilate → nod) |
| `src/OnboardingManager.js` | Unified 9-sec timeline с новыми states |
| `src/main.js` | Wiring + `?reset` URL param для тестирования |

**Timeline (9 секунд):**
```
VOID (0-0.8s) → FIRST_SPARK (0.8-1s) → RESONANCE (1-1.5s) →
SPIRAL (1.5-4s) → PROTO (4-5.5s) → EGO_DEATH (5.5-6s) →
CRYSTALLIZE (6-6.5s) → FIRST_BREATH (6.5-8.5s) → OPENING (8.5-9s) → LIVING
```

**Эффекты:**
- Частицы начинают в spiral nebula, собираются в сферу
- Ego death — хаотичное смещение + whiteout
- Camera shake во время ego death
- First breath — контракция → глубокий вдох
- Eye appears и делает firstGaze()

---

## Для следующей сессии

### Оставшиеся Tasks (10-13): Tier 2/3 Enhancers

| Task | Описание | Tier |
|------|----------|------|
| 10 | UmbilicalSystem — золотые "пуповины" от nebula к сфере | 2+ |
| 11 | Synesthesia Colors — rainbow частицы по "частоте" | 2+ |
| 12 | NeuralConnections — синаптические связи (skeleton) | 3 |
| 13 | Tier-Based Feature Activation в OnboardingManager | all |

**План:** `docs/plans/2026-01-14-anamnesis-implementation.md`

### Тестирование

Сброс онбординга для повторного просмотра:
```
http://localhost:5174/?reset
```

### Известные проблемы

1. **Playwright visibility** — браузер теряет focus, triggering pause. На реальном устройстве работает.
2. **Debug log** — временный `[Anamnesis] Start` в console (можно удалить).

---

## Архитектура (обновлено)

```
src/
├── main.js              # Entry, RAF loop, orchestration
├── Sphere.js            # Эмоции, координация систем
├── ParticleSystem.js    # 5000 частиц, assembly, ego death
├── Eye.js               # Глаз + firstGaze()
├── LivingCore.js        # 3-слойное внутреннее свечение
├── VoidBackground.js    # NEW: Anamnesis живая тьма
├── CameraBreathing.js   # NEW: Anamnesis дыхание камеры
├── OrganicTicks.js      # Автономные микро-движения
├── IdleAgency.js        # Инициатива при бездействии
├── OnboardingManager.js # Anamnesis state machine (9 states)
├── AccelerometerManager.js
├── InputManager.js
├── MemoryManager.js
├── HapticManager.js
├── SampleSoundSystem.js
├── utils/
│   └── GPUTier.js       # NEW: GPU tier detection
└── ui/
    └── ...
```

---

## История последних коммитов

| Коммит | Описание |
|--------|----------|
| e8bd8b2 | feat: implement Anamnesis — 9-second consciousness birth |
| a9fd97b | docs: Anamnesis implementation plan (13 tasks) |
| 8431d89 | docs: particle choreography design spec |
| 03f379f | fix: onboarding 10sec + safe-area UI buttons |

---

## Debug консоль

```javascript
// Anamnesis reset
window.location.href = '/?reset'

// Manual assembly test
app.particleSystem.setAssemblyProgress(0)   // nebula
app.particleSystem.setAssemblyProgress(0.5) // mid-assembly
app.particleSystem.setAssemblyProgress(1)   // sphere

// Ego death test
app.particleSystem.setEgoDeathIntensity(0.8)

// Eye first gaze
app.eye.firstGaze()

// Camera breathing
app.cameraBreathing.enable()
app.cameraBreathing.update(Math.PI, 0.5)
```

---

## Build

```bash
npm run dev              # http://localhost:5173
npm run dev -- --host    # + мобильный доступ
npm run build && npx vercel --prod  # Deploy
```
