/**
 * InputManager - Unified mouse/touch input handling
 * Tracks position, velocity, and idle state
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
        this.isTouching = true
        this.isActive = true
        if (e.touches.length > 0) {
            const touch = e.touches[0]
            const coords = this._normalizeCoords(touch.clientX, touch.clientY)
            this.position.x = coords.x
            this.position.y = coords.y
        }
    }

    _onTouchMove(e) {
        e.preventDefault()
        if (e.touches.length > 0) {
            const touch = e.touches[0]
            const coords = this._normalizeCoords(touch.clientX, touch.clientY)
            this.position.x = coords.x
            this.position.y = coords.y
        }
    }

    _onTouchEnd() {
        this.isTouching = false
        // Keep isActive true for a bit after touch ends
    }

    update(delta) {
        // Calculate velocity
        const dx = this.position.x - this.prevPosition.x
        const dy = this.position.y - this.prevPosition.y
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

        // Store previous position
        this.prevPosition.x = this.position.x
        this.prevPosition.y = this.position.y
    }

    getState() {
        return {
            position: { ...this.position },
            velocity: this.velocity,
            idleTime: this.idleTime,
            franticTime: this.franticTime,
            isIdle: this.idleTime > this.IDLE_DURATION,
            isFrantic: this.franticTime > this.FRANTIC_DURATION,
            isActive: this.isActive
        }
    }

    dispose() {
        // Events will be garbage collected with the element
    }
}
