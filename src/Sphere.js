/**
 * Sphere.js — Emotional Response Orchestrator
 * 
 * Manages 7 emotional phases creating dialogue between user and sphere:
 * PEACE → LISTENING → TENSION → BLEEDING → TRAUMA → HEALING
 *                                                  ↑
 *                              RECOGNITION ────────┘ (hold gesture)
 */

import * as THREE from 'three'

// Emotional phases
export const PHASE = {
    PEACE: 'peace',           // Baseline breathing
    LISTENING: 'listening',   // Micro-pause when user stops (50-80ms)
    TENSION: 'tension',       // Breath quickens before bleeding
    BLEEDING: 'bleeding',     // Particle detachment with hesitation
    TRAUMA: 'trauma',         // Memory of pain (slower response)
    HEALING: 'healing',       // Gradual return to deeper breath
    RECOGNITION: 'recognition' // Hold gesture — "she heard, she understood"
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
        this.sizeMultiplier = 1.0        // Responsive multiplier (mobile = 1.4-1.8)
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
            trembleNervous: 0,      // 0-1, accumulated nervousness
            // New gestures (Stage 7)
            tapPulse: 0,            // 0-1, brief pulse on tap
            flickPush: 0,           // 0-1, push effect from flick
            hesitationSadness: 0,   // 0-1, slow sadness from hesitation
            spiralTrance: 0         // 0-1, deep trance from spiral
        }

        // ═══════════════════════════════════════════════════════════
        // EMOTION STATE (Gesture→Emotion Mapping)
        // Decouples visual appearance from PHASE state machine
        // ═══════════════════════════════════════════════════════════
        this.emotionState = {
            current: 'peace',    // peace | alert | trust | bleeding
            intensity: 0,        // 0-1 for fade effects
            decayRate: 0         // per-second decay
        }

        // Ripple effect state (poke reaction)
        this.ripple = {
            active: false,
            origin: new THREE.Vector3(),
            startTime: 0
        }

        // ═══════════════════════════════════════════════════════════
        // RECOGNITION PHASE (hold gesture response)
        // "Пауза. Узнавание." — patient presence calms and awakens
        // ═══════════════════════════════════════════════════════════
        this.recognitionConfig = {
            pauseDuration: 0.4,       // Phase 1: everything freezes
            recognitionDuration: 0.8, // Phase 2: understanding
            holdThreshold: 0.5,       // Min hold time to trigger
            calmingRate: 0.3,         // How fast hold calms trauma (per sec)
            faceRotationSpeed: 2.5    // Quaternion slerp speed for face-to-face turn
        }
        this.recognitionTouchPos = new THREE.Vector3()  // Where they touched
        this.recognitionProgress = 0    // 0-1 for animation
        this.wasInRecognition = false   // To detect exit from recognition
        this.targetFaceRotation = null  // THREE.Quaternion for face-to-face rotation

        // Sound Manager (set via setSoundManager after user interaction)
        this.soundManager = null

        // Memory Manager (emotional memory / trust system)
        this.memory = null

        // Haptic Manager (vibration feedback)
        this.haptic = null
        this.lastHapticPulse = 0  // Last time haptic pulse was triggered

        // Osmosis state (continuous hold gradient)
        this.osmosisActive = false
        this.osmosisDepth = 0  // Current osmosis depth 0-1

        // Inner Glow (Bioluminescence) — "Two rhythms: lungs and heart"
        this.innerGlowTime = 0
        this.innerGlowFrequency = 0.30  // Hz, independent from breathing (peace default)
        this.innerGlowConfig = {
            peace: { freq: 0.30, intensity: 0.40, color: 0xFFE4B5 },  // Warm amber
            listening: { freq: 0.40, intensity: 0.50, color: 0xFFD700 },  // Gold
            tension: { freq: 0.60, intensity: 0.70, color: 0xFFA500 },  // Orange
            bleeding: { freq: 1.00, intensity: 0.85, color: 0xFF6347 },  // Tomato
            trauma: { freq: 0.20, intensity: 0.30, color: 0x8B0000 },  // Dark red
            healing: { freq: 0.35, intensity: 0.45, color: 0x98FB98 },  // Pale green
            recognition: { freq: 0.25, intensity: 0.60, color: 0xE6E6FA }   // Lavender
        }

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

    /**
     * Set the memory manager (emotional memory system)
     * @param {MemoryManager} memoryManager - The memory manager instance
     */
    setMemoryManager(memoryManager) {
        this.memory = memoryManager

        // v3: Check return gap and prepare reaction
        if (memoryManager) {
            const { gap, level } = memoryManager.getReturnGap()
            this.returnReaction = { gap, level, processed: false }
        }
    }

    /**
     * Set responsive size multiplier (for mobile devices)
     * @param {number} multiplier - 1.0 (desktop) to 1.8 (mobile phones)
     */
    setSizeMultiplier(multiplier) {
        this.sizeMultiplier = multiplier
    }

    /**
     * Set the haptic manager (for vibration feedback)
     * @param {HapticManager} hm - The haptic manager instance
     */
    setHapticManager(hm) {
        this.haptic = hm
    }

    /**
     * Get current emotion phase for LivingCore visual appearance
     * Returns emotionState.current (gesture-driven) which controls colors
     * separate from PHASE state machine (gameplay mechanics)
     * @returns {string} peace | alert | trust | bleeding
     */
    getEmotionPhase() {
        return this.emotionState.current
    }

    update(delta, elapsed) {
        const inputState = this.input.getState()

        // Update phase time
        this.phaseTime += delta

        // Update memory with current emotional state
        if (this.memory) {
            this.memory.update(delta, this.currentPhase, inputState)
            // v3: Record gesture and phase for user profile
            this.memory.recordGesture(inputState.gestureType, delta)
            this.memory.recordPhase(this.currentPhase, delta)

            // Set trace positions in LOCAL/ORIGINAL space (match shader's aOriginalPos)
            // The shader compares trace positions against particle original positions,
            // which are in local space before mesh rotation is applied
            if (this.cursorOnSphere) {
                // Transform world position to local space (undo mesh rotation)
                const localPos = this.cursorWorldPos.clone()
                    .applyMatrix4(this.particles.mesh.matrixWorld.clone().invert())
                // Normalize to sphere surface (match Fibonacci distribution radius)
                localPos.normalize().multiplyScalar(this.particles.baseRadius)

                // Set positions for any traces waiting for position
                this.memory.setLatestGhostTracePosition(localPos)
                this.memory.setLatestWarmTracePosition(localPos)
            }
        }

        // v3: Process return reaction (once per session)
        this._processReturnReaction(elapsed)

        // ═══════════════════════════════════════════════════════════
        // OSMOSIS: Continuous Hold Gradient — "bidirectional membrane exchange"
        // Replaces phased recognition with smooth gradient
        // ═══════════════════════════════════════════════════════════
        const { holdDuration, isHolding } = inputState

        if (isHolding && this.cursorOnSphere && holdDuration > 0) {
            // Calculate osmosis depth (continuous gradient, no phases)
            const depth = this._calculateOsmosisDepth(holdDuration)
            this.osmosisDepth = depth

            // Start osmosis effects on first frame
            if (!this.osmosisActive && depth > 0) {
                this.osmosisActive = true
                this.recognitionTouchPos.copy(this.cursorWorldPos)

                // Start osmosis bass
                if (this.soundManager) {
                    this.soundManager.startOsmosisBass()
                }

                // Initial soft touch haptic
                if (this.haptic) {
                    this.haptic.softTouch()
                }

                // Lock eye gaze
                if (this.eye) {
                    this.eye.lockGaze(this.recognitionTouchPos)
                }
            }

            // Apply continuous osmosis effects
            if (depth > 0) {
                // Haptic heartbeat (every ~0.8s when depth > 0.1)
                if (this.haptic && depth > 0.1 && elapsed - this.lastHapticPulse > 0.8) {
                    this.haptic.heartbeat(depth)
                    this.lastHapticPulse = elapsed
                }

                // Sound: osmosis bass intensity
                if (this.soundManager) {
                    this.soundManager.setOsmosisDepth(depth)
                }

                // Visual: particle indent + amber warmth
                this.particles.setOsmosisDepth(depth)

                // Eye dilation follows depth
                if (this.eye) {
                    this.eye.setDilation(0.3 + depth * 0.7)
                }

                // Gradual calming (stronger with depth)
                const calmingRate = this.recognitionConfig.calmingRate
                const calmingAmount = delta * calmingRate * (1 + depth * 2)
                this.traumaLevel = Math.max(0, this.traumaLevel - calmingAmount * 0.5)
                this.tensionTime = Math.max(0, this.tensionTime - calmingAmount)

                // TRUST emotion for LivingCore (hold >0.5s = gold warmth)
                // Intensity grows with depth, slow decay on release
                this._setEmotion('trust', Math.min(1, depth + 0.3), 0.3)
            }
        } else if (this.osmosisActive) {
            // Hold released — exit osmosis
            this._exitOsmosis()
        }

        // Process current phase and check transitions
        this._processPhase(delta, inputState)

        // Update emotion state (gesture→emotion decay)
        this._updateEmotion(delta)

        // Update Inner Glow (Bioluminescence)
        this._updateInnerGlow(delta)

        // Update Sensitivity Zones drift
        this.particles.updateSensitivityDrift(delta)

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

            case PHASE.RECOGNITION:
                this._processRecognition(delta, inputState)
                break
        }
    }

    /**
     * Set emotion state for LivingCore visual appearance
     * @param {string} emotion - peace | alert | trust | bleeding
     * @param {number} intensity - 0-1
     * @param {number} decayRate - per-second decay rate
     */
    _setEmotion(emotion, intensity, decayRate) {
        this.emotionState.current = emotion
        this.emotionState.intensity = intensity
        this.emotionState.decayRate = decayRate

        // Debug logging (temporary)
        // console.log(`[EMOTION] → ${emotion} (intensity=${intensity.toFixed(2)}, decay=${decayRate})`)
    }

    /**
     * Update emotion state - decay intensity over time
     * @param {number} delta - Frame delta time
     */
    _updateEmotion(delta) {
        const e = this.emotionState
        e.intensity = Math.max(0, e.intensity - delta * e.decayRate)

        // Return to peace when emotion fades
        if (e.intensity <= 0 && e.current !== 'peace') {
            e.current = 'peace'
        }
    }

    _processPeace(delta, inputState) {
        const { velocity, idleTime, gestureType } = inputState

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

        // ═══════════════════════════════════════════════════════════
        // GESTURE → EMOTION MAPPING (replaces velocity-based triggers)
        // Only affects LivingCore colors, NOT the PHASE state machine
        // ═══════════════════════════════════════════════════════════
        switch (gestureType) {
            case 'poke':
            case 'tremble':
            case 'flick':
                // Alert: brief warm flash (1-2s)
                this._setEmotion('alert', 1.0, 2.0)
                break

            case 'spiral':
                // Bleeding: deep trance pulse
                this._setEmotion('bleeding', 0.8, 0.2)
                break

            // Gentle gestures → stay peace (no action needed)
            // case 'hover':
            // case 'moving':
            // case 'stroke':
            // case 'tap':
        }

        // Gradual trauma recovery in peace (modified by trust level)
        if (this.traumaLevel > 0) {
            const decayMod = this.memory ? this.memory.getTensionDecayModifier() : 1.0
            this.traumaLevel = Math.max(0, this.traumaLevel - delta * 0.05 * decayMod)
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

        // Check for TRAUMA (threshold modified by trust level)
        const thresholdMod = this.memory ? this.memory.getTraumaThresholdModifier() : 1.0
        if (this.bleedingTime > this.config.traumaThreshold * thresholdMod) {
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

    /**
     * Process RECOGNITION phase — hold gesture response
     * "Пауза. Узнавание." — patient presence calms and awakens
     */
    _processRecognition(delta, inputState) {
        const cfg = this.recognitionConfig
        const t = this.phaseTime
        const { holdDuration, isHolding } = inputState

        // ═══════════════════════════════════════════════════════════
        // ФАЗА 1: ПАУЗА (0 - pauseDuration)
        // "Она услышала" — everything freezes
        // ═══════════════════════════════════════════════════════════
        if (t < cfg.pauseDuration) {
            const pauseProgress = t / cfg.pauseDuration  // 0 → 1

            // ═══════════════════════════════════════════════════════════
            // FACE-TO-FACE ROTATION: Sphere turns to face the touch point
            // ═══════════════════════════════════════════════════════════
            if (!this.targetFaceRotation) {
                this.targetFaceRotation = this._computeFaceToFaceRotation(this.recognitionTouchPos)
            }

            // Smoothly rotate sphere toward touch point
            const currentQuat = new THREE.Quaternion()
            currentQuat.setFromEuler(this.particles.mesh.rotation)
            currentQuat.slerp(this.targetFaceRotation, delta * cfg.faceRotationSpeed)
            this.particles.mesh.rotation.setFromQuaternion(currentQuat)

            // Sync eye rotation with sphere
            if (this.eye) {
                this.eye.setSphereRotation(this.particles.mesh.rotation)
            }

            // Breathing stops
            this.particles.setBreathSpeed(this.baseBreathSpeed * (1 - pauseProgress))

            // Particles freeze (via pauseFactor)
            this.particles.setPauseFactor(pauseProgress)

            // Eye locks on touch point
            if (this.eye) {
                this.eye.lockGaze(this.recognitionTouchPos)
            }

            // Sound: ambient fades out, recognition hum starts
            if (this.soundManager) {
                this.soundManager.setAmbientIntensity(1 - pauseProgress)
                // Start recognition hum at the beginning of pause
                if (pauseProgress < 0.1) {
                    this.soundManager.playRecognitionHum()
                }
            }
        }

        // ═══════════════════════════════════════════════════════════
        // ФАЗА 2: УЗНАВАНИЕ (pauseDuration - pauseDuration + recognitionDuration)
        // "Она поняла" — pupil dilates, glow, pulsation
        // ═══════════════════════════════════════════════════════════
        else if (t < cfg.pauseDuration + cfg.recognitionDuration) {
            const recogT = (t - cfg.pauseDuration) / cfg.recognitionDuration  // 0 → 1
            this.recognitionProgress = recogT

            // Continue rotation toward touch point (may not have finished in PAUSE)
            if (this.targetFaceRotation) {
                const currentQuat = new THREE.Quaternion()
                currentQuat.setFromEuler(this.particles.mesh.rotation)
                currentQuat.slerp(this.targetFaceRotation, delta * cfg.faceRotationSpeed)
                this.particles.mesh.rotation.setFromQuaternion(currentQuat)

                if (this.eye) {
                    this.eye.setSphereRotation(this.particles.mesh.rotation)
                }
            }

            // Pupil dilates (0.3 → 1.0)
            if (this.eye) {
                this.eye.setDilation(0.3 + recogT * 0.7)
            }

            // Touch glow around touch point
            this.particles.setTouchGlow(this.recognitionTouchPos, recogT)

            // Sound: recognition hum intensifies
            if (this.soundManager) {
                this.soundManager.setRecognitionIntensity(recogT)
            }

            // Pulsation (heartbeat, ~2 Hz)
            const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5  // 0-1 oscillating
            this.particles.setPulse(pulse * recogT * 0.3)  // Max 30% size boost

            // Continue calming trauma while holding
            if (isHolding) {
                const calmingAmount = delta * cfg.calmingRate * (1 + holdDuration * 0.5)
                this.traumaLevel = Math.max(0, this.traumaLevel - calmingAmount)
                this.tensionTime = Math.max(0, this.tensionTime - calmingAmount * 2)
            }
        }

        // ═══════════════════════════════════════════════════════════
        // EXIT: If hold released or phases complete → return to PEACE/HEALING
        // ═══════════════════════════════════════════════════════════
        if (!isHolding) {
            // Released — graceful exit
            this._exitRecognition()
            return
        }

        // If phases complete but still holding — stay in recognition (loop phase 2)
        if (t >= cfg.pauseDuration + cfg.recognitionDuration) {
            // Continue calming while holding
            const calmingAmount = delta * cfg.calmingRate * (1 + holdDuration * 0.5)
            this.traumaLevel = Math.max(0, this.traumaLevel - calmingAmount)
            this.tensionTime = Math.max(0, this.tensionTime - calmingAmount * 2)

            // Keep pulsating
            const pulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5
            this.particles.setPulse(pulse * 0.3)
        }
    }

    /**
     * Clean exit from RECOGNITION phase
     */
    _exitRecognition() {
        // Clear glow and pulse
        this.particles.clearTouchGlow()
        this.particles.setPulse(0)

        // Stop recognition hum
        if (this.soundManager) {
            this.soundManager.stopRecognitionHum()
        }

        // Unlock eye gaze
        if (this.eye) {
            this.eye.unlockGaze()
        }

        // Clear face rotation target
        this.targetFaceRotation = null

        // Return to appropriate phase
        if (this.traumaLevel > 0.2) {
            this._transitionTo(PHASE.HEALING)
        } else {
            this._transitionTo(PHASE.PEACE)
        }

        this.recognitionProgress = 0
        this.wasInRecognition = false
    }

    /**
     * Calculate osmosis depth from hold duration
     * Continuous gradient: 0-0.3s → 0, 0.3-2s → 0→0.7, 2-5s → 0.7→1.0
     * @param {number} holdDuration - Time holding in seconds
     * @returns {number} Depth 0-1
     */
    _calculateOsmosisDepth(holdDuration) {
        if (holdDuration < 0.3) return 0
        if (holdDuration < 2) return (holdDuration - 0.3) / 1.7 * 0.7
        if (holdDuration < 5) return 0.7 + (holdDuration - 2) / 3 * 0.3
        return 1.0
    }

    /**
     * Clean exit from osmosis state
     */
    _exitOsmosis() {
        // Clear visual effects
        this.particles.setOsmosisDepth(0)

        // Stop osmosis bass
        if (this.soundManager) {
            this.soundManager.stopOsmosisBass()
        }

        // Unlock eye gaze
        if (this.eye) {
            this.eye.unlockGaze()
        }

        // Reset state
        this.osmosisActive = false
        this.osmosisDepth = 0
    }

    /**
     * Update Inner Glow (Bioluminescence) — independent pulsation rhythm
     * "Two rhythms — lungs and heart. They almost match, but not quite."
     * @param {number} delta - Time since last frame
     */
    _updateInnerGlow(delta) {
        // Advance glow time at current frequency
        this.innerGlowTime += delta * this.innerGlowFrequency

        // Sinusoidal pulsation with subtle noise for organic feel
        const baseGlow = Math.sin(this.innerGlowTime * Math.PI * 2) * 0.5 + 0.5
        const noise = (Math.random() - 0.5) * 0.05  // ±2.5% variation
        const glowPhase = Math.max(0, Math.min(1, baseGlow + noise))

        // Get current config for intensity and color
        const config = this.innerGlowConfig[this.currentPhase] || this.innerGlowConfig.peace

        // Apply to particle system
        this.particles.setInnerGlow(glowPhase, config.intensity, config.color)
    }

    /**
     * Update inner glow parameters for new phase
     * Called when phase transitions
     * @param {string} phase - New emotional phase
     */
    _updateInnerGlowForPhase(phase) {
        const config = this.innerGlowConfig[phase] || this.innerGlowConfig.peace
        this.innerGlowFrequency = config.freq
        // Intensity and color will be applied in _updateInnerGlow each frame
    }

    /**
     * Compute target rotation to face the touch point
     * The eye is at local (0, 0, baseRadius) — north pole of sphere
     * We want to rotate the sphere so the north pole points toward touchPos
     * @param {THREE.Vector3} touchPos - World position of touch point
     * @returns {THREE.Quaternion} Target rotation
     */
    _computeFaceToFaceRotation(touchPos) {
        // Direction from center to touch point (normalized)
        const toTouch = touchPos.clone().normalize()

        // The eye is at the north pole (0, 0, 1) in local space
        const northPole = new THREE.Vector3(0, 0, 1)

        // Compute quaternion that rotates north pole to point toward touch
        const targetRotation = new THREE.Quaternion()
        targetRotation.setFromUnitVectors(northPole, toTouch)

        return targetRotation
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

        // Sync haptic heartbeat with emotional phase
        if (this.haptic && typeof this.haptic.setPhase === 'function') {
            this.haptic.setPhase(newPhase)
        }

        // Sync eye emotional state with phase
        if (this.eye) {
            this.eye.setEmotionalPhase(newPhase)
        }

        // Update inner glow frequency for new phase
        this._updateInnerGlowForPhase(newPhase)
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
        const baseSize = this.sizeConfig.baseSize * this.sizeMultiplier
        const maxSizeBoost = this.sizeConfig.maxSizeBoost * this.sizeMultiplier
        const sizeSmoothSpeed = this.sizeConfig.sizeSmoothSpeed
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
        this._applyEyeEffects()

        // Update particles
        this.particles.update(delta, this.particles.material.uniforms.uTime.value + delta)
    }

    /**
     * Apply eye-related visual effects based on emotional state
     */
    _applyEyeEffects() {
        if (!this.eye) return

        // ═══════════════════════════════════════════════════════════
        // GAZE BEHAVIOR: Avoidance vs Seeking based on emotional state
        // ═══════════════════════════════════════════════════════════
        if (this.cursorOnSphere) {
            if (this.currentPhase === PHASE.TRAUMA || this.currentColorProgress > 0.7) {
                // High tension / trauma: eye looks AWAY from cursor (avoidance)
                // "She can't look at what hurts her"
                this.eye.lookAwayFrom(this.cursorWorldPos, this.currentColorProgress)
            } else if (this.currentPhase === PHASE.HEALING) {
                // Healing: eye actively SEEKS cursor (curiosity, reconnection)
                // "She's ready to trust again"
                this.eye.seekCursor(this.cursorWorldPos)
            } else {
                // Normal gaze tracking
                this.eye.lookAt(this.cursorWorldPos)
            }
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

    /**
     * Calculate cursor world position and apply proximity effects
     * Includes smart magnetism (repel/attract based on approach) and habituation
     */
    _updateCursorProximity(delta, inputState) {
        // Skip cursor proximity updates during RECOGNITION
        // This prevents rolling mechanics from interfering with face-to-face rotation
        if (this.currentPhase === PHASE.RECOGNITION) {
            return
        }

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
        const { gestureType, touchIntensity = 0 } = inputState
        const reaction = this.gestureReaction

        // Touch intensity modifier: 1.0 for mouse, 1.0-2.0 for touch based on pressure
        const intensityModifier = 1.0 + touchIntensity * 1.0

        // ═══════════════════════════════════════════════════════════
        // DECAY: All reactions fade over time
        // ═══════════════════════════════════════════════════════════
        this._decayGestureReactions(delta)

        // ═══════════════════════════════════════════════════════════
        // GESTURE REACTIONS — via handler methods
        // ═══════════════════════════════════════════════════════════
        const context = { delta, inputState, intensityModifier, reaction }

        switch (gestureType) {
            case 'stroke':
                this._handleStroke(context)
                break
            case 'poke':
                this._handlePoke(context)
                break
            case 'orbit':
                this._handleOrbit(context)
                break
            case 'tremble':
                this._handleTremble(context)
                break
            case 'tap':
                this._handleTap(context)
                break
            case 'flick':
                this._handleFlick(context)
                break
            case 'hesitation':
                this._handleHesitation(context)
                break
            case 'spiral':
                this._handleSpiral(context)
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
        this._applyGestureGoosebumps()

        // ═══════════════════════════════════════════════════════════
        // SOUND INTEGRATION
        // ═══════════════════════════════════════════════════════════
        this._applyGestureSound(gestureType, intensityModifier)

        // Update ripple animation
        this.particles.updateRipple(delta)
    }

    /**
     * Decay all gesture reactions over time
     */
    _decayGestureReactions(delta) {
        const reaction = this.gestureReaction
        reaction.strokeCalm = Math.max(0, reaction.strokeCalm - delta * 0.3)
        reaction.pokeStartle = Math.max(0, reaction.pokeStartle - delta * 2.0)  // Fast decay
        reaction.orbitSync = Math.max(0, reaction.orbitSync - delta * 0.4)
        reaction.trembleNervous = Math.max(0, reaction.trembleNervous - delta * 0.5)
        // New gesture decays (Stage 7)
        reaction.tapPulse = Math.max(0, reaction.tapPulse - delta * 3.0)  // Very fast decay
        reaction.flickPush = Math.max(0, reaction.flickPush - delta * 2.5)  // Fast decay
        reaction.hesitationSadness = Math.max(0, reaction.hesitationSadness - delta * 0.15)  // Slow decay
        reaction.spiralTrance = Math.max(0, reaction.spiralTrance - delta * 0.2)  // Slow decay
    }

    /**
     * STROKE: Calming — reduce tension, deepen breathing, press particles inward
     */
    _handleStroke({ delta, inputState, reaction }) {
        reaction.strokeCalm = Math.min(1, reaction.strokeCalm + delta * 0.8)

        // Record positive event in memory
        if (this.memory) this.memory.recordEvent('stroke', delta)

        // Slower, deeper breathing
        this.targetBreathSpeed = this.baseBreathSpeed * (0.7 - reaction.strokeCalm * 0.2)

        // Reduce tension actively
        this.tensionTime = Math.max(0, this.tensionTime - delta * 2)

        // Press particles closer to sphere (reduce noise displacement)
        const baseNoise = 0.08
        const pressedNoise = baseNoise * (1 - reaction.strokeCalm * 0.5)
        this.particles.setNoiseAmount(pressedNoise)

        // WARM TRACE: Create when prolonged stroke in same zone
        // "She remembers where it was soft"
        if (this.memory && this.cursorOnSphere) {
            const strokeZoneDuration = inputState.strokeZoneDuration || 0
            const threshold = this.memory.config.warmTraceThreshold
            const minInterval = this.memory.config.warmTraceMinInterval
            const timeSince = this.memory.currentElapsed - this.memory.lastWarmTraceTime

            if (strokeZoneDuration > threshold && timeSince > minInterval) {
                this.memory.createWarmTrace()
            }
        }
    }

    /**
     * POKE: Startle — instant tension spike, goosebumps burst, trigger ripple
     */
    _handlePoke({ intensityModifier, reaction }) {
        if (reaction.pokeStartle >= 0.1) return  // Only trigger once per poke

        reaction.pokeStartle = 1.0

        // Record negative event in memory
        if (this.memory) this.memory.recordEvent('poke', intensityModifier)

        // Instant tension spike (boosted by touch intensity)
        this.tensionTime = Math.min(0.5, this.tensionTime + 0.3 * intensityModifier)

        // Trigger ripple from cursor position
        if (this.cursorOnSphere) {
            const localOrigin = this.cursorWorldPos.clone()
                .applyMatrix4(this.particles.mesh.matrixWorld.clone().invert())
            this.particles.triggerRipple(localOrigin)
        }
    }

    /**
     * ORBIT: Hypnosis (inverse) — slow orbit = slow breathing, fast = faster
     */
    _handleOrbit({ delta, inputState, reaction }) {
        reaction.orbitSync = Math.min(1, reaction.orbitSync + delta * 0.5)

        // Inverse relationship: slower orbit = calmer
        const orbitSpeed = Math.abs(inputState.angularVelocity)
        // Low orbit speed (<1.5) -> breathing slows to 0.5x
        // High orbit speed (>3.0) -> breathing rises to 1.2x
        const orbitBreathMultiplier = 0.5 + Math.min(orbitSpeed, 3.0) * 0.23
        this.targetBreathSpeed = this.baseBreathSpeed * orbitBreathMultiplier
    }

    /**
     * TREMBLE: Nervous — goosebumps max, quicker breathing
     */
    _handleTremble({ delta, intensityModifier, reaction }) {
        reaction.trembleNervous = Math.min(1, reaction.trembleNervous + delta * 1.5 * intensityModifier)

        // Record negative event in memory
        if (this.memory) this.memory.recordEvent('tremble', delta)

        // Accelerate breathing
        this.targetBreathSpeed = this.baseBreathSpeed * (1.3 + reaction.trembleNervous * 0.4)

        // Increase tension (can lead to bleeding) - also boosted
        this.tensionTime = Math.min(0.4, this.tensionTime + delta * 0.5 * intensityModifier)
    }

    /**
     * TAP: Brief affirmation pulse — "я тут" / "I'm here"
     */
    _handleTap({ reaction }) {
        if (reaction.tapPulse >= 0.1) return  // Only trigger once per tap

        reaction.tapPulse = 1.0

        // Brief size pulse (15% boost)
        this.particles.setPulse(0.15)

        // Trigger soft glow at touch position
        if (this.cursorOnSphere) {
            this.particles.setTouchGlow(this.cursorWorldPos, 0.5)
        }

        // Eye briefly dilates (friendly acknowledgment)
        if (this.eye) {
            this.eye.setDilation(0.8)
        }
    }

    /**
     * FLICK: Fast dismissive gesture — like poke but exits screen
     */
    _handleFlick({ intensityModifier, reaction }) {
        if (reaction.flickPush >= 0.1) return  // Only trigger once per flick

        reaction.flickPush = 1.0

        // Record negative event (like poke)
        if (this.memory) this.memory.recordEvent('poke', intensityModifier * 0.8)

        // Tension spike (slightly less than poke)
        this.tensionTime = Math.min(0.4, this.tensionTime + 0.2 * intensityModifier)

        // Trigger ripple with push direction
        if (this.cursorOnSphere) {
            const localOrigin = this.cursorWorldPos.clone()
                .applyMatrix4(this.particles.mesh.matrixWorld.clone().invert())
            this.particles.triggerRipple(localOrigin)
        }

        // Create ghost trace (cold memory)
        if (this.memory && this.cursorOnSphere) {
            this.memory.createGhostTrace()
            this.memory.setLatestGhostTracePosition(this.cursorWorldPos)
        }
    }

    /**
     * HESITATION: Approach → pause → retreat — sphere feels the uncertainty
     * "Она грустит + зеркалит" — sadness + mirroring
     */
    _handleHesitation({ delta, reaction }) {
        reaction.hesitationSadness = Math.min(1, reaction.hesitationSadness + delta * 1.5)

        // Slow down breathing (heaviness, sadness)
        this.targetBreathSpeed = this.baseBreathSpeed * (0.5 - reaction.hesitationSadness * 0.2)

        // Compress particles slightly (withdrawal)
        const compressionAmount = reaction.hesitationSadness * 0.03
        this.particles.setNoiseAmount(0.08 - compressionAmount)

        // Eye seeks cursor (longing, wanting connection)
        if (this.eye && this.cursorOnSphere) {
            this.eye.seekCursor(this.cursorWorldPos)
        }
    }

    /**
     * SPIRAL: Deep trance — orbit + shrinking radius
     * "Глубокий транс" — breathing stops, pupil max, particles pause
     */
    _handleSpiral({ delta, reaction }) {
        reaction.spiralTrance = Math.min(1, reaction.spiralTrance + delta * 0.8)

        // Breathing stops gradually
        this.targetBreathSpeed = this.baseBreathSpeed * (1 - reaction.spiralTrance * 0.9)

        // Pupil dilates to maximum (hypnosis)
        if (this.eye) {
            this.eye.setDilation(0.3 + reaction.spiralTrance * 0.7)  // 0.3 → 1.0
        }

        // Particles slow down (entering trance)
        this.particles.setPauseFactor(reaction.spiralTrance * 0.6)

        // Reduce tension (calming trance)
        this.tensionTime = Math.max(0, this.tensionTime - delta * reaction.spiralTrance)
    }

    /**
     * Apply gesture effects to goosebumps uniform
     */
    _applyGestureGoosebumps() {
        const reaction = this.gestureReaction
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
    }

    /**
     * Apply gesture-specific sounds
     */
    _applyGestureSound(gestureType, intensityModifier) {
        if (!this.soundManager) return

        const reaction = this.gestureReaction

        // Ambient hum tracks emotional tension
        this.soundManager.setAmbientIntensity(this.currentColorProgress)

        // Gesture-specific sounds
        switch (gestureType) {
            case 'stroke':
                if (reaction.strokeCalm > 0.2) {
                    this.soundManager.playGestureSound('stroke', reaction.strokeCalm)
                }
                break
            case 'poke':
                if (reaction.pokeStartle > 0.8) {
                    this.soundManager.playGestureSound('poke', intensityModifier)
                }
                break
            case 'tremble':
                if (reaction.trembleNervous > 0.3) {
                    this.soundManager.playGestureSound('tremble', reaction.trembleNervous)
                }
                break
            case 'tap':
                if (reaction.tapPulse > 0.8) {
                    this.soundManager.playGestureSound('tap', 0.5)
                }
                break
            case 'flick':
                if (reaction.flickPush > 0.8) {
                    this.soundManager.playGestureSound('flick', intensityModifier)
                }
                break
            case 'spiral':
                if (reaction.spiralTrance > 0.3) {
                    this.soundManager.playGestureSound('spiral', reaction.spiralTrance)
                }
                break
        }

        // Bleeding sound when evaporating
        if (this.currentPhase === 'bleeding') {
            this.soundManager.triggerBleeding(this.currentColorProgress)
        }
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

    // ═══════════════════════════════════════════════════════════════════
    // v3: RETURN REACTION — "she remembers you"
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Process return reaction based on time since last visit
     * Called once per session, triggers special greeting behavior
     * @param {number} elapsed - Current elapsed time
     * @private
     */
    _processReturnReaction(elapsed) {
        if (!this.returnReaction || this.returnReaction.processed) return

        // Wait a moment before reacting (0.5s delay for natural feel)
        if (elapsed < 0.5) return

        const { level } = this.returnReaction
        this.returnReaction.processed = true

        // Different reactions based on absence duration
        switch (level) {
            case 'first':
                // First visit: subtle curiosity
                this._triggerReturnEffect('curious', 0.3)
                break

            case 'short':
                // < 1 hour: brief acknowledgment
                this._triggerReturnEffect('acknowledge', 0.2)
                break

            case 'medium':
                // 1 hour - 1 day: happy to see you
                this._triggerReturnEffect('happy', 0.5)
                break

            case 'long':
                // 1 day - 1 week: very happy, missed you
                this._triggerReturnEffect('excited', 0.7)
                break

            case 'very_long':
                // > 1 week: special reunion
                this._triggerReturnEffect('reunion', 1.0)
                break
        }
    }

    /**
     * Trigger visual/audio effect for return reaction
     * @param {string} type - Effect type
     * @param {number} intensity - Effect intensity (0-1)
     * @private
     */
    _triggerReturnEffect(type, intensity) {
        // Visual: pulse the inner glow
        if (this.particles) {
            // Brief size pulse
            this.particles.setPulse(intensity * 0.2)

            // Schedule pulse decay
            setTimeout(() => {
                this.particles.setPulse(0)
            }, 800)
        }

        // LivingCore: warm flash
        if (this.livingCore) {
            const flashIntensity = 0.3 + intensity * 0.5
            this.livingCore.triggerFlash(flashIntensity)
        }

        // Haptic: gentle greeting
        if (this.haptic && intensity > 0.3) {
            this.haptic.softTouch()
        }

        // Sound: greeting tone (will be expanded in 3.5)
        if (this.soundManager && intensity > 0.4) {
            // Use existing sound system for now
            // Will be replaced with procedural greeting in v3.5
        }

        // Eye: brief attention
        if (this.eye && intensity > 0.3) {
            // Look toward camera briefly
            this.eye.unlockGaze()
        }
    }

    dispose() {
        // Cleanup if needed
    }

    // ═══════════════════════════════════════════════════════════════════
    // MATH UTILITIES
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    _lerp(a, b, t) {
        return a + (b - a) * t
    }

    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value))
    }

    /**
     * Smoothstep interpolation (ease in-out)
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Input value
     * @returns {number} Smoothly interpolated value (0-1)
     */
    _smoothstep(edge0, edge1, x) {
        const t = this._clamp((x - edge0) / (edge1 - edge0), 0, 1)
        return t * t * (3 - 2 * t)
    }
}
