import { describe, it, expect } from 'vitest'
import { BioticNoise } from '../BioticNoise.js'

describe('BioticNoise', () => {
  describe('getDrift', () => {
    it('returns values in range ~0.92-1.08', () => {
      const noise = new BioticNoise({ driftAmount: 0.08 })

      // Test multiple elapsed times to cover full sine wave
      const values = []
      for (let t = 0; t < 100; t += 0.5) {
        values.push(noise.getDrift(t))
      }

      const min = Math.min(...values)
      const max = Math.max(...values)

      expect(min).toBeGreaterThanOrEqual(0.91)
      expect(max).toBeLessThanOrEqual(1.09)
    })

    it('clamps elapsed time to prevent extreme values', () => {
      const noise = new BioticNoise()
      const result = noise.getDrift(999999)

      expect(result).toBeGreaterThan(0.9)
      expect(result).toBeLessThan(1.1)
    })
  })

  describe('getJitter', () => {
    it('returns values in range ~0.98-1.02', () => {
      const noise = new BioticNoise({ jitterAmount: 0.04 })

      const values = []
      for (let i = 0; i < 100; i++) {
        noise.updateFrame(0.016)
        values.push(noise.getJitter())
      }

      const min = Math.min(...values)
      const max = Math.max(...values)

      expect(min).toBeGreaterThanOrEqual(0.96)
      expect(max).toBeLessThanOrEqual(1.04)
    })
  })

  describe('pause timing', () => {
    it('triggers pause after ~pauseInterval seconds', () => {
      let callCount = 0
      const deterministicRng = () => {
        callCount++
        return 0.5 // Always return middle value
      }

      const noise = new BioticNoise({
        pauseInterval: 2,
        pauseVariance: 0,
        rng: deterministicRng
      })

      // Simulate 1.9 seconds — no pause yet
      for (let i = 0; i < 190; i++) {
        noise.updateFrame(0.01)
      }
      expect(noise.isPaused()).toBe(false)

      // Simulate 0.2 more seconds — should trigger pause
      for (let i = 0; i < 20; i++) {
        noise.updateFrame(0.01)
      }
      expect(noise.isPaused()).toBe(true)
    })

    it('pause duration is within configured range', () => {
      const noise = new BioticNoise({
        pauseInterval: 0.1,
        pauseVariance: 0,
        pauseDurationMin: 0.2,
        pauseDurationMax: 0.6,
        rng: () => 0.5
      })

      // Trigger pause (0.1 sec interval)
      for (let i = 0; i < 15; i++) {
        noise.updateFrame(0.01)
      }

      expect(noise.isPaused()).toBe(true)

      // Pause duration = 0.2 + 0.5 * 0.4 = 0.4 sec
      // Wait for pause to end
      for (let i = 0; i < 45; i++) {
        noise.updateFrame(0.01)
      }

      expect(noise.isPaused()).toBe(false)
    })
  })

  describe('reset', () => {
    it('resets all timers and state', () => {
      const noise = new BioticNoise({
        pauseInterval: 0.1,
        pauseVariance: 0,
        rng: () => 0.5
      })

      // Trigger pause
      for (let i = 0; i < 20; i++) {
        noise.updateFrame(0.01)
      }
      expect(noise.isPaused()).toBe(true)

      // Reset
      noise.reset()

      expect(noise.isPaused()).toBe(false)
      expect(noise.pauseRemaining).toBe(0)
      expect(noise.timeSinceLastPause).toBe(0)
      expect(noise.frameJitter).toBe(0)
    })
  })

  describe('injectable RNG', () => {
    it('produces deterministic results with fixed RNG', () => {
      const fixedRng = () => 0.25

      const noise1 = new BioticNoise({ rng: fixedRng, driftOffset: 0 })
      const noise2 = new BioticNoise({ rng: fixedRng, driftOffset: 0 })

      noise1.updateFrame(0.016)
      noise2.updateFrame(0.016)

      expect(noise1.getJitter()).toBe(noise2.getJitter())
      expect(noise1.nextPauseAt).toBe(noise2.nextPauseAt)
    })
  })

  describe('delta validation', () => {
    it('ignores negative delta', () => {
      const noise = new BioticNoise({ rng: () => 0.5 })

      const initialTime = noise.timeSinceLastPause
      noise.updateFrame(-0.5)

      expect(noise.timeSinceLastPause).toBe(initialTime)
    })

    it('ignores delta > 1', () => {
      const noise = new BioticNoise({ rng: () => 0.5 })

      const initialTime = noise.timeSinceLastPause
      noise.updateFrame(5)

      expect(noise.timeSinceLastPause).toBe(initialTime)
    })

    it('accepts valid delta', () => {
      const noise = new BioticNoise({ rng: () => 0.5 })

      noise.updateFrame(0.016)

      expect(noise.timeSinceLastPause).toBeCloseTo(0.016, 5)
    })
  })

  describe('shouldUpdatePhase', () => {
    it('returns true when not paused', () => {
      const noise = new BioticNoise()
      expect(noise.shouldUpdatePhase()).toBe(true)
    })

    it('returns false during pause', () => {
      const noise = new BioticNoise({
        pauseInterval: 0.05,
        pauseVariance: 0,
        rng: () => 0.5
      })

      // Trigger pause
      for (let i = 0; i < 10; i++) {
        noise.updateFrame(0.01)
      }

      expect(noise.shouldUpdatePhase()).toBe(false)
    })
  })

  describe('getFrequencyMultiplier', () => {
    it('combines drift and jitter', () => {
      const noise = new BioticNoise({
        driftAmount: 0.08,
        jitterAmount: 0.04,
        driftOffset: 0,
        rng: () => 0.5
      })

      noise.updateFrame(0.016)

      const drift = noise.getDrift(1)
      const jitter = noise.getJitter()
      const combined = noise.getFrequencyMultiplier(1)

      expect(combined).toBeCloseTo(drift * jitter, 5)
    })
  })
})
