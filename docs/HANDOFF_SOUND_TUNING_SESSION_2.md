# HANDOFF: Sound System Tuning — Session 2
**Дата:** 2026-01-11 23:31  
**Статус:** 🟡 Требуется дотюнинг

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

## 📋 Next Session TODO

- [ ] Implement tuning Set A (220Hz)
- [ ] A/B test: с/без detune
- [ ] Проверить: формант Q слишком высокий?
- [ ] Записать: exact параметры которые работают

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
