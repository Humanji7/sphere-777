/**
 * SonicOrganism.js — Living Sound System
 * 
 * A continuous, multi-layered sound synthesis engine that breathes with the sphere.
 * Unlike event-triggered sounds, this runs every frame, mapping state to sound.
 * 
 * Philosophy: Sound is not a reaction. Sound is the sphere's continuous presence made audible.
 * 
 * Architecture (7 Layers):
 *   L1: Spectral Body - 32 harmonics, additive synthesis
 *   L2: Pulse Network - 5 polyrhythmic LFOs
 *   L3: Granular Membrane - Touch texture (future)
 *   L4: Formant Voice - Vowel-like presence (future)
 *   L5: Spatial Field - 3D audio (future)
 *   L6: Memory Resonance - Evolving state (future)
 *   L7: Genre Morphing - Style crossfade (future)
 */

export class SonicOrganism {
    constructor(audioContext = null) {
        // Use provided AudioContext or create new one
        this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)()

        // Master output
        this.masterGain = this.audioContext.createGain()
        this.masterGain.gain.value = 0.15  // Start quiet, blend with SoundManager
        this.masterGain.connect(this.audioContext.destination)

        // State tracking for smooth interpolation
        this.currentTrustIndex = 0.5
        this.currentProximity = 0
        this.currentColorProgress = 0
        this.currentEmotionalState = 'PEACE'

        // Debug mode
        this.debug = false
        this.frameCount = 0

        // Initialize layers
        this._initSpectralBody()
        this._initPulseNetwork()

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume()
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 1: SPECTRAL BODY — 32 Harmonics (Additive Synthesis)
    // The base "vocal timbre" of the sphere
    // ═══════════════════════════════════════════════════════════════════════

    _initSpectralBody() {
        const FUNDAMENTAL = 55  // A1, deep base tone
        const HARMONIC_COUNT = 32

        // Group gain nodes for band control
        this.spectralGain = this.audioContext.createGain()
        this.spectralGain.gain.value = 1.0
        this.spectralGain.connect(this.masterGain)

        // 4 frequency bands with separate control
        this.bands = {
            bass: { gain: null, harmonics: [], range: [1, 4] },      // H1-H4
            lowMid: { gain: null, harmonics: [], range: [5, 12] },   // H5-H12
            highMid: { gain: null, harmonics: [], range: [13, 20] }, // H13-H20
            treble: { gain: null, harmonics: [], range: [21, 32] }   // H21-H32
        }

        // Create band gain nodes
        for (const bandName in this.bands) {
            const band = this.bands[bandName]
            band.gain = this.audioContext.createGain()
            band.gain.gain.value = 0.8
            band.gain.connect(this.spectralGain)
        }

        // Create 32 harmonics
        this.harmonics = []
        for (let i = 1; i <= HARMONIC_COUNT; i++) {
            const harmonic = this._createHarmonic(FUNDAMENTAL, i, HARMONIC_COUNT)
            this.harmonics.push(harmonic)

            // Route to appropriate band
            if (i <= 4) {
                harmonic.gain.connect(this.bands.bass.gain)
                this.bands.bass.harmonics.push(harmonic)
            } else if (i <= 12) {
                harmonic.gain.connect(this.bands.lowMid.gain)
                this.bands.lowMid.harmonics.push(harmonic)
            } else if (i <= 20) {
                harmonic.gain.connect(this.bands.highMid.gain)
                this.bands.highMid.harmonics.push(harmonic)
            } else {
                harmonic.gain.connect(this.bands.treble.gain)
                this.bands.treble.harmonics.push(harmonic)
            }
        }

        // Start all oscillators
        const now = this.audioContext.currentTime
        this.harmonics.forEach(h => h.oscillator.start(now))
    }

    _createHarmonic(fundamental, n, total) {
        const freq = fundamental * n

        // Oscillator (sine for pure harmonics)
        const oscillator = this.audioContext.createOscillator()
        oscillator.type = 'sine'
        oscillator.frequency.value = freq

        // Natural amplitude rolloff: higher harmonics are quieter
        // Using 1/n for harmonic series character
        const baseAmplitude = 1 / (n * 0.8)

        // Gain node for individual control
        const gain = this.audioContext.createGain()
        gain.gain.value = baseAmplitude * 0.3  // Scale down for mixing

        // Slight random detuning for organic feel (±3 cents)
        const detune = (Math.random() - 0.5) * 6
        oscillator.detune.value = detune

        // Connect
        oscillator.connect(gain)

        return {
            oscillator,
            gain,
            baseAmplitude,
            n,
            freq
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 2: PULSE NETWORK — 5 Polyrhythmic LFOs
    // Vital signs that never repeat exactly
    // ═══════════════════════════════════════════════════════════════════════

    _initPulseNetwork() {
        // Golden ratio for irrational rhythms
        const PHI = 1.618033988749

        // 5 LFOs with different rates
        this.pulses = {
            master: { lfo: null, rate: 1.0, phase: 0 },           // 60bpm base
            breath: { lfo: null, rate: 1 / 3, phase: 0 },           // Slow ~20bpm
            heartbeat: { lfo: null, rate: PHI, phase: 0 },        // Golden ratio
            neural: { lfo: null, rate: 13, phase: 0 },            // Fast shimmer
            swell: { lfo: null, rate: 1 / 7, phase: 0 }             // Very slow oceanic
        }

        // Create LFO oscillators (we'll read their values via AnalyserNode)
        for (const pulseName in this.pulses) {
            const pulse = this.pulses[pulseName]

            pulse.lfo = this.audioContext.createOscillator()
            pulse.lfo.type = 'sine'
            pulse.lfo.frequency.value = pulse.rate

            // Connect to a gain node we can read (not to audio output)
            pulse.analyser = this.audioContext.createAnalyser()
            pulse.analyser.fftSize = 32

            // Need a tiny gain to keep signal alive but inaudible
            pulse.lfoGain = this.audioContext.createGain()
            pulse.lfoGain.gain.value = 0.001  // Essentially silent

            pulse.lfo.connect(pulse.lfoGain)
            pulse.lfoGain.connect(this.masterGain)  // Keep oscillator alive

            pulse.lfo.start(this.audioContext.currentTime)
        }

        // Buffer for reading LFO values
        this.pulseBuffer = new Float32Array(32)
    }

    /**
     * Get current pulse values (0-1 range)
     * Uses mathematical calculation for efficiency (no FFT needed)
     */
    _getPulseValues(elapsed) {
        const values = {}
        for (const pulseName in this.pulses) {
            const pulse = this.pulses[pulseName]
            // sin gives -1 to 1, normalize to 0-1
            values[pulseName] = (Math.sin(elapsed * pulse.rate * Math.PI * 2) + 1) / 2
        }
        return values
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE LOOP — Called every frame from main.js
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Main update function — synthesizes sound based on current sphere state
     * @param {Object} state - Current sphere state
     * @param {number} state.trustIndex - 0-1 trust level from MemoryManager
     * @param {number} state.proximity - 0-1 cursor distance (1 = touching)
     * @param {number} state.colorProgress - 0-1 emotional tension
     * @param {string} state.emotionalState - 'PEACE', 'FEAR', 'SHY', etc.
     * @param {boolean} state.isActive - Is user currently interacting
     * @param {number} elapsed - Total elapsed time in seconds
     */
    update(state = {}, elapsed = 0) {
        const {
            trustIndex = 0.5,
            proximity = 0,
            colorProgress = 0,
            emotionalState = 'PEACE',
            isActive = false
        } = state

        // Smooth interpolation for all values (lerp with 0.05 factor)
        const lerp = 0.05
        this.currentTrustIndex += (trustIndex - this.currentTrustIndex) * lerp
        this.currentProximity += (proximity - this.currentProximity) * lerp
        this.currentColorProgress += (colorProgress - this.currentColorProgress) * lerp
        this.currentEmotionalState = emotionalState

        // Get current pulse values
        const pulses = this._getPulseValues(elapsed)

        // Apply Layer 1: Spectral Body
        this._updateSpectralBody(pulses, elapsed)

        // Apply Layer 2: Pulse Network modulation
        this._applyPulseModulation(pulses)

        // Debug logging (every 60 frames)
        if (this.debug && this.frameCount % 60 === 0) {
            console.log('[SonicOrganism] Frame update:', {
                trustIndex: this.currentTrustIndex.toFixed(2),
                proximity: this.currentProximity.toFixed(2),
                colorProgress: this.currentColorProgress.toFixed(2),
                masterPulse: pulses.master.toFixed(2),
                harmonicsActive: this.harmonics.length
            })
        }
        this.frameCount++
    }

    /**
     * Update spectral body based on state
     * Trust → spectral tilt (warm/cold)
     * Proximity → upper harmonics boost
     */
    _updateSpectralBody(pulses, elapsed) {
        const now = this.audioContext.currentTime

        // Trust affects even/odd harmonic balance (warm = more even harmonics)
        // Trust 0 = cold (odd harmonics), Trust 1 = warm (even harmonics)
        const warmth = this.currentTrustIndex

        // Proximity boosts upper harmonics
        const proximityBoost = this.currentProximity * 0.5

        // Emotional state affects overall brightness
        const tensionBrightness = this.currentColorProgress * 0.3

        // Update each harmonic
        this.harmonics.forEach((harmonic, index) => {
            const n = harmonic.n
            const isEven = n % 2 === 0

            // Base amplitude with 1/n rolloff
            let amplitude = harmonic.baseAmplitude

            // Trust modulation: even harmonics boosted by warmth
            if (isEven) {
                amplitude *= (0.5 + warmth * 0.5)
            } else {
                amplitude *= (1 - warmth * 0.3)
            }

            // Proximity boost for upper harmonics
            if (n > 12) {
                amplitude *= (1 + proximityBoost * (n / 32))
            }

            // Tension brightens everything slightly
            amplitude *= (1 + tensionBrightness)

            // Apply master pulse modulation (gentle amplitude sway)
            amplitude *= (0.8 + pulses.master * 0.2)

            // Update gain with smooth ramp
            harmonic.gain.gain.linearRampToValueAtTime(
                amplitude * 0.3,  // Scale factor
                now + 0.016      // ~1 frame
            )

            // Breath pulse modulates frequency slightly for upper harmonics
            if (n > 8) {
                const freqMod = 1 + (pulses.breath - 0.5) * 0.002 * (n / 32)
                harmonic.oscillator.frequency.linearRampToValueAtTime(
                    harmonic.freq * freqMod,
                    now + 0.016
                )
            }
        })

        // Band-level adjustments
        // Bass gets subtle heartbeat accent
        this.bands.bass.gain.gain.linearRampToValueAtTime(
            0.7 + pulses.heartbeat * 0.15,
            now + 0.016
        )

        // Treble gets neural flicker
        this.bands.treble.gain.gain.linearRampToValueAtTime(
            0.3 + pulses.neural * 0.1 + proximityBoost * 0.3,
            now + 0.016
        )
    }

    /**
     * Apply pulse network modulation to master volume
     */
    _applyPulseModulation(pulses) {
        const now = this.audioContext.currentTime

        // Emotional swell affects overall volume
        const swellMod = 0.8 + pulses.swell * 0.2

        // Base volume depends on proximity (louder when interacting)
        const baseVolume = 0.1 + this.currentProximity * 0.1

        // Final master volume
        const targetVolume = baseVolume * swellMod

        this.masterGain.gain.linearRampToValueAtTime(
            targetVolume,
            now + 0.05
        )
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONTROL API
    // ═══════════════════════════════════════════════════════════════════════

    setDebug(enabled) {
        this.debug = enabled
    }

    setVolume(volume) {
        const now = this.audioContext.currentTime
        this.masterGain.gain.linearRampToValueAtTime(
            Math.max(0, Math.min(1, volume)),
            now + 0.1
        )
    }

    mute() {
        this.setVolume(0)
    }

    unmute() {
        this.setVolume(0.15)
    }

    /**
     * Cleanup resources
     */
    dispose() {
        // Stop all harmonics
        this.harmonics.forEach(h => {
            h.oscillator.stop()
            h.oscillator.disconnect()
            h.gain.disconnect()
        })

        // Stop all pulses
        for (const pulseName in this.pulses) {
            const pulse = this.pulses[pulseName]
            pulse.lfo.stop()
            pulse.lfo.disconnect()
            pulse.lfoGain.disconnect()
        }

        // Disconnect bands
        for (const bandName in this.bands) {
            this.bands[bandName].gain.disconnect()
        }

        this.spectralGain.disconnect()
        this.masterGain.disconnect()
    }
}
