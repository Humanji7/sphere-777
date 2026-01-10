/**
 * HapticManager - Living Heartbeat Vibration System
 * 
 * Provides haptic patterns synchronized with the sphere's emotional state:
 * - softTouch: Initial contact feedback
 * - heartbeat: On-demand rhythmic pulse during deep contact
 * - Continuous BPM-based heartbeat tied to emotional phases
 * 
 * Philosophy: "You feel her pulse through the screen"
 */
export class HapticManager {
    constructor() {
        this.supported = 'vibrate' in navigator
        this.lastBeat = 0

        // ═══════════════════════════════════════════════════════════
        // CONTINUOUS HEARTBEAT STATE
        // ═══════════════════════════════════════════════════════════
        this.isActive = false
        this.phase = 'peace'

        // Current BPM and derived interval
        this.currentBPM = 65
        this.beatInterval = 60000 / this.currentBPM  // ms between beats

        // Rhythm variation (organic feel)
        this.rhythmVariation = 0.1     // ±10% timing variation
        this.intensityBase = 15        // ms base pulse duration
        this.intensityVariation = 0.2  // ±20% intensity variation

        // Pattern type for current phase
        this.pattern = 'steady'
    }

    // ═══════════════════════════════════════════════════════════
    // CONTINUOUS HEARTBEAT API
    // ═══════════════════════════════════════════════════════════

    /**
     * Start continuous heartbeat synchronized with sphere
     * @param {string} phase - Emotional phase: 'peace', 'listening', 'tension', etc.
     */
    startHeartbeat(phase = 'peace') {
        this.isActive = true
        this.phase = phase
        this._updatePhaseParameters(phase)
    }

    /**
     * Stop continuous heartbeat
     */
    stopHeartbeat() {
        this.isActive = false
    }

    /**
     * Set emotional phase (called from Sphere when phase changes)
     * Updates BPM, intensity, and pattern to match emotional state
     * @param {string} phase - Emotional phase name
     */
    setPhase(phase) {
        if (this.phase !== phase) {
            this.phase = phase
            this._updatePhaseParameters(phase)
        }
    }

    /**
     * Update heartbeat parameters based on emotional phase
     * @private
     */
    _updatePhaseParameters(phase) {
        // Phase-specific heartbeat characteristics
        // "Each emotion has its own pulse"
        const params = {
            peace: {
                bpm: 65,
                intensity: 15,
                variation: 0.08,
                pattern: 'steady'
            },
            listening: {
                bpm: 75,
                intensity: 18,
                variation: 0.10,
                pattern: 'steady'
            },
            tension: {
                bpm: 100,
                intensity: 25,
                variation: 0.15,
                pattern: 'accelerating'
            },
            bleeding: {
                bpm: 130,
                intensity: 35,
                variation: 0.25,
                pattern: 'chaotic'
            },
            trauma: {
                bpm: 55,
                intensity: 40,
                variation: 0.05,
                pattern: 'heavy'
            },
            healing: {
                bpm: 70,
                intensity: 20,
                variation: 0.12,
                pattern: 'recovering'
            },
            recognition: {
                bpm: 60,
                intensity: 25,
                variation: 0.05,
                pattern: 'synchronized'
            }
        }

        const p = params[phase] || params.peace
        this.currentBPM = p.bpm
        this.beatInterval = 60000 / p.bpm
        this.intensityBase = p.intensity
        this.rhythmVariation = p.variation
        this.pattern = p.pattern
    }

    /**
     * Call every frame from Sphere.update() or main.js
     * Triggers heartbeat pulses based on internal BPM
     * @param {number} delta - Time since last frame (unused but available)
     * @param {number} elapsed - Total elapsed time in seconds
     */
    update(delta, elapsed) {
        if (!this.isActive || !this.supported) return

        const now = performance.now()
        const timeSinceLastBeat = now - this.lastBeat

        // Apply rhythm variation for organic feel
        const variation = 1 + (Math.random() - 0.5) * 2 * this.rhythmVariation
        const currentInterval = this.beatInterval * variation

        if (timeSinceLastBeat >= currentInterval) {
            this._beat()
            this.lastBeat = now
        }
    }

    /**
     * Single heartbeat pulse with pattern-specific behavior
     * @private
     */
    _beat() {
        // Intensity variation for organic feel
        const intensityVar = 1 + (Math.random() - 0.5) * 2 * this.intensityVariation
        const duration = Math.floor(this.intensityBase * intensityVar)

        // Pattern-specific vibration behavior
        switch (this.pattern) {
            case 'steady':
                // Simple single pulse
                navigator.vibrate(duration)
                break

            case 'heavy':
                // Double beat (lub-dub) — trauma/weight
                navigator.vibrate([duration, 80, Math.floor(duration * 0.7)])
                break

            case 'chaotic':
                // Random skips — panic/bleeding
                if (Math.random() > 0.15) {
                    navigator.vibrate(duration)
                }
                // Else: skip beat (arrhythmia)
                break

            case 'synchronized':
                // Stronger double pulse — recognition/connection
                navigator.vibrate([duration, 50, Math.floor(duration * 0.5)])
                break

            case 'accelerating':
                // Slightly longer pulses — building tension
                navigator.vibrate(Math.floor(duration * 1.2))
                break

            case 'recovering':
                // Softer, gentler pulses — healing
                navigator.vibrate(Math.floor(duration * 0.8))
                break

            default:
                navigator.vibrate(duration)
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ON-DEMAND HAPTIC PATTERNS (existing API)
    // ═══════════════════════════════════════════════════════════

    /**
     * Soft impulse on initial touch
     */
    softTouch() {
        if (!this.supported) return
        navigator.vibrate(10)
    }

    /**
     * Heartbeat pattern for deep contact (osmosis)
     * @param {number} intensity - 0 to 1, affects pulse duration
     */
    heartbeat(intensity) {
        if (!this.supported) return
        const duration = Math.floor(20 + intensity * 30)
        navigator.vibrate([duration, 100, duration])
    }

    /**
     * Sharp startle response (for poke gesture)
     */
    startle() {
        if (!this.supported) return
        navigator.vibrate([5, 30, 15, 50, 10])
    }

    /**
     * Gentle calming pulse (for stroke gesture)
     */
    calm() {
        if (!this.supported) return
        navigator.vibrate(8)
    }
}
