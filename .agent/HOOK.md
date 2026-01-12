# 🔴 HOOK: Sample Sound System

## Molecules

### M1: Infrastructure ✅
- [x] Создать `/public/audio/`
- [x] Добавить feature flag в main.js
- [x] Mute SonicOrganism
**Files:** 2 (main.js, folder)
**Commit:** `M1: sample sound infrastructure` ✅

### M2: Sample File ✅
- [x] Найти на Freesound ambient pad
- [x] Скачать в `/public/audio/foundation.mp3`
**Files:** 1 (audio file)
**Commit:** `M2: add foundation sample` ✅

### M3: Basic Player ✅
- [x] Создать `SampleSoundSystem.js`
- [x] constructor(audioContext)
- [x] loadSamples() — fetch + decode
- [x] _playLoop(buffer)
**Files:** 1 (SampleSoundSystem.js)
**Commit:** `M3: SampleSoundSystem basic player` ✅

### M4: Touch Integration ✅
- [x] update(state) — play/stop по touch
- [x] Fade in/out (100ms ramp)
- [x] Подключить в main.js
**Files:** 2 (SampleSoundSystem.js, main.js)
**Commit:** `M4: touch triggers sample playback` ✅

### 🔴 CHECKPOINT: MVP Test
> Звучит лучше bee buzz? Если нет → M2 (другой сэмпл)

### M5: Dynamics ⚪
- [ ] Gain от proximity
- [ ] Filter от trust (lowpass)
**Files:** 1 (SampleSoundSystem.js)
**Commit:** `M5: proximity/trust modulation`

### M6: Glass Layer ⚪
- [ ] Найти glass сэмпл
- [ ] Второй источник в SampleSoundSystem
- [ ] Gain от touchIntensity
**Files:** 2 (audio file, SampleSoundSystem.js)
**Commit:** `M6: glass resonance layer`

### M7: Breath LFO ⚪
- [ ] LFO oscillator (0.2Hz)
- [ ] Модуляция master gain
**Files:** 1 (SampleSoundSystem.js)
**Commit:** `M7: breath modulation`

### M8: Reverb Tail ⚪
- [ ] Delay-based reverb или IR
- [ ] Wet от holdDuration
**Files:** 1-2 (SampleSoundSystem.js, [reverb_ir.wav])
**Commit:** `M8: reverb tail on release`

### M9: Cleanup ⚪
- [ ] Убрать feature flag
- [ ] Архивировать SonicOrganism.js
- [ ] Обновить debug команды
**Files:** 2-3
**Commit:** `M9: cleanup old oscillator system`

---

## Status
- Current: CHECKPOINT (MVP Test) 🔴
- Done: M1, M2, M3, M4
- Blocked: —
