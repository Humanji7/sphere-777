/**
 * SoundManager.js — Procedural Audio Engine
 * 
 * Creates organic, body-like sounds from the sphere's "inside"
 * using Web Audio API synthesis (no external audio files).
 * 
 * Philosophy: Sound is the sphere's breath made audible.
 */

export class SoundManager {
    constructor() {
        // Create AudioContext (suspended until user interaction)
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()

        // Master gain (global volume control)
        this.masterGain = this.audioContext.createGain()
        this.masterGain.gain.value = 0.3  // Start quiet
        this.masterGain.connect(this.audioContext.destination)

        // ═══════════════════════════════════════════════════════════
        // AMBIENT HUM (Peace phase breathing sound)
        // ═══════════════════════════════════════════════════════════
        this.ambientOscillator = null
        this.ambientGain = null
        this.ambientLFO = null
        this.ambientLFOGain = null
        this._initAmbientHum()

        // ═══════════════════════════════════════════════════════════
        // RECOGNITION HUM (Hold gesture — "she hears, she understands")
        // Low, dark, rising drone that intensifies during RECOGNITION phase
        // ═══════════════════════════════════════════════════════════
        this.recognitionOsc1 = null
        this.recognitionOsc2 = null
        this.recognitionGain = null
        this.recognitionLFO = null
        this.recognitionLFOGain = null
        this.recognitionActive = false

        // ═══════════════════════════════════════════════════════════
        // OSMOSIS BASS (Hold gesture — deep physical vibration)
        // 25-40Hz subharmonics, felt in the body
        // ═══════════════════════════════════════════════════════════
        this.osmosisOsc = null
        this.osmosisGain = null
        this.osmosisActive = false

        // ═══════════════════════════════════════════════════════════
        // GESTURE EFFECTS (one-shot sounds)
        // ═══════════════════════════════════════════════════════════
        this.gestureGain = this.audioContext.createGain()
        this.gestureGain.gain.value = 1.0
        this.gestureGain.connect(this.masterGain)

        // Cooldowns to prevent sound spam
        this.lastStrokeTime = 0
        this.lastPokeTime = 0
        this.STROKE_COOLDOWN = 0.3  // seconds
        this.POKE_COOLDOWN = 0.15

        // Resume context on first interaction
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume()
        }
    }

    // ═══════════════════════════════════════════════════════════
    // AUDIO HELPERS — Common patterns extracted for reusability
    // ═══════════════════════════════════════════════════════════

    /**
     * Create an oscillator with gain node, pre-connected to destination
     * @param {string} type - Oscillator type: 'sine', 'triangle', 'sawtooth', 'square'
     * @param {number} frequency - Base frequency in Hz
     * @param {AudioNode} destination - Where to connect output
     * @returns {{ osc: OscillatorNode, gain: GainNode }}
     */
    _createOscillator(type, frequency, destination) {
        const osc = this.audioContext.createOscillator()
        osc.type = type
        osc.frequency.value = frequency

        const gain = this.audioContext.createGain()
        gain.gain.value = 0

        osc.connect(gain)
        gain.connect(destination)

        return { osc, gain }
    }

    /**
     * Apply ADSR-like envelope to a gain node
     * @param {GainNode} gainNode - Target gain node
     * @param {number} startTime - AudioContext time to start
     * @param {{ attack: number, peak: number, decay: number, end: number }} envelope
     */
    _applyEnvelope(gainNode, startTime, envelope) {
        const { attack = 0.02, peak = 0.3, decay = 0.3, end = 0.001 } = envelope
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(peak, startTime + attack)
        gainNode.gain.exponentialRampToValueAtTime(end, startTime + attack + decay)
    }

    /**
     * Stop and cleanup an oscillator with fade-out
     * @param {OscillatorNode|null} osc - Oscillator to stop
     * @param {GainNode|null} gain - Associated gain node
     * @param {number} fadeTime - Fade duration in seconds
     * @param {Function} callback - Called after cleanup
     */
    _stopOscillatorWithFade(osc, gain, fadeTime, callback) {
        if (!osc) return

        const now = this.audioContext.currentTime

        if (gain) {
            gain.gain.linearRampToValueAtTime(0, now + fadeTime)
        }

        setTimeout(() => {
            this._cleanupNode(osc, true)
            this._cleanupNode(gain)
            if (callback) callback()
        }, fadeTime * 1000 + 50)
    }

    /**
     * Stop and disconnect an audio node, optionally stop if oscillator
     * @param {AudioNode|null} node - Node to cleanup
     * @param {boolean} isOscillator - If true, call stop() first
     */
    _cleanupNode(node, isOscillator = false) {
        if (!node) return
        if (isOscillator && node.stop) node.stop()
        node.disconnect()
    }

    /**
     * Initialize the ambient "breathing" hum
     * Low frequency oscillator modulated by LFO for organic feel
     */
    _initAmbientHum() {
        // Main oscillator: deep ~60Hz hum
        this.ambientOscillator = this.audioContext.createOscillator()
        this.ambientOscillator.type = 'sine'
        this.ambientOscillator.frequency.value = 60

        // LFO for frequency modulation (breathing rhythm)
        this.ambientLFO = this.audioContext.createOscillator()
        this.ambientLFO.type = 'sine'
        this.ambientLFO.frequency.value = 0.15  // Very slow ~6s cycle

        // LFO → frequency modulation depth
        this.ambientLFOGain = this.audioContext.createGain()
        this.ambientLFOGain.gain.value = 8  // ±8Hz wobble

        // Ambient volume envelope
        this.ambientGain = this.audioContext.createGain()
        this.ambientGain.gain.value = 0.15  // Quiet background

        // Connect: LFO → LFOGain → oscillator.frequency
        this.ambientLFO.connect(this.ambientLFOGain)
        this.ambientLFOGain.connect(this.ambientOscillator.frequency)

        // Connect: oscillator → gain → master
        this.ambientOscillator.connect(this.ambientGain)
        this.ambientGain.connect(this.masterGain)

        // Start oscillators
        this.ambientOscillator.start()
        this.ambientLFO.start()
    }

    /**
     * Set ambient hum intensity based on tension/colorProgress
     * @param {number} intensity - 0 (calm) to 1 (tense)
     */
    setAmbientIntensity(intensity) {
        if (!this.ambientOscillator) return

        const now = this.audioContext.currentTime

        // Volume: increases with tension (0.1 → 0.4)
        const targetVolume = 0.1 + intensity * 0.3
        this.ambientGain.gain.linearRampToValueAtTime(targetVolume, now + 0.1)

        // Frequency: rises with tension (60Hz → 90Hz)
        const targetFreq = 60 + intensity * 30
        this.ambientOscillator.frequency.linearRampToValueAtTime(targetFreq, now + 0.1)

        // LFO speed: faster with tension (breathing quickens)
        const targetLFOSpeed = 0.15 + intensity * 0.35  // 0.15 → 0.5 Hz
        this.ambientLFO.frequency.linearRampToValueAtTime(targetLFOSpeed, now + 0.1)
    }

    /**
     * Play a gesture-specific sound
     * @param {string} gesture - 'stroke', 'poke', 'tremble'
     * @param {number} intensity - 0-1 intensity modifier
     */
    playGestureSound(gesture, intensity = 1.0) {
        const now = this.audioContext.currentTime

        switch (gesture) {
            case 'stroke':
                this._playStrokeSound(now, intensity)
                break
            case 'poke':
                this._playPokeSound(now, intensity)
                break
            case 'tremble':
                this._playTrembleSound(now, intensity)
                break
        }
    }

    /**
     * Stroke: Soft "glass chime" / rustle
     * High-frequency burst with rapid decay
     */
    _playStrokeSound(now, intensity) {
        // Cooldown check
        if (now - this.lastStrokeTime < this.STROKE_COOLDOWN) return
        this.lastStrokeTime = now

        // Create high-frequency oscillator
        const osc = this.audioContext.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = 2000 + Math.random() * 1000  // 2-3kHz

        // Gentle volume envelope
        const gain = this.audioContext.createGain()
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.15 * intensity, now + 0.02)  // Quick attack
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)  // Soft decay

        // High-pass filter for "airy" feel
        const filter = this.audioContext.createBiquadFilter()
        filter.type = 'highpass'
        filter.frequency.value = 1500
        filter.Q.value = 1

        // Connect and play
        osc.connect(filter)
        filter.connect(gain)
        gain.connect(this.gestureGain)

        osc.start(now)
        osc.stop(now + 0.4)
    }

    /**
     * Poke: Sharp click + resonant decay
     * Attack transient followed by filtered resonance
     */
    _playPokeSound(now, intensity) {
        // Cooldown check
        if (now - this.lastPokeTime < this.POKE_COOLDOWN) return
        this.lastPokeTime = now

        // CLICK: Short noise burst
        const clickOsc = this.audioContext.createOscillator()
        clickOsc.type = 'sawtooth'
        clickOsc.frequency.value = 150 + Math.random() * 50

        const clickGain = this.audioContext.createGain()
        clickGain.gain.setValueAtTime(0.4 * intensity, now)
        clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

        clickOsc.connect(clickGain)
        clickGain.connect(this.gestureGain)

        clickOsc.start(now)
        clickOsc.stop(now + 0.06)

        // RESONANCE: Decaying tone
        const resOsc = this.audioContext.createOscillator()
        resOsc.type = 'sine'
        resOsc.frequency.value = 200 + Math.random() * 100

        const resGain = this.audioContext.createGain()
        resGain.gain.setValueAtTime(0.2 * intensity, now + 0.01)
        resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)

        // Lowpass for warmth
        const resFilter = this.audioContext.createBiquadFilter()
        resFilter.type = 'lowpass'
        resFilter.frequency.value = 400
        resFilter.Q.value = 5

        resOsc.connect(resFilter)
        resFilter.connect(resGain)
        resGain.connect(this.gestureGain)

        resOsc.start(now)
        resOsc.stop(now + 0.6)
    }

    /**
     * Tremble: Rising pitch with granular texture
     * Suggests agitation/stress
     */
    _playTrembleSound(now, intensity) {
        // Create grain-like texture with multiple short oscillators
        const grainCount = 3

        for (let i = 0; i < grainCount; i++) {
            const osc = this.audioContext.createOscillator()
            osc.type = 'sawtooth'

            // Slightly detuned for "shimmering" effect
            const baseFreq = 100 + intensity * 150
            osc.frequency.value = baseFreq + (Math.random() - 0.5) * 30

            // Pitch ramp up (tension rising)
            osc.frequency.linearRampToValueAtTime(
                baseFreq * (1.2 + intensity * 0.3),
                now + 0.2
            )

            const gain = this.audioContext.createGain()
            const startTime = now + i * 0.03
            gain.gain.setValueAtTime(0, startTime)
            gain.gain.linearRampToValueAtTime(0.08 * intensity, startTime + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15)

            // Bandpass for "thin" nervous sound
            const filter = this.audioContext.createBiquadFilter()
            filter.type = 'bandpass'
            filter.frequency.value = 300 + intensity * 200
            filter.Q.value = 3

            osc.connect(filter)
            filter.connect(gain)
            gain.connect(this.gestureGain)

            osc.start(startTime)
            osc.stop(startTime + 0.2)
        }
    }

    /**
     * Bleeding: Evaporating static/white noise
     * Called when particles are evaporating
     */
    triggerBleeding(intensity = 0.5) {
        const now = this.audioContext.currentTime

        // White noise via buffer
        const bufferSize = this.audioContext.sampleRate * 0.5  // 500ms
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate)
        const output = noiseBuffer.getChannelData(0)

        for (let i = 0; i < bufferSize; i++) {
            output[i] = (Math.random() * 2 - 1) * 0.5
        }

        const noise = this.audioContext.createBufferSource()
        noise.buffer = noiseBuffer

        // Lowpass filter (warm static)
        const filter = this.audioContext.createBiquadFilter()
        filter.type = 'lowpass'
        filter.frequency.value = 800
        filter.Q.value = 1

        // Fade envelope
        const gain = this.audioContext.createGain()
        gain.gain.setValueAtTime(0.15 * intensity, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)

        noise.connect(filter)
        filter.connect(gain)
        gain.connect(this.gestureGain)

        noise.start(now)
        noise.stop(now + 0.5)
    }

    // ═══════════════════════════════════════════════════════════
    // RECOGNITION HUM: Low rising drone for RECOGNITION phase
    // "Она услышала" — deep, mystical presence
    // ═══════════════════════════════════════════════════════════

    /**
     * Start recognition hum — low dark drone
     * Called when entering RECOGNITION phase
     */
    playRecognitionHum() {
        if (this.recognitionActive) return
        this.recognitionActive = true

        const now = this.audioContext.currentTime

        // Create two slightly detuned oscillators for rich drone
        this.recognitionOsc1 = this.audioContext.createOscillator()
        this.recognitionOsc1.type = 'sine'
        this.recognitionOsc1.frequency.value = 40  // Very low

        this.recognitionOsc2 = this.audioContext.createOscillator()
        this.recognitionOsc2.type = 'triangle'  // Slightly brighter
        this.recognitionOsc2.frequency.value = 42  // Slight detune for beating

        // LFO for organic pulsation (slow throb, ~0.5 Hz)
        this.recognitionLFO = this.audioContext.createOscillator()
        this.recognitionLFO.type = 'sine'
        this.recognitionLFO.frequency.value = 0.5

        this.recognitionLFOGain = this.audioContext.createGain()
        this.recognitionLFOGain.gain.value = 5  // ±5Hz wobble

        // Main gain envelope (fades in)
        this.recognitionGain = this.audioContext.createGain()
        this.recognitionGain.gain.setValueAtTime(0, now)
        this.recognitionGain.gain.linearRampToValueAtTime(0.2, now + 0.3)

        // Connect: LFO → both oscillator frequencies
        this.recognitionLFO.connect(this.recognitionLFOGain)
        this.recognitionLFOGain.connect(this.recognitionOsc1.frequency)
        this.recognitionLFOGain.connect(this.recognitionOsc2.frequency)

        // Connect: oscillators → gain → master
        this.recognitionOsc1.connect(this.recognitionGain)
        this.recognitionOsc2.connect(this.recognitionGain)
        this.recognitionGain.connect(this.masterGain)

        // Start
        this.recognitionOsc1.start(now)
        this.recognitionOsc2.start(now)
        this.recognitionLFO.start(now)
    }

    /**
     * Set recognition hum intensity
     * @param {number} intensity - 0-1, controls pitch rise and volume
     */
    setRecognitionIntensity(intensity) {
        if (!this.recognitionActive || !this.recognitionOsc1) return

        const now = this.audioContext.currentTime
        const clampedIntensity = Math.max(0, Math.min(1, intensity))

        // Frequency rises with intensity (40Hz → 80Hz)
        const targetFreq1 = 40 + clampedIntensity * 40
        const targetFreq2 = 42 + clampedIntensity * 40

        this.recognitionOsc1.frequency.linearRampToValueAtTime(targetFreq1, now + 0.1)
        this.recognitionOsc2.frequency.linearRampToValueAtTime(targetFreq2, now + 0.1)

        // Volume also rises (0.2 → 0.4)
        const targetVolume = 0.2 + clampedIntensity * 0.2
        this.recognitionGain.gain.linearRampToValueAtTime(targetVolume, now + 0.1)

        // LFO speed increases (0.5 → 2 Hz) — heartbeat quickens
        const targetLFOSpeed = 0.5 + clampedIntensity * 1.5
        this.recognitionLFO.frequency.linearRampToValueAtTime(targetLFOSpeed, now + 0.1)
    }

    /**
     * Stop recognition hum with graceful fade-out
     * Called when exiting RECOGNITION phase
     */
    stopRecognitionHum() {
        if (!this.recognitionActive) return

        const now = this.audioContext.currentTime
        const fadeTime = 0.3

        // Fade out
        if (this.recognitionGain) {
            this.recognitionGain.gain.linearRampToValueAtTime(0, now + fadeTime)
        }

        // Schedule stop after fade
        setTimeout(() => {
            this._cleanupNode(this.recognitionOsc1, true)
            this._cleanupNode(this.recognitionOsc2, true)
            this._cleanupNode(this.recognitionLFO, true)
            this._cleanupNode(this.recognitionLFOGain)
            this._cleanupNode(this.recognitionGain)
            this.recognitionOsc1 = null
            this.recognitionOsc2 = null
            this.recognitionLFO = null
            this.recognitionLFOGain = null
            this.recognitionGain = null
            this.recognitionActive = false
        }, fadeTime * 1000 + 50)
    }

    // ═══════════════════════════════════════════════════════════
    // OSMOSIS BASS: Ultra-low frequency felt in the body
    // "The weight of connection" — 25-40Hz
    // ═══════════════════════════════════════════════════════════

    /**
     * Start osmosis bass — very low frequency drone
     * Called when hold begins on sphere
     */
    startOsmosisBass() {
        if (this.osmosisActive) return
        this.osmosisActive = true

        const now = this.audioContext.currentTime

        // Create ultra-low oscillator (25Hz)
        this.osmosisOsc = this.audioContext.createOscillator()
        this.osmosisOsc.type = 'sine'
        this.osmosisOsc.frequency.value = 25  // Very low, subharmonic

        // Gain envelope (starts at 0)
        this.osmosisGain = this.audioContext.createGain()
        this.osmosisGain.gain.setValueAtTime(0, now)

        // Connect
        this.osmosisOsc.connect(this.osmosisGain)
        this.osmosisGain.connect(this.masterGain)
        this.osmosisOsc.start(now)
    }

    /**
     * Set osmosis depth — controls bass intensity and pitch
     * @param {number} depth - 0 (nothing) to 1 (deep connection)
     */
    setOsmosisDepth(depth) {
        if (!this.osmosisActive || !this.osmosisOsc) return

        const now = this.audioContext.currentTime
        const clampedDepth = Math.max(0, Math.min(1, depth))

        // Volume rises with depth (0 → 0.5)
        const targetGain = clampedDepth * 0.5
        this.osmosisGain.gain.linearRampToValueAtTime(targetGain, now + 0.1)

        // Frequency rises with depth (25Hz → 40Hz)
        const targetFreq = 25 + clampedDepth * 15
        this.osmosisOsc.frequency.linearRampToValueAtTime(targetFreq, now + 0.1)
    }

    /**
     * Stop osmosis bass with graceful fade-out
     */
    stopOsmosisBass() {
        if (!this.osmosisActive) return

        const now = this.audioContext.currentTime
        const fadeTime = 0.3

        // Fade out
        if (this.osmosisGain) {
            this.osmosisGain.gain.linearRampToValueAtTime(0, now + fadeTime)
        }

        // Schedule stop after fade
        setTimeout(() => {
            this._cleanupNode(this.osmosisOsc, true)
            this._cleanupNode(this.osmosisGain)
            this.osmosisOsc = null
            this.osmosisGain = null
            this.osmosisActive = false
        }, fadeTime * 1000 + 50)
    }

    /**
     * Set master volume
     * @param {number} volume - 0-1
     */
    setVolume(volume) {
        this.masterGain.gain.value = Math.max(0, Math.min(1, volume))
    }

    /**
     * Mute/unmute
     */
    mute() {
        this.masterGain.gain.value = 0
    }

    unmute() {
        this.masterGain.gain.value = 0.3
    }

    /**
     * Cleanup
     */
    dispose() {
        if (this.ambientOscillator) {
            this.ambientOscillator.stop()
            this.ambientOscillator.disconnect()
        }
        if (this.ambientLFO) {
            this.ambientLFO.stop()
            this.ambientLFO.disconnect()
        }
        if (this.audioContext) {
            this.audioContext.close()
        }
    }
}
