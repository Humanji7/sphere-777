/**
 * EffectConductor.js — "Living Chaos" System
 * 
 * Probabilistically activates visual effects to create an organic,
 * unpredictable feel. Effects fade in/out smoothly, never pop.
 * 
 * Philosophy: The sphere should feel alive, not programmed.
 */

// Effect configuration: probability weights, durations, cooldowns
const EFFECT_CONFIG = {
    chromaticAberration: {
        weight: 0.25,           // Base probability
        minDuration: 1.5,       // Min active duration (seconds)
        maxDuration: 4.0,       // Max active duration
        minCooldown: 2.0,
        maxCooldown: 6.0,
        requiresTension: 0.3    // Minimum tension to trigger
    },
    dynamicSize: {
        weight: 0.35,
        minDuration: 3.0,
        maxDuration: 8.0,
        minCooldown: 1.0,
        maxCooldown: 4.0,
        requiresTension: 0.0    // Can trigger at any tension
    },
    sparkles: {
        weight: 0.30,
        minDuration: 2.0,
        maxDuration: 6.0,
        minCooldown: 3.0,
        maxCooldown: 8.0,
        requiresTension: 0.1
    }
}

export class EffectConductor {
    constructor() {
        // Initialize effect runtime state from config
        this.effects = {}
        for (const [name, config] of Object.entries(EFFECT_CONFIG)) {
            this.effects[name] = {
                ...config,
                active: false,
                intensity: 0,           // Current intensity (0-1)
                targetIntensity: 0,     // Target (smoothly interpolated)
                cooldown: 0             // Time until can activate again
            }
        }

        // Scheduler state
        this.nextRollTime = 0      // When to roll dice next
        this.rollInterval = 2.0    // Base interval between dice rolls
        this.maxConcurrentEffects = 2

        // Output values (consumed by main.js / shaders)
        this.output = {
            chromaticAberration: 0,  // 0-1, passed to post-processing
            dynamicSizeAmount: 0,    // 0-1, passed to vertex shader
            sparkleIntensity: 0      // 0-1, passed to fragment shader
        }

        // Smoothing speed (higher = faster transitions)
        this.smoothingSpeed = 2.0
    }

    /**
     * Main update loop
     * @param {number} delta - Time since last frame (seconds)
     * @param {number} elapsed - Total elapsed time (seconds)
     * @param {number} tension - Current emotional tension (0-1)
     */
    update(delta, elapsed, tension) {
        // Update cooldowns
        for (const effect of Object.values(this.effects)) {
            if (effect.cooldown > 0) {
                effect.cooldown -= delta
            }
        }

        // Dice roll scheduling
        if (elapsed >= this.nextRollTime) {
            this._rollDice(tension)
            // Next roll: 1-3 seconds, faster when tense
            const tensionFactor = 1.0 - tension * 0.5  // 1.0 at peace, 0.5 at max tension
            this.nextRollTime = elapsed + this.rollInterval * tensionFactor * (0.5 + Math.random())
        }

        // Check for effect expiration
        for (const [name, effect] of Object.entries(this.effects)) {
            if (effect.active && effect.remainingDuration !== undefined) {
                effect.remainingDuration -= delta
                if (effect.remainingDuration <= 0) {
                    this._deactivateEffect(name)
                }
            }
        }

        // Smooth intensity transitions
        this._updateIntensities(delta)

        // Update output values
        this._updateOutputs()
    }

    /**
     * Roll dice for activating effects
     * @private
     */
    _rollDice(tension) {
        // Guard: skip if at max concurrent effects
        const activeCount = Object.values(this.effects).filter(e => e.active).length
        if (activeCount >= this.maxConcurrentEffects) return

        // Build list of eligible effects
        const eligible = Object.entries(this.effects)
            .filter(([_, e]) => !e.active && e.cooldown <= 0 && tension >= e.requiresTension)
            .map(([name, effect]) => ({ name, effect }))

        // Guard: no eligible effects
        if (eligible.length === 0) return

        // Calculate total weight (scales with tension)
        const tensionBoost = 1.0 + tension * 0.5
        const totalWeight = eligible.reduce((sum, { effect }) =>
            sum + effect.weight * tensionBoost, 0)

        // Roll (*2 makes activation ~50% chance per roll)
        const roll = Math.random() * totalWeight * 2

        // Guard: nothing triggers this roll
        if (roll > totalWeight) return

        // Weighted selection
        let cumulative = 0
        for (const { name, effect } of eligible) {
            cumulative += effect.weight * tensionBoost
            if (roll <= cumulative) {
                this._activateEffect(name, tension)
                return
            }
        }
    }

    /**
     * Activate an effect
     * @private
     */
    _activateEffect(name, tension) {
        const effect = this.effects[name]
        effect.active = true

        // Intensity scales with tension (0.4-1.0 range)
        effect.targetIntensity = 0.4 + tension * 0.6

        // Random duration within range
        effect.remainingDuration = effect.minDuration +
            Math.random() * (effect.maxDuration - effect.minDuration)
    }

    /**
     * Deactivate an effect
     * @private
     */
    _deactivateEffect(name) {
        const effect = this.effects[name]
        effect.active = false
        effect.targetIntensity = 0
        effect.remainingDuration = undefined

        // Set cooldown
        effect.cooldown = effect.minCooldown +
            Math.random() * (effect.maxCooldown - effect.minCooldown)
    }

    /**
     * Smooth intensity transitions
     * @private
     */
    _updateIntensities(delta) {
        const lerpFactor = 1.0 - Math.exp(-this.smoothingSpeed * delta)

        for (const effect of Object.values(this.effects)) {
            effect.intensity += (effect.targetIntensity - effect.intensity) * lerpFactor

            // Clamp tiny values to zero
            if (effect.intensity < 0.001) effect.intensity = 0
        }
    }

    /**
     * Update output values for consumption
     * @private
     */
    _updateOutputs() {
        this.output.chromaticAberration = this.effects.chromaticAberration.intensity
        this.output.dynamicSizeAmount = this.effects.dynamicSize.intensity
        this.output.sparkleIntensity = this.effects.sparkles.intensity
    }

    /**
     * Force-activate an effect (for testing)
     */
    forceActivate(name, intensity = 1.0) {
        const effect = this.effects[name]
        if (effect) {
            effect.active = true
            effect.targetIntensity = intensity
            effect.remainingDuration = effect.maxDuration
        }
    }

    /**
     * Get current output values
     */
    getOutputs() {
        return this.output
    }

    /**
     * Get debug info
     */
    getDebugInfo() {
        const info = {}
        for (const [name, effect] of Object.entries(this.effects)) {
            info[name] = {
                active: effect.active,
                intensity: effect.intensity.toFixed(2),
                cooldown: effect.cooldown.toFixed(1)
            }
        }
        return info
    }
}
