# AccelerometerManager Design Spec

**Date:** 2026-01-14

---

## Overview

Новый модуль `AccelerometerManager` добавляет motion-based interaction со сферой через акселерометр/гироскоп телефона.

---

## Motion → Reaction Mapping

### Scope: ВСЯ СФЕРА реагирует на акселерометр

| Motion Type | Detection | Reaction |
|-------------|-----------|----------|
| **Shake** | acceleration > 15 m/s², chaotic | **Emotion:** alert → tension (0.9, decay 1.5)<br>**Particles:** хаотичное смещение<br>**Eye:** дёргается в испуге<br>**Core:** пульс ускоряется |
| **Gentle Tilt** | angle < 15° | **Particles:** лёгкое смещение к наклону<br>**Eye:** плавно следит<br>**Core:** минимальный offset |
| **Strong Tilt** | angle > 30° | **Particles:** заметно "стекают"<br>**Eye:** явно смотрит в сторону<br>**Core:** смещение свечения |
| **Jolt** | spike > 25 m/s² | **Emotion:** alert (1.0, decay 2.0)<br>**Eye:** резкое расширение<br>**Particles:** импульс в направлении |

---

## API Design

```javascript
// AccelerometerManager.js

export class AccelerometerManager {
    constructor(options = {}) {
        this.onMotionEvent = options.onMotionEvent || null  // callback
        this.enabled = false
        this.hasPermission = false

        // Thresholds (tunable)
        this.T = {
            SHAKE_THRESHOLD: 15,      // m/s² acceleration magnitude
            SHAKE_MIN_COUNT: 3,       // detections within window
            SHAKE_WINDOW: 500,        // ms
            TILT_SIGNIFICANT: 30,     // degrees
            JOLT_THRESHOLD: 25,       // m/s² sudden spike
        }

        // State
        this.tilt = { x: 0, y: 0 }           // current tilt angles
        this.acceleration = { x: 0, y: 0, z: 0 }
        this.shakeHistory = []                // timestamps of shake detections
        this.isShaking = false
    }

    // Request permission (required for iOS 13+)
    async requestPermission() {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            const permission = await DeviceMotionEvent.requestPermission()
            this.hasPermission = permission === 'granted'
        } else {
            // Android or older iOS — no permission needed
            this.hasPermission = true
        }
        return this.hasPermission
    }

    enable() {
        if (!this.hasPermission) return false
        window.addEventListener('devicemotion', this._onDeviceMotion)
        window.addEventListener('deviceorientation', this._onDeviceOrientation)
        this.enabled = true
        return true
    }

    disable() {
        window.removeEventListener('devicemotion', this._onDeviceMotion)
        window.removeEventListener('deviceorientation', this._onDeviceOrientation)
        this.enabled = false
    }

    // Returns current motion state for Sphere.update()
    getState() {
        return {
            tilt: { ...this.tilt },
            acceleration: { ...this.acceleration },
            isShaking: this.isShaking,
            enabled: this.enabled
        }
    }

    _onDeviceMotion(e) {
        const acc = e.accelerationIncludingGravity
        this.acceleration = { x: acc.x, y: acc.y, z: acc.z }

        const magnitude = Math.sqrt(acc.x**2 + acc.y**2 + acc.z**2)

        // Shake detection
        if (magnitude > this.T.SHAKE_THRESHOLD) {
            this._recordShake()
        }

        // Jolt detection (sudden spike)
        if (magnitude > this.T.JOLT_THRESHOLD) {
            this._emitEvent('jolt', magnitude)
        }
    }

    _onDeviceOrientation(e) {
        // beta: front-back tilt (-180 to 180)
        // gamma: left-right tilt (-90 to 90)
        this.tilt = {
            x: e.gamma || 0,  // left-right
            y: e.beta || 0    // front-back
        }
    }

    _recordShake() {
        const now = Date.now()
        this.shakeHistory.push(now)

        // Clean old entries
        this.shakeHistory = this.shakeHistory.filter(
            t => now - t < this.T.SHAKE_WINDOW
        )

        // Detect sustained shake
        if (this.shakeHistory.length >= this.T.SHAKE_MIN_COUNT) {
            if (!this.isShaking) {
                this.isShaking = true
                this._emitEvent('shake_start')
            }
        }
    }

    _emitEvent(type, value = null) {
        if (this.onMotionEvent) {
            this.onMotionEvent({ type, value, timestamp: Date.now() })
        }
    }
}
```

---

## Integration Points

### 1. main.js — Initialization

```javascript
import { AccelerometerManager } from './AccelerometerManager.js'

// In App constructor
this.accelerometer = new AccelerometerManager({
    onMotionEvent: (e) => this._handleMotionEvent(e)
})

// Enable on first user interaction (for iOS permission)
async _enableMotion() {
    const granted = await this.accelerometer.requestPermission()
    if (granted) {
        this.accelerometer.enable()
    }
}

_handleMotionEvent(e) {
    switch (e.type) {
        case 'shake_start':
            this.sphere.applyMotionGesture('shake')
            break
        case 'jolt':
            this.sphere.applyMotionGesture('jolt', e.value)
            break
    }
}
```

### 2. Sphere.js — Motion Gesture Handler

```javascript
/**
 * Apply motion-based gesture (from accelerometer)
 * @param {string} gesture - shake | jolt | tilt
 * @param {number} value - intensity (optional)
 */
applyMotionGesture(gesture, value = 1) {
    switch (gesture) {
        case 'shake':
            // Shake → tension (agitated, stressed)
            this._setEmotion('alert', 0.9, 1.5)
            // Could escalate to 'trauma' if prolonged
            break
        case 'jolt':
            // Sudden drop → startle
            this._setEmotion('alert', 1.0, 2.0)
            break
    }
}
```

### 3. Settings — Enable/Disable Toggle

В SettingsModal добавить пункт "Motion" (ON/OFF), сохранять в localStorage.

---

## Tilt → Sphere Direction (Optional Enhancement)

```javascript
// In Sphere.update()
if (this.accelerometer?.enabled) {
    const { tilt } = this.accelerometer.getState()

    // Normalize tilt to -1..1 range
    const tiltX = Math.max(-1, Math.min(1, tilt.x / 45))
    const tiltY = Math.max(-1, Math.min(1, tilt.y / 45))

    // Influence sphere's "look" direction
    this.targetLookOffset = { x: tiltX * 0.3, y: tiltY * 0.3 }
}
```

---

## iOS Permission Flow

```
1. User opens Settings
2. User taps "Motion: Enable"
3. App calls DeviceMotionEvent.requestPermission()
4. iOS shows native permission dialog
5. If granted → enable accelerometer
6. If denied → show explanation, offer retry
```

---

## Testing

### Manual Testing
1. Open on mobile device
2. Enable motion in Settings
3. Shake phone → verify tension reaction
4. Drop phone (safely) → verify startle
5. Tilt phone → verify sphere follows (if implemented)

### Debug Panel
Add motion debug info to LFO Debug panel:
```
Motion: ON
Shake: 0 | Tilt: (12°, -5°)
```

---

## Implementation Order

1. **Phase 1: Core** (MVP)
   - [ ] Create AccelerometerManager.js
   - [ ] Shake detection
   - [ ] Integration with Sphere.applyMotionGesture()
   - [ ] iOS permission handling

2. **Phase 2: Settings**
   - [ ] Add Motion toggle to SettingsModal
   - [ ] localStorage persistence

3. **Phase 3: Tilt** (Optional)
   - [ ] Tilt → sphere look direction
   - [ ] Smooth interpolation

---

## Edge Cases

- **No accelerometer**: Check for API availability, disable feature gracefully
- **Background tab**: Disable when page hidden (save battery)
- **Permission denied**: Remember denial, don't re-prompt
- **Low battery**: Consider disabling to save power

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `src/AccelerometerManager.js` | **CREATE** |
| `src/main.js` | Add initialization, event handling |
| `src/Sphere.js` | Add `applyMotionGesture()` method |
| `src/ui/SettingsModal.js` | Add Motion toggle |
| `style.css` | (if debug UI needed) |

---

## Open Questions

1. Должен ли shake escalate в trauma при длительном встряхивании?
2. Нужен ли cooldown после shake (чтобы не спамить эмоцию)?
3. Как совмещать tilt с touch input? (touch priority?)
