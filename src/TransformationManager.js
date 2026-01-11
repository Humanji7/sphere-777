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

import * as THREE from 'three'

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
        this.minInterval = 90   // seconds (was 45)
        this.maxInterval = 300  // seconds (was 180)
        this.nextTriggerTime = this._randomInterval()
        this.idleTriggerThreshold = 45  // seconds in attention-seeking (was 30)

        // Callbacks
        this.onTransitionStart = null
        this.onTransitionComplete = null

        // External components to hide during shell transitions
        this.livingCore = null
        this.eye = null

        // Input forwarding
        this.inputManager = null
        this.raycaster = new THREE.Raycaster()
        this.cursorNDC = new THREE.Vector2()

        // Debug
        this.DEBUG = false
    }

    /**
     * Set external components that should be hidden during shell transitions
     * @param {LivingCore} livingCore - Inner glow layers
     * @param {Eye} eye - Organic eye
     */
    setComponents(livingCore, eye) {
        this.livingCore = livingCore
        this.eye = eye
    }

    /**
     * Set input manager for cursor forwarding to active shell
     * @param {InputManager} inputManager
     */
    setInput(inputManager) {
        this.inputManager = inputManager
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

        // Update target shell during transition TO shell (for smooth fade-in)
        if (this.isTransitioning && this.targetState && this.targetState !== 'organic' && this.shells[this.targetState]) {
            this.shells[this.targetState].update(delta, elapsed)
        }

        // Update current shell during transition TO organic (for smooth fade-out)
        if (this.isTransitioning && this.targetState === 'organic' && this.currentState !== 'organic' && this.shells[this.currentState]) {
            this.shells[this.currentState].update(delta, elapsed)
        }

        // Update active shell when fully transitioned (not during return to organic)
        if (!this.isTransitioning && this.currentState !== 'organic' && this.shells[this.currentState]) {
            const activeShell = this.shells[this.currentState]
            activeShell.update(delta, elapsed)

            // Keep particles hidden while in shell state
            this.particles.setTransformFade(0)
            // Keep LivingCore + Eye hidden too
            if (this.livingCore) this._setLivingCoreOpacity(0)
            if (this.eye) this._setEyeOpacity(0)

            // Forward cursor input to active shell
            this._forwardCursorToShell(activeShell)
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
            // Phase 1: Particles + LivingCore + Eye fade out (0-50%)
            if (this.transitionProgress < 0.5) {
                const fadeOutProgress = this.transitionProgress / 0.5  // 0-1
                this.particles.setTransformFade(1 - fadeOutProgress)  // 1 → 0

                // Fade out LivingCore (set opacity on all layer materials)
                if (this.livingCore) {
                    this._setLivingCoreOpacity(1 - fadeOutProgress)
                }
                // Fade out Eye
                if (this.eye) {
                    this._setEyeOpacity(1 - fadeOutProgress)
                }
            }
            // Phase 2: Particles hidden, shell fades in (50%+)
            else if (this.transitionProgress >= 0.5 && this.transitionProgress < 0.55) {
                // Start shell fade-in at 50%
                this.particles.setTransformFade(0)
                this.shells[this.targetState].show(this.transitionDuration * 0.4)

                // Ensure LivingCore + Eye fully hidden
                if (this.livingCore) this._setLivingCoreOpacity(0)
                if (this.eye) this._setEyeOpacity(0)
            }
        }

        // Transitioning TO organic (from a shell)
        else if (this.targetState === 'organic') {
            // Phase 1: Shell fades out (0-50%)
            if (this.transitionProgress < 0.5) {
                // Shell hide was already called in returnToOrganic()
            }
            // Phase 2: Particles + LivingCore + Eye fade in (50-100%)
            else {
                const fadeInProgress = (this.transitionProgress - 0.5) / 0.5  // 0-1
                this.particles.setTransformFade(fadeInProgress)  // 0 → 1

                // Fade in LivingCore and Eye
                if (this.livingCore) this._setLivingCoreOpacity(fadeInProgress)
                if (this.eye) this._setEyeOpacity(fadeInProgress)
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

    /**
     * Set opacity on all LivingCore layer materials
     * @param {number} opacity - 0-1
     */
    _setLivingCoreOpacity(opacity) {
        if (!this.livingCore?.group) return

        this.livingCore.group.traverse((child) => {
            if (child.isMesh && child.material) {
                // Preserve original intensity but scale by opacity
                child.material.opacity = opacity
                child.visible = opacity > 0.01
            }
        })
    }

    /**
     * Set opacity on Eye mesh
     * @param {number} opacity - 0-1
     */
    _setEyeOpacity(opacity) {
        if (!this.eye) return

        const mesh = this.eye.getMesh?.() || this.eye.mesh
        if (mesh?.material) {
            mesh.material.opacity = opacity
            mesh.visible = opacity > 0.01
        }
    }

    /**
     * Forward cursor input to active shell via raycast
     * @param {BaseShell} shell - active shell to forward input to
     */
    _forwardCursorToShell(shell) {
        if (!this.inputManager || !shell.mesh) return

        const inputState = this.inputManager.getState()

        // Convert screen position to NDC (-1 to 1)
        this.cursorNDC.x = inputState.position.x
        this.cursorNDC.y = inputState.position.y

        // Set up raycaster from camera through cursor
        this.raycaster.setFromCamera(this.cursorNDC, this.camera)

        // Raycast against shell mesh
        const intersects = this.raycaster.intersectObject(shell.mesh, false)

        if (intersects.length > 0) {
            const hit = intersects[0]
            // Cursor is on shell — pass world position and turn on glow
            shell.setCursorWorldPos?.(hit.point)
            // Stronger glow when actively touching, subtle glow on hover
            const glowIntensity = this.inputManager.isActive ? 0.9 : 0.5
            shell.setCursorInfluence?.(glowIntensity)
            // Enable cursor-guided rotation — "shell turns to face the touch"
            shell.setTargetRotationPoint?.(hit.point)
        } else {
            // Cursor off shell — fade glow and clear rotation target
            shell.setCursorInfluence?.(0)
            shell.setTargetRotationPoint?.(null)
        }
    }
}
