/**
 * Sphere.js — Emotional Response Orchestrator
 * 
 * Manages 6 emotional phases creating dialogue between user and sphere:
 * PEACE → LISTENING → TENSION → BLEEDING → TRAUMA → HEALING
 */

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
    constructor(particleSystem, inputManager) {
        this.particles = particleSystem
        this.input = inputManager

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

        // Debug
        this.DEBUG = false
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
                // Color dimming + hue shift to cooler
                this.particles.setColorTint(0.6)
                this.particles.setColorHue(-0.08)
                this.particles.setPauseFactor(0)
                break

            case PHASE.BLEEDING:
                // Intense, back to normal color for contrast with lime
                this.particles.setColorTint(1.0)
                this.particles.setPauseFactor(0)
                break

            default:
                // Reset effects
                this.particles.setPauseFactor(0)
                this.particles.setColorTint(1.0)
                this.particles.setColorHue(0)
        }

        // Apply rolling based on input (with trauma-adjusted response)
        if (isActive && this.currentPhase !== PHASE.LISTENING) {
            const delta = inputState.delta || { x: 0, y: 0 }
            // Multiply by large factor - delta is normalized (-1 to 1)
            this.particles.applyRolling(delta, 15.0 * this.particles.responseLag)
        } else if (this.currentPhase !== PHASE.LISTENING) {
            // When cursor leaves - keep rolling but attract particles back
            this.particles.returnToOrigin()
        }

        // Update particles
        this.particles.update(delta, this.particles.material.uniforms.uTime.value + delta)
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
