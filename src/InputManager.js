/**
 * InputManager - Unified mouse/touch input handling
 * Tracks position, velocity, gesture recognition, and idle state
 * 
 * Gesture Types:
 * - 'idle': No movement
 * - 'stroke': Slow, linear movement (petting)
 * - 'poke': Fast movement + sudden stop (tap)
 * - 'orbit': Circular movement around center
 * - 'tremble': Fast, chaotic movement
 * - 'moving': General movement (no specific gesture)
 */
export class InputManager {
    constructor(domElement) {
        this.domElement = domElement

        // Normalized position (-1 to 1)
        this.position = { x: 0, y: 0 }
        this.prevPosition = { x: 0, y: 0 }

        // Velocity tracking
        this.velocity = 0
        this.velocityHistory = []
        this.maxHistoryLength = 10

        // State timers
        this.idleTime = 0
        this.franticTime = 0

        // Thresholds
        this.IDLE_VELOCITY = 0.01
        this.FRANTIC_VELOCITY = 0.15
        this.IDLE_DURATION = 0.5  // seconds to consider idle
        this.FRANTIC_DURATION = 0.3  // seconds to consider frantic

        // Flags
        this.isActive = false
        this.isTouching = false

        // ═══════════════════════════════════════════════════════════
        // TOUCH PRESSURE & RADIUS (Mobile emotional intensity)
        // ═══════════════════════════════════════════════════════════
        this.touchRadius = 0       // Normalized contact area (0-1)
        this.touchPressure = 0     // iOS Force Touch (0-1)
        this.touchIntensity = 0    // Combined intensity modifier (0-1)

        // ═══════════════════════════════════════════════════════════
        // GESTURE RECOGNITION
        // ═══════════════════════════════════════════════════════════

        // Direction history for consistency calculation
        this.directionHistory = []  // {x, y}[] normalized direction vectors
        this.directionHistoryLength = 15  // ~250ms at 60fps

        // Smoothed direction vector
        this.smoothedDirection = { x: 0, y: 0 }

        // Directional consistency: 0 = chaos, 1 = perfectly linear
        this.directionalConsistency = 0

        // Angular velocity (radians per second, relative to screen center)
        this.angularVelocity = 0
        this.prevAngle = 0  // Previous angle from center

        // Gesture classification
        this.currentGesture = 'idle'

        // Poke detection: track if we just had high velocity
        this.recentHighVelocity = false
        this.highVelocityDecay = 0

        // Just stopped detection (for poke)
        this.justStopped = false
        this.wasMoving = false

        // Gesture thresholds (tunable via console)
        this.STROKE_MAX_VELOCITY = 0.15
        this.STROKE_MIN_CONSISTENCY = 0.7
        this.POKE_MIN_VELOCITY = 0.25
        this.ORBIT_MIN_ANGULAR = 1.5  // radians per second
        this.TREMBLE_MIN_VELOCITY = 0.18
        this.TREMBLE_MAX_CONSISTENCY = 0.35

        this._bindEvents()
    }

    _bindEvents() {
        // Mouse events
        this.domElement.addEventListener('mousemove', this._onMouseMove.bind(this))
        this.domElement.addEventListener('mouseenter', () => this.isActive = true)
        this.domElement.addEventListener('mouseleave', () => this.isActive = false)

        // Touch events
        this.domElement.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false })
        this.domElement.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false })
        this.domElement.addEventListener('touchend', this._onTouchEnd.bind(this))
        this.domElement.addEventListener('touchcancel', this._onTouchEnd.bind(this))
    }

    _normalizeCoords(clientX, clientY) {
        const rect = this.domElement.getBoundingClientRect()
        return {
            x: ((clientX - rect.left) / rect.width) * 2 - 1,
            y: -((clientY - rect.top) / rect.height) * 2 + 1
        }
    }

    _onMouseMove(e) {
        const coords = this._normalizeCoords(e.clientX, e.clientY)
        this.position.x = coords.x
        this.position.y = coords.y
        this.isActive = true
    }

    _onTouchStart(e) {
        e.preventDefault()
        // Only track primary touch (ignore multi-touch)
        if (e.touches.length !== 1) return

        this.isTouching = true
        this.isActive = true

        const touch = e.touches[0]
        const coords = this._normalizeCoords(touch.clientX, touch.clientY)
        this.position.x = coords.x
        this.position.y = coords.y

        // Capture touch radius/pressure
        this._updateTouchMetrics(touch)
    }

    _onTouchMove(e) {
        e.preventDefault()
        // Only track primary touch
        if (e.touches.length !== 1) return

        const touch = e.touches[0]
        const coords = this._normalizeCoords(touch.clientX, touch.clientY)
        this.position.x = coords.x
        this.position.y = coords.y

        // Update touch radius/pressure
        this._updateTouchMetrics(touch)
    }

    /**
     * Extract touch radius and pressure as emotional intensity modifiers
     * @param {Touch} touch - The Touch object from the event
     */
    _updateTouchMetrics(touch) {
        // radiusX/radiusY: contact ellipse (pixels, varies by device)
        // Normalize to ~0-1 range (50px = full finger)
        const avgRadius = ((touch.radiusX || 0) + (touch.radiusY || 0)) / 2
        this.touchRadius = Math.min(avgRadius / 50, 1)

        // force: iOS Force Touch / 3D Touch (0-1)
        this.touchPressure = touch.force || 0

        // Combined intensity: prefer force if available, otherwise use radius
        this.touchIntensity = this.touchPressure > 0
            ? this.touchPressure
            : this.touchRadius
    }

    _onTouchEnd() {
        this.isTouching = false
        // Decay touch metrics smoothly
        this.touchRadius = 0
        this.touchPressure = 0
        this.touchIntensity = 0
        // Keep isActive true for a bit after touch ends
    }

    update(delta) {
        // Calculate delta BEFORE updating prevPosition
        this.lastDelta = {
            x: this.position.x - this.prevPosition.x,
            y: this.position.y - this.prevPosition.y
        }

        // Calculate velocity
        const dx = this.lastDelta.x
        const dy = this.lastDelta.y
        const instantVelocity = Math.sqrt(dx * dx + dy * dy) / delta

        // Smooth velocity with history
        this.velocityHistory.push(instantVelocity)
        if (this.velocityHistory.length > this.maxHistoryLength) {
            this.velocityHistory.shift()
        }
        this.velocity = this.velocityHistory.reduce((a, b) => a + b, 0) / this.velocityHistory.length

        // Update idle/frantic timers
        if (this.velocity < this.IDLE_VELOCITY) {
            this.idleTime += delta
            this.franticTime = 0
        } else if (this.velocity > this.FRANTIC_VELOCITY) {
            this.franticTime += delta
            this.idleTime = 0
        } else {
            this.idleTime = 0
            this.franticTime = 0
        }

        // ═══════════════════════════════════════════════════════════
        // GESTURE RECOGNITION UPDATES
        // ═══════════════════════════════════════════════════════════

        // 1. Update direction history (for consistency calculation)
        const deltaMag = Math.sqrt(dx * dx + dy * dy)
        if (deltaMag > 0.001) {
            // Normalize direction
            const dir = { x: dx / deltaMag, y: dy / deltaMag }
            this.directionHistory.push(dir)
            if (this.directionHistory.length > this.directionHistoryLength) {
                this.directionHistory.shift()
            }

            // Update smoothed direction (exponential smoothing)
            const smoothFactor = 0.3
            this.smoothedDirection.x += (dir.x - this.smoothedDirection.x) * smoothFactor
            this.smoothedDirection.y += (dir.y - this.smoothedDirection.y) * smoothFactor
        }

        // 2. Calculate directional consistency
        this.directionalConsistency = this._calculateConsistency()

        // 3. Calculate angular velocity (for orbit detection)
        this._updateAngularVelocity(delta)

        // 4. Detect "just stopped" for poke detection
        const isCurrentlyMoving = this.velocity > this.IDLE_VELOCITY
        this.justStopped = this.wasMoving && !isCurrentlyMoving
        this.wasMoving = isCurrentlyMoving

        // Track recent high velocity (for poke detection)
        if (this.velocity > this.POKE_MIN_VELOCITY) {
            this.recentHighVelocity = true
            this.highVelocityDecay = 0.15  // 150ms window
        }
        if (this.highVelocityDecay > 0) {
            this.highVelocityDecay -= delta
            if (this.highVelocityDecay <= 0) {
                this.recentHighVelocity = false
            }
        }

        // 5. Classify gesture
        this.currentGesture = this._classifyGesture()

        // Store previous position AFTER calculating delta
        this.prevPosition.x = this.position.x
        this.prevPosition.y = this.position.y
    }

    /**
     * Calculate how consistent the movement direction is
     * @returns {number} 0-1, where 1 = perfectly linear movement
     */
    _calculateConsistency() {
        if (this.directionHistory.length < 3) return 0

        // Average all direction vectors
        let avgX = 0, avgY = 0
        for (const dir of this.directionHistory) {
            avgX += dir.x
            avgY += dir.y
        }
        avgX /= this.directionHistory.length
        avgY /= this.directionHistory.length

        // Magnitude of averaged vector = consistency
        // If all vectors point same way, mag ≈ 1
        // If vectors cancel out (chaos), mag ≈ 0
        return Math.sqrt(avgX * avgX + avgY * avgY)
    }

    /**
     * Calculate angular velocity around screen center
     * @param {number} delta - time delta in seconds
     */
    _updateAngularVelocity(delta) {
        // Current angle from center (0,0)
        const currentAngle = Math.atan2(this.position.y, this.position.x)

        // Calculate angular delta
        let angleDelta = currentAngle - this.prevAngle

        // Handle wrap-around (-π to π)
        if (angleDelta > Math.PI) angleDelta -= 2 * Math.PI
        if (angleDelta < -Math.PI) angleDelta += 2 * Math.PI

        // Angular velocity = angle change per second
        // Smooth it to avoid spikes
        const instantAngular = angleDelta / delta
        this.angularVelocity += (instantAngular - this.angularVelocity) * 0.2

        this.prevAngle = currentAngle
    }

    /**
     * Classify the current gesture based on metrics
     * @returns {string} gesture type
     */
    _classifyGesture() {
        const { velocity, directionalConsistency, angularVelocity } = this

        // Priority order matters!

        // 1. Idle - no movement
        if (velocity < this.IDLE_VELOCITY) return 'idle'

        // 2. Poke - fast movement followed by sudden stop
        if (this.justStopped && this.recentHighVelocity) return 'poke'

        // 3. Orbit - consistent circular motion
        if (Math.abs(angularVelocity) > this.ORBIT_MIN_ANGULAR && velocity > 0.05) return 'orbit'

        // 4. Tremble - fast and chaotic
        if (velocity > this.TREMBLE_MIN_VELOCITY && directionalConsistency < this.TREMBLE_MAX_CONSISTENCY) return 'tremble'

        // 5. Stroke - slow and linear (petting)
        if (velocity < this.STROKE_MAX_VELOCITY && directionalConsistency > this.STROKE_MIN_CONSISTENCY) return 'stroke'

        // 6. Default - general movement
        return 'moving'
    }

    getState() {
        return {
            // Position and movement
            position: { ...this.position },
            delta: this.lastDelta || { x: 0, y: 0 },
            velocity: this.velocity,

            // Timers
            idleTime: this.idleTime,
            franticTime: this.franticTime,

            // Boolean flags
            isIdle: this.idleTime > this.IDLE_DURATION,
            isFrantic: this.franticTime > this.FRANTIC_DURATION,
            isActive: this.isActive,
            justStopped: this.justStopped,
            isTouching: this.isTouching,

            // Gesture recognition
            direction: { ...this.smoothedDirection },
            directionalConsistency: this.directionalConsistency,
            angularVelocity: this.angularVelocity,
            gestureType: this.currentGesture,

            // Touch metrics (mobile emotional intensity)
            touchRadius: this.touchRadius,
            touchPressure: this.touchPressure,
            touchIntensity: this.touchIntensity
        }
    }

    dispose() {
        // Events will be garbage collected with the element
    }
}
