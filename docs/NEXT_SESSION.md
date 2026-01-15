# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-15

---

## Последняя сессия: Anamnesis Complete (13/13 tasks)

### Сделано

**Anamnesis — 9-секундная анимация "рождения сознания"** — полностью реализована.

| Коммит | Описание |
|--------|----------|
| 1d12cc0 | feat: complete Anamnesis Phase 2 — Tier 2/3 enhancers |
| 8c83c65 | docs: handoff — Anamnesis Phase 1 complete |
| e8bd8b2 | feat: implement Anamnesis — 9-second consciousness birth |

**Core (все устройства):**
- VoidBackground — живая тьма с туманностью
- CameraBreathing — камера дышит со сферой
- Assembly animation — частицы собираются из nebula
- Ego Death — хаотичное растворение перед кристаллизацией
- First Breath — контракция → глубокий вдох
- Eye.firstGaze() — момент узнавания

**Tier 2+ (mid-range устройства):**
- UmbilicalSystem — 300 золотых пуповин от nebula к сфере
- Synesthesia Colors — rainbow частицы по "частоте" во время SPIRAL

**Tier 3 (high-end устройства):**
- NeuralConnections — синаптические связи (skeleton)

**Polish:**
- Smooth camera transition (600ms ease-out) при завершении онбординга

---

## Что дальше? (предложения)

### 1. Audio Integration (высокий приоритет)
Anamnesis визуально готов, но без звука. SampleSoundSystem уже есть.

**Идеи:**
- Ambient drone во время VOID (low frequency)
- Heartbeat pulse синхронно с breathing
- Crystallization sound при ego death → crystallize
- First breath — реальный вдох/выдох sample

**Файлы:** `src/SampleSoundSystem.js`, `src/OnboardingManager.js`

---

### 2. NeuralConnections полная реализация (Tier 3)
Сейчас skeleton с static connections. Можно добавить:

- Dynamic neighbor detection (spatial hashing)
- Firing animations (pulse travels along connection)
- Connection density увеличивается к центру

**Файл:** `src/NeuralConnections.js`

---

### 3. Morphogenetic Field (Phase 2 expansion)
Из оригинального плана — attractor visualization:

- Невидимые силовые линии становятся видимыми
- Частицы следуют за полем
- "Судьба каждой частицы предопределена"

**Сложность:** Средняя. Нужен новый shader effect.

---

### 4. Mobile Optimization
Проверить и оптимизировать:

- Tier detection accuracy на реальных устройствах
- 60fps на iPhone SE / low-end Android
- Touch responsiveness во время онбординга

---

### 5. Settings: Reset Onboarding кнопка
Сейчас только через `?reset` URL. Добавить в Settings modal:

```
[Debug Section]
☐ Reset Onboarding — пересмотреть Anamnesis
```

**Файлы:** `src/ui/SettingsModal.js`

---

### 6. Platonic Solid Hints (experimental)
Из оригинального spec — на мгновение показать:

- Икосаэдр во время CRYSTALLIZE
- Додекаэдр намёком в PROTO
- "Сакральная геометрия под хаосом"

**Сложность:** Высокая. Нужна wireframe geometry + timing.

---

## Тестирование

```bash
# Локально
npm run dev
http://localhost:5173/?reset

# Мобильный (в той же сети)
http://192.168.3.63:5173/?reset

# Deploy
npm run build && npx vercel --prod
```

---

## Архитектура (финальная)

```
src/
├── main.js              # Entry, RAF loop, orchestration
├── Sphere.js            # Эмоции, координация систем
├── ParticleSystem.js    # 5000 частиц, assembly, ego death, synesthesia
├── Eye.js               # Глаз + firstGaze()
├── LivingCore.js        # 3-слойное внутреннее свечение
├── VoidBackground.js    # Anamnesis: живая тьма
├── CameraBreathing.js   # Anamnesis: дыхание камеры
├── UmbilicalSystem.js   # Anamnesis Tier 2+: пуповины
├── NeuralConnections.js # Anamnesis Tier 3: синапсы (skeleton)
├── OnboardingManager.js # Anamnesis state machine (9 states)
├── OrganicTicks.js      # Автономные микро-движения
├── IdleAgency.js        # Инициатива при бездействии
├── utils/
│   └── GPUTier.js       # GPU tier detection
└── ui/
    └── ...
```

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

// Synesthesia test
app.particleSystem.setSynesthesiaAmount(0.5)

// Eye first gaze
app.eye.firstGaze()

// GPU Tier (1-3)
app.gpuTier
```
