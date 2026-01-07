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
