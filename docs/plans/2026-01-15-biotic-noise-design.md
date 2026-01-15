# Biotic Noise System — Design Document

**Дата:** 2026-01-15
**Статус:** READY FOR IMPLEMENTATION
**Цель:** Усилить ощущение "она живая" через органическую вариативность ритмов
**Ревью:** Пройдено 2026-01-15, исправления применены

---

## Проблема

Текущие системы работают на **фиксированных частотах**:

| Система | Текущее значение | Проблема |
|---------|------------------|----------|
| LivingCore inner | 0.10 Hz | Константа, не плавает |
| LivingCore pulse | 0.55 Hz | Константа, не плавает |
| PulseWaves speed | `0.3 + intensity * 0.7` | Линейная формула |
| OrganicTicks timers | Random при создании | Линейное убывание |

**Результат:** Идеальные синусоиды выдают "это код". Живые организмы имеют вариативность:
- Сердце: 60-80 bpm, плавает ±5-10% каждый удар
- Дыхание: неравномерные паузы
- Моргание: иногда 2 раза подряд, иногда долгая пауза

---

## Решение: Три слоя Biotic Noise

```
┌─────────────────────────────────────────────────────────────────┐
│                        BIOTIC NOISE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Layer 1: FREQUENCY DRIFT                                       │
│  ├── Масштаб: медленный (τ = 30-60 sec)                        │
│  ├── Эффект: базовая частота плавает ±8%                       │
│  └── Метафора: "пульс ускоряется и замедляется"                │
│                                                                 │
│  Layer 2: PHASE JITTER                                          │
│  ├── Масштаб: быстрый (каждый фрейм)                           │
│  ├── Эффект: микро-вариации ±2%                                │
│  └── Метафора: "каждый удар немного другой"                    │
│                                                                 │
│  Layer 3: MICRO-PAUSES                                          │
│  ├── Масштаб: случайный (~1 раз в 20 сек)                      │
│  ├── Эффект: короткие паузы 200-600ms                          │
│  └── Метафора: "задержала дыхание"                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Frequency Drift

### Концепция

Медленное синусоидальное "плавание" базовых частот. Имитирует естественную вариабельность сердечного ритма (HRV — Heart Rate Variability).

### Параметры

```javascript
const DRIFT_CONFIG = {
  speed: 0.1,        // Полный цикл за ~60 сек
  amount: 0.08,      // ±8% отклонение от базовой частоты
  // Уникальные offsets для десинхронизации между системами
  offsets: {
    livingCoreInner: 0,
    livingCorePulse: 2.1,
    pulseWaves: 4.2,
    particles: 1.05
  }
}
```

### Реализация

**LivingCore.js:**
```javascript
// В constructor:
this.driftOffsets = {
  inner: 0,
  pulse: 2.1  // Рассинхронизация
}

// В update():
const drift = Math.sin(elapsed * 0.1 + this.driftOffsets[name]) * 0.08
const effectiveFreq = cfg.freq * (1 + drift)
cfg.phase += delta * effectiveFreq
```

**PulseWaves.js:**
```javascript
// В constructor:
this.driftOffset = 4.2

// В update():
const drift = Math.sin(time * 0.1 + this.driftOffset) * 0.08
const waveSpeed = (0.3 + this.intensity * 0.7) * (1 + drift)
```

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `LivingCore.js` | Добавить drift в update() |
| `PulseWaves.js` | Добавить drift в update() |
| `ParticleSystem.js` | Добавить drift в uBreathPhase |

---

## Layer 2: Phase Jitter

### Концепция

Микро-вариации в каждом фрейме. Каждый "удар" немного отличается от предыдущего.

### Параметры

```javascript
const JITTER_CONFIG = {
  amount: 0.04,  // ±2% на фрейм
  coherent: true // Внутри системы — одинаковый, между системами — разный
}
```

### Реализация

**LivingCore.js:**
```javascript
// В update():
// Один jitter для всех слоёв этой системы (когерентность)
const frameJitter = (Math.random() - 0.5) * 0.04

for (const mesh of this.group.children) {
  const cfg = this.layers[mesh.name]
  // ... drift calculation ...
  cfg.phase += delta * effectiveFreq * (1 + frameJitter)
}
```

**PulseWaves.js:**
```javascript
// В update():
const frameJitter = (Math.random() - 0.5) * 0.04

for (let i = 0; i < this.ringCount; i++) {
  ring.phase += delta * waveSpeed * spawnRate / this.ringCount * (1 + frameJitter)
}
```

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `LivingCore.js` | Добавить jitter в phase increment |
| `PulseWaves.js` | Добавить jitter в ring.phase |
| `ParticleSystem.js` | Добавить jitter в breath phase |

---

## Layer 3: Micro-Pauses

### Концепция

Случайные короткие "задержки дыхания". Создаёт ощущение, что сфера прислушивается или думает.

### Параметры

```javascript
const PAUSE_CONFIG = {
  probability: 0.0008,  // ~1 раз в 20 сек при 60fps
  durationMin: 0.2,     // 200ms минимум
  durationMax: 0.6,     // 600ms максимум
  recoveryEase: true    // Плавный выход из паузы
}
```

### Реализация

**LivingCore.js:**
```javascript
// В constructor:
this.breathPause = {
  active: false,
  remaining: 0,
  probability: 0.0008
}

// В update():
// Проверка на начало паузы
if (!this.breathPause.active && Math.random() < this.breathPause.probability) {
  this.breathPause.active = true
  this.breathPause.remaining = 0.2 + Math.random() * 0.4
}

// Обработка паузы
if (this.breathPause.active) {
  this.breathPause.remaining -= delta
  if (this.breathPause.remaining <= 0) {
    this.breathPause.active = false
  }
  // Во время паузы — не обновляем phase (или очень медленно)
  return
}
```

### Альтернатива: Soft Pause

Вместо полной остановки — замедление в 10 раз:

```javascript
if (this.breathPause.active) {
  this.breathPause.remaining -= delta
  if (this.breathPause.remaining <= 0) {
    this.breathPause.active = false
  }
  // Замедляем вместо полной остановки
  delta *= 0.1
}
```

### Файлы для изменения

| Файл | Изменение |
|------|-----------|
| `LivingCore.js` | Добавить pause logic |
| `ParticleSystem.js` | Добавить pause в breath cycle |

---

## Интеграция: BioticNoise utility

Для избежания дублирования кода — вынести в утилиту:

**src/utils/BioticNoise.js:**
```javascript
/**
 * BioticNoise — Organic rhythm variations
 *
 * Adds life-like imperfections to periodic systems
 */
export class BioticNoise {
  constructor(config = {}) {
    // Drift config
    this.driftSpeed = config.driftSpeed ?? 0.1
    this.driftAmount = config.driftAmount ?? 0.08
    this.driftOffset = config.driftOffset ?? Math.random() * Math.PI * 2

    // Jitter config (pre-doubled for performance)
    this.jitterAmount = (config.jitterAmount ?? 0.04) * 2

    // Pause config (timer-based for predictable intervals)
    this.pauseInterval = config.pauseInterval ?? 20      // Base interval in seconds
    this.pauseVariance = config.pauseVariance ?? 5       // ±variance
    this.pauseDurationMin = config.pauseDurationMin ?? 0.2
    this.pauseDurationMax = config.pauseDurationMax ?? 0.6

    // Injectable RNG for testing
    this.rng = config.rng ?? Math.random

    // State
    this.pauseActive = false
    this.pauseRemaining = 0
    this.frameJitter = 0
    this.timeSinceLastPause = 0
    this.nextPauseAt = this._randomNextPause()
  }

  /**
   * Calculate next pause time with variance
   * @private
   */
  _randomNextPause() {
    return this.pauseInterval + (this.rng() - 0.5) * this.pauseVariance * 2
  }

  /**
   * Call once per frame to update internal state
   * @param {number} delta - Frame delta time in seconds
   */
  updateFrame(delta) {
    // Validate delta
    if (delta < 0 || delta > 1) {
      return
    }

    // Update jitter for this frame
    this.frameJitter = (this.rng() - 0.5) * this.jitterAmount

    // Timer-based pause trigger (instead of probability)
    this.timeSinceLastPause += delta

    if (!this.pauseActive && this.timeSinceLastPause >= this.nextPauseAt) {
      this.pauseActive = true
      this.pauseRemaining = this.pauseDurationMin +
        this.rng() * (this.pauseDurationMax - this.pauseDurationMin)
      this.timeSinceLastPause = 0
      this.nextPauseAt = this._randomNextPause()
    }

    // Update pause timer
    if (this.pauseActive) {
      this.pauseRemaining -= delta
      if (this.pauseRemaining <= 0) {
        this.pauseActive = false
      }
    }
  }

  /**
   * Get drift multiplier (slow, sinusoidal)
   * @param {number} elapsed - Total elapsed time
   * @returns {number} Multiplier ~0.92-1.08
   */
  getDrift(elapsed) {
    const clampedElapsed = Math.min(elapsed, 10000)  // Prevent extreme values
    return 1 + Math.sin(clampedElapsed * this.driftSpeed + this.driftOffset) * this.driftAmount
  }

  /**
   * Get jitter multiplier (fast, random)
   * @returns {number} Multiplier ~0.96-1.04
   */
  getJitter() {
    return 1 + this.frameJitter
  }

  /**
   * Get combined frequency multiplier (drift + jitter)
   * @param {number} elapsed - Total elapsed time
   * @returns {number} Combined multiplier
   */
  getFrequencyMultiplier(elapsed) {
    return this.getDrift(elapsed) * this.getJitter()
  }

  /**
   * Check if phase should be updated this frame
   * @returns {boolean} false during pause
   */
  shouldUpdatePhase() {
    return !this.pauseActive
  }

  /**
   * Check if currently in pause state
   * @returns {boolean}
   */
  isPaused() {
    return this.pauseActive
  }

  /**
   * Reset all state (use when changing scenes/emotions)
   */
  reset() {
    this.pauseActive = false
    this.pauseRemaining = 0
    this.frameJitter = 0
    this.timeSinceLastPause = 0
    this.nextPauseAt = this._randomNextPause()
  }
}
```

### Использование в системах

**LivingCore.js:**
```javascript
import { BioticNoise } from './utils/BioticNoise.js'

// В constructor:
this.bioticNoise = {
  inner: new BioticNoise({ driftOffset: 0, pauseInterval: 20 }),
  pulse: new BioticNoise({ driftOffset: 2.1, pauseInterval: 25 })  // Разные интервалы для декорреляции
}

// В update():
for (const [name, cfg] of Object.entries(this.layers)) {
  const noise = this.bioticNoise[name]
  noise.updateFrame(delta)

  // Пропускаем обновление фазы во время паузы
  if (noise.shouldUpdatePhase()) {
    const effectiveFreq = cfg.freq * noise.getFrequencyMultiplier(elapsed)
    cfg.phase += delta * effectiveFreq
  }
}
```

**PulseWaves.js:**
```javascript
import { BioticNoise } from './utils/BioticNoise.js'

// В constructor:
this.bioticNoise = new BioticNoise({ driftOffset: 4.2, pauseInterval: 30 })

// В update():
this.bioticNoise.updateFrame(delta)

if (this.bioticNoise.shouldUpdatePhase()) {
  const freqMult = this.bioticNoise.getFrequencyMultiplier(time)
  const waveSpeed = (0.3 + this.intensity * 0.7) * freqMult
  // ... ring update logic
}
```

---

## Интеграция с эмоциями

### Когда вызывать reset()

| Событие | Действие | Причина |
|---------|----------|---------|
| Смена эмоции (calm→angry) | **НЕ вызывать** reset() | Органическая непрерывность — noise продолжает свой цикл |
| Hard reset сферы | Вызывать reset() | Полный сброс состояния |
| Переход в sleep mode | Вызывать reset() | При "пробуждении" — свежий старт |
| Tab visibility change | НЕ вызывать reset() | Delta validation уже обрабатывает |

### Рекомендация

BioticNoise работает независимо от эмоционального состояния. Это создаёт ощущение "она дышит всегда", даже когда меняется настроение. Эмоции влияют на amplitude и цвет, но не на микро-вариативность ритмов.

```javascript
// В Sphere.js при смене эмоции:
setEmotion(newEmotion) {
  this.emotion = newEmotion
  // НЕ вызываем bioticNoise.reset() — пусть продолжает
}

// При hard reset:
resetSphere() {
  this.livingCore.bioticNoise.inner.reset()
  this.livingCore.bioticNoise.pulse.reset()
  this.pulseWaves.bioticNoise.reset()
}
```

---

## План имплементации

### Этап 1: BioticNoise utility
1. Создать `src/utils/BioticNoise.js`
2. Unit тесты (обязательно):
   - `getDrift()` возвращает значения в диапазоне ~0.92-1.08
   - `getJitter()` возвращает значения в диапазоне ~0.98-1.02
   - Pause срабатывает после ~pauseInterval секунд (±variance)
   - `reset()` сбрасывает все таймеры
   - Injectable RNG даёт детерминированные результаты
   - Delta validation: отрицательный и >1 игнорируются

### Этап 2: LivingCore integration
1. Импортировать BioticNoise
2. Создать экземпляры для inner/pulse
3. Интегрировать в update()
4. Визуальное тестирование

### Этап 3: PulseWaves integration
1. Импортировать BioticNoise
2. Создать экземпляр
3. Интегрировать в update()
4. Визуальное тестирование

### Этап 4: ParticleSystem integration (опционально)
1. Добавить drift/jitter в uBreathPhase
2. Тестирование на mobile

### Этап 5: Fine-tuning
1. Подобрать оптимальные значения параметров
2. Тестирование "она живая?" на разных устройствах

---

## Параметры для тюнинга

| Параметр | Значение | Диапазон | Эффект |
|----------|----------|----------|--------|
| `driftSpeed` | 0.1 | 0.05-0.2 | Скорость плавания частоты |
| `driftAmount` | 0.08 | 0.05-0.15 | Амплитуда плавания |
| `jitterAmount` | 0.04 | 0.02-0.08 | Микро-вариации |
| `pauseInterval` | 20 | 15-30 | Базовый интервал между паузами (сек) |
| `pauseVariance` | 5 | 3-10 | Разброс интервала ± (сек) |
| `pauseDurationMin` | 0.2 | 0.1-0.3 | Минимальная пауза |
| `pauseDurationMax` | 0.6 | 0.4-1.0 | Максимальная пауза |

---

## Риски и митигация

| Риск | Вероятность | Митигация |
|------|-------------|-----------|
| Слишком заметные вариации | Средняя | Уменьшить driftAmount/jitterAmount |
| Паузы выглядят как баг | Низкая | Добавить soft pause вместо hard stop |
| Performance impact | Низкая | Math.random() и Math.sin() — O(1), negligible |
| Конфликт с существующей логикой | Низкая | BioticNoise — чистая утилита без side effects |

---

## Критерии успеха

1. **Эмоциональный тест:** Смотришь 30 сек — "она живая?" → Да
2. **Технический тест:** Нет visible jank на mobile
3. **A/B тест:** С BioticNoise vs без — заметна разница

---

## Отклонённые альтернативы

### NervousSystem Architecture (Event Bus + Blackboard)
**Причина отклонения:** Over-engineering, GC pressure, latency в визуальных эффектах. Архитектурное ревью показало, что проблема решается проще.

### LifeCoordinator Pattern
**Причина отклонения:** Решает cross-talk, но не решает проблему "идеальных синусоид". Корневая причина — не отсутствие связей, а механичность самих ритмов.

---

## Ссылки

- `src/LivingCore.js` — основной файл для интеграции
- `src/PulseWaves.js` — второй файл для интеграции
- `src/ParticleSystem.js` — опциональная интеграция
- `docs/IMPLEMENTATION_ORGANIC_LIFE.md` — философия "живости"

---

## Результаты ревью (2026-01-15)

**Статус:** APPROVED с исправлениями
**Reviewer:** Architect Agent

### Исправления применены

| # | Проблема | Решение | Статус |
|---|----------|---------|--------|
| 1 | Фаза продолжала расти во время паузы | `shouldUpdatePhase()` вместо `getDeltaMultiplier()` | ✅ |
| 2 | Probability-based pause — высокая дисперсия | Timer-based: `pauseInterval` + `pauseVariance` | ✅ |
| 3 | Нет валидации delta | Добавлена проверка `delta < 0 \|\| delta > 1` | ✅ |
| 4 | Недетерминированность для тестов | Injectable `rng` через config | ✅ |
| 5 | Нет способа сбросить состояние | Добавлен метод `reset()` | ✅ |
| 6 | Микрооптимизация jitterAmount | Pre-doubled в конструкторе | ✅ |
| 7 | timeSinceLastPause накапливался во время паузы | Счётчик работает только когда !pauseActive | ✅ |

### Оценки

| Критерий | Оценка | Комментарий |
|----------|--------|-------------|
| API Design | 7→8/10 | После упрощения pause API |
| Performance | 8/10 | Нет GC pressure, O(1) операции |
| Correctness | 6→9/10 | После исправления pause logic |
| Testability | 7→9/10 | После добавления injectable RNG |
| Overall | **APPROVED** | Соответствует KISS/YAGNI |
