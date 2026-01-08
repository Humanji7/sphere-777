/**
 * GranularProcessor.js — AudioWorklet Processor for Granular Synthesis
 * 
 * Creates a cloud of 50-200 micro-grains that respond to touch.
 * Uses a recycling pool pattern to avoid GC during playback.
 * 
 * Target: <1ms per audio frame (128 samples @ 48kHz)
 */

class GranularProcessor extends AudioWorkletProcessor {
    constructor() {
        super()

        // Grain pool (pre-allocated, recycled)
        this.MAX_GRAINS = 200
        this.grains = []
        for (let i = 0; i < this.MAX_GRAINS; i++) {
            this.grains.push({
                active: false,
                position: 0,        // Current playback position in buffer
                duration: 0,        // Total duration in samples
                pitch: 1.0,         // Playback rate
                attack: 0.02,       // Attack time (0-1 of duration)
                decay: 0.3,         // Decay time (0-1 of duration)
                volume: 0          // Current envelope value
            })
        }

        // Circular feedback buffer (records organism's output)
        // 2 seconds at 48kHz
        this.BUFFER_SIZE = 96000
        this.feedbackBuffer = new Float32Array(this.BUFFER_SIZE)
        this.writeHead = 0

        // Parameters (updated via port messages)
        this.params = {
            density: 20,         // Grains per second (5-200)
            pitch: 1.0,          // Base pitch (0.25-4.0)
            grainSize: 100,      // Duration in samples (240-24000 for 5-500ms @ 48kHz)
            attack: 0.02,        // Attack sharpness (0.01-0.2)
            freeze: false,       // Frozen grain loops for ghost traces
            active: false        // Is touch active?
        }

        // Grain spawning accumulator
        this.spawnAccumulator = 0

        // Random seed for variation
        this.seed = Math.random() * 1000

        // Listen for parameter updates
        this.port.onmessage = (event) => {
            const data = event.data
            if (data.type === 'params') {
                this.params.density = data.density ?? this.params.density
                this.params.pitch = data.pitch ?? this.params.pitch
                this.params.grainSize = data.grainSize ?? this.params.grainSize
                this.params.attack = data.attack ?? this.params.attack
                this.params.freeze = data.freeze ?? this.params.freeze
                this.params.active = data.active ?? this.params.active
            }
        }
    }

    /**
     * Simple pseudo-random for deterministic variation
     */
    _random() {
        this.seed = (this.seed * 9301 + 49297) % 233280
        return this.seed / 233280
    }

    /**
     * Spawn a new grain from the pool
     */
    _spawnGrain() {
        // Find inactive grain
        for (let i = 0; i < this.MAX_GRAINS; i++) {
            if (!this.grains[i].active) {
                const grain = this.grains[i]

                // Random variation on parameters
                const pitchVar = 1.0 + (this._random() - 0.5) * 0.2  // ±10% variation
                const sizeVar = 1.0 + (this._random() - 0.5) * 0.4   // ±20% variation

                grain.active = true
                grain.position = 0
                grain.duration = Math.floor(this.params.grainSize * sizeVar)
                grain.pitch = this.params.pitch * pitchVar
                grain.attack = this.params.attack
                grain.decay = 0.3 + this._random() * 0.2  // 30-50% decay
                grain.volume = 0

                // Random start position in feedback buffer
                // If frozen, use a fixed region
                if (this.params.freeze) {
                    // Read from a fixed frozen region (last 500ms)
                    grain.bufferStart = (this.writeHead - 24000 + this.BUFFER_SIZE) % this.BUFFER_SIZE
                } else {
                    // Random position in recent buffer (last 1s)
                    const offset = Math.floor(this._random() * 48000)
                    grain.bufferStart = (this.writeHead - offset + this.BUFFER_SIZE) % this.BUFFER_SIZE
                }

                return
            }
        }
        // No available grains - skip spawn (pool exhausted)
    }

    /**
     * Calculate envelope value for grain
     */
    _envelope(grain) {
        const progress = grain.position / grain.duration

        // Attack phase
        if (progress < grain.attack) {
            return progress / grain.attack
        }

        // Decay phase
        const decayStart = 1.0 - grain.decay
        if (progress > decayStart) {
            return 1.0 - (progress - decayStart) / grain.decay
        }

        // Sustain
        return 1.0
    }

    process(inputs, outputs, parameters) {
        const output = outputs[0]
        const outputChannel = output[0]

        if (!outputChannel) return true

        const numSamples = outputChannel.length

        // Fill output with silence first
        outputChannel.fill(0)

        // If not active, still keep processor alive but don't spawn
        if (this.params.active) {
            // Spawn new grains based on density
            // density = grains per second
            // Each process call = 128 samples @ 48kHz = 2.67ms
            const samplesPerSecond = sampleRate
            const grainsPerSample = this.params.density / samplesPerSecond
            this.spawnAccumulator += grainsPerSample * numSamples

            while (this.spawnAccumulator >= 1) {
                this._spawnGrain()
                this.spawnAccumulator -= 1
            }
        }

        // Process all active grains
        for (let i = 0; i < this.MAX_GRAINS; i++) {
            const grain = this.grains[i]
            if (!grain.active) continue

            for (let s = 0; s < numSamples; s++) {
                // Calculate envelope
                const env = this._envelope(grain)

                // Read from feedback buffer with interpolation
                const readPos = (grain.bufferStart + grain.position * grain.pitch) % this.BUFFER_SIZE
                const readPosInt = Math.floor(readPos)
                const frac = readPos - readPosInt

                const sample0 = this.feedbackBuffer[readPosInt]
                const sample1 = this.feedbackBuffer[(readPosInt + 1) % this.BUFFER_SIZE]
                const sample = sample0 + (sample1 - sample0) * frac

                // Mix into output with envelope
                outputChannel[s] += sample * env * 0.15  // Gain reduction for mixing

                // Advance grain position
                grain.position++

                // Check if grain finished
                if (grain.position >= grain.duration) {
                    grain.active = false
                    break
                }
            }
        }

        // Write output to feedback buffer (for self-feedback texture)
        // Mix with input if available
        const inputChannel = inputs[0]?.[0]
        for (let s = 0; s < numSamples; s++) {
            const inputSample = inputChannel ? inputChannel[s] : 0
            // Mix: 80% previous spectral body input, 20% granular output
            this.feedbackBuffer[this.writeHead] = inputSample * 0.8 + outputChannel[s] * 0.2
            this.writeHead = (this.writeHead + 1) % this.BUFFER_SIZE
        }

        // Soft clip output to prevent distortion
        for (let s = 0; s < numSamples; s++) {
            const x = outputChannel[s]
            outputChannel[s] = Math.tanh(x)
        }

        return true  // Keep processor alive
    }
}

registerProcessor('granular-processor', GranularProcessor)
