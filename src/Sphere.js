/**
 * Sphere.js — Emotional Response Orchestrator
 * 
 * Manages 6 emotional phases creating dialogue between user and sphere:
 * PEACE → LISTENING → TENSION → BLEEDING → TRAUMA → HEALING
 */

import * as THREE from 'three'

// Emotional phases
export const PHASE = {
    PEACE: 'peace',           // Baseline breathing
    LISTENING: 'listening',   // Micro-pause when user stops (50-80ms)
    TENSION: 'tension',       // Breath quickens before bleeding
    BLEEDING: 'bleeding',     // Particle detachment with hesitation
    TRAUMA: 'trauma',         // Memory of pain (slower response)
    HEALING: 'healing'        // Gradual return to deeper breath
}

export class Sphere {
    constructor(particleSystem, inputManager, camera) {
        this.particles = particleSystem
        this.input = inputManager
        this.camera = camera  // Needed for cursor raycast

        // Current state
        this.currentPhase = PHASE.PEACE
        this.phaseTime = 0  // Time in current phase

        // Timers and thresholds
        this.config = {
            // Listening (micro-pause)
            listeningTrigger: 0.3,      // seconds of idle to trigger
            listeningPauseDuration: 0.06, // 60ms pause (50-80ms range)

            // Tension (lowered for sensitivity)
            tensionVelocity: 0.1,       // velocity threshold
            tensionDuration: 0.15,      // duration above threshold

            // Bleeding (lowered for sensitivity)
            bleedingVelocity: 0.15,
            bleedingDuration: 0.25,
            tremorDuration: 0.1,        // 100ms tremor before detach
            bleedRate: 0.08,            // particles per second (fraction of total)

            // Trauma
            traumaThreshold: 2.0,       // seconds of bleeding to cause trauma

            // Healing
            healingRate: 0.3            // breath recovery speed
        }

        // Phase-specific state
        this.listeningPauseProgress = 0  // 0-1 for pause animation
        this.hasListenedThisIdle = false // prevent multiple listening per idle
        this.tensionTime = 0             // accumulator for tension detection
        this.bleedingTime = 0            // total time spent bleeding
        this.traumaLevel = 0             // 0-1, affects response lag
        this.healingProgress = 0         // 0-1 for breath recovery

        // Breath control
        this.baseBreathSpeed = 0.8       // radians/sec (3-4s cycle)
        this.currentBreathSpeed = 0.8
        this.targetBreathSpeed = 0.8

        // Smoothed color progress (prevents jumpy color changes)
        this.currentColorProgress = 0
        this.colorSmoothingSpeed = 0.4   // Higher = faster response, tune for feel (lowered for slower transitions)

        // ═══════════════════════════════════════════════════════════
        // DYNAMIC PARTICLE SIZE (tension-based density)
        // ═══════════════════════════════════════════════════════════
        this.currentSize = 6.0           // Current interpolated size
        this.sizeConfig = {
            baseSize: 6.0,               // Peace state ("breathing freely")
            maxSizeBoost: 1.5,           // +1.5 at full tension (totalMax = 7.5)
            sizeSmoothSpeed: 2.0         // Smoothing speed
        }

        // ═══════════════════════════════════════════════════════════
        // CURSOR PROXIMITY (Deep Interaction)
        // ═══════════════════════════════════════════════════════════
        this.raycaster = new THREE.Raycaster()
        this.cursorWorldPos = new THREE.Vector3(0, 0, 10)  // Far away default
        this.sphereBounds = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1.5)  // Match baseRadius
        this.cursorOnSphere = false  // Is cursor intersecting sphere?
        this.cursorInfluenceSmoothed = 0  // Smoothed influence for gradual fade

        // ═══════════════════════════════════════════════════════════
        // SMART MAGNETISM & HABITUATION (Deep Interaction)
        // ═══════════════════════════════════════════════════════════
        this.habituation = 0              // 0-1, how "used to" cursor presence
        this.attractionModifier = 1.0     // -1 (repel) to 1 (attract)
        this.magnetismConfig = {
            fastApproachThreshold: -0.4,  // Approach speed that triggers flinch
            slowApproachThreshold: -0.1,  // Approach speed for gentle approach
            repulsionStrength: -0.6,      // How strongly to repel on flinch
            habituationTime: 2.0,         // Seconds to fully habituate
            habituationDecay: 0.5         // How fast habituation fades when cursor moves
        }

        // ═══════════════════════════════════════════════════════════
        // GESTURE REACTIONS (Stage 6)
        // ═══════════════════════════════════════════════════════════
        this.gestureReaction = {
            strokeCalm: 0,          // 0-1, accumulated calming from strokes
            pokeStartle: 0,         // 0-1, spike from poke (decays fast)
            orbitSync: 0,           // 0-1, breathing sync with orbit
            trembleNervous: 0       // 0-1, accumulated nervousness
        }

        // Ripple effect state (poke reaction)
        this.ripple = {
            active: false,
            origin: new THREE.Vector3(),
            startTime: 0
        }

        // Sound Manager (set via setSoundManager after user interaction)
        this.soundManager = null

        // Debug
        this.DEBUG = false
    }

    /**
     * Set the sound manager (called after user interaction)
     * @param {SoundManager} sm - The sound manager instance
     */
    setSoundManager(sm) {
        this.soundManager = sm
    }

    /**
     * Set the eye (organic particle-based)
     * @param {Eye} eye - The eye instance
     */
    setEye(eye) {
        this.eye = eye
    }

    update(delta, elapsed) {
        const inputState = this.input.getState()

        // Update phase time
        this.phaseTime += delta

        // Process current phase and check transitions
        this._processPhase(delta, inputState)

        // Apply effects to particle system
        this._applyEffects(delta, inputState)

        if (this.DEBUG && Math.floor(elapsed) !== Math.floor(elapsed - delta)) {
            console.log(`[SPHERE] Phase: ${this.currentPhase}, Trauma: ${this.traumaLevel.toFixed(2)}`)
        }
    }

    _processPhase(delta, inputState) {
        const { velocity, idleTime, isIdle, isFrantic } = inputState

        switch (this.currentPhase) {
            case PHASE.PEACE:
                this._processPeace(delta, inputState)
                break

            case PHASE.LISTENING:
                this._processListening(delta, inputState)
                break

            case PHASE.TENSION:
                this._processTension(delta, inputState)
                break

            case PHASE.BLEEDING:
                this._processBleeding(delta, inputState)
                break

            case PHASE.TRAUMA:
                this._processTrauma(delta, inputState)
                break

            case PHASE.HEALING:
                this._processHealing(delta, inputState)
                break
        }
    }

    _processPeace(delta, inputState) {
        const { velocity, idleTime } = inputState

        // Reset listening flag when movement resumes
        if (velocity > 0.02) {
            this.hasListenedThisIdle = false
        }

        // Check for LISTENING trigger (only once per idle session)
        if (!this.hasListenedThisIdle && idleTime > this.config.listeningTrigger && idleTime < this.config.listeningTrigger + 0.3) {
            this.hasListenedThisIdle = true
            this._transitionTo(PHASE.LISTENING)
            return
        }

        // Check for TENSION trigger
        if (velocity > this.config.tensionVelocity) {
            this.tensionTime += delta
            if (this.tensionTime > this.config.tensionDuration) {
                this._transitionTo(PHASE.TENSION)
                return
            }
        } else {
            this.tensionTime = Math.max(0, this.tensionTime - delta * 2) // Decay faster
        }

        // Gradual trauma recovery in peace
        if (this.traumaLevel > 0) {
            this.traumaLevel = Math.max(0, this.traumaLevel - delta * 0.05)
        }
    }

    _processListening(delta, inputState) {
        const { velocity } = inputState

        // Animate the pause
        this.listeningPauseProgress += delta / this.config.listeningPauseDuration

        // Movement breaks the listening
        if (velocity > 0.05) {
            this.listeningPauseProgress = 0
            this._transitionTo(PHASE.PEACE)
            return
        }

        // Pause complete - return to peace with deeper breath
        if (this.listeningPauseProgress >= 1) {
            this.listeningPauseProgress = 0
            this._transitionTo(PHASE.PEACE)
            // Slight breath deepening after listening
            this.targetBreathSpeed = this.baseBreathSpeed * 0.9
        }
    }

    _processTension(delta, inputState) {
        const { velocity } = inputState

        // Breath quickens
        this.currentBreathSpeed = this.baseBreathSpeed * 1.4

        // Color dimming is applied in _applyEffects

        // Check for BLEEDING trigger
        if (velocity > this.config.bleedingVelocity) {
            this.tensionTime += delta
            if (this.tensionTime > this.config.bleedingDuration) {
                this._transitionTo(PHASE.BLEEDING)
                return
            }
        } else if (velocity < this.config.tensionVelocity) {
            // Calming down - return to peace
            this.tensionTime = Math.max(0, this.tensionTime - delta)
            if (this.tensionTime <= 0) {
                this._transitionTo(PHASE.PEACE)
            }
        }
    }

    _processBleeding(delta, inputState) {
        const { velocity, idleTime } = inputState

        // Accumulate bleeding time
        this.bleedingTime += delta

        // Trigger particle evaporation (replaces old gravity-based bleeding)
        this.particles.processEvaporation(delta, this.config.bleedRate)

        // Check for TRAUMA
        if (this.bleedingTime > this.config.traumaThreshold) {
            this.traumaLevel = Math.min(1, this.traumaLevel + delta * 0.2)
        }

        // Stillness stops bleeding
        if (idleTime > 0.3) {
            this._transitionTo(this.traumaLevel > 0.3 ? PHASE.TRAUMA : PHASE.HEALING)
            this.bleedingTime = 0
        }
    }

    _processTrauma(delta, inputState) {
        const { velocity, idleTime } = inputState

        // Apply scars
        this.particles.applyScars()

        // Set slower response
        this.particles.setResponseLag(0.3 + this.traumaLevel * 0.4) // 0.3-0.7 lerp factor reduction

        // Transition to healing after brief trauma acknowledgment
        if (this.phaseTime > 0.5) {
            this._transitionTo(PHASE.HEALING)
        }

        // But if movement resumes, back to peace (with trauma memory)
        if (velocity > 0.1) {
            this._transitionTo(PHASE.PEACE)
        }
    }

    _processHealing(delta, inputState) {
        const { velocity, idleTime } = inputState

        // Gradual breath deepening (not instant!)
        this.healingProgress += delta * this.config.healingRate
        const targetSpeed = this.baseBreathSpeed * (0.6 + 0.4 * (1 - Math.min(1, this.healingProgress)))
        this.currentBreathSpeed += (targetSpeed - this.currentBreathSpeed) * 0.02

        // Gradual trauma recovery
        this.traumaLevel = Math.max(0, this.traumaLevel - delta * 0.1)

        // Gradually restore response lag
        const currentLag = 0.3 + this.traumaLevel * 0.4
        this.particles.setResponseLag(currentLag)

        // Movement interrupts healing
        if (velocity > 0.1) {
            this._transitionTo(PHASE.PEACE)
            return
        }

        // Healing complete
        if (this.healingProgress >= 1 && this.traumaLevel < 0.1) {
            this.healingProgress = 0
            this._transitionTo(PHASE.PEACE)
        }
    }

    _transitionTo(newPhase) {
        if (this.DEBUG) {
            console.log(`[SPHERE] ${this.currentPhase} → ${newPhase}`)
        }
        this.currentPhase = newPhase
        this.phaseTime = 0

        // Reset phase-specific state
        switch (newPhase) {
            case PHASE.PEACE:
                this.targetBreathSpeed = this.baseBreathSpeed
                break
            case PHASE.LISTENING:
                this.listeningPauseProgress = 0
                break
            case PHASE.TENSION:
                // tensionTime carries over
                break
            case PHASE.BLEEDING:
                this.particles.startBleeding()
                break
            case PHASE.HEALING:
                this.healingProgress = 0
                this.particles.stopBleeding()
                break
        }
    }

    _applyEffects(delta, inputState) {
        const { position, velocity, isActive } = inputState

        // Breath speed interpolation
        this.currentBreathSpeed += (this.targetBreathSpeed - this.currentBreathSpeed) * 0.05
        this.particles.setBreathSpeed(this.currentBreathSpeed)

        // Phase-specific effects
        switch (this.currentPhase) {
            case PHASE.LISTENING:
                // Pause factor: smooth ease-in-out
                const pauseT = this.listeningPauseProgress
                const pauseFactor = pauseT < 0.5
                    ? 2 * pauseT * pauseT
                    : 1 - Math.pow(-2 * pauseT + 2, 2) / 2
                this.particles.setPauseFactor(pauseFactor)
                break

            case PHASE.TENSION:
            case PHASE.BLEEDING:
                // No instant color changes - handled below with gradient
                this.particles.setPauseFactor(0)

                // === DUAL-LAYER GOOSEBUMPS: Organic tension effect ===
                // Base layer stays constant for organic feel
                // Goosebumps layer (high-freq ripples) intensifies with tension
                const tensionIntensity = Math.min(1, this.tensionTime * 2.0)

                // Target goosebumps intensity: 0 (calm) → 0.05 (tense)
                const targetGoosebumps = tensionIntensity * 0.05

                // Smooth lerp for gradual appearance
                const currentGoosebumps = this.particles.material.uniforms.uGoosebumpsIntensity.value
                this.particles.material.uniforms.uGoosebumpsIntensity.value =
                    currentGoosebumps + (targetGoosebumps - currentGoosebumps) * 0.08
                break

            default:
                // Reset effects
                this.particles.setPauseFactor(0)

                // Return goosebumps to calm (fade out high-freq layer)
                const calmGoosebumps = this.particles.material.uniforms.uGoosebumpsIntensity.value
                this.particles.material.uniforms.uGoosebumpsIntensity.value =
                    calmGoosebumps + (0.0 - calmGoosebumps) * 0.03
        }

        // Calculate TARGET color progress based on velocity + tension
        // Higher velocity + longer tension = warmer colors (pink → ember)
        const targetColorProgress = Math.min(1,
            velocity * 0.8 +                    // instant velocity contribution
            this.tensionTime * 0.3 +            // accumulated tension
            (this.currentPhase === PHASE.BLEEDING ? 0.3 : 0) // boost in bleeding
        )

        // SMOOTH the color transition (lerp towards target, not instant)
        // This prevents jarring color jumps when velocity spikes
        const lerpFactor = 1 - Math.exp(-this.colorSmoothingSpeed * delta)
        this.currentColorProgress += (targetColorProgress - this.currentColorProgress) * lerpFactor
        this.particles.setColorProgress(this.currentColorProgress)

        // ═══════════════════════════════════════════════════════════
        // DYNAMIC uSIZE: Particles "contract" with tension
        // Philosophy: sphere "breathes freely" in peace, "contracts" under stress
        // ═══════════════════════════════════════════════════════════
        const { baseSize, maxSizeBoost, sizeSmoothSpeed } = this.sizeConfig
        const targetSize = baseSize + this.currentColorProgress * maxSizeBoost

        // Stroke gesture accelerates return to base size
        const strokeBoost = this.gestureReaction.strokeCalm * 2.0  // 2x faster when calming
        const effectiveSmoothSpeed = sizeSmoothSpeed + strokeBoost

        // Exponential smoothing
        const sizeLerpFactor = 1 - Math.exp(-effectiveSmoothSpeed * delta)
        this.currentSize += (targetSize - this.currentSize) * sizeLerpFactor
        this.particles.material.uniforms.uSize.value = this.currentSize

        // Apply rolling based on input (with trauma-adjusted response)
        if (isActive && this.currentPhase !== PHASE.LISTENING) {
            const delta = inputState.delta || { x: 0, y: 0 }
            // Multiply by large factor - delta is normalized (-1 to 1)
            this.particles.applyRolling(delta, 15.0 * this.particles.responseLag)
        } else if (this.currentPhase !== PHASE.LISTENING) {
            // When cursor leaves - keep rolling but attract particles back
            this.particles.returnToOrigin()
        }

        // ═══════════════════════════════════════════════════════════
        // CURSOR PROXIMITY EFFECT (Deep Interaction)
        // ═══════════════════════════════════════════════════════════
        this._updateCursorProximity(delta, inputState)

        // ═══════════════════════════════════════════════════════════
        // GESTURE REACTIONS (Stage 6)
        // ═══════════════════════════════════════════════════════════
        this._processGesture(delta, inputState)

        // ═══════════════════════════════════════════════════════════
        // EYE INTEGRATION
        // ═══════════════════════════════════════════════════════════
        if (this.eye) {
            // Eye follows cursor
            if (this.cursorOnSphere) {
                this.eye.lookAt(this.cursorWorldPos)
            }

            // Pupil dilation based on tension (inverse: dilates when calm, contracts when tense)
            // This mimics realistic fear response (pupils constrict under stress)
            const pupilDilation = 1 - this.currentColorProgress
            this.eye.setDilation(pupilDilation * 0.7)  // Max 70% dilation when calm

            // Pass tension to eye for micro-tremors
            this.eye.setTension(this.currentColorProgress)

            // Pass cursor proximity for aura glow
            this.eye.setCursorProximity(this.cursorInfluenceSmoothed)

            // Set emotional phase for mystical visual effects
            this.eye.setEmotionalPhase(this.currentPhase)

            // Phase-specific eye reactions
            switch (this.currentPhase) {
                case PHASE.LISTENING:
                    // Blink during listening pause
                    if (this.listeningPauseProgress > 0.3 && this.listeningPauseProgress < 0.4) {
                        this.eye.blink()
                    }
                    break

                case PHASE.BLEEDING:
                case PHASE.TRAUMA:
                    // Eyes close during pain/trauma
                    this.eye.setSleeping(true)
                    break

                default:
                    this.eye.setSleeping(false)
            }
        }

        // Update particles
        this.particles.update(delta, this.particles.material.uniforms.uTime.value + delta)
    }

    /**
     * Calculate cursor world position and apply proximity effects
     * Includes smart magnetism (repel/attract based on approach) and habituation
     */
    _updateCursorProximity(delta, inputState) {
        const { position, isActive, approachSpeed = 0, hoverDuration = 0 } = inputState
        const config = this.magnetismConfig

        // Target influence: 1.0 if active and on sphere, 0.0 otherwise
        let targetInfluence = 0

        if (isActive && this.camera) {
            // Create ray from camera through cursor
            const cursorNDC = new THREE.Vector2(position.x, position.y)
            this.raycaster.setFromCamera(cursorNDC, this.camera)

            // Intersect with sphere bounds
            const intersection = new THREE.Vector3()
            const ray = this.raycaster.ray

            if (ray.intersectSphere(this.sphereBounds, intersection)) {
                // Cursor is pointing at sphere - update world position
                this.cursorWorldPos.copy(intersection)
                this.cursorOnSphere = true
                targetInfluence = 1.0
            } else {
                // Cursor not on sphere - move influence point far away
                this.cursorOnSphere = false
            }
        }

        // Smooth the influence for gradual fade in/out
        const smoothSpeed = targetInfluence > this.cursorInfluenceSmoothed ? 8.0 : 3.0  // Faster fade in
        this.cursorInfluenceSmoothed += (targetInfluence - this.cursorInfluenceSmoothed) *
            (1 - Math.exp(-smoothSpeed * delta))

        // ═══════════════════════════════════════════════════════════
        // HABITUATION: Sphere "gets used to" cursor presence
        // After prolonged hover, reactions diminish
        // ═══════════════════════════════════════════════════════════
        if (this.cursorOnSphere && hoverDuration > 0.5) {
            // Build habituation over time
            const habituationRate = delta / config.habituationTime
            this.habituation = Math.min(1, this.habituation + habituationRate)
        } else {
            // Decay habituation when cursor moves or leaves
            this.habituation = Math.max(0, this.habituation - delta * config.habituationDecay)
        }

        // ═══════════════════════════════════════════════════════════
        // SMART MAGNETISM: Repel on fast approach, attract on slow
        // "Осторожный ребёнок — боится резких движений"
        // ═══════════════════════════════════════════════════════════
        let targetAttractionMod = 1.0

        if (approachSpeed < config.fastApproachThreshold) {
            // Fast approach → FLINCH (repulsion)
            targetAttractionMod = config.repulsionStrength
            // Brief tension spike from startle (reduced by habituation)
            const startleIntensity = 1 - this.habituation * 0.7
            this.tensionTime = Math.min(0.3, this.tensionTime + delta * 0.8 * startleIntensity)
        } else if (approachSpeed > config.slowApproachThreshold && approachSpeed < 0.1) {
            // Slow approach or stationary → attraction (particles lean in)
            targetAttractionMod = 1.0
        } else if (approachSpeed >= 0.1) {
            // Retreating → neutral/slight following
            targetAttractionMod = 0.5
        }

        // Smooth the attraction modifier
        this.attractionModifier += (targetAttractionMod - this.attractionModifier) * 0.15

        // Apply to particle system
        this.particles.setCursorWorldPos(this.cursorWorldPos)
        this.particles.setCursorInfluence(this.cursorInfluenceSmoothed)

        // Final attraction: base × velocity damping × magnetism modifier × (1 - habituation)
        // Habituation reduces reaction strength
        const attractionBase = this.cursorInfluenceSmoothed * 0.7
        const velocityDamping = Math.max(0, 1 - inputState.velocity * 3)
        const habituationDamping = 1 - this.habituation * 0.6  // Max 60% reduction
        const finalAttraction = attractionBase * velocityDamping * this.attractionModifier * habituationDamping
        this.particles.setCursorAttraction(finalAttraction)
    }


    /**
     * Process gesture-based emotional reactions
     * Maps gesture intent to sphere behavior
     */
    _processGesture(delta, inputState) {
        const { gestureType, angularVelocity, directionalConsistency, touchIntensity = 0 } = inputState
        const reaction = this.gestureReaction

        // Touch intensity modifier: 1.0 for mouse, 1.0-2.0 for touch based on pressure
        const intensityModifier = 1.0 + touchIntensity * 1.0

        // ═══════════════════════════════════════════════════════════
        // DECAY: All reactions fade over time
        // ═══════════════════════════════════════════════════════════
        reaction.strokeCalm = Math.max(0, reaction.strokeCalm - delta * 0.3)
        reaction.pokeStartle = Math.max(0, reaction.pokeStartle - delta * 2.0)  // Fast decay
        reaction.orbitSync = Math.max(0, reaction.orbitSync - delta * 0.4)
        reaction.trembleNervous = Math.max(0, reaction.trembleNervous - delta * 0.5)

        // ═══════════════════════════════════════════════════════════
        // GESTURE REACTIONS
        // ═══════════════════════════════════════════════════════════
        switch (gestureType) {
            case 'stroke':
                // CALMING: reduce tension, deepen breathing, press particles inward
                reaction.strokeCalm = Math.min(1, reaction.strokeCalm + delta * 0.8)

                // Slower, deeper breathing
                this.targetBreathSpeed = this.baseBreathSpeed * (0.7 - reaction.strokeCalm * 0.2)

                // Reduce tension actively
                this.tensionTime = Math.max(0, this.tensionTime - delta * 2)

                // Press particles closer to sphere (reduce noise displacement)
                const baseNoise = 0.08
                const pressedNoise = baseNoise * (1 - reaction.strokeCalm * 0.5)
                this.particles.setNoiseAmount(pressedNoise)
                break

            case 'poke':
                // STARTLE: instant tension spike, goosebumps burst, trigger ripple
                if (reaction.pokeStartle < 0.1) {
                    // Only trigger once per poke
                    reaction.pokeStartle = 1.0

                    // Instant tension spike (boosted by touch intensity)
                    this.tensionTime = Math.min(0.5, this.tensionTime + 0.3 * intensityModifier)

                    // Trigger ripple from cursor position
                    if (this.cursorOnSphere) {
                        // Convert world pos to local (undo mesh rotation)
                        const localOrigin = this.cursorWorldPos.clone()
                            .applyMatrix4(this.particles.mesh.matrixWorld.clone().invert())
                        this.particles.triggerRipple(localOrigin)
                    }
                }
                break

            case 'orbit':
                // HYPNOSIS (INVERSE): slow orbit = slow breathing, fast = faster
                reaction.orbitSync = Math.min(1, reaction.orbitSync + delta * 0.5)

                // Inverse relationship: slower orbit = calmer
                const orbitSpeed = Math.abs(angularVelocity)
                // Low orbit speed (< 1.5) -> breathing slows to 0.5x
                // High orbit speed (> 3.0) -> breathing rises to 1.2x
                const orbitBreathMultiplier = 0.5 + Math.min(orbitSpeed, 3.0) * 0.23
                this.targetBreathSpeed = this.baseBreathSpeed * orbitBreathMultiplier
                break

            case 'tremble':
                // NERVOUS: goosebumps max, quicker breathing (boosted by touch intensity)
                reaction.trembleNervous = Math.min(1, reaction.trembleNervous + delta * 1.5 * intensityModifier)

                // Accelerate breathing
                this.targetBreathSpeed = this.baseBreathSpeed * (1.3 + reaction.trembleNervous * 0.4)

                // Increase tension (can lead to bleeding) - also boosted
                this.tensionTime = Math.min(0.4, this.tensionTime + delta * 0.5 * intensityModifier)
                break

            default:
                // Reset noise amount when not stroking
                if (reaction.strokeCalm < 0.01) {
                    this.particles.setNoiseAmount(0.08)  // Base value
                }
        }

        // ═══════════════════════════════════════════════════════════
        // APPLY GESTURE EFFECTS TO GOOSEBUMPS
        // ═══════════════════════════════════════════════════════════
        const gestureGoosebumps =
            reaction.pokeStartle * 0.08 +   // Poke = burst
            reaction.trembleNervous * 0.06   // Tremble = sustained

        // Blend with existing tension-based goosebumps
        const currentTensionGoosebumps = this.particles.material.uniforms.uGoosebumpsIntensity.value
        const maxGestureContribution = Math.min(0.1, gestureGoosebumps)

        // Take the max of tension-based or gesture-based
        const targetGoosebumps = Math.max(currentTensionGoosebumps, maxGestureContribution)
        this.particles.material.uniforms.uGoosebumpsIntensity.value =
            currentTensionGoosebumps + (targetGoosebumps - currentTensionGoosebumps) * 0.15

        // ═══════════════════════════════════════════════════════════
        // SOUND INTEGRATION
        // ═══════════════════════════════════════════════════════════
        if (this.soundManager) {
            // Ambient hum tracks emotional tension
            this.soundManager.setAmbientIntensity(this.currentColorProgress)

            // Gesture-specific sounds
            switch (gestureType) {
                case 'stroke':
                    // Play soft chime when actively stroking
                    if (reaction.strokeCalm > 0.2) {
                        this.soundManager.playGestureSound('stroke', reaction.strokeCalm)
                    }
                    break
                case 'poke':
                    // Sharp click on startle
                    if (reaction.pokeStartle > 0.8) {
                        this.soundManager.playGestureSound('poke', intensityModifier)
                    }
                    break
                case 'tremble':
                    // Granular nervousness
                    if (reaction.trembleNervous > 0.3) {
                        this.soundManager.playGestureSound('tremble', reaction.trembleNervous)
                    }
                    break
            }

            // Bleeding sound when evaporating
            if (this.currentPhase === 'bleeding') {
                this.soundManager.triggerBleeding(this.currentColorProgress)
            }
        }

        // Update ripple animation
        this.particles.updateRipple(delta)
    }

    // Public API
    getPhase() {
        return this.currentPhase
    }

    getTraumaLevel() {
        return this.traumaLevel
    }

    setDebug(enabled) {
        this.DEBUG = enabled
    }

    dispose() {
        // Cleanup if needed
    }
}
