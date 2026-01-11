/**
 * SonicOrganism.js — Living Sound System
 * 
 * A continuous, multi-layered sound synthesis engine that breathes with the sphere.
 * Unlike event-triggered sounds, this runs every frame, mapping state to sound.
 * 
 * Philosophy: Sound is not a reaction. Sound is the sphere's continuous presence made audible.
 * 
 * Architecture (11 Layers):
 *   L1: Spectral Body - 32 harmonics @ 165Hz
 *   L1.5: Breath Noise - Async filtered white noise
 *   L2: Pulse Network - 5 polyrhythmic LFOs
 *   L3: Granular Membrane - Touch texture
 *   L4: Formant Voice - Vowel-like presence + micro-vibrato
 *   L5: Spatial Field - HRTF 3D audio
 *   L6: Memory Resonance - Evolving state (future)
 *   L7: Genre Morphing - Style crossfade (future)
 *   L10: Sub-Bass - 82.5Hz warmth foundation
 *   L11: Reverb - Delay-based room simulation
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

        // 🔬 Layer Isolation for debugging "bee buzz" issue
        // Set any to false to disable that layer and isolate the problem
        this.layerEnabled = {
            spectral: true,      // L1: 32 harmonics @ 165Hz + detune
            breathNoise: true,   // L1.5: White noise with async envelope
            formantVoice: true,  // L4: Vowel filters + vibrato
            spatial: true,       // L5: HRTF panner
            subBass: true,       // L10: 82.5Hz warmth foundation
            reverb: true         // L11: Delay-based room simulation
        }

        // Granular membrane state (L3)
        this.granularNode = null
        this.granularReady = false

        // Initialize layers
        this._initSpectralBody()
        this._initPulseNetwork()
        this._initGranularMembrane()  // L3: Tactile grain cloud
        this._initBreathNoise()        // L1.5: Breath texture layer
        this._initSpatialField()       // L5: 3D audio positioning
        this._initFormantVoice()       // L4: Vowel presence layer
        this._initSubBass()            // L10: Warmth foundation
        this._initReverb()             // L11: Room simulation

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
        const FUNDAMENTAL = 165  // E3 (sweet spot between 110 drone and 220 mosquito)
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

        // Graduated detuning for organic "chorus" feel
        // Minimal detune: 3-2-1 cents — just enough warmth, no buzz
        const detuneCents = n <= 2 ? 3 : n <= 8 ? 2 : 1
        const detune = (Math.random() - 0.5) * detuneCents * 2
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
    // LAYER 3: GRANULAR MEMBRANE — Touch Texture (50-200 grains)
    // Tactile "skin" that responds to physical contact
    // ═══════════════════════════════════════════════════════════════════════

    async _initGranularMembrane() {
        // Check for AudioWorklet support
        if (!this.audioContext.audioWorklet) {
            console.warn('[SonicOrganism] AudioWorklet not supported, skipping granular membrane')
            return
        }

        try {
            // Register the worklet processor
            await this.audioContext.audioWorklet.addModule('/worklets/GranularProcessor.js')

            // Create the worklet node
            this.granularNode = new AudioWorkletNode(this.audioContext, 'granular-processor')

            // Create a gain node for granular output level control
            this.granularGain = this.audioContext.createGain()
            this.granularGain.gain.value = 0.4  // Blend with spectral body

            // Connect: spectral body → granular (as feedback input) → master
            // This allows grains to sample the organism's own output
            this.spectralGain.connect(this.granularNode)
            this.granularNode.connect(this.granularGain)
            this.granularGain.connect(this.masterGain)

            this.granularReady = true
            console.log('[SonicOrganism] Granular membrane initialized')

        } catch (error) {
            console.error('[SonicOrganism] Failed to initialize granular membrane:', error)
        }
    }

    /**
     * Update granular membrane based on touch state
     * @param {Object} touch - Touch state from InputManager
     * @param {number} touch.x - X position (-1 to 1)
     * @param {number} touch.y - Y position (-1 to 1)
     * @param {number} touch.velocity - Movement velocity
     * @param {number} touch.intensity - Touch pressure/radius (0-1)
     * @param {number} touch.holdDuration - How long held in place
     * @param {string} touch.gestureType - Current gesture classification
     * @param {Array} ghostTraces - Active ghost traces for frozen loops
     */
    _updateGranularMembrane(touch = {}, ghostTraces = []) {
        if (!this.granularReady || !this.granularNode) return

        const {
            x = 0,
            y = 0,
            velocity = 0,
            intensity = 0,
            holdDuration = 0,
            gestureType = 'idle'
        } = touch

        // Determine if touch is actively interacting
        const isActive = gestureType !== 'idle' && (intensity > 0 || velocity > 0.01)

        // Map touch X to pitch (±2 octaves: 0.25 to 4.0)
        // Center (x=0) = 1.0, Left = lower pitch, Right = higher pitch
        const pitch = Math.pow(2, x * 2)  // -1 → 0.25, 0 → 1.0, 1 → 4.0

        // Map touch Y to grain size (top = short 5ms, bottom = long 500ms)
        // Y is inverted: +1 = top, -1 = bottom
        // Convert to samples at 48kHz: 5ms = 240 samples, 500ms = 24000 samples
        const grainSizeMs = 5 + (1 - (y + 1) / 2) * 495  // 5-500ms
        const grainSizeSamples = Math.floor(grainSizeMs * 48)  // @ 48kHz

        // Map velocity to density (slow = 5/sec, fast = 200/sec)
        // Use logarithmic scaling for natural feel
        const velocityNorm = Math.min(velocity / 0.5, 1)  // Normalize to 0-1
        const density = 5 + velocityNorm * 195  // 5-200 grains/sec

        // Map intensity to attack sharpness (light = soft 0.2, hard = sharp 0.01)
        const attack = 0.2 - intensity * 0.19  // 0.2 → 0.01

        // Check for freeze (ghost traces present and close to touch point)
        const freeze = ghostTraces.length > 0

        // Send parameters to worklet
        this.granularNode.port.postMessage({
            type: 'params',
            density,
            pitch,
            grainSize: grainSizeSamples,
            attack,
            freeze,
            active: isActive
        })

        // Adjust granular gain based on proximity and hold duration
        // Louder when touching, softer when hovering
        const now = this.audioContext.currentTime
        const targetGain = isActive ? 0.3 + intensity * 0.3 : 0.1
        this.granularGain.gain.linearRampToValueAtTime(targetGain, now + 0.05)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 1.5: BREATH NOISE — Filtered white noise with asymmetric envelope
    // "Air" in the sound — inhale faster than exhale (matches visual pow 1.6)
    // ═══════════════════════════════════════════════════════════════════════

    _initBreathNoise() {
        // Create white noise buffer
        const bufferSize = this.audioContext.sampleRate * 2  // 2 seconds
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
        const output = noiseBuffer.getChannelData(0)

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1
        }

        // Noise source (looping)
        this.breathNoise = this.audioContext.createBufferSource()
        this.breathNoise.buffer = noiseBuffer
        this.breathNoise.loop = true

        // Bandpass filter (200-800Hz for breath texture)
        this.breathFilter = this.audioContext.createBiquadFilter()
        this.breathFilter.type = 'bandpass'
        this.breathFilter.frequency.value = 400  // Center frequency, will be modulated
        this.breathFilter.Q.value = 1.5

        // Envelope gain (asymmetric attack/release controlled in update)
        this.breathGain = this.audioContext.createGain()
        this.breathGain.gain.value = 0  // Start silent

        // Connect chain: noise → filter → gain → master (at -12dB relative)
        this.breathNoise.connect(this.breathFilter)
        this.breathFilter.connect(this.breathGain)
        this.breathGain.connect(this.masterGain)

        // Start noise source
        this.breathNoise.start(this.audioContext.currentTime)

        // Track breath phase for asymmetric envelope
        this.breathPhase = 0
        this.lastBreathUpdate = 0
    }

    /**
     * Update breath noise layer based on breath pulse
     * @param {number} breathValue - Current breath pulse (0-1)
     * @param {number} elapsed - Total elapsed time
     */
    _updateBreathNoise(breathValue, elapsed) {
        if (!this.breathGain || !this.breathFilter) return

        const now = this.audioContext.currentTime

        // Asymmetric envelope matching visual pow(1.6) asymmetry
        // Inhale (rising): fast attack (0.3s)
        // Exhale (falling): slow release (0.8s)
        const attackTime = 0.3
        const releaseTime = 0.8

        // Determine if we're in attack or release phase
        const dt = elapsed - this.lastBreathUpdate
        this.lastBreathUpdate = elapsed

        // Target amplitude based on breath value (-12dB = 0.25 relative)
        const targetAmplitude = breathValue * 0.04  // -12dB from master @ 0.15

        // Choose ramp time based on direction
        const currentGain = this.breathGain.gain.value
        const rampTime = targetAmplitude > currentGain ? attackTime : releaseTime

        // Apply envelope
        this.breathGain.gain.linearRampToValueAtTime(targetAmplitude, now + Math.min(rampTime, 0.1))

        // Modulate filter frequency with breath (200-800Hz range)
        const filterFreq = 200 + breathValue * 600
        this.breathFilter.frequency.linearRampToValueAtTime(filterFreq, now + 0.05)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 5: SPATIAL FIELD — HRTF 3D audio positioning
    // Sound follows cursor position in 3D space (quick win: 20 lines)
    // ═══════════════════════════════════════════════════════════════════════

    _initSpatialField() {
        // Create HRTF panner for binaural audio
        this.spatialPanner = this.audioContext.createPanner()
        this.spatialPanner.panningModel = 'HRTF'
        this.spatialPanner.distanceModel = 'inverse'
        this.spatialPanner.refDistance = 1
        this.spatialPanner.maxDistance = 10000
        this.spatialPanner.rolloffFactor = 1

        // Set listener at origin
        const listener = this.audioContext.listener
        if (listener.positionX) {
            listener.positionX.value = 0
            listener.positionY.value = 0
            listener.positionZ.value = 0
        }

        // Insert panner between spectral gain and master
        // spectral → panner → master (instead of spectral → master)
        this.spectralGain.disconnect()
        this.spectralGain.connect(this.spatialPanner)
        this.spatialPanner.connect(this.masterGain)

        // Track cursor position for spatial
        this.cursorX = 0
        this.cursorY = 0
    }

    /**
     * Update spatial positioning based on cursor
     * @param {number} x - Cursor X (-1 to 1)
     * @param {number} y - Cursor Y (-1 to 1)
     */
    _updateSpatialField(x, y) {
        if (!this.spatialPanner) return

        // Map cursor to 3D position
        // X becomes left-right, Y becomes up-down, Z stays fixed
        const posX = x * 2  // -2 to 2 range
        const posY = y * 2  // -2 to 2 range
        const posZ = -1     // In front of listener

        const now = this.audioContext.currentTime

        if (this.spatialPanner.positionX) {
            // Modern API with AudioParam
            this.spatialPanner.positionX.linearRampToValueAtTime(posX, now + 0.05)
            this.spatialPanner.positionY.linearRampToValueAtTime(posY, now + 0.05)
            this.spatialPanner.positionZ.linearRampToValueAtTime(posZ, now + 0.05)
        } else {
            // Legacy API
            this.spatialPanner.setPosition(posX, posY, posZ)
        }

        this.cursorX = x
        this.cursorY = y
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 4: FORMANT VOICE — Vowel-like presence with micro-vibrato
    // Creates near-vocalization "almost words" that respond to emotion
    // ═══════════════════════════════════════════════════════════════════════

    _initFormantVoice() {
        // Formant frequencies for different vowels (based on human vocal tract)
        this.vowelFormants = {
            // [a] - Peace, Open acceptance
            a: { f1: 730, f2: 1090, f3: 2440 },
            // [o] - Trust, Warm embrace
            o: { f1: 570, f2: 840, f3: 2410 },
            // [i] - Curiosity, Reaching out
            i: { f1: 270, f2: 2290, f3: 3010 },
            // [ɪ] - Fear, Withdrawal
            fear: { f1: 400, f2: 1920, f3: 2560 }
        }

        // Create formant filter bank (5 parallel bandpass filters)
        this.formantFilters = []
        this.formantGains = []

        // Main formant output gain (-6dB idle, 0dB active)
        this.formantMasterGain = this.audioContext.createGain()
        this.formantMasterGain.gain.value = 0.1  // Start at -6dB equivalent
        this.formantMasterGain.connect(this.masterGain)

        // Create 5 formant resonators
        for (let i = 0; i < 5; i++) {
            const filter = this.audioContext.createBiquadFilter()
            filter.type = 'bandpass'
            filter.Q.value = 10 + i * 5  // Increasing Q for higher formants

            const gain = this.audioContext.createGain()
            gain.gain.value = 0.2 / (i + 1)  // Decreasing amplitude for higher formants

            // Connect spectral body through formants
            this.spectralGain.connect(filter)
            filter.connect(gain)
            gain.connect(this.formantMasterGain)

            this.formantFilters.push(filter)
            this.formantGains.push(gain)
        }

        // Initialize to neutral [a] vowel
        this._setVowel('a')

        // Micro-vibrato LFO (5-7 Hz natural vocal cord tremor)
        this.vibratoLFO = this.audioContext.createOscillator()
        this.vibratoLFO.type = 'sine'
        this.vibratoLFO.frequency.value = 6  // 6 Hz tremor

        this.vibratoGain = this.audioContext.createGain()
        this.vibratoGain.gain.value = 5  // ±5 Hz depth

        // Connect LFO to modulate formant frequencies
        this.vibratoLFO.connect(this.vibratoGain)
        this.formantFilters.forEach(filter => {
            this.vibratoGain.connect(filter.frequency)
        })

        this.vibratoLFO.start(this.audioContext.currentTime)

        // Track current vowel blend
        this.currentVowelMix = { a: 1, o: 0, i: 0, fear: 0 }
    }

    /**
     * Set formant frequencies to match a vowel
     */
    _setVowel(vowelName) {
        const vowel = this.vowelFormants[vowelName]
        if (!vowel) return

        const now = this.audioContext.currentTime

        // F1, F2, F3 are primary formants
        if (this.formantFilters[0]) {
            this.formantFilters[0].frequency.linearRampToValueAtTime(vowel.f1, now + 0.1)
        }
        if (this.formantFilters[1]) {
            this.formantFilters[1].frequency.linearRampToValueAtTime(vowel.f2, now + 0.1)
        }
        if (this.formantFilters[2]) {
            this.formantFilters[2].frequency.linearRampToValueAtTime(vowel.f3, now + 0.1)
        }
        // F4, F5 are harmonics of lower formants
        if (this.formantFilters[3]) {
            this.formantFilters[3].frequency.linearRampToValueAtTime(vowel.f1 * 1.5, now + 0.1)
        }
        if (this.formantFilters[4]) {
            this.formantFilters[4].frequency.linearRampToValueAtTime(vowel.f2 * 1.2, now + 0.1)
        }
    }

    /**
     * Blend between vowels based on mix ratios
     */
    _blendVowels(mix) {
        const now = this.audioContext.currentTime
        const blended = { f1: 0, f2: 0, f3: 0 }

        // Weight each vowel's formants
        for (const [vowelName, weight] of Object.entries(mix)) {
            const vowel = this.vowelFormants[vowelName]
            if (vowel && weight > 0) {
                blended.f1 += vowel.f1 * weight
                blended.f2 += vowel.f2 * weight
                blended.f3 += vowel.f3 * weight
            }
        }

        // Apply blended formants
        if (this.formantFilters[0]) {
            this.formantFilters[0].frequency.linearRampToValueAtTime(blended.f1, now + 0.1)
        }
        if (this.formantFilters[1]) {
            this.formantFilters[1].frequency.linearRampToValueAtTime(blended.f2, now + 0.1)
        }
        if (this.formantFilters[2]) {
            this.formantFilters[2].frequency.linearRampToValueAtTime(blended.f3, now + 0.1)
        }
    }

    /**
     * Update formant voice based on emotional state
     * Maps trust, tension, and activity to vowel blending and vibrato
     */
    _updateFormantVoice(state = {}) {
        if (!this.formantFilters || this.formantFilters.length === 0) return

        const {
            trustIndex = 0.5,
            colorProgress = 0,
            isActive = false,
            holdSaturation = 0
        } = state

        const now = this.audioContext.currentTime

        // Emotional Morphing (from implementation plan B.2):
        // - High trust → [a] → [o] (warm, open)
        // - High tension (colorProgress) → [a] → [ɪ] (fearful)
        // - Active interaction → louder formant, stronger vibrato
        // - Hold saturation → deep [o] with intense tremor

        let vowelMix = { a: 0, o: 0, i: 0, fear: 0 }

        if (holdSaturation > 0.5) {
            // Deep hold: dominated by [o] with some [a]
            vowelMix.o = 0.7 + holdSaturation * 0.3
            vowelMix.a = 1 - vowelMix.o
        } else if (colorProgress > 0.5) {
            // High tension: shift toward [ɪ] (fear)
            vowelMix.fear = colorProgress
            vowelMix.a = 1 - colorProgress
        } else if (trustIndex > 0.6) {
            // High trust: warm [o] with [a]
            vowelMix.o = (trustIndex - 0.5) * 2
            vowelMix.a = 1 - vowelMix.o
        } else {
            // Neutral: mostly [a] with hint of [i] (curiosity)
            vowelMix.a = 0.7
            vowelMix.i = 0.3
        }

        // Normalize mix
        const total = Object.values(vowelMix).reduce((a, b) => a + b, 0)
        if (total > 0) {
            for (const key in vowelMix) {
                vowelMix[key] /= total
            }
        }

        this._blendVowels(vowelMix)
        this.currentVowelMix = vowelMix

        // Update formant volume: -6dB idle, 0dB active
        const targetFormantGain = isActive ? 0.25 : 0.1
        this.formantMasterGain.gain.linearRampToValueAtTime(targetFormantGain, now + 0.1)

        // Update vibrato: deeper on hold, faster on tension
        if (this.vibratoGain && this.vibratoLFO) {
            // Vibrato depth: base ±5Hz, up to ±15Hz on hold saturation
            const vibratoDepth = 5 + holdSaturation * 10
            this.vibratoGain.gain.linearRampToValueAtTime(vibratoDepth, now + 0.1)

            // Vibrato rate: base 6Hz, up to 8Hz on high tension
            const vibratoRate = 6 + colorProgress * 2
            this.vibratoLFO.frequency.linearRampToValueAtTime(vibratoRate, now + 0.1)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 10: SUB-BASS — Warmth Foundation (82.5Hz sine)
    // Octave below 165Hz fundamental, direct to master (non-directional)
    // ═══════════════════════════════════════════════════════════════════════

    _initSubBass() {
        this.subBassOsc = this.audioContext.createOscillator()
        this.subBassOsc.type = 'sine'
        this.subBassOsc.frequency.value = 82.5  // Octave below 165Hz

        this.subBassGain = this.audioContext.createGain()
        this.subBassGain.gain.value = 0.18  // -15dB

        // Direct to master, bypasses spatialPanner (sub-bass is non-directional)
        this.subBassOsc.connect(this.subBassGain)
        this.subBassGain.connect(this.masterGain)

        this.subBassOsc.start(this.audioContext.currentTime)
    }

    // ═══════════════════════════════════════════════════════════════════════
    // LAYER 11: REVERB — Delay-Based Room Simulation
    // Parallel send from spatialPanner, stereo delay with feedback
    // ═══════════════════════════════════════════════════════════════════════

    _initReverb() {
        // Pre-delay (20ms)
        this.reverbPreDelay = this.audioContext.createDelay(0.1)
        this.reverbPreDelay.delayTime.value = 0.02

        // Main delay (80ms early reflections)
        this.reverbDelay = this.audioContext.createDelay(0.5)
        this.reverbDelay.delayTime.value = 0.08

        // Feedback loop (0.3 for short tail)
        this.reverbFeedback = this.audioContext.createGain()
        this.reverbFeedback.gain.value = 0.3

        // High-cut filter (remove mud at 2kHz)
        this.reverbFilter = this.audioContext.createBiquadFilter()
        this.reverbFilter.type = 'lowpass'
        this.reverbFilter.frequency.value = 2000

        // Wet output (15%)
        this.reverbWet = this.audioContext.createGain()
        this.reverbWet.gain.value = 0.15

        // Connect chain: spatialPanner → preDelay → delay → filter → feedback → delay (loop)
        //                                                      └→ wet → master
        this.spatialPanner.connect(this.reverbPreDelay)
        this.reverbPreDelay.connect(this.reverbDelay)
        this.reverbDelay.connect(this.reverbFilter)
        this.reverbFilter.connect(this.reverbFeedback)
        this.reverbFeedback.connect(this.reverbDelay)  // Feedback loop
        this.reverbFilter.connect(this.reverbWet)
        this.reverbWet.connect(this.masterGain)
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
            isActive = false,
            touch = {},           // L3: Touch state for granular membrane
            ghostTraces = [],     // L3: Ghost traces for frozen loops
            holdSaturation = 0    // L4: Hold intensity for formant
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

        // Apply Layer 3: Granular Membrane (touch texture)
        this._updateGranularMembrane(touch, ghostTraces)

        // Apply Layer 1.5: Breath Noise (synced to breath pulse)
        if (this.layerEnabled.breathNoise) {
            this._updateBreathNoise(pulses.breath, elapsed)
        }

        // Apply Layer 5: Spatial Field (cursor following)
        if (this.layerEnabled.spatial) {
            const cursorX = touch.x || 0
            const cursorY = touch.y || 0
            this._updateSpatialField(cursorX, cursorY)
        }

        // Apply Layer 4: Formant Voice (emotional vowel morphing)
        if (this.layerEnabled.formantVoice) {
            this._updateFormantVoice({
                trustIndex: this.currentTrustIndex,
                colorProgress: this.currentColorProgress,
                isActive,
                holdSaturation
            })
        }

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

    /**
     * 🔬 Enable/disable individual layers for debugging
     * @param {string} layer - 'spectral', 'breathNoise', 'formantVoice', 'spatial'
     * @param {boolean} enabled
     */
    setLayer(layer, enabled) {
        if (this.layerEnabled.hasOwnProperty(layer)) {
            this.layerEnabled[layer] = enabled
            console.log(`[SonicOrganism] Layer '${layer}' ${enabled ? 'ENABLED' : 'DISABLED'}`)
            console.log('[SonicOrganism] Current layers:', this.layerEnabled)
        } else {
            console.warn(`[SonicOrganism] Unknown layer: ${layer}. Valid: spectral, breathNoise, formantVoice, spatial`)
        }
    }

    /**
     * 🔬 Isolate a single layer (disable all others)
     * Call with no args to enable all layers
     */
    isolateLayer(layer = null) {
        if (!layer) {
            // Enable all
            Object.keys(this.layerEnabled).forEach(k => this.layerEnabled[k] = true)
            console.log('[SonicOrganism] ALL layers enabled')
        } else if (this.layerEnabled.hasOwnProperty(layer)) {
            Object.keys(this.layerEnabled).forEach(k => this.layerEnabled[k] = (k === layer))
            console.log(`[SonicOrganism] ISOLATED layer: ${layer}`)
        } else {
            console.warn(`[SonicOrganism] Unknown layer: ${layer}`)
        }
        console.log('[SonicOrganism] Current layers:', this.layerEnabled)
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

        // Disconnect granular membrane (L3)
        if (this.granularNode) {
            this.granularNode.disconnect()
            this.granularGain?.disconnect()
        }

        // Disconnect breath noise (L1.5)
        if (this.breathNoise) {
            this.breathNoise.stop()
            this.breathNoise.disconnect()
            this.breathFilter?.disconnect()
            this.breathGain?.disconnect()
        }

        // Disconnect spatial field (L5)
        if (this.spatialPanner) {
            this.spatialPanner.disconnect()
        }

        // Disconnect formant voice (L4)
        if (this.vibratoLFO) {
            this.vibratoLFO.stop()
            this.vibratoLFO.disconnect()
            this.vibratoGain?.disconnect()
        }
        if (this.formantFilters) {
            this.formantFilters.forEach(f => f.disconnect())
            this.formantGains?.forEach(g => g.disconnect())
            this.formantMasterGain?.disconnect()
        }

        // Disconnect sub-bass (L10)
        if (this.subBassOsc) {
            this.subBassOsc.stop()
            this.subBassOsc.disconnect()
            this.subBassGain?.disconnect()
        }

        // Disconnect reverb (L11)
        if (this.reverbPreDelay) {
            this.reverbPreDelay.disconnect()
            this.reverbDelay?.disconnect()
            this.reverbFeedback?.disconnect()
            this.reverbFilter?.disconnect()
            this.reverbWet?.disconnect()
        }

        this.spectralGain.disconnect()
        this.masterGain.disconnect()
    }
}
