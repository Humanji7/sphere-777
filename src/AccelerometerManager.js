/**
 * AccelerometerManager — Motion-based interaction
 * Detects shake, tilt, jolt for sphere reactions
 *
 * Reactions:
 * - Tilt → particles drift, eye follows, core shifts
 * - Shake → emotion (alert/tension), chaotic particles
 * - Jolt → startle reaction
 */

export class AccelerometerManager {
    constructor(options = {}) {
        this.onMotionEvent = options.onMotionEvent || null

        // State
        this.enabled = false
        this.hasPermission = false
        this.isSupported = this._checkSupport()

        // Thresholds (tunable)
        this.T = {
            SHAKE_THRESHOLD: 15,      // m/s² acceleration for shake
            SHAKE_MIN_COUNT: 3,       // detections within window
            SHAKE_WINDOW: 500,        // ms
            SHAKE_COOLDOWN: 2000,     // ms between shake events
            JOLT_THRESHOLD: 25,       // m/s² sudden spike
            TILT_DEADZONE: 5,         // degrees — ignore small tilts
            TILT_MAX: 45,             // degrees — clamp max tilt
        }

        // Motion state
        this.tilt = { x: 0, y: 0 }              // normalized -1..1
        this.tiltRaw = { x: 0, y: 0 }           // raw degrees
        this.acceleration = { x: 0, y: 0, z: 0 }
        this.gravityOffset = { x: 0, y: 0 }     // for particle drift

        // Shake detection
        this.shakeHistory = []
        this.isShaking = false
        this.lastShakeEvent = 0

        // Smoothing
        this._smoothTilt = { x: 0, y: 0 }

        // Bind handlers
        this._onDeviceMotion = this._onDeviceMotion.bind(this)
        this._onDeviceOrientation = this._onDeviceOrientation.bind(this)
    }

    /**
     * Check if device supports motion APIs
     */
    _checkSupport() {
        return 'DeviceMotionEvent' in window || 'DeviceOrientationEvent' in window
    }

    /**
     * Request permission (required for iOS 13+)
     * Must be called from user gesture (click/tap)
     */
    async requestPermission() {
        if (!this.isSupported) {
            console.warn('[Accelerometer] Not supported on this device')
            return false
        }

        // iOS 13+ requires explicit permission
        if (typeof DeviceMotionEvent !== 'undefined' &&
            typeof DeviceMotionEvent.requestPermission === 'function') {
            try {
                const permission = await DeviceMotionEvent.requestPermission()
                this.hasPermission = permission === 'granted'
                console.log('[Accelerometer] Permission:', permission)
            } catch (e) {
                console.error('[Accelerometer] Permission error:', e)
                this.hasPermission = false
            }
        } else {
            // Android or older iOS — no permission needed
            this.hasPermission = true
        }

        return this.hasPermission
    }

    /**
     * Enable motion tracking
     */
    enable() {
        if (!this.hasPermission) {
            console.warn('[Accelerometer] No permission, call requestPermission() first')
            return false
        }

        if (this.enabled) return true

        window.addEventListener('devicemotion', this._onDeviceMotion)
        window.addEventListener('deviceorientation', this._onDeviceOrientation)
        this.enabled = true
        console.log('[Accelerometer] Enabled')
        return true
    }

    /**
     * Disable motion tracking
     */
    disable() {
        if (!this.enabled) return

        window.removeEventListener('devicemotion', this._onDeviceMotion)
        window.removeEventListener('deviceorientation', this._onDeviceOrientation)
        this.enabled = false

        // Reset state
        this.tilt = { x: 0, y: 0 }
        this.gravityOffset = { x: 0, y: 0 }
        this.isShaking = false

        console.log('[Accelerometer] Disabled')
    }

    /**
     * Handle device motion events (acceleration)
     */
    _onDeviceMotion(e) {
        const acc = e.accelerationIncludingGravity
        if (!acc) return

        this.acceleration = {
            x: acc.x || 0,
            y: acc.y || 0,
            z: acc.z || 0
        }

        // Calculate magnitude (excluding gravity ~9.8)
        const magnitude = Math.sqrt(
            acc.x * acc.x +
            acc.y * acc.y +
            acc.z * acc.z
        )

        // Shake detection
        if (magnitude > this.T.SHAKE_THRESHOLD) {
            this._recordShake(magnitude)
        } else {
            // Decay shake state
            if (this.isShaking && this.shakeHistory.length === 0) {
                this.isShaking = false
                this._emitEvent('shake_end')
            }
        }

        // Jolt detection (sudden spike)
        if (magnitude > this.T.JOLT_THRESHOLD) {
            this._emitEvent('jolt', magnitude)
        }
    }

    /**
     * Handle device orientation events (tilt)
     */
    _onDeviceOrientation(e) {
        // beta: front-back tilt (-180 to 180), 0 = flat
        // gamma: left-right tilt (-90 to 90), 0 = flat
        const beta = e.beta || 0
        const gamma = e.gamma || 0

        this.tiltRaw = { x: gamma, y: beta }

        // Apply deadzone
        const applyDeadzone = (val, deadzone) => {
            if (Math.abs(val) < deadzone) return 0
            return val - Math.sign(val) * deadzone
        }

        const tiltX = applyDeadzone(gamma, this.T.TILT_DEADZONE)
        const tiltY = applyDeadzone(beta, this.T.TILT_DEADZONE)

        // Normalize to -1..1 with max clamp
        const maxTilt = this.T.TILT_MAX - this.T.TILT_DEADZONE
        const normalizedX = Math.max(-1, Math.min(1, tiltX / maxTilt))
        const normalizedY = Math.max(-1, Math.min(1, tiltY / maxTilt))

        // Smooth tilt (prevent jitter)
        const smoothFactor = 0.15
        this._smoothTilt.x += (normalizedX - this._smoothTilt.x) * smoothFactor
        this._smoothTilt.y += (normalizedY - this._smoothTilt.y) * smoothFactor

        this.tilt = {
            x: this._smoothTilt.x,
            y: this._smoothTilt.y
        }

        // Calculate gravity offset for particle drift
        // Stronger tilt = stronger drift
        this.gravityOffset = {
            x: this.tilt.x * 0.5,   // scale factor for visual effect
            y: -this.tilt.y * 0.3   // inverted Y, less vertical effect
        }
    }

    /**
     * Record shake detection
     */
    _recordShake(magnitude) {
        const now = Date.now()
        this.shakeHistory.push(now)

        // Clean old entries
        this.shakeHistory = this.shakeHistory.filter(
            t => now - t < this.T.SHAKE_WINDOW
        )

        // Detect sustained shake
        if (this.shakeHistory.length >= this.T.SHAKE_MIN_COUNT) {
            // Check cooldown
            if (now - this.lastShakeEvent > this.T.SHAKE_COOLDOWN) {
                if (!this.isShaking) {
                    this.isShaking = true
                    this.lastShakeEvent = now
                    this._emitEvent('shake', magnitude)
                }
            }
        }
    }

    /**
     * Emit motion event to callback
     */
    _emitEvent(type, value = null) {
        if (this.onMotionEvent) {
            this.onMotionEvent({
                type,
                value,
                tilt: { ...this.tilt },
                timestamp: Date.now()
            })
        }
    }

    /**
     * Get current motion state
     * Called by Sphere.update() for continuous effects
     */
    getState() {
        return {
            enabled: this.enabled,
            tilt: { ...this.tilt },
            tiltRaw: { ...this.tiltRaw },
            gravityOffset: { ...this.gravityOffset },
            acceleration: { ...this.acceleration },
            isShaking: this.isShaking
        }
    }

    /**
     * Check if motion is available and enabled
     */
    isActive() {
        return this.enabled && this.hasPermission
    }

    dispose() {
        this.disable()
    }
}
