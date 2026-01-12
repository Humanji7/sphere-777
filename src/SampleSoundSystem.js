/**
 * SampleSoundSystem.js — Sample-based Living Sound
 *
 * Replaces oscillator synthesis (SonicOrganism) with prepared samples.
 * Simpler, more predictable, easier to tune.
 *
 * Philosophy: "Electric but breathing presence of alternative life form.
 * Echo of ancient glass processes. Spirit speaking through the screen."
 *
 * Layers:
 *   L1: Foundation - low pad triggered by touch
 *   L2: Glass - high overtones by intensity (future)
 *   L3: Breath - LFO modulation (future)
 *   L4: Tail - reverb on release (future)
 */

export class SampleSoundSystem {
    constructor(audioContext) {
        this.audioContext = audioContext

        // Master output
        this.masterGain = this.audioContext.createGain()
        this.masterGain.gain.value = 0.3
        this.masterGain.connect(this.audioContext.destination)

        // Sample buffers
        this.samples = {
            foundation: null
        }

        // Active sources (for stopping)
        this.activeSources = {
            foundation: null
        }

        // Playback state
        this.isPlaying = false

        // Layer enable flags (for debugging)
        this.layerEnabled = {
            foundation: true
        }

        // Loaded flag
        this.loaded = false
    }

    /**
     * Load all samples. Call after construction.
     * @returns {Promise<void>}
     */
    async loadSamples() {
        try {
            const response = await fetch('/audio/foundation.mp3')
            if (!response.ok) {
                throw new Error(`Failed to load foundation.mp3: ${response.status}`)
            }

            const arrayBuffer = await response.arrayBuffer()
            this.samples.foundation = await this.audioContext.decodeAudioData(arrayBuffer)

            this.loaded = true
            console.log('[SampleSoundSystem] Samples loaded successfully')
        } catch (error) {
            console.error('[SampleSoundSystem] Failed to load samples:', error)
            throw error
        }
    }

    /**
     * Start playing foundation loop with fade in
     */
    _startFoundation() {
        if (!this.samples.foundation || !this.layerEnabled.foundation) return
        if (this.activeSources.foundation) return // Already playing

        const source = this.audioContext.createBufferSource()
        source.buffer = this.samples.foundation
        source.loop = true

        // Gain for fade in/out
        const gainNode = this.audioContext.createGain()
        gainNode.gain.value = 0

        source.connect(gainNode)
        gainNode.connect(this.masterGain)

        source.start()

        // Fade in (100ms)
        const now = this.audioContext.currentTime
        gainNode.gain.linearRampToValueAtTime(1, now + 0.1)

        this.activeSources.foundation = { source, gainNode }
        this.isPlaying = true
    }

    /**
     * Stop foundation loop with fade out
     */
    _stopFoundation() {
        if (!this.activeSources.foundation) return

        const { source, gainNode } = this.activeSources.foundation
        const now = this.audioContext.currentTime

        // Fade out (100ms)
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1)

        // Stop after fade
        setTimeout(() => {
            try {
                source.stop()
            } catch (e) {
                // Already stopped
            }
        }, 150)

        this.activeSources.foundation = null
        this.isPlaying = false
    }

    /**
     * Main update function — called every frame from main.js
     * @param {Object} state - Current sphere state
     * @param {number} elapsed - Total elapsed time in seconds
     */
    update(state = {}, elapsed = 0) {
        if (!this.loaded) return

        const {
            isActive = false
        } = state

        // Simple logic: play when touching, stop when not
        if (isActive && !this.isPlaying) {
            this._startFoundation()
        } else if (!isActive && this.isPlaying) {
            this._stopFoundation()
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CONTROL API (same as SonicOrganism for compatibility)
    // ═══════════════════════════════════════════════════════════════════════

    setLayer(layer, enabled) {
        if (this.layerEnabled.hasOwnProperty(layer)) {
            this.layerEnabled[layer] = enabled
            console.log(`[SampleSoundSystem] Layer '${layer}' ${enabled ? 'ENABLED' : 'DISABLED'}`)
        }
    }

    isolateLayer(layer = null) {
        if (!layer) {
            Object.keys(this.layerEnabled).forEach(k => this.layerEnabled[k] = true)
            console.log('[SampleSoundSystem] ALL layers enabled')
        } else if (this.layerEnabled.hasOwnProperty(layer)) {
            Object.keys(this.layerEnabled).forEach(k => this.layerEnabled[k] = (k === layer))
            console.log(`[SampleSoundSystem] ISOLATED layer: ${layer}`)
        }
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
        this.setVolume(0.3)
    }

    dispose() {
        this._stopFoundation()
        this.masterGain.disconnect()
    }
}
