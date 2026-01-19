/**
 * IdleAgency.js — Autonomous Behavior Engine
 * 
 * Creates the illusion of a living creature that exists independently.
 * When the user is idle, the sphere transitions through mood states:
 * calm → curious → restless → attention-seeking
 * 
 * Character: Playful, like a cat waiting for attention
 * 
 * Philosophy: "She doesn't just wait — she wonders, fidgets, beckons"
 */

import * as THREE from 'three'

export class IdleAgency {
    constructor(sphere, organicTicks, eye, particleSystem) {
        this.sphere = sphere
        this.organicTicks = organicTicks
        this.eye = eye
        this.particles = particleSystem
        this.input = null      // Set via setInputManager()
        this.sound = null      // Set via setSoundManager()
        this.persistence = null  // Set via setPersistence()
        this.hasPlayedReturnReaction = false

        // ═══════════════════════════════════════════════════════════
        // IDLE STATE
        // ═══════════════════════════════════════════════════════════
        this.idleTime = 0
        this.wasActive = false

        // ═══════════════════════════════════════════════════════════
        // MOOD SYSTEM
        // ═══════════════════════════════════════════════════════════
        this.mood = 'calm'  // calm | curious | restless | attention-seeking
        this.moodTransitions = {
            calm: 0,
            curious: 2,          // Quick reaction: "она заметила"
            restless: 4,         // "Куда ты?"
            'attention-seeking': 6   // "Смотри на меня!"
        }

        // ═══════════════════════════════════════════════════════════
        // BEHAVIOR TIMERS
        // ═══════════════════════════════════════════════════════════
        this.behaviorTimers = {
            wanderGaze: 0,      // Eye wandering (curious)
            microTurn: 0,        // Sphere micro-rotations (restless)
            bounce: 0,           // Z-offset pulse (attention-seeking)
            flash: 0             // Brightness flash (attention-seeking)
        }

        // Bounce state
        this.bouncePhase = 0
        this.baseSphereZ = 0

        // Flash state
        this.flashIntensity = 0
    }

    /**
     * Set input manager for interaction detection
     * @param {InputManager} inputManager
     */
    setInputManager(inputManager) {
        this.input = inputManager
    }

    /**
     * Set sound manager for idle swells
     * @param {SoundManager} soundManager
     */
    setSoundManager(soundManager) {
        this.sound = soundManager
    }

    /**
     * Set persistence manager for return reactions
     * @param {PersistenceManager} persistence
     */
    setPersistence(persistence) {
        this.persistence = persistence
    }

    /**
     * Main update loop
     * @param {number} delta - Time since last frame
     * @param {number} elapsed - Total elapsed time
     */
    update(delta, elapsed) {
        const inputState = this.input?.getState()
        const isUserActive = inputState?.isActive ||
            inputState?.isHolding ||
            inputState?.velocity > 0.05

        // ═══════════════════════════════════════════════════════════
        // ACTIVITY DETECTION
        // ═══════════════════════════════════════════════════════════
        if (isUserActive) {
            // Play return reaction on first interaction
            if (!this.hasPlayedReturnReaction) {
                this._playReturnReaction()
            }

            // User touched — instant reset!
            if (this.idleTime > 0) {
                this._onUserReturn()
            }
            this.idleTime = 0
            this.wasActive = true
            this._setMood('calm')
            return
        }

        // ═══════════════════════════════════════════════════════════
        // IDLE TIME ACCUMULATION
        // ═══════════════════════════════════════════════════════════
        this.idleTime += delta
        this._updateMood()

        // ═══════════════════════════════════════════════════════════
        // IDLE SOUNDS — "она вздыхает когда скучает"
        // ═══════════════════════════════════════════════════════════
        if (this.sound?.updateIdleSwell) {
            this.sound.updateIdleSwell(this.mood, delta)
        }

        // ═══════════════════════════════════════════════════════════
        // MOOD-BASED BEHAVIORS
        // ═══════════════════════════════════════════════════════════
        switch (this.mood) {
            case 'curious':
                this._behaveCurious(delta, elapsed)
                break
            case 'restless':
                this._behaveRestless(delta, elapsed)
                break
            case 'attention-seeking':
                this._behaveAttentionSeeking(delta, elapsed)
                break
        }

        // Apply visual effects
        this._applyEffects(delta)
    }

    /**
     * Update mood based on idle time
     */
    _updateMood() {
        let newMood = 'calm'

        if (this.idleTime >= this.moodTransitions['attention-seeking']) {
            newMood = 'attention-seeking'
        } else if (this.idleTime >= this.moodTransitions.restless) {
            newMood = 'restless'
        } else if (this.idleTime >= this.moodTransitions.curious) {
            newMood = 'curious'
        }

        if (newMood !== this.mood) {
            this._setMood(newMood)
        }
    }

    /**
     * Set mood and notify OrganicTicks
     */
    _setMood(mood) {
        this.mood = mood

        // Notify OrganicTicks to adjust tick frequency
        if (this.organicTicks?.setIdleMood) {
            this.organicTicks.setIdleMood(mood)
        }
    }

    /**
     * Called when user returns after being idle
     * "She was waiting for you!"
     */
    _onUserReturn() {
        // Reset bounce
        this.bouncePhase = 0
        if (this.particles?.mesh) {
            this.particles.mesh.position.z = this.baseSphereZ
        }

        // Reset flash
        this.flashIntensity = 0
    }

    /**
     * Play initial reaction based on how long user was away
     * Called once at app start after first user interaction
     */
    _playReturnReaction() {
        if (this.hasPlayedReturnReaction || !this.persistence) return
        this.hasPlayedReturnReaction = true

        const returnType = this.persistence.getReturnType()

        switch (returnType) {
            case 'happy':
                // Quick return — excited bounce + flash
                this.flashIntensity = 0.8
                this.bouncePhase = 0
                this._setMood('attention-seeking')  // Brief excitement
                setTimeout(() => this._setMood('calm'), 2000)
                break

            case 'sad':
                // Long absence — slow, subdued start
                if (this.particles?.mesh) {
                    this.particles.mesh.position.z = this.baseSphereZ - 0.1  // Slight droop
                }
                // Will naturally recover through normal behavior
                break

            case 'first':
                // First visit — handled by OnboardingManager
                break

            case 'neutral':
            default:
                // Normal return — no special reaction
                break
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // MOOD BEHAVIORS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Curious: Eye wanders more, slightly faster breathing
     */
    _behaveCurious(delta, elapsed) {
        this.behaviorTimers.wanderGaze -= delta

        if (this.behaviorTimers.wanderGaze <= 0) {
            // Random glance direction
            const direction = new THREE.Vector2(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            )

            if (this.eye?.glanceAt) {
                this.eye.glanceAt(direction, 0.6 + Math.random() * 0.4)
            }

            // Next glance in 1.5-3s (faster than normal OrganicTicks)
            this.behaviorTimers.wanderGaze = 1.5 + Math.random() * 1.5
        }
    }

    /**
     * Restless: Micro-rotations, even faster ticks
     */
    _behaveRestless(delta, elapsed) {
        // Inherit curious behavior
        this._behaveCurious(delta, elapsed)

        this.behaviorTimers.microTurn -= delta

        if (this.behaviorTimers.microTurn <= 0) {
            // Apply micro-rotation to sphere
            if (this.particles?.mesh) {
                const rotX = (Math.random() - 0.5) * 0.03
                const rotY = (Math.random() - 0.5) * 0.03

                this.particles.mesh.rotation.x += rotX
                this.particles.mesh.rotation.y += rotY
            }

            // Next micro-turn in 0.8-1.5s
            this.behaviorTimers.microTurn = 0.8 + Math.random() * 0.7
        }
    }

    /**
     * Attention-seeking: Bouncing + brightness flashes + face viewer
     * Note: Does NOT inherit restless micro-rotations — face-viewer takes priority
     */
    _behaveAttentionSeeking(delta, elapsed) {
        // Only inherit eye wandering from curious (NOT restless micro-rotations!)
        // Face-viewer will control sphere rotation
        this._behaveCurious(delta, elapsed)

        // ═══════════════════════════════════════════════════════════
        // FACE VIEWER: Smoothly rotate to look at camera
        // "Смотри на меня!" — sphere turns its eye toward the viewer
        // ═══════════════════════════════════════════════════════════
        this._faceViewer(delta)

        // Continuous bounce (sine wave)
        this.bouncePhase += delta * 2.5  // ~0.4s period

        if (this.particles?.mesh) {
            const bounceAmount = Math.sin(this.bouncePhase) * 0.08
            this.particles.mesh.position.z = this.baseSphereZ + bounceAmount
        }

        // Periodic brightness flashes
        this.behaviorTimers.flash -= delta

        if (this.behaviorTimers.flash <= 0) {
            this.flashIntensity = 0.6
            this.behaviorTimers.flash = 3 + Math.random() * 2  // Every 3-5s
        }
    }

    /**
     * Face Viewer: Smoothly rotate sphere so eye faces camera
     * Eye is at north pole (0, 0, 1) in local space
     * Target: rotationX = 0, rotationY = 0 (eye looking at +Z toward camera)
     * 
     * Note: We modify particles.rotationX/Y directly because
     * ParticleSystem.updateRolling() overwrites mesh.rotation every frame
     */
    _faceViewer(delta) {
        if (!this.particles) return

        // Decay rotationX and rotationY toward 0
        // Speed 3.0 = noticeable but smooth
        const decay = delta * 3.0

        this.particles.rotationX *= (1 - decay)
        this.particles.rotationY *= (1 - decay)

        // Also kill rolling velocity to prevent fighting
        this.particles.rollingVelocityX *= 0.5
        this.particles.rollingVelocityY *= 0.5
    }

    /**
     * Apply visual effects based on state
     */
    _applyEffects(delta) {
        // Decay flash
        if (this.flashIntensity > 0) {
            this.flashIntensity = Math.max(0, this.flashIntensity - delta * 2)

            // Apply to particle system inner glow
            if (this.particles?.material?.uniforms?.uInnerGlowIntensity) {
                const baseGlow = this.particles.material.uniforms.uInnerGlowIntensity.value
                this.particles.material.uniforms.uInnerGlowIntensity.value =
                    Math.max(baseGlow, this.flashIntensity)
            }
        }
    }

    /**
     * Get current mood for external systems
     * @returns {string} calm | curious | restless | attention-seeking
     */
    getMood() {
        return this.mood
    }

    /**
     * Get idle time in seconds
     * @returns {number}
     */
    getIdleTime() {
        return this.idleTime
    }

    /**
     * Check if in attention-seeking mode
     * @returns {boolean}
     */
    isSeekingAttention() {
        return this.mood === 'attention-seeking'
    }
}
