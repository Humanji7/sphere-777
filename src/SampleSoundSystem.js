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
            glass: true
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
            } catch (e) {}
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
        
        this.masterGain.disconnect()
    }
}
