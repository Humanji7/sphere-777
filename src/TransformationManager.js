/**
 * TransformationManager.js — Transformation State Machine
 * 
 * Manages organic → shell transitions with:
 * - Random trigger (45-180s)
 * - Idle trigger (30+ seconds in attention-seeking)
 * - Smooth fade transitions
 * 
 * States: organic | beetle | drone | eye
 */

export class TransformationManager {
    constructor(scene, particles, camera) {
        this.scene = scene
        this.particles = particles
        this.camera = camera

        // State machine
        this.states = ['organic', 'beetle', 'drone', 'eye']
        this.currentState = 'organic'
        this.targetState = null
        this.transitionProgress = 0  // 0-1
        this.transitionDuration = 3.0  // seconds
        this.isTransitioning = false

        // Loaded shells
        this.shells = {}

        // Triggers
        this.idleTime = 0
        this.elapsedTime = 0
        this.lastTransformTime = 0
        this.minInterval = 45   // seconds
        this.maxInterval = 180  // seconds
        this.nextTriggerTime = this._randomInterval()
        this.idleTriggerThreshold = 30  // seconds in attention-seeking

        // Callbacks
        this.onTransitionStart = null
        this.onTransitionComplete = null

        // Debug
        this.DEBUG = false
    }

    _randomInterval() {
        return this.minInterval + Math.random() * (this.maxInterval - this.minInterval)
    }

    _randomShell() {
        const available = Object.keys(this.shells)
        if (available.length === 0) return null
        return available[Math.floor(Math.random() * available.length)]
    }

    registerShell(name, shell) {
        this.shells[name] = shell
        shell.setAutoReturnCallback(() => this.returnToOrganic())

        if (this.DEBUG) {
            console.log(`[TRANSFORM] Registered shell: ${name}`)
        }
    }

    update(delta, elapsed, idleMood = null) {
        this.elapsedTime = elapsed

        // Track idle time for attention-seeking trigger
        if (idleMood === 'attention-seeking') {
            this.idleTime += delta
        } else {
            this.idleTime = 0
        }

        // Check triggers only when in organic state and not transitioning
        if (this.currentState === 'organic' && !this.isTransitioning) {
            // Random trigger
            const timeSinceLastTransform = elapsed - this.lastTransformTime
            if (timeSinceLastTransform > this.nextTriggerTime) {
                this._triggerRandomTransform()
            }

            // Idle trigger (30+ seconds in attention-seeking mood)
            if (this.idleTime > this.idleTriggerThreshold) {
                this._triggerRandomTransform()
                this.idleTime = 0  // Reset to prevent rapid re-triggers
            }
        }

        // Process active transition
        if (this.isTransitioning) {
            this._processTransition(delta)
        }

        // Update active shell
        if (this.currentState !== 'organic' && this.shells[this.currentState]) {
            this.shells[this.currentState].update(delta, elapsed)
        }
    }

    _triggerRandomTransform() {
        const target = this._randomShell()
        if (target) {
            this.transitionTo(target)
        }
    }

    transitionTo(state, duration = 3.0) {
        if (!this.shells[state]) {
            console.warn(`[TRANSFORM] Shell not registered: ${state}`)
            return
        }

        if (this.currentState === state || this.isTransitioning) {
            return
        }

        this.targetState = state
        this.transitionProgress = 0
        this.transitionDuration = duration
        this.isTransitioning = true

        if (this.DEBUG) {
            console.log(`[TRANSFORM] ${this.currentState} → ${state}`)
        }

        if (this.onTransitionStart) {
            this.onTransitionStart(this.currentState, state)
        }
    }

    _processTransition(delta) {
        this.transitionProgress += delta / this.transitionDuration

        // Transitioning TO a shell
        if (this.currentState === 'organic' && this.targetState !== 'organic') {
            // Phase 1: Particles fade out (0-50%)
            if (this.transitionProgress < 0.5) {
                const fadeOutProgress = this.transitionProgress / 0.5  // 0-1
                this.particles.setTransformFade(1 - fadeOutProgress)  // 1 → 0
            }
            // Phase 2: Particles hidden, shell fades in (50%+)
            else if (this.transitionProgress >= 0.5 && this.transitionProgress < 0.55) {
                // Start shell fade-in at 50%
                this.particles.setTransformFade(0)
                this.shells[this.targetState].show(this.transitionDuration * 0.4)
            }
        }

        // Transitioning TO organic (from a shell)
        else if (this.targetState === 'organic') {
            // Phase 1: Shell fades out (0-50%)
            if (this.transitionProgress < 0.5) {
                // Shell hide was already called in returnToOrganic()
            }
            // Phase 2: Particles fade in (50-100%)
            else {
                const fadeInProgress = (this.transitionProgress - 0.5) / 0.5  // 0-1
                this.particles.setTransformFade(fadeInProgress)  // 0 → 1
            }
        }

        // Transition complete
        if (this.transitionProgress >= 1) {
            const prevState = this.currentState
            this.currentState = this.targetState
            this.targetState = null
            this.isTransitioning = false
            this.lastTransformTime = this.elapsedTime
            this.nextTriggerTime = this._randomInterval()

            if (this.DEBUG) {
                console.log(`[TRANSFORM] Complete: now ${this.currentState}`)
            }

            if (this.onTransitionComplete) {
                this.onTransitionComplete(this.currentState)
            }
        }
    }

    returnToOrganic(duration = 3.0) {
        if (this.currentState === 'organic' || this.isTransitioning) {
            return
        }

        // Hide current shell
        if (this.shells[this.currentState]) {
            this.shells[this.currentState].hide(duration * 0.4)
        }

        this.targetState = 'organic'
        this.transitionProgress = 0
        this.transitionDuration = duration
        this.isTransitioning = true

        if (this.DEBUG) {
            console.log(`[TRANSFORM] Returning to organic`)
        }
    }

    // Public method for debug/testing
    forceTransform(state) {
        if (this.currentState !== 'organic') {
            this.returnToOrganic(1.0)
            setTimeout(() => this.transitionTo(state, 2.0), 1500)
        } else {
            this.transitionTo(state, 2.0)
        }
    }

    getCurrentState() {
        return this.currentState
    }

    isInTransition() {
        return this.isTransitioning
    }
}
