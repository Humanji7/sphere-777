/**
 * SampleSoundSystem.js — Living Sound with Modulation
 *
 * Sample-based sound with multi-LFO modulation system.
 * Inspired by Brian Eno's generative approach: controlled randomness,
 * parameters that never quite repeat.
 *
 * Philosophy: "Electric but breathing presence of alternative life form."
 *
 * Layers:
 *   L1: Foundation - low pad
 *   L2: Glass - high shimmer
 *
 * Modulation:
 *   - Gain (volume pulses)
 *   - Pan (stereo movement)
 *   - Filter (timbral shifts)
 *   - Pitch (subtle drift)
 */

export class SampleSoundSystem {
    constructor(audioContext) {
        this.audioContext = audioContext

        // Master output
        this.masterGain = this.audioContext.createGain()
        this.masterGain.gain.value = 0.35
        this.masterGain.connect(this.audioContext.destination)

        // Sample buffers
        this.samples = {
            foundation: null,
            glass: null
        }

        // Active sound chains (source → filter → panner → gain → master)
        this.activeSources = {
            foundation: null,
            glass: null
        }

        // ═══════════════════════════════════════════════════════════════
        // LFO SYSTEM — Multiple oscillators with incommensurate rates
        // Like Eno's tape loops that never sync
        // DEBUG MODE: Faster rates to hear effect quickly
        // ═══════════════════════════════════════════════════════════════
        this.lfoRates = {
            // Oceanic swell (period ~4s) — was ~14s
            ocean: 0.25 + Math.random() * 0.05,
            // Breath rhythm (period ~2s) — was ~5s
            breath: 0.5 + Math.random() * 0.1,
            // Gentle pulse (period ~1s) — was ~2s
            pulse: 1.0 + Math.random() * 0.2,
            // Shimmer/tremolo (period ~0.3s)
            shimmer: 3.0 + Math.random() * 0.5,
            // Glacial drift (period ~8s) — was ~30s
            drift: 0.12 + Math.random() * 0.03
        }

        // Random phase offsets so LFOs start at different points
        this.lfoPhases = {
            ocean: Math.random() * Math.PI * 2,
            breath: Math.random() * Math.PI * 2,
            pulse: Math.random() * Math.PI * 2,
            shimmer: Math.random() * Math.PI * 2,
            drift: Math.random() * Math.PI * 2
        }

        // Playback state
        this.isPlaying = false

        // Layer enable flags
        this.layerEnabled = {
            foundation: true,
            glass: true,
            breath: true,
            formant: true
        }

        // Modulation enable flags (for debugging)
        this.modulationEnabled = {
            gain: true,
            pan: true,
            filter: true,
            pitch: true
        }

        // Current state for smooth transitions
        this.currentIntensity = 0

        this.loaded = false

        // ═══════════════════════════════════════════════════════════════
        // L4 TAIL — Reverb/delay feedback loop for "memory of contact"
        // Sound continues 2-3s after release
        // ═══════════════════════════════════════════════════════════════
        this.tailDelay = this.audioContext.createDelay(5.0)  // max 5s delay
        this.tailDelay.delayTime.value = 0.08  // 80ms pre-delay

        this.tailFeedback = this.audioContext.createGain()
        this.tailFeedback.gain.value = 0.35  // feedback amount (~2-3s decay)

        this.tailFilter = this.audioContext.createBiquadFilter()
        this.tailFilter.type = 'lowpass'
        this.tailFilter.frequency.value = 3000  // darken repeats

        this.tailWetGain = this.audioContext.createGain()
        this.tailWetGain.gain.value = 0.25  // wet mix

        // Connect feedback loop: delay → filter → feedback → delay
        this.tailDelay.connect(this.tailFilter)
        this.tailFilter.connect(this.tailFeedback)
        this.tailFeedback.connect(this.tailDelay)

        // Wet output to master
        this.tailDelay.connect(this.tailWetGain)
        this.tailWetGain.connect(this.masterGain)

        // ═══════════════════════════════════════════════════════════════
        // L5 BREATH — Organic "lung" texture (filtered white noise)
        // Asymmetric envelope: fast inhale (0.3s), slow exhale (0.8s)
        // ═══════════════════════════════════════════════════════════════
        this.breathNoise = null  // BufferSource (created on _startBreath)
        this.breathFilter = this.audioContext.createBiquadFilter()
        this.breathFilter.type = 'lowpass'
        this.breathFilter.frequency.value = 400  // muffled breath
        this.breathFilter.Q.value = 1.0

        this.breathGain = this.audioContext.createGain()
        this.breathGain.gain.value = 0  // starts silent

        this.breathFilter.connect(this.breathGain)
        this.breathGain.connect(this.masterGain)

        this.breathPhase = 0

        // ═══════════════════════════════════════════════════════════════
        // L6 FORMANT — Vocal presence via parallel bandpass filters  
        // 5 formants (F1-F5) with micro-vibrato (6Hz LFO)
        // Emotional morphing: vowels shift with sphere state
        // ═══════════════════════════════════════════════════════════════
        this.vowels = {
            a: [730, 1090, 2440, 3400, 4500],     // open [a] — neutral
            o: [570, 840, 2410, 3400, 4500],      // rounded [o] — trust/hold
            i: [270, 2290, 3010, 3400, 4500],     // sharp [i] — curiosity
            fear: [400, 1700, 2700, 3400, 4500]   // constricted — tension
        }

        this.formantFilters = []
        this.formantGains = []

        for (let i = 0; i < 5; i++) {
            const filter = this.audioContext.createBiquadFilter()
            filter.type = 'bandpass'
            filter.frequency.value = this.vowels.a[i]
            filter.Q.value = 10 + i * 2

            const gain = this.audioContext.createGain()
            gain.gain.value = 0.15 - i * 0.02

            filter.connect(gain)
            gain.connect(this.masterGain)

            this.formantFilters.push(filter)
            this.formantGains.push(gain)
        }

        this.vibratoLFO = null  // OscillatorNode (created on _startFormant)
        this.vibratoGain = this.audioContext.createGain()
        this.vibratoGain.gain.value = 10  // ±10Hz depth

        this.currentVowel = 'a'

        // ═══════════════════════════════════════════════════════════════
        // L7 GLITCH — Audio disruptions at emotional peaks
        // Bitcrush + stutter for "system overload" at high tension
        // ═══════════════════════════════════════════════════════════════
        this.glitchShaper = this.audioContext.createWaveShaper()
        this.glitchShaper.curve = this._createBitcrushCurve(8)  // 8-bit default

        this.glitchGain = this.audioContext.createGain()
        this.glitchGain.gain.value = 0  // starts silent

        this.glitchMix = 0  // 0 = clean, 1 = full glitch
        this.glitchEnabled = true
    }

    /**
     * Get LFO value at current time
     * @param {string} name - LFO name
     * @param {number} elapsed - Time in seconds
     * @returns {number} Value between -1 and 1
     */
    _getLFO(name, elapsed) {
        const rate = this.lfoRates[name]
        const phase = this.lfoPhases[name]
        return Math.sin(elapsed * rate * Math.PI * 2 + phase)
    }

    /**
     * Create WaveShaper curve for bitcrushing
     * @param {number} bits - Bit depth (lower = more distorted)
     */
    _createBitcrushCurve(bits) {
        const samples = 44100
        const curve = new Float32Array(samples)
        const step = Math.pow(0.5, bits)
        for (let i = 0; i < samples; i++) {
            const x = (i * 2) / samples - 1
            curve[i] = Math.round(x / step) * step
        }
        return curve
    }

    /**
     * Get LFO value normalized to 0-1 range
     */
    _getLFONorm(name, elapsed) {
        return (this._getLFO(name, elapsed) + 1) / 2
    }

    /**
     * Load all samples
     */
    async loadSamples() {
        try {
            const [foundationResp, glassResp] = await Promise.all([
                fetch('/audio/foundation.mp3'),
                fetch('/audio/glass.mp3')
            ])

            if (!foundationResp.ok) throw new Error(`foundation.mp3: ${foundationResp.status}`)
            if (!glassResp.ok) throw new Error(`glass.mp3: ${glassResp.status}`)

            const [foundationBuffer, glassBuffer] = await Promise.all([
                foundationResp.arrayBuffer(),
                glassResp.arrayBuffer()
            ])

            this.samples.foundation = await this.audioContext.decodeAudioData(foundationBuffer)
            this.samples.glass = await this.audioContext.decodeAudioData(glassBuffer)

            this.loaded = true
            console.log('[SampleSoundSystem] Samples loaded with modulation system')
        } catch (error) {
            console.error('[SampleSoundSystem] Failed to load samples:', error)
            throw error
        }
    }

    /**
     * Create a full audio chain for a layer
     * source → filter → panner → gain → master
     */
    _createAudioChain(sampleBuffer, loop = true) {
        const source = this.audioContext.createBufferSource()
        source.buffer = sampleBuffer
        source.loop = loop

        // Lowpass filter for timbral control
        const filter = this.audioContext.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 8000  // Start open
        filter.Q.value = 0.7

        // Stereo panner
        const panner = this.audioContext.createStereoPanner()
        panner.pan.value = 0

        // Gain for volume control
        const gain = this.audioContext.createGain()
        gain.gain.value = 0

        // Connect chain
        source.connect(filter)
        filter.connect(panner)
        panner.connect(gain)
        gain.connect(this.masterGain)

        // Add send to tail reverb (L4 Tail)
        const sendGain = this.audioContext.createGain()
        sendGain.gain.value = 0.4  // send amount
        gain.connect(sendGain)
        sendGain.connect(this.tailDelay)

        return { source, filter, panner, gain, sendGain }
    }

    /**
     * Create white noise buffer for breath layer
     */
    _createBreathNoise() {
        const bufferSize = this.audioContext.sampleRate * 2
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1
        }
        return buffer
    }

    /**
     * Start L5 Breath layer
     */
    _startBreath() {
        if (this.breathNoise || !this.layerEnabled.breath) return

        const buffer = this._createBreathNoise()
        this.breathNoise = this.audioContext.createBufferSource()
        this.breathNoise.buffer = buffer
        this.breathNoise.loop = true
        this.breathNoise.connect(this.breathFilter)
        this.breathNoise.start()

        console.log('[SampleSoundSystem] L5 Breath started')
    }

    /**
     * Start L6 Formant layer
     */
    _startFormant() {
        if (this.vibratoLFO || !this.layerEnabled.formant) return

        // Connect foundation as source for formants
        const foundationChain = this.activeSources.foundation
        if (foundationChain) {
            this.formantFilters.forEach(filter => {
                foundationChain.gain.connect(filter)
            })
        }

        // Start vibrato LFO
        this.vibratoLFO = this.audioContext.createOscillator()
        this.vibratoLFO.type = 'sine'
        this.vibratoLFO.frequency.value = 6

        this.formantFilters.forEach(filter => {
            this.vibratoLFO.connect(this.vibratoGain)
            this.vibratoGain.connect(filter.frequency)
        })

        this.vibratoLFO.start()
        console.log('[SampleSoundSystem] L6 Formant started')
    }

    /**
     * Modulate L5 Breath with asymmetric envelope
     */
    _modulateBreath(elapsed) {
        if (!this.breathNoise) return

        const phase = this._getLFONorm('breath', elapsed)

        // Asymmetric: 27% inhale, 73% exhale
        let envelope
        if (phase < 0.27) {
            envelope = phase / 0.27
        } else {
            envelope = 1 - ((phase - 0.27) / 0.73)
        }
        envelope = Math.pow(envelope, 1.5)

        const now = this.audioContext.currentTime
        this.breathGain.gain.linearRampToValueAtTime(envelope * 0.08, now + 0.05)

        const filterFreq = 300 + envelope * 300
        this.breathFilter.frequency.linearRampToValueAtTime(filterFreq, now + 0.05)
    }

    /**
     * Modulate L6 Formant vowels based on sphere state
     */
    _modulateFormant(state = {}) {
        const { holdSaturation = 0, colorProgress = 0, trustIndex = 0.5 } = state

        let targetVowel = 'a'
        if (holdSaturation > 0.5) targetVowel = 'o'
        else if (colorProgress > 0.5) targetVowel = 'fear'
        else if (trustIndex > 0.7) targetVowel = 'o'
        else if (trustIndex < 0.3) targetVowel = 'i'

        if (targetVowel === this.currentVowel) return

        const now = this.audioContext.currentTime
        const targetFreqs = this.vowels[targetVowel]

        this.formantFilters.forEach((filter, i) => {
            filter.frequency.linearRampToValueAtTime(targetFreqs[i], now + 0.3)
        })

        this.currentVowel = targetVowel
        console.log(`[SampleSoundSystem] Formant → [${targetVowel}]`)
    }

    /**
     * Start L7 Glitch — connect parallel chain from foundation
     */
    _startGlitch() {
        if (!this.glitchEnabled) return
        const foundationChain = this.activeSources.foundation
        if (!foundationChain) return

        foundationChain.gain.connect(this.glitchShaper)
        this.glitchShaper.connect(this.glitchGain)
        this.glitchGain.connect(this.masterGain)

        console.log('[SampleSoundSystem] L7 Glitch started')
    }

    /**
     * Modulate L7 Glitch based on emotional state
     * Activates at tension > 0.35 (lowered from 0.6 for earlier activation)
     *
     * Tension formula: max(colorProgress, holdSaturation * 0.8)
     * - colorProgress rises with velocity (0.8x) + tensionTime (0.3x)
     * - holdSaturation rises with hold duration (osmosis depth 0-1)
     */
    _modulateGlitch(state = {}) {
        if (!this.glitchEnabled) return

        const { colorProgress = 0, holdSaturation = 0 } = state

        // Glitch activates at moderate tension (threshold lowered for accessibility)
        const tension = Math.max(colorProgress, holdSaturation * 0.8)
        const threshold = 0.35  // Was 0.6 — now activates earlier

        if (tension < threshold) {
            this.glitchMix = 0
        } else {
            // Intensity 0-1 above threshold (0.35 → 0%, 1.0 → 100%)
            this.glitchMix = (tension - threshold) / (1 - threshold)
        }

        const now = this.audioContext.currentTime

        // Glitch gain follows mix
        this.glitchGain.gain.linearRampToValueAtTime(
            this.glitchMix * 0.7,  // TEST: 70% wet (was 30%)
            now + 0.05
        )

        // Stutter effect: random brief silences at high intensity
        if (this.glitchMix > 0.4 && Math.random() < 0.08) {  // TEST: lower threshold, more frequent
            this.glitchGain.gain.setValueAtTime(0, now)
            this.glitchGain.gain.linearRampToValueAtTime(
                this.glitchMix * 0.7,  // TEST: match wet level
                now + 0.02 + Math.random() * 0.05
            )
        }
    }

    /**
     * Start foundation layer
     */
    _startFoundation() {
        if (!this.samples.foundation || !this.layerEnabled.foundation) return
        if (this.activeSources.foundation) return

        const chain = this._createAudioChain(this.samples.foundation)
        chain.source.start()

        // Fade in
        const now = this.audioContext.currentTime
        chain.gain.gain.linearRampToValueAtTime(0.8, now + 0.5)

        this.activeSources.foundation = chain

        // Start L5/L6/L7 after foundation is ready
        this._startBreath()
        this._startFormant()
        this._startGlitch()
    }

    /**
     * Start glass layer
     */
    _startGlass() {
        if (!this.samples.glass || !this.layerEnabled.glass) return
        if (this.activeSources.glass) return

        const chain = this._createAudioChain(this.samples.glass)
        chain.source.start()

        // Fade in (quieter than foundation)
        const now = this.audioContext.currentTime
        chain.gain.gain.linearRampToValueAtTime(0.3, now + 0.4)

        this.activeSources.glass = chain
    }

    /**
     * Stop a layer with fade out
     */
    _stopLayer(name) {
        const chain = this.activeSources[name]
        if (!chain) return

        const now = this.audioContext.currentTime
        // L4 Tail: Extended fade out (1.5s) for smooth transition into tail reverb
        chain.gain.gain.linearRampToValueAtTime(0, now + 1.5)

        setTimeout(() => {
            try {
                chain.source.stop()
            } catch (e) { }
        }, 1600)  // 1.6s to match extended fade

        this.activeSources[name] = null
    }

    /**
     * Apply modulation to a layer
     */
    _modulateLayer(name, elapsed, baseGain) {
        const chain = this.activeSources[name]
        if (!chain) return

        const now = this.audioContext.currentTime

        // ─────────────────────────────────────────────────────────────
        // GAIN MODULATION — breath + pulse = volume swell
        // DEBUG: Exaggerated for testing
        // ─────────────────────────────────────────────────────────────
        if (this.modulationEnabled.gain) {
            const breathMod = this._getLFONorm('breath', elapsed)
            const pulseMod = this._getLFONorm('pulse', elapsed)

            // DEBUG: 30% base + 50% breath + 20% pulse (very noticeable)
            const gainMod = 0.3 + breathMod * 0.5 + pulseMod * 0.2
            const targetGain = baseGain * gainMod

            chain.gain.gain.linearRampToValueAtTime(targetGain, now + 0.05)
        }

        // ─────────────────────────────────────────────────────────────
        // PAN MODULATION — ocean + drift = slow stereo movement
        // ─────────────────────────────────────────────────────────────
        if (this.modulationEnabled.pan) {
            const oceanPan = this._getLFO('ocean', elapsed)
            const driftPan = this._getLFO('drift', elapsed)

            // Subtle movement: ±0.3 max (not hard L/R)
            const pan = (oceanPan * 0.2 + driftPan * 0.1)

            chain.panner.pan.linearRampToValueAtTime(pan, now + 0.05)
        }

        // ─────────────────────────────────────────────────────────────
        // FILTER MODULATION — breath + shimmer = timbral breathing
        // DEBUG: Wide range for obvious effect
        // ─────────────────────────────────────────────────────────────
        if (this.modulationEnabled.filter) {
            const breathFilter = this._getLFONorm('breath', elapsed)
            const shimmerFilter = this._getLFONorm('shimmer', elapsed)

            // DEBUG: Very wide range to hear filter sweep
            // Foundation: 300-6000 Hz (was 2000-8000)
            // Glass: 800-10000 Hz (was 4000-12000)
            const isGlass = name === 'glass'
            const minFreq = isGlass ? 800 : 300
            const maxFreq = isGlass ? 10000 : 6000

            // 70% breath (slow) + 30% shimmer (faster wobble)
            const filterMod = breathFilter * 0.7 + shimmerFilter * 0.3
            const freq = minFreq + filterMod * (maxFreq - minFreq)

            chain.filter.frequency.linearRampToValueAtTime(freq, now + 0.05)
        }

        // ─────────────────────────────────────────────────────────────
        // PITCH MODULATION — drift = pitch wander
        // DEBUG: Exaggerated for testing
        // ─────────────────────────────────────────────────────────────
        if (this.modulationEnabled.pitch) {
            const driftPitch = this._getLFO('drift', elapsed)

            // DEBUG: ±10% pitch variation (0.9 - 1.1) — very noticeable
            const rate = 1 + driftPitch * 0.1

            chain.source.playbackRate.linearRampToValueAtTime(rate, now + 0.1)
        }
    }

    /**
     * Main update — called every frame
     */
    update(state = {}, elapsed = 0) {
        if (!this.loaded) return

        const {
            isActive = false,
            touchIntensity = 0,
            velocity = 0
        } = state

        // Combined intensity
        const intensity = Math.min(1, touchIntensity + velocity * 0.5)
        this.currentIntensity += (intensity - this.currentIntensity) * 0.1

        // Start/stop
        if (isActive && !this.isPlaying) {
            this._startFoundation()
            this._startGlass()
            this.isPlaying = true
        } else if (!isActive && this.isPlaying) {
            this._stopLayer('foundation')
            this._stopLayer('glass')
            this.isPlaying = false
        }

        // Apply modulation while playing
        if (this.isPlaying) {
            // Foundation: base gain 0.8, less affected by intensity
            const foundationGain = 0.6 + this.currentIntensity * 0.2
            this._modulateLayer('foundation', elapsed, foundationGain)

            // Glass: base gain depends on intensity
            const glassGain = 0.1 + this.currentIntensity * 0.5
            this._modulateLayer('glass', elapsed, glassGain)

            // L5 Breath modulation
            this._modulateBreath(elapsed)

            // L6 Formant emotional morphing
            this._modulateFormant(state)

            // L7 Glitch at emotional peaks
            this._modulateGlitch(state)
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DEBUG & CONTROL API
    // ═══════════════════════════════════════════════════════════════════════

    setLayer(layer, enabled) {
        if (this.layerEnabled.hasOwnProperty(layer)) {
            this.layerEnabled[layer] = enabled
            console.log(`[SampleSoundSystem] Layer '${layer}' ${enabled ? 'ON' : 'OFF'}`)
        }
    }

    setModulation(type, enabled) {
        if (this.modulationEnabled.hasOwnProperty(type)) {
            this.modulationEnabled[type] = enabled
            console.log(`[SampleSoundSystem] Modulation '${type}' ${enabled ? 'ON' : 'OFF'}`)
        }
    }

    isolateLayer(layer = null) {
        if (!layer) {
            Object.keys(this.layerEnabled).forEach(k => this.layerEnabled[k] = true)
        } else if (this.layerEnabled.hasOwnProperty(layer)) {
            Object.keys(this.layerEnabled).forEach(k => this.layerEnabled[k] = (k === layer))
        }
    }

    setVolume(volume) {
        const now = this.audioContext.currentTime
        this.masterGain.gain.linearRampToValueAtTime(
            Math.max(0, Math.min(1, volume)),
            now + 0.1
        )
    }

    mute() { this.setVolume(0) }
    unmute() { this.setVolume(0.35) }

    /**
     * Toggle tail reverb on/off (for debugging)
     */
    setTailEnabled(enabled) {
        this.tailWetGain.gain.value = enabled ? 0.25 : 0
        console.log(`[SampleSoundSystem] Tail ${enabled ? 'ON' : 'OFF'}`)
    }

    /**
     * Toggle L5 Breath on/off (for debugging)
     */
    setBreathEnabled(enabled) {
        this.layerEnabled.breath = enabled
        if (!enabled && this.breathNoise) {
            this.breathGain.gain.value = 0
        }
        console.log(`[SampleSoundSystem] Breath ${enabled ? 'ON' : 'OFF'}`)
    }

    /**
     * Toggle L6 Formant on/off (for debugging)
     */
    setFormantEnabled(enabled) {
        this.layerEnabled.formant = enabled
        const gain = enabled ? 0.15 : 0
        this.formantGains?.forEach(g => { g.gain.value = gain })
        console.log(`[SampleSoundSystem] Formant ${enabled ? 'ON' : 'OFF'}`)
    }

    /**
     * Toggle L7 Glitch on/off (for debugging)
     */
    setGlitchEnabled(enabled) {
        this.glitchEnabled = enabled
        if (!enabled) this.glitchGain.gain.value = 0
        console.log(`[SampleSoundSystem] Glitch ${enabled ? 'ON' : 'OFF'}`)
    }

    /**
     * Get current LFO values for debug visualization
     */
    getDebugInfo(elapsed) {
        return {
            lfo: {
                ocean: this._getLFONorm('ocean', elapsed),
                breath: this._getLFONorm('breath', elapsed),
                pulse: this._getLFONorm('pulse', elapsed),
                shimmer: this._getLFONorm('shimmer', elapsed),
                drift: this._getLFONorm('drift', elapsed)
            },
            isPlaying: this.isPlaying,
            intensity: this.currentIntensity
        }
    }

    dispose() {
        this._stopLayer('foundation')
        this._stopLayer('glass')

        // Clean up tail nodes
        this.tailDelay?.disconnect()
        this.tailFeedback?.disconnect()
        this.tailFilter?.disconnect()
        this.tailWetGain?.disconnect()

        // Clean up L5 Breath
        this.breathNoise?.stop()
        this.breathNoise?.disconnect()
        this.breathFilter?.disconnect()
        this.breathGain?.disconnect()

        // Clean up L6 Formant
        this.vibratoLFO?.stop()
        this.vibratoLFO?.disconnect()
        this.vibratoGain?.disconnect()
        this.formantFilters?.forEach(f => f.disconnect())
        this.formantGains?.forEach(g => g.disconnect())

        // Clean up L7 Glitch
        this.glitchShaper?.disconnect()
        this.glitchGain?.disconnect()

        this.masterGain.disconnect()
    }
}
