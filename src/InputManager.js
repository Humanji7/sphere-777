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
        // APPROACH SPEED & HOVER DURATION (Deep Interaction)
        // ═══════════════════════════════════════════════════════════
        this.approachSpeed = 0           // Rate of approach to center (negative = approaching)
        this.prevDistFromCenter = 1.0    // Previous distance from screen center
        this.hoverDuration = 0           // Time cursor has been relatively stationary
        this.hoverPosition = { x: 0, y: 0 }  // Position when hover started
        this.HOVER_THRESHOLD = 0.05      // Movement threshold to reset hover

        // ═══════════════════════════════════════════════════════════
        // STROKE ZONE TRACKING (for Warm Traces)
        // ═══════════════════════════════════════════════════════════
        this.strokeZoneDuration = 0           // Time stroke held in same area
        this.strokeZonePosition = { x: 0, y: 0 }  // Position where zone began
        this.strokeZoneRadius = 0.15          // Drift threshold before zone resets

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

        // ═══════════════════════════════════════════════════════════
        // HOLD DETECTION (for recognition / calming)
        // Hold = patient presence, requires intention
        // ═══════════════════════════════════════════════════════════
        this.holdStartTime = 0              // When hold started (ms)
        this.holdPosition = { x: 0, y: 0 }  // Where hold started
        this.isHolding = false              // Currently holding?
        this.holdDuration = 0               // How long held (seconds)
        this.HOLD_THRESHOLD = 0.5           // Seconds to activate hold
        this.HOLD_MAX_DRIFT = 0.08          // Max movement to keep hold valid

        // ═══════════════════════════════════════════════════════════
        // TAP DETECTION (short contact, "я тут")
        // ═══════════════════════════════════════════════════════════
        this.contactStartTime = 0           // When touch/click started
        this.justReleased = false           // True for 1 frame after release
        this.contactDuration = 0            // Last contact duration (seconds)
        this.TAP_MAX_DURATION = 0.3         // Max duration to count as tap
        this.TAP_MAX_VELOCITY = 0.1         // Max velocity for tap (not a flick)

        // ═══════════════════════════════════════════════════════════
        // FLICK DETECTION (fast exit)
        // ═══════════════════════════════════════════════════════════
        this.exitVelocity = 0               // Velocity when leaving bounds
        this.justExited = false             // True for 1 frame after exit
        this.FLICK_MIN_EXIT_VELOCITY = 0.3  // Min velocity for flick

        // ═══════════════════════════════════════════════════════════
        // HESITATION DETECTION (approach → pause → retreat)
        // ═══════════════════════════════════════════════════════════
        this.hesitationPhase = 'none'       // 'approaching' | 'paused' | 'retreating' | 'none'
        this.hesitationTimer = 0            // Time in current phase
        this.hesitationCompleted = false    // True when full sequence detected
        this.HESITATION_APPROACH_SPEED = -0.15  // Threshold for "approaching" (negative = toward center)
        this.HESITATION_PAUSE_MIN = 0.3     // Min pause duration before retreat
        this.HESITATION_RETREAT_SPEED = 0.1 // Threshold for "retreating"

        // ═══════════════════════════════════════════════════════════
        // SPIRAL DETECTION (orbit + shrinking radius)
        // ═══════════════════════════════════════════════════════════
        this.orbitRadius = 0                // Current distance from center
        this.orbitRadiusPrev = 0            // Previous distance (for shrink detection)
        this.orbitShrinkRate = 0            // Rate of radius change (negative = shrinking)
        this.isSpiraling = false            // True when spiraling inward
        this.SPIRAL_SHRINK_THRESHOLD = -0.08 // Threshold for "shrinking" per second
        this.SPIRAL_MIN_ORBIT = 0.8         // Min angular velocity to be considered orbit

        this._bindEvents()
    }

    _bindEvents() {
        // Mouse events
        this.domElement.addEventListener('mousemove', this._onMouseMove.bind(this))
        this.domElement.addEventListener('mousedown', this._onMouseDown.bind(this))
        this.domElement.addEventListener('mouseup', this._onMouseUp.bind(this))
        this.domElement.addEventListener('mouseenter', () => this.isActive = true)
        this.domElement.addEventListener('mouseleave', () => {
            this.isActive = false
            this._endHold()  // End hold when leaving
        })

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

    _onMouseDown(e) {
        this._startHold(this._normalizeCoords(e.clientX, e.clientY))
        this._startContact()
    }

    _onMouseUp(e) {
        this._endHold()
        this._endContact()
    }

    /**
     * Start hold tracking
     * @param {Object} coords - Normalized position {x, y}
     */
    _startHold(coords) {
        this.holdStartTime = performance.now()
        this.holdPosition = { ...coords }
        this.isHolding = true
        this.holdDuration = 0
    }

    /**
     * End hold tracking
     */
    _endHold() {
        this.isHolding = false
        this.holdDuration = 0
    }

    /**
     * Start contact tracking (for tap detection)
     */
    _startContact() {
        this.contactStartTime = performance.now()
    }

    /**
     * End contact tracking (for tap detection)
     */
    _endContact() {
        this.contactDuration = (performance.now() - this.contactStartTime) / 1000
        this.justReleased = true
        this.exitVelocity = this.velocity
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

        // Start hold tracking
        this._startHold(coords)
        this._startContact()

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
        this._endHold()  // End hold tracking
        this._endContact()  // End contact tracking
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

        // ═══════════════════════════════════════════════════════════
        // APPROACH SPEED (Deep Interaction)
        // Negative = approaching center, Positive = retreating
        // ═══════════════════════════════════════════════════════════
        const distFromCenter = Math.sqrt(
            this.position.x * this.position.x +
            this.position.y * this.position.y
        )
        // Smooth the approach speed calculation (with NaN guard)
        if (delta > 0.001) {
            const instantApproach = (distFromCenter - this.prevDistFromCenter) / delta
            // Guard against NaN propagation
            if (!isNaN(instantApproach) && isFinite(instantApproach)) {
                this.approachSpeed += (instantApproach - this.approachSpeed) * 0.3
            }
        }
        this.prevDistFromCenter = distFromCenter

        // ═══════════════════════════════════════════════════════════
        // HOVER DURATION (for habituation)
        // ═══════════════════════════════════════════════════════════
        const hoverDist = Math.sqrt(
            Math.pow(this.position.x - this.hoverPosition.x, 2) +
            Math.pow(this.position.y - this.hoverPosition.y, 2)
        )
        if (hoverDist < this.HOVER_THRESHOLD) {
            // Still hovering in same spot
            this.hoverDuration += delta
        } else {
            // Moved - reset hover tracking
            this.hoverDuration = 0
            this.hoverPosition.x = this.position.x
            this.hoverPosition.y = this.position.y
        }

        // ═══════════════════════════════════════════════════════════
        // STROKE ZONE TRACKING (for Warm Traces)
        // ═══════════════════════════════════════════════════════════
        if (this.currentGesture === 'stroke') {
            const zoneDist = Math.sqrt(
                Math.pow(this.position.x - this.strokeZonePosition.x, 2) +
                Math.pow(this.position.y - this.strokeZonePosition.y, 2)
            )
            if (zoneDist < this.strokeZoneRadius) {
                // Still stroking in same zone
                this.strokeZoneDuration += delta
            } else {
                // Drifted to new zone - reset but count this frame
                this.strokeZoneDuration = delta
                this.strokeZonePosition.x = this.position.x
                this.strokeZonePosition.y = this.position.y
            }
        } else {
            // Not stroking - reset zone tracking
            this.strokeZoneDuration = 0
        }

        // ═══════════════════════════════════════════════════════════
        // HOLD TRACKING (for recognition / calming)
        // Hold = patient presence, finger stays still
        // ═══════════════════════════════════════════════════════════
        if (this.isHolding) {
            const holdDrift = Math.sqrt(
                Math.pow(this.position.x - this.holdPosition.x, 2) +
                Math.pow(this.position.y - this.holdPosition.y, 2)
            )

            if (holdDrift < this.HOLD_MAX_DRIFT) {
                // Still holding in place — accumulate duration
                this.holdDuration = (performance.now() - this.holdStartTime) / 1000
            } else {
                // Drifted too far — reset hold to new position
                this.holdStartTime = performance.now()
                this.holdPosition = { ...this.position }
                this.holdDuration = 0
            }
        }

        // ═══════════════════════════════════════════════════════════
        // HESITATION STATE MACHINE (approach → pause → retreat)
        // "Она грустит + зеркалит"
        // ═══════════════════════════════════════════════════════════
        this.hesitationCompleted = false  // Reset each frame
        switch (this.hesitationPhase) {
            case 'none':
                // Looking for approach
                if (this.approachSpeed < this.HESITATION_APPROACH_SPEED) {
                    this.hesitationPhase = 'approaching'
                    this.hesitationTimer = 0
                }
                break
            case 'approaching':
                this.hesitationTimer += delta
                // Still approaching? Continue
                if (this.approachSpeed < this.HESITATION_APPROACH_SPEED * 0.5) {
                    // Still approaching fast, keep in phase
                } else if (Math.abs(this.approachSpeed) < 0.05) {
                    // Paused! Transition to paused phase
                    this.hesitationPhase = 'paused'
                    this.hesitationTimer = 0
                } else if (this.approachSpeed > this.HESITATION_RETREAT_SPEED) {
                    // Retreated too fast without pause - reset
                    this.hesitationPhase = 'none'
                } else if (this.hesitationTimer > 2.0) {
                    // Too long in approach - reset
                    this.hesitationPhase = 'none'
                }
                break
            case 'paused':
                this.hesitationTimer += delta
                if (Math.abs(this.approachSpeed) < 0.05) {
                    // Still paused
                } else if (this.approachSpeed > this.HESITATION_RETREAT_SPEED) {
                    // Started retreating!
                    if (this.hesitationTimer >= this.HESITATION_PAUSE_MIN) {
                        // Valid hesitation sequence complete!
                        this.hesitationCompleted = true
                        this.hesitationPhase = 'retreating'
                        this.hesitationTimer = 0
                    } else {
                        // Pause too short - reset
                        this.hesitationPhase = 'none'
                    }
                } else if (this.approachSpeed < this.HESITATION_APPROACH_SPEED) {
                    // Started approaching again - reset
                    this.hesitationPhase = 'approaching'
                    this.hesitationTimer = 0
                } else if (this.hesitationTimer > 3.0) {
                    // Paused too long - reset
                    this.hesitationPhase = 'none'
                }
                break
            case 'retreating':
                this.hesitationTimer += delta
                // Stay in retreating for a bit to allow gesture to register
                if (this.hesitationTimer > 0.5) {
                    this.hesitationPhase = 'none'
                }
                break
        }

        // ═══════════════════════════════════════════════════════════
        // SPIRAL DETECTION (orbit + shrinking radius)
        // "Глубокий транс"
        // ═══════════════════════════════════════════════════════════
        this.orbitRadiusPrev = this.orbitRadius
        this.orbitRadius = Math.sqrt(
            this.position.x * this.position.x +
            this.position.y * this.position.y
        )
        if (delta > 0.001) {
            const instantShrink = (this.orbitRadius - this.orbitRadiusPrev) / delta
            if (!isNaN(instantShrink) && isFinite(instantShrink)) {
                this.orbitShrinkRate += (instantShrink - this.orbitShrinkRate) * 0.2
            }
        }
        // Spiraling = orbiting + radius shrinking
        const isOrbiting = Math.abs(this.angularVelocity) > this.SPIRAL_MIN_ORBIT
        this.isSpiraling = isOrbiting && this.orbitShrinkRate < this.SPIRAL_SHRINK_THRESHOLD

        // ═══════════════════════════════════════════════════════════
        // RESET justReleased at end of frame (so it's true for 1 frame only)
        // ═══════════════════════════════════════════════════════════
        // Note: justReleased is set in _endContact, reset here after classification
        this.justReleased = false

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
     * 
     * Priority order (checked in sequence):
     * 1. idle - no movement
     * 2. tap - short contact + low velocity (release event)
     * 3. flick - fast exit velocity (release event)
     * 4. poke - fast movement + sudden stop
     * 5. spiral - orbit + shrinking radius (trance)
     * 6. hesitation - approach → pause → retreat (sadness)
     * 7. orbit - circular motion
     * 8. tremble - fast + chaotic
     * 9. stroke - slow + linear (petting)
     * 10. moving - default
     */
    _classifyGesture() {
        const { velocity, directionalConsistency, angularVelocity } = this

        // Priority order matters!

        // 1. Idle - no movement
        if (velocity < this.IDLE_VELOCITY) return 'idle'

        // 2. Tap - short contact, low velocity on release
        // Must check before poke! Tap is gentle, poke is aggressive
        if (this.justReleased &&
            this.contactDuration < this.TAP_MAX_DURATION &&
            this.exitVelocity < this.TAP_MAX_VELOCITY) {
            return 'tap'
        }

        // 3. Flick - fast exit from the sphere (like poke but exits screen)
        if (this.justReleased && this.exitVelocity >= this.FLICK_MIN_EXIT_VELOCITY) {
            return 'flick'
        }

        // 4. Poke - fast movement followed by sudden stop
        if (this.justStopped && this.recentHighVelocity) return 'poke'

        // 5. Spiral - orbit + shrinking radius (deep trance)
        if (this.isSpiraling) return 'spiral'

        // 6. Hesitation - completed approach → pause → retreat sequence
        if (this.hesitationCompleted || this.hesitationPhase === 'retreating') {
            return 'hesitation'
        }

        // 7. Orbit - consistent circular motion
        if (Math.abs(angularVelocity) > this.ORBIT_MIN_ANGULAR && velocity > 0.05) return 'orbit'

        // 8. Tremble - fast and chaotic
        if (velocity > this.TREMBLE_MIN_VELOCITY && directionalConsistency < this.TREMBLE_MAX_CONSISTENCY) return 'tremble'

        // 9. Stroke - slow and linear (petting)
        if (velocity < this.STROKE_MAX_VELOCITY && directionalConsistency > this.STROKE_MIN_CONSISTENCY) return 'stroke'

        // 10. Default - general movement
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
            touchIntensity: this.touchIntensity,

            // Deep Interaction metrics
            approachSpeed: this.approachSpeed,
            hoverDuration: this.hoverDuration,
            strokeZoneDuration: this.strokeZoneDuration,

            // Hold tracking (recognition / calming)
            isHolding: this.isHolding,
            holdDuration: this.holdDuration,
            holdPosition: { ...this.holdPosition },

            // New gesture tracking
            justReleased: this.justReleased,
            contactDuration: this.contactDuration,
            exitVelocity: this.exitVelocity,
            hesitationPhase: this.hesitationPhase,
            isSpiraling: this.isSpiraling,
            orbitShrinkRate: this.orbitShrinkRate
        }
    }

    dispose() {
        // Events will be garbage collected with the element
    }
}
