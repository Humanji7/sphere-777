# L7 Glitch: Micro Audio Disruptions at Emotional Peaks

**Date**: 2026-01-13  
**Status**: ✅ Implemented & Verified

## Overview

Добавлен новый аудио-слой **L7 Glitch** в `SampleSoundSystem.js` — кратковременные цифровые сбои, которые активируются при эмоциональных пиках сферы, создавая ощущение "перегрузки системы".

## Implementation Details

### Audio Chain

```
Foundation.gain ──┬──► masterGain (clean path)
                  │
                  └──► glitchShaper ──► glitchGain ──► masterGain
                        (bitcrush)      (0-30% wet)
```

### Components

#### 1. Bitcrush WaveShaper
- **Method**: `_createBitcrushCurve(bits)`
- **Bit depth**: 8-bit (default)
- **Effect**: Снижение разрядности аудио для "цифрового" артефакта

#### 2. Activation Threshold
- **Trigger**: `tension > 0.6`
- **Tension calc**: `Math.max(colorProgress, holdSaturation * 0.8)`
- **Intensity mapping**: `(tension - 0.6) / 0.4` → 0-1 range

#### 3. Stutter Effect
- **Condition**: `glitchMix > 0.5` + 5% random chance per frame
- **Duration**: 20-50ms brief silences
- **Purpose**: Дополнительная "нестабильность" на высоком напряжении

### Code Changes

#### Constructor Additions (~line 173)
```javascript
// L7 GLITCH — Audio disruptions at emotional peaks
this.glitchShaper = this.audioContext.createWaveShaper()
this.glitchShaper.curve = this._createBitcrushCurve(8)  // 8-bit default

this.glitchGain = this.audioContext.createGain()
this.glitchGain.gain.value = 0  // starts silent

this.glitchMix = 0  // 0 = clean, 1 = full glitch
this.glitchEnabled = true
```

#### New Methods
1. **`_createBitcrushCurve(bits)`** — генерация WaveShaper curve
2. **`_startGlitch()`** — подключение parallel chain от Foundation
3. **`_modulateGlitch(state)`** — модуляция на основе эмоционального состояния
4. **`setGlitchEnabled(enabled)`** — debug API

#### Integration Points
- **`_startFoundation()`**: добавлен вызов `_startGlitch()`
- **`update()`**: добавлен вызов `_modulateGlitch(state)` при `isPlaying`
- **`dispose()`**: cleanup для `glitchShaper` и `glitchGain`

## Verification Results

### Browser Console Test
```javascript
// Instance found at app.sampleSound
window.app.sampleSound

// Test high tension (colorProgress = 0.95)
window.app.sampleSound._modulateGlitch({ colorProgress: 0.95 })

// Results:
// ✅ glitchEnabled: true
// ✅ glitchMix: 0.875 // correct: (0.95 - 0.6) / 0.4 = 0.875
// ✅ hasGlitchShaper: true
// ✅ hasGlitchGain: true
```

### Expected Behavior
1. **Calm state** (`colorProgress < 0.6`): Глитч молчит (`glitchMix = 0`)
2. **Rising tension** (`0.6 < colorProgress < 1.0`): Постепенное нарастание bitcrush
3. **Peak tension** (`colorProgress > 0.8`): Глитч + stutter на 30% wet mix

## Debug API

```javascript
// Toggle glitch on/off
window.app.sampleSound.setGlitchEnabled(false)

// Force high tension test
window.app.sampleSound._modulateGlitch({ colorProgress: 0.9 })

// Force holdSaturation test
window.app.sampleSound._modulateGlitch({ holdSaturation: 0.85 })
```

## Files Modified

- [`src/SampleSoundSystem.js`](file:///Users/admin/projects/sphere-777/src/SampleSoundSystem.js) — ядро реализации L7 Glitch

## Next Steps

Возможные расширения:
- **Variable bit depth**: Динамическое изменение `bits` параметра в зависимости от интенсивности
- **Frequency glitch**: Добавить `±15%` pitch fluctuations (упомянуто в плане, но не реализовано)
- **Sample rate reduction**: Дополнительный эффект через `AudioContext.sampleRate` симуляция

## Philosophy

> "Glitch as emotional overflow — the sphere's voice distorts when experience exceeds its processing capacity."

L7 Glitch превращает эмоциональное напряжение в техническую нестабильность, создавая метафору "перегрузки" живой системы.
