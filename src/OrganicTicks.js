/**
 * OrganicTicks.js — Autonomous Micro-Movements
 * 
 * Creates the illusion of life through unpredictable, subtle movements
 * that occur independently of user interaction.
 * 
 * Tick Types:
 * - twitch: Quick micro-shudder of a random surface zone
 * - stretch: Slow directional "yawn" or stretch
 * - shiver: Wave of goosebumps across entire surface
 * - glance: Eye darts to random point then returns
 * 
 * Philosophy: "Life continues even when no one is watching"
 */

import * as THREE from 'three'

export class OrganicTicks {
    constructor(sphere, particleSystem, eye) {
        this.sphere = sphere
        this.particles = particleSystem
        this.eye = eye
        this.input = null  // Set via setInputManager()

        // Tick timers (randomized intervals in seconds)
        this.timers = {
            twitch: this._randomInterval(8, 15),
            stretch: this._randomInterval(20, 40),
            shiver: this._randomInterval(45, 90),
            glance: this._randomInterval(30, 60)
        }

        // Active tick state
        this.activeTick = null
        this.tickProgress = 0
        this.tickDuration = 0
        this.tickData = {}  // Tick-specific data (zone, direction, etc.)

        // Tick durations (in seconds)
        this.durations = {
            twitch: { min: 0.15, max: 0.3 },
            stretch: { min: 0.4, max: 0.7 },
            shiver: { min: 0.5, max: 0.8 },
            glance: { min: 0.3, max: 0.5 }
        }
    }

    /**
     * Set the input manager for interaction detection
     * @param {InputManager} inputManager
     */
    setInputManager(inputManager) {
        this.input = inputManager
    }

    /**
     * Main update loop - call every frame
     * @param {number} delta - Time since last frame in seconds
     * @param {number} elapsed - Total elapsed time
     */
    update(delta, elapsed) {
        // ═══════════════════════════════════════════════════════════
        // SUPPRESSION: Skip ticks during user interaction
        // "She only twitches when no one is touching"
        // ═══════════════════════════════════════════════════════════
        const inputState = this.input?.getState()
        const isUserActive = inputState?.isActive || inputState?.isHolding || inputState?.velocity > 0.05

        if (isUserActive) {
            // Reset all timers slightly to prevent immediate tick after interaction
            this._nudgeTimers(delta * 0.5)
            return
        }

        // Also suppress during high emotional states (trauma, bleeding)
        if (this.sphere) {
            const phase = this.sphere.currentPhase
            if (phase === 'bleeding' || phase === 'trauma' || phase === 'recognition') {
                return
            }
        }

        // ═══════════════════════════════════════════════════════════
        // ACTIVE TICK: Animate current tick
        // ═══════════════════════════════════════════════════════════
        if (this.activeTick) {
            this.tickProgress += delta / this.tickDuration

            if (this.tickProgress >= 1) {
                // Tick complete
                this._clearActiveTick()
            } else {
                // Animate tick
                this._animateTick(this.activeTick, this.tickProgress)
            }
            return  // Only one tick at a time
        }

        // ═══════════════════════════════════════════════════════════
        // TIMER COUNTDOWN: Check for tick triggers
        // ═══════════════════════════════════════════════════════════
        for (const tickType of ['twitch', 'stretch', 'shiver', 'glance']) {
            this.timers[tickType] -= delta

            if (this.timers[tickType] <= 0) {
                this._triggerTick(tickType)
                break  // Only one tick at a time
            }
        }
    }

    // ═══════════════════════════════════════════════════════════
    // TICK TRIGGERS
    // ═══════════════════════════════════════════════════════════

    _triggerTick(type) {
        this.activeTick = type
        this.tickProgress = 0

        const dur = this.durations[type]
        this.tickDuration = dur.min + Math.random() * (dur.max - dur.min)

        switch (type) {
            case 'twitch':
                this._initTwitch()
                break
            case 'stretch':
                this._initStretch()
                break
            case 'shiver':
                this._initShiver()
                break
            case 'glance':
                this._initGlance()
                break
        }

        // Reset timer with new random interval
        this.timers[type] = this._randomInterval(
            type === 'twitch' ? 8 : type === 'stretch' ? 20 : type === 'shiver' ? 45 : 30,
            type === 'twitch' ? 15 : type === 'stretch' ? 40 : type === 'shiver' ? 90 : 60
        )
    }

    _initTwitch() {
        // Random point on sphere surface (in local space)
        const phi = Math.acos(2 * Math.random() - 1)
        const theta = Math.random() * Math.PI * 2

        const r = this.particles.baseRadius
        this.tickData = {
            zone: new THREE.Vector3(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            ),
            radius: 0.3 + Math.random() * 0.3  // 0.3-0.6 radius
        }

        // Initialize particle system uniforms
        this._setTickUniforms(this.tickData.zone, this.tickData.radius, 0, 1)
    }

    _initStretch() {
        // Random direction for stretch
        const theta = Math.random() * Math.PI * 2
        const phi = Math.PI / 4 + Math.random() * Math.PI / 2  // Avoid poles

        this.tickData = {
            direction: new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.sin(phi) * Math.sin(theta),
                Math.cos(phi)
            ).normalize(),
            radius: 0.8 + Math.random() * 0.4  // Larger zone for stretch
        }

        // Stretch uses the direction as zone center (half-sphere effect)
        const zone = this.tickData.direction.clone().multiplyScalar(this.particles.baseRadius * 0.5)
        this._setTickUniforms(zone, this.tickData.radius, 0, 2)
    }

    _initShiver() {
        // Shiver affects whole sphere (no specific zone)
        this.tickData = {
            intensity: 0.5 + Math.random() * 0.5  // 0.5-1.0
        }

        // Full sphere coverage
        this._setTickUniforms(new THREE.Vector3(0, 0, 0), 10, 0, 3)
    }

    _initGlance() {
        if (!this.eye) return

        // Random glance direction
        this.tickData = {
            direction: new THREE.Vector2(
                (Math.random() - 0.5) * 1.5,  // -0.75 to 0.75
                (Math.random() - 0.5) * 1.0   // -0.5 to 0.5 (less vertical range)
            ),
            originalGaze: this.eye.targetGaze.clone()
        }

        // Trigger eye glance
        this.eye.glanceAt?.(this.tickData.direction, this.tickDuration)
    }

    // ═══════════════════════════════════════════════════════════
    // TICK ANIMATIONS
    // ═══════════════════════════════════════════════════════════

    _animateTick(type, progress) {
        // Smooth ease-out animation curve
        const eased = this._easeOutQuad(progress)
        // Bell curve for intensity (peaks at 0.3, fades out by 1.0)
        const intensity = Math.sin(progress * Math.PI) * (1 - progress * 0.3)

        switch (type) {
            case 'twitch':
                this._animateTwitch(intensity)
                break
            case 'stretch':
                this._animateStretch(intensity)
                break
            case 'shiver':
                this._animateShiver(intensity)
                break
            case 'glance':
                // Eye handles its own animation
                break
        }
    }

    _animateTwitch(intensity) {
        this._setTickIntensity(intensity)
    }

    _animateStretch(intensity) {
        this._setTickIntensity(intensity * 0.7)  // Stretch is subtler
    }

    _animateShiver(intensity) {
        const shiverIntensity = intensity * this.tickData.intensity
        this._setTickIntensity(shiverIntensity)
    }

    // ═══════════════════════════════════════════════════════════
    // CLEANUP
    // ═══════════════════════════════════════════════════════════

    _clearActiveTick() {
        // Reset particle uniforms
        this._setTickUniforms(new THREE.Vector3(0, 0, 0), 0, 0, 0)

        this.activeTick = null
        this.tickProgress = 0
        this.tickData = {}
    }

    // ═══════════════════════════════════════════════════════════
    // PARTICLE SYSTEM INTERFACE
    // ═══════════════════════════════════════════════════════════

    _setTickUniforms(zone, radius, intensity, type) {
        const uniforms = this.particles.material.uniforms
        if (uniforms.uTickZone) {
            uniforms.uTickZone.value.copy(zone)
            uniforms.uTickRadius.value = radius
            uniforms.uTickIntensity.value = intensity
            uniforms.uTickType.value = type
        }
    }

    _setTickIntensity(intensity) {
        const uniforms = this.particles.material.uniforms
        if (uniforms.uTickIntensity) {
            uniforms.uTickIntensity.value = intensity
        }
    }

    // ═══════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════

    _randomInterval(min, max) {
        return min + Math.random() * (max - min)
    }

    _nudgeTimers(amount) {
        // Add small amount to all timers (delays ticks after interaction)
        for (const key in this.timers) {
            this.timers[key] += amount
        }
    }

    _easeOutQuad(t) {
        return 1 - (1 - t) * (1 - t)
    }

    /**
     * Force a specific tick (for testing)
     * @param {string} type - 'twitch', 'stretch', 'shiver', 'glance'
     */
    forceTick(type) {
        if (this.activeTick) return
        this._triggerTick(type)
    }
}
