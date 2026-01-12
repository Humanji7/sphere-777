# HANDOFF: Sound System Tuning — Session 2
**Дата:** 2026-01-12 01:17  
**Статус:** ✅ Завершено

---

## ✅ Что сделано (Session 2)

### Phase C: Sub-Bass + Reverb (только что)
- ✅ **L10 Sub-Bass** — 82.5Hz sine @ -15dB (octave below 165Hz fundamental)
  - Direct to master (non-directional, bypasses HRTF panner)
- ✅ **L11 Reverb** — Delay-based room simulation
  - Pre-delay: 20ms
  - Delay time: 80ms (early reflections)
  - Feedback: 0.3 (short tail)
  - High-cut: 2kHz (no mud)
  - Wet/Dry: 15%

### Архитектура L1→L11:
```
L1  Spectral Body ────► spatialPanner ─┬─► masterGain ─► destination
                                       │
                                       └─► reverb chain ─► masterGain
                                       
L1.5 Breath Noise ─────────────────────────► masterGain

L10 Sub-Bass (82.5Hz) ─────────────────────► masterGain
```

---

## ✅ Что сделано (Session 1)

### Phase A: Kill the Drone
- ✅ Fundamental 55→110Hz
- ✅ Graduated detune (±18 cents low, ±10 mid, ±4 high)
- ✅ Breath Noise layer (asymmetric envelope 0.3s/0.8s)
- ✅ HRTF Spatial audio

### Phase B: Formant Voice
- ✅ 5-band vowel filters ([a], [o], [i], [ɪ])
- ✅ Micro-vibrato (6Hz, ±5Hz depth)
- ✅ Emotional morphing (trust/tension/hold)

---

## 🐝 Проблема: "Жужжит как пчела"

**Симптом:** После поднятия частоты с 55Hz → 110Hz звук стал слышен, но появился "buzz" эффект.

### Possible Root Causes

| Причина | Вероятность | Как проверить |
|---------|-------------|---------------|
| **110Hz все еще слишком низко** | 🔴 Высокая | Поднять до 220Hz (A3) |
| **Graduated detune слишком агрессивный** | 🟡 Средняя | Уменьшить ±18 → ±8 cents |
| **Breath noise muddy** | 🟢 Низкая | Поднять bandpass 400-1200Hz |
| **Formant filters резонируют** | 🟡 Средняя | Уменьшить Q value |
| **Master gain слишком громкий** | 🟢 Низкая | Общая громкость |

---

## 🎛️ Tuning Parameters для экспериментов

### Set A: Higher Fundamental (Рекомендуется)
```javascript
// SonicOrganism.js:60
const FUNDAMENTAL = 220  // A3 вместо 110 (A2)
```
**Почему:** 220Hz = четкая нота, без "drone" ощущения

---

### Set B: Softer Detune
```javascript
// SonicOrganism.js:127
// Было: 18-10-4
// Стало:
const detuneCents = n <= 2 ? 8 : n <= 8 ? 5 : 2
```
**Почему:** Меньше beating frequency → меньше "buzz"

---

### Set C: Cleaner Breath Filter
```javascript
// SonicOrganism.js:328 (_initBreathNoise)
this.breathFilter.frequency.value = 800  // вместо 400
// Bandpass range: 600-1200Hz вместо 200-800Hz
```
**Почему:** Выше по спектру = меньше muddy low-end

---

### Set D: Gentler Formants
```javascript
// SonicOrganism.js:479 (_initFormantVoice)
filter.Q.value = 5 + i * 2  // вместо 10 + i * 5
```
**Почему:** Ниже Q = шире полоса = мягче резонансы

---

### Set E: Lower Master Gain
```javascript
// SonicOrganism.js:26
this.masterGain.gain.value = 0.08  // вместо 0.15
```
**Почему:** Общая громкость может создавать перегруз

---

## 🔬 Debugging Strategy

### Step 1: Isolate Layers (найти виновника)
Закомментировать все слои кроме одного:

```javascript
// В update():
// this._updateBreathNoise(pulses.breath, elapsed)  // выключить
// this._updateFormantVoice({...})                  // выключить
```

Проверить порядок:
1. Только Spectral Body (L1)
2. + Breath Noise (L1.5)
3. + Formant Voice (L4)

**Где жужжит?** → Там и проблема.

---

### Step 2: Quick Wins (пробуем по порядку)

#### Win #1: Поднять фундамент 220Hz
```bash
# SonicOrganism.js:60
FUNDAMENTAL = 220
```
Сохранить, обновить браузер. Жужжит меньше? → Оставить.

#### Win #2: Разредить detune
```bash
# SonicOrganism.js:127
detuneCents = n <= 2 ? 8 : n <= 8 ? 5 : 2
```

#### Win #3: Убрать formant на время
```bash
# SonicOrganism.js:47
// this._initFormantVoice()  // закомментировать
```

---

## 🎯 Recommended Action Plan

### Minimal (1 change)
- **220Hz fundamental** — самое вероятное решение

### Medium (2-3 changes)
- 220Hz fundamental
- Softer detune (8-5-2)
- Lower formant Q (5 вместо 10)

### Full Reset (если все плохо)
- 220Hz fundamental
- Detune = 0 (без детюна вообще, пока не найдем sweet spot)
- Breath noise OFF
- Formant voice OFF
→ Добавлять по одному слою, слушая где появляется buzz

---

## 📋 Debug Session Protocol

### Quick Start: Open Browser Console (F12 → Console)

**Step 0: Click to start (activates audio)**

**Step 1: Isolate L1 only (spectral body = 110Hz + detune)**
```javascript
isolateSound('spectral')
// Listen. Does it buzz? → L1 is the problem (detune too aggressive)
```

**Step 2: Add L1.5 (breath noise)**
```javascript
setSound('breathNoise', true)
// Listen. More buzz? → Breath noise adds to problem
```

**Step 3: Add L4 (formant voice)**
```javascript
setSound('formantVoice', true)
// Listen. Even more buzz? → Formant Q too high
```

**Step 4: Enable all and compare**
```javascript
isolateSound()  // All layers ON
```

### Available Commands
| Command | Effect |
|---------|--------|
| `isolateSound('spectral')` | Only L1 (harmonics) |
| `isolateSound('breathNoise')` | Only L1.5 (breath) |
| `isolateSound('formantVoice')` | Only L4 (vowels) |
| `isolateSound()` | Enable ALL layers |
| `setSound('breathNoise', false)` | Disable only breath |
| `setSound('formantVoice', false)` | Disable only formant |

### Expected Results Matrix

| Layer | Sound Character | If Buzz Here |
|-------|-----------------|--------------|
| L1 only | Synthetic choir, soft beating | ↑ detune too aggressive (18c→8c) |
| L1+L1.5 | + airy breath | Check bandpass freq (400→800Hz) |
| L1+L4 | + vowel resonance | ↓ formant Q (10→5) |
| All | Full organic | Track which combo adds buzz |

---

## 🧑‍🎨 Sound Design Notes

> **Философия:** "Bee buzz" = биения слишком быстрые для расслабления.  
> Цель: тёплый, глубокий тон, не пронзительный.

**Референс:** Тибетские поющие чаши — fundamental + мягкие обертоны, без резких биений.

---

## 📎 Files Modified (Session 1)

- `src/SonicOrganism.js` 
  - Lines 60, 127-130 (fundamental + detune)
  - Lines 310-383 (breath noise)
  - Lines 385-445 (spatial field)
  - Lines 452-640 (formant voice)

---

## 🎤 User Feedback

> "жужжит как пчела"

**Действие:** Попробовать 220Hz + softer detune первым делом.
