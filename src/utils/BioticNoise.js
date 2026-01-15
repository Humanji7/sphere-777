/**
 * BioticNoise — Organic rhythm variations
 *
 * Adds life-like imperfections to periodic systems:
 * - Frequency Drift: slow sinusoidal variation (~60 sec cycle)
 * - Phase Jitter: micro-variations per frame
 * - Micro-Pauses: occasional breath holds
 */
export class BioticNoise {
  constructor(config = {}) {
    // Drift config
    this.driftSpeed = config.driftSpeed ?? 0.1
    this.driftAmount = config.driftAmount ?? 0.08
    this.driftOffset = config.driftOffset ?? Math.random() * Math.PI * 2

    // Jitter config (pre-doubled for performance)
    this.jitterAmount = (config.jitterAmount ?? 0.04) * 2

    // Pause config (timer-based for predictable intervals)
    this.pauseInterval = config.pauseInterval ?? 20
    this.pauseVariance = config.pauseVariance ?? 5
    this.pauseDurationMin = config.pauseDurationMin ?? 0.2
    this.pauseDurationMax = config.pauseDurationMax ?? 0.6

    // Injectable RNG for testing
    this.rng = config.rng ?? Math.random

    // State
    this.pauseActive = false
    this.pauseRemaining = 0
    this.frameJitter = 0
    this.timeSinceLastPause = 0
    this.nextPauseAt = this._randomNextPause()
  }

  /**
   * Calculate next pause time with variance
   * @private
   */
  _randomNextPause() {
    return this.pauseInterval + (this.rng() - 0.5) * this.pauseVariance * 2
  }

  /**
   * Call once per frame to update internal state
   * @param {number} delta - Frame delta time in seconds
   */
  updateFrame(delta) {
    // Validate delta
    if (delta < 0 || delta > 1) {
      return
    }

    // Update jitter for this frame
    this.frameJitter = (this.rng() - 0.5) * this.jitterAmount

    // Timer-based pause trigger (only count when not paused)
    if (!this.pauseActive) {
      this.timeSinceLastPause += delta
    }

    if (!this.pauseActive && this.timeSinceLastPause >= this.nextPauseAt) {
      this.pauseActive = true
      this.pauseRemaining = this.pauseDurationMin +
        this.rng() * (this.pauseDurationMax - this.pauseDurationMin)
      this.timeSinceLastPause = 0
      this.nextPauseAt = this._randomNextPause()
    }

    // Update pause timer
    if (this.pauseActive) {
      this.pauseRemaining -= delta
      if (this.pauseRemaining <= 0) {
        this.pauseActive = false
      }
    }
  }

  /**
   * Get drift multiplier (slow, sinusoidal)
   * @param {number} elapsed - Total elapsed time
   * @returns {number} Multiplier ~0.92-1.08
   */
  getDrift(elapsed) {
    const clampedElapsed = Math.min(elapsed, 10000)
    return 1 + Math.sin(clampedElapsed * this.driftSpeed + this.driftOffset) * this.driftAmount
  }

  /**
   * Get jitter multiplier (fast, random)
   * @returns {number} Multiplier ~0.98-1.02
   */
  getJitter() {
    return 1 + this.frameJitter
  }

  /**
   * Get combined frequency multiplier (drift + jitter)
   * @param {number} elapsed - Total elapsed time
   * @returns {number} Combined multiplier
   */
  getFrequencyMultiplier(elapsed) {
    return this.getDrift(elapsed) * this.getJitter()
  }

  /**
   * Check if phase should be updated this frame
   * @returns {boolean} false during pause
   */
  shouldUpdatePhase() {
    return !this.pauseActive
  }

  /**
   * Check if currently in pause state
   * @returns {boolean}
   */
  isPaused() {
    return this.pauseActive
  }

  /**
   * Reset all state (use when changing scenes/emotions)
   */
  reset() {
    this.pauseActive = false
    this.pauseRemaining = 0
    this.frameJitter = 0
    this.timeSinceLastPause = 0
    this.nextPauseAt = this._randomNextPause()
  }
}
