/**
 * OnboardingManager — State machine for sphere awakening ritual
 *
 * First launch: VOID → RESONANCE → MEETING → THRESHOLD → OPENING → LIVING
 * Returning: RETURNING → LIVING (sphere remembers you)
 *
 * Philosophy: "Set & Setting через синхронизацию"
 * Two consciousnesses find each other. Not a loading screen — a ritual.
 */

import * as THREE from 'three'

const STORAGE_KEY = 'sphere_awakened'

const STATES = {
    IDLE: 'IDLE',
    VOID: 'VOID',
    RESONANCE: 'RESONANCE',
    MEETING: 'MEETING',
    THRESHOLD: 'THRESHOLD',
    OPENING: 'OPENING',
    RETURNING: 'RETURNING',
    LIVING: 'LIVING'
}

export class OnboardingManager {
    constructor(options = {}) {
        // Required dependencies
        this.scene = options.scene
        this.camera = options.camera
        this.particleSystem = options.particleSystem
        this.livingCore = options.livingCore
        this.eye = options.eye
        this.canvas = options.canvas

        // Callbacks
        this.onComplete = options.onComplete || (() => {})
        this.onStateChange = options.onStateChange || (() => {})

        // State
        this.currentState = STATES.IDLE
        this.stateStartTime = 0
        this.stateDuration = 0
        this.stateData = {}

        // Flags
        this.audioReady = false
        this.audioFailed = false
        this.reducedMotion = this._checkReducedMotion()
        this.isFirstLaunch = !localStorage.getItem(STORAGE_KEY)

        // Timers
        this._timeouts = []
        this._intervals = []

        // Visibility handling
        this._boundVisibilityChange = this._onVisibilityChange.bind(this)
        document.addEventListener('visibilitychange', this._boundVisibilityChange)

        // Touch detection for THRESHOLD
        this._boundTouchHandler = this._onTouch.bind(this)

        // Screen reader announcer
        this._createAnnouncer()
    }

    /**
     * Start the onboarding flow
     * Decides between first launch (full ritual) or returning (quick splash)
     */
    start() {
        if (this.currentState !== STATES.IDLE) {
            console.warn('[Onboarding] Already started')
            return
        }

        console.log(`[Onboarding] Starting — isFirstLaunch: ${this.isFirstLaunch}`)

        if (this.isFirstLaunch) {
            this._transitionTo(STATES.VOID)
        } else {
            this._transitionTo(STATES.RETURNING)
        }
    }

    /**
     * Update called from main RAF loop
     */
    update(delta, elapsed) {
        if (this.currentState === STATES.IDLE || this.currentState === STATES.LIVING) {
            return
        }

        const stateTime = performance.now() - this.stateStartTime

        switch (this.currentState) {
            case STATES.VOID:
                this._updateVoid(delta, stateTime)
                break
            case STATES.RESONANCE:
                this._updateResonance(delta, stateTime)
                break
            case STATES.MEETING:
                this._updateMeeting(delta, stateTime)
                break
            case STATES.THRESHOLD:
                this._updateThreshold(delta, stateTime)
                break
            case STATES.OPENING:
                this._updateOpening(delta, stateTime)
                break
            case STATES.RETURNING:
                this._updateReturning(delta, stateTime)
                break
        }

        // Global timeout fallback (15 seconds max for any state)
        if (stateTime > 15000 && this.currentState !== STATES.LIVING) {
            console.warn('[Onboarding] Global timeout — forcing to OPENING')
            this._transitionTo(STATES.OPENING)
        }
    }

    /**
     * Get current state
     */
    getState() {
        return this.currentState
    }

    /**
     * Check if onboarding is active
     */
    isActive() {
        return this.currentState !== STATES.IDLE && this.currentState !== STATES.LIVING
    }

    /**
     * Notify that audio is ready (AudioContext unlocked)
     */
    setAudioReady(ready = true) {
        this.audioReady = ready
        console.log(`[Onboarding] Audio ready: ${ready}`)
    }

    /**
     * Notify that audio failed (will compensate visually)
     */
    setAudioFailed(failed = true) {
        this.audioFailed = failed
        console.log(`[Onboarding] Audio failed: ${failed}`)
    }

    // ═══════════════════════════════════════════════════════════
    // STATE: VOID — Darkness as a mirror
    // "User becomes aware of their own presence"
    // ═══════════════════════════════════════════════════════════

    _enterVoid() {
        this._announce('Загрузка...')

        // Duration varies to feel organic
        const duration = this.reducedMotion
            ? this._randomRange(500, 800)
            : this._randomRange(1500, 3000)

        this.stateData = {
            duration,
            ambientFadeTarget: 0.1,
            ambientFadeDuration: 2000
        }

        // Set everything to invisible
        this._setOpacity(0)
    }

    _updateVoid(delta, stateTime) {
        // Exit condition: audio ready AND duration elapsed
        const audioCondition = this.audioReady || this.audioFailed || stateTime > 2000
        const durationCondition = stateTime >= this.stateData.duration

        if ((audioCondition && durationCondition) || stateTime > 5000) {
            this._transitionTo(STATES.RESONANCE)
        }
    }

    _exitVoid() {
        // Nothing to cleanup — opacity stays at 0 for RESONANCE entry
    }

    // ═══════════════════════════════════════════════════════════
    // STATE: RESONANCE — Synchronization through breathing
    // "User unconsciously aligns with the entity's rhythm"
    // ═══════════════════════════════════════════════════════════

    _enterResonance() {
        this._announce('Что-то просыпается...')

        // Animation parameters
        const animDuration = this.reducedMotion ? 0 : 2500

        this.stateData = {
            // Opacity animation
            particleOpacity: { current: 0, target: 0.3, duration: animDuration },
            coreGlow: { current: 0, target: 0.5, duration: animDuration },
            eyeOpacity: { current: 0, target: 0.2, duration: animDuration },

            // Glow offset — appears NOT at center (breaks expectation)
            glowOffset: {
                x: this._randomRange(-0.3, 0.3),
                y: this._randomRange(-0.2, 0.2)
            },

            // Audio fade target
            breathAudioVolume: { current: 0, target: 0.4, duration: 3000 },

            // Exit thresholds
            exitThreshold: { opacity: 0.3, glow: 0.5 }
        }

        // Reduced motion: instant visibility
        if (this.reducedMotion) {
            this._setOpacity(0.3)
            if (this.livingCore) this.livingCore.setGlobalOpacity(0.5)
            if (this.eye) this.eye.setGlobalOpacity(0.2)
        }
    }

    _updateResonance(delta, stateTime) {
        const data = this.stateData

        if (!this.reducedMotion) {
            // Ease-in-out animation
            const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

            // Animate particle opacity
            if (data.particleOpacity.duration > 0) {
                const progress = Math.min(1, stateTime / data.particleOpacity.duration)
                data.particleOpacity.current = data.particleOpacity.target * easeInOut(progress)
                this.particleSystem?.setGlobalOpacity(data.particleOpacity.current)
            }

            // Animate core glow
            if (data.coreGlow.duration > 0) {
                const progress = Math.min(1, stateTime / data.coreGlow.duration)
                data.coreGlow.current = data.coreGlow.target * easeInOut(progress)
                this.livingCore?.setGlobalOpacity(data.coreGlow.current)
            }

            // Animate eye opacity (slightly delayed)
            if (data.eyeOpacity.duration > 0 && stateTime > 500) {
                const adjustedTime = stateTime - 500
                const progress = Math.min(1, adjustedTime / data.eyeOpacity.duration)
                data.eyeOpacity.current = data.eyeOpacity.target * easeInOut(progress)
                this.eye?.setGlobalOpacity(data.eyeOpacity.current)
            }
        }

        // Exit condition: opacity targets reached
        const opacityReached = data.particleOpacity.current >= data.exitThreshold.opacity
        const glowReached = data.coreGlow.current >= data.exitThreshold.glow

        // Exit after animation complete or timeout
        if ((opacityReached && glowReached) || stateTime > 6000) {
            this._transitionTo(STATES.MEETING)
        }

        // Reduced motion fast exit
        if (this.reducedMotion && stateTime > 500) {
            this._transitionTo(STATES.MEETING)
        }
    }

    _exitResonance() {
        // Ensure we're at target values before MEETING
        this.particleSystem?.setGlobalOpacity(0.3)
        this.livingCore?.setGlobalOpacity(0.5)
        this.eye?.setGlobalOpacity(0.2)
    }

    // ═══════════════════════════════════════════════════════════
    // STATE: MEETING — Mutual discovery
    // "Two consciousnesses discover each other"
    // ═══════════════════════════════════════════════════════════

    _enterMeeting() {
        this._announce('Оно вас заметило.')

        // Phase durations
        const focusingDuration = this.reducedMotion ? 200 : this._randomRange(800, 1200)
        const searchingDuration = this.reducedMotion ? 0 : this._randomRange(1000, 1500)
        const sacredPauseDuration = 400

        this.stateData = {
            phase: 'focusing',
            phaseStartTime: 0,
            phaseDurations: {
                focusing: focusingDuration,
                searching: searchingDuration,
                recognition: 400,
                sacredPause: sacredPauseDuration
            },
            // Eye starts blurred
            eyeBlur: 1.0,
            // Random wander points for "searching"
            wanderPoints: [
                { x: this._randomRange(-0.5, 0.5), y: this._randomRange(-0.3, 0.3) },
                { x: this._randomRange(-0.5, 0.5), y: this._randomRange(-0.3, 0.3) },
                { x: this._randomRange(-0.5, 0.5), y: this._randomRange(-0.3, 0.3) }
            ],
            currentWanderIndex: 0,
            // Opacity continues from RESONANCE
            particleOpacity: 0.3,
            coreOpacity: 0.5
        }

        // Set initial eye blur
        this.eye?.setBlur(1.0)
        this.eye?.setGlobalOpacity(0.3)
    }

    _updateMeeting(delta, stateTime) {
        const data = this.stateData
        const durations = data.phaseDurations
        const easeOut = (t) => 1 - Math.pow(1 - t, 3)

        switch (data.phase) {
            case 'focusing': {
                // Eye blur → sharp
                const progress = Math.min(1, stateTime / durations.focusing)
                data.eyeBlur = 1.0 - easeOut(progress)
                this.eye?.setBlur(data.eyeBlur)

                // Increase eye opacity
                const eyeOpacity = 0.3 + 0.5 * easeOut(progress)
                this.eye?.setGlobalOpacity(eyeOpacity)

                // Increase particle opacity
                data.particleOpacity = 0.3 + 0.4 * easeOut(progress)
                this.particleSystem?.setGlobalOpacity(data.particleOpacity)

                // Increase core opacity
                data.coreOpacity = 0.5 + 0.3 * easeOut(progress)
                this.livingCore?.setGlobalOpacity(data.coreOpacity)

                if (stateTime >= durations.focusing) {
                    data.phase = this.reducedMotion ? 'recognition' : 'searching'
                    data.phaseStartTime = stateTime
                }
                break
            }

            case 'searching': {
                const phaseTime = stateTime - data.phaseStartTime
                const progress = phaseTime / durations.searching

                // Eye wanders between random points
                const wanderIndex = Math.min(
                    data.wanderPoints.length - 1,
                    Math.floor(progress * data.wanderPoints.length)
                )

                if (wanderIndex !== data.currentWanderIndex) {
                    data.currentWanderIndex = wanderIndex
                    const target = data.wanderPoints[wanderIndex]
                    // Animate eye gaze toward wander point
                    this.eye?.lookAt(new THREE.Vector3(target.x, target.y, 3))
                }

                if (phaseTime >= durations.searching) {
                    data.phase = 'recognition'
                    data.phaseStartTime = stateTime
                }
                break
            }

            case 'recognition': {
                // Eye finds user — looks at center (or cursor position)
                this.eye?.lookAt(new THREE.Vector3(0, 0, 3))

                const phaseTime = stateTime - data.phaseStartTime
                if (phaseTime >= durations.recognition) {
                    data.phase = 'sacredPause'
                    data.phaseStartTime = stateTime
                }
                break
            }

            case 'sacredPause': {
                // Both freeze — moment of mutual recognition
                const phaseTime = stateTime - data.phaseStartTime
                if (phaseTime >= durations.sacredPause) {
                    this._transitionTo(STATES.THRESHOLD)
                }
                break
            }
        }

        // Global timeout
        if (stateTime > 5000) {
            this._transitionTo(STATES.THRESHOLD)
        }
    }

    _exitMeeting() {
        // Ensure sharp, visible eye
        this.eye?.setBlur(0)
        this.eye?.setGlobalOpacity(0.8)
        this.particleSystem?.setGlobalOpacity(0.7)
        this.livingCore?.setGlobalOpacity(0.8)
    }

    // ═══════════════════════════════════════════════════════════
    // STATE: THRESHOLD — The choice
    // "Both are vulnerable, both wait. Touch = conscious choice."
    // ═══════════════════════════════════════════════════════════

    _enterThreshold() {
        this._announce('Коснитесь экрана для продолжения.')

        this.stateData = {
            waitingForTouch: true,
            reminderCount: 0,
            lastReminderTime: performance.now(),
            // Subtle vulnerability animation
            baseScale: 1.0,
            currentScale: 1.0
        }

        // Listen for touch
        this.canvas?.addEventListener('mousedown', this._boundTouchHandler)
        this.canvas?.addEventListener('touchstart', this._boundTouchHandler)

        // Sphere "inhales" — shows vulnerability
        this._animateSphereScale(0.98, 800)
    }

    _updateThreshold(delta, stateTime) {
        const data = this.stateData

        // Reminder system: pulse after 8 seconds
        const timeSinceReminder = performance.now() - data.lastReminderTime

        if (data.reminderCount < 3 && timeSinceReminder > 8000) {
            data.reminderCount++
            data.lastReminderTime = performance.now()
            console.log(`[Onboarding] Reminder ${data.reminderCount}/3`)

            // Visual reminder: subtle pulse
            this._pulseReminder()
        }

        // Give up after 3 reminders + 6 seconds
        if (data.reminderCount >= 3 && timeSinceReminder > 6000) {
            console.log('[Onboarding] Entity decides to start relationship itself')
            this._transitionTo(STATES.OPENING)
        }
    }

    _exitThreshold() {
        this.canvas?.removeEventListener('mousedown', this._boundTouchHandler)
        this.canvas?.removeEventListener('touchstart', this._boundTouchHandler)
    }

    /**
     * Animate sphere scale (for THRESHOLD vulnerability)
     */
    _animateSphereScale(targetScale, duration) {
        // Simple scale animation via particle system mesh
        if (!this.particleSystem?.mesh) return

        const startScale = this.particleSystem.mesh.scale.x
        const startTime = performance.now()

        const animate = () => {
            const elapsed = performance.now() - startTime
            const progress = Math.min(1, elapsed / duration)
            const eased = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2

            const scale = startScale + (targetScale - startScale) * eased
            this.particleSystem.mesh.scale.setScalar(scale)
            if (this.livingCore) this.livingCore.getMesh().scale.setScalar(scale)
            if (this.eye) this.eye.getMesh().scale.setScalar(scale)

            if (progress < 1) {
                requestAnimationFrame(animate)
            }
        }

        requestAnimationFrame(animate)
    }

    /**
     * Subtle pulse reminder for THRESHOLD
     */
    _pulseReminder() {
        if (!this.particleSystem?.mesh) return

        const startScale = this.particleSystem.mesh.scale.x
        const pulseScale = startScale * 1.02

        // Quick pulse: scale up then back
        this._animateSphereScale(pulseScale, 300)
        this._setTimeout(() => {
            this._animateSphereScale(startScale, 300)
        }, 300)
    }

    // ═══════════════════════════════════════════════════════════
    // STATE: OPENING — Beginning of relationship
    // "Not 'normal mode' — a new reality where you are connected"
    // ═══════════════════════════════════════════════════════════

    _enterOpening() {
        this._announce('Связь установлена.')

        this.stateData = {
            duration: 1200,
            blinkTriggered: false
        }

        // Mark as awakened
        localStorage.setItem(STORAGE_KEY, Date.now().toString())

        // Gentle acceptance response
        // Eye blinks (trust signal)
        this._setTimeout(() => {
            this.eye?.blink?.()
            this.stateData.blinkTriggered = true
        }, 200)

        // Haptic pulse (warm single)
        // Will be connected in integration

        // Fade to full opacity
        this._setOpacity(1.0)
    }

    _updateOpening(delta, stateTime) {
        // Smooth fade to full visibility
        const progress = Math.min(1, stateTime / this.stateData.duration)
        const eased = 1 - Math.pow(1 - progress, 2)

        // Particle opacity: 0.7 → 1.0
        this.particleSystem?.setGlobalOpacity(0.7 + 0.3 * eased)
        this.livingCore?.setGlobalOpacity(0.8 + 0.2 * eased)
        this.eye?.setGlobalOpacity(0.8 + 0.2 * eased)

        if (stateTime > this.stateData.duration) {
            this._transitionTo(STATES.LIVING)
        }
    }

    _exitOpening() {
        // Ensure full visibility
        this._setOpacity(1.0)
    }

    // ═══════════════════════════════════════════════════════════
    // STATE: RETURNING — Splash for returning users
    // "The entity remembers you"
    // ═══════════════════════════════════════════════════════════

    _enterReturning() {
        this.stateData = {
            duration: this._randomRange(1500, 2500),
            recognitionBlinkDone: false
        }

        // Start from dark
        this._setOpacity(0)

        // Quick darkness (300ms)
        this._setTimeout(() => {
            // Glow appears (500ms)
            this.livingCore?.setGlobalOpacity(0.5)
        }, 300)

        this._setTimeout(() => {
            // Particles fade in (800ms)
            this.particleSystem?.setGlobalOpacity(0.7)
        }, 500)

        this._setTimeout(() => {
            // Eye appears — already knows where you are
            this.eye?.setGlobalOpacity(0.8)
            this.eye?.lookAt(new THREE.Vector3(0, 0, 3))
            // Recognition blink — "I remember you"
            this.eye?.blink?.()
            this.stateData.recognitionBlinkDone = true
        }, 800)
    }

    _updateReturning(delta, stateTime) {
        // Smooth fade to full
        if (stateTime > 800) {
            const fadeProgress = Math.min(1, (stateTime - 800) / 700)
            const eased = 1 - Math.pow(1 - fadeProgress, 2)

            this.particleSystem?.setGlobalOpacity(0.7 + 0.3 * eased)
            this.livingCore?.setGlobalOpacity(0.5 + 0.5 * eased)
            this.eye?.setGlobalOpacity(0.8 + 0.2 * eased)
        }

        if (stateTime > this.stateData.duration) {
            this._transitionTo(STATES.LIVING)
        }
    }

    _exitReturning() {
        this._setOpacity(1.0)
    }

    _enterLiving() {
        console.log('[Onboarding] Complete — transitioning to LIVING')
        this.onComplete()
    }

    _updateLiving() {
        // No-op — managed by main app
    }

    _exitLiving() {
        // Never exits
    }

    // ═══════════════════════════════════════════════════════════
    // STATE MACHINE CORE
    // ═══════════════════════════════════════════════════════════

    _transitionTo(newState) {
        const oldState = this.currentState

        // Exit current state
        this._callStateMethod('exit', oldState)

        // Update state
        this.currentState = newState
        this.stateStartTime = performance.now()

        console.log(`[Onboarding] ${oldState} → ${newState}`)

        // Enter new state
        this._callStateMethod('enter', newState)

        // Notify listeners
        this.onStateChange(newState, oldState)
    }

    _callStateMethod(type, state) {
        const methodName = `_${type}${state.charAt(0) + state.slice(1).toLowerCase()}`
        if (typeof this[methodName] === 'function') {
            this[methodName]()
        }
    }

    // ═══════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════

    _onTouch(e) {
        if (this.currentState === STATES.THRESHOLD && this.stateData.waitingForTouch) {
            e.preventDefault()
            console.log('[Onboarding] Touch detected in THRESHOLD')
            this.stateData.waitingForTouch = false
            this._transitionTo(STATES.OPENING)
        }
    }

    _onVisibilityChange() {
        if (document.visibilityState === 'hidden') {
            // Pause all timers
            this._clearAllTimers()
            console.log('[Onboarding] Paused (visibility hidden)')
        } else {
            // Resume from current state
            console.log('[Onboarding] Resumed (visibility visible)')
            // State will continue from where it was
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    /**
     * Set opacity for all visual components
     * @param {number} opacity - 0 (invisible) to 1 (visible)
     */
    _setOpacity(opacity) {
        this.particleSystem?.setGlobalOpacity(opacity)
        this.livingCore?.setGlobalOpacity(opacity)
        this.eye?.setGlobalOpacity(opacity)
    }

    _checkReducedMotion() {
        return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false
    }

    _randomRange(min, max) {
        return min + Math.random() * (max - min)
    }

    _setTimeout(fn, delay) {
        const id = setTimeout(fn, delay)
        this._timeouts.push(id)
        return id
    }

    _setInterval(fn, interval) {
        const id = setInterval(fn, interval)
        this._intervals.push(id)
        return id
    }

    _clearAllTimers() {
        this._timeouts.forEach(id => clearTimeout(id))
        this._intervals.forEach(id => clearInterval(id))
        this._timeouts = []
        this._intervals = []
    }

    _createAnnouncer() {
        // Screen reader announcer for accessibility
        if (document.getElementById('onboarding-announcer')) return

        const announcer = document.createElement('div')
        announcer.id = 'onboarding-announcer'
        announcer.setAttribute('aria-live', 'polite')
        announcer.className = 'sr-only'
        document.body.appendChild(announcer)
    }

    _announce(message) {
        const announcer = document.getElementById('onboarding-announcer')
        if (announcer) {
            announcer.textContent = message
        }
    }

    // ═══════════════════════════════════════════════════════════
    // STATE QUERIES
    // ═══════════════════════════════════════════════════════════

    isComplete() {
        return this.currentState === STATES.LIVING
    }

    getState() {
        return this.currentState
    }

    // ═══════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════

    dispose() {
        this._clearAllTimers()
        document.removeEventListener('visibilitychange', this._boundVisibilityChange)
        this.canvas?.removeEventListener('mousedown', this._boundTouchHandler)
        this.canvas?.removeEventListener('touchstart', this._boundTouchHandler)

        const announcer = document.getElementById('onboarding-announcer')
        if (announcer) {
            announcer.remove()
        }
    }
}
