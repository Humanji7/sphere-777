/**
 * MemoryManager.js — Emotional Memory System
 * 
 * Accumulates a "trust index" based on how the user treats the sphere.
 * Philosophy: "She remembers pain" — rough treatment has lasting effects.
 * 
 * Events that DECREASE trust:
 * - poke (instant shock)
 * - tremble (sustained nervousness)
 * - fast approach (sudden scare)
 * - time in TRAUMA/BLEEDING phases
 * 
 * Events that INCREASE trust:
 * - stroke (gentle petting)
 * - slow approach (careful movement)
 * - time in PEACE phase
 * - prolonged hovering (patient presence)
 */

import * as THREE from 'three'

// localStorage key for persistence
const STORAGE_KEY = 'sphere_trust_index'

export class MemoryManager {
    constructor() {
        // Trust index: 0 = full distrust, 1 = full trust
        // Load from localStorage if available, otherwise start neutral
        this.trustIndex = this._loadTrust()

        // Session event log (for debugging/analytics)
        this.sessionLog = []
        this.maxLogSize = 100

        // Ghost Traces: visual memory of scares (Cold Traces)
        // {position: THREE.Vector3, birthTime: number, intensity: number}
        this.ghostTraces = []
        this.maxGhostTraces = 3

        // Warm Traces: visual memory of gentle contact
        // {position: THREE.Vector3, birthTime: number, intensity: number}
        this.warmTraces = []
        this.maxWarmTraces = 3

        // Persistence: debounced save
        this._lastSaveTime = 0
        this._saveInterval = 2.0  // Save at most every 2 seconds
        this._pendingSave = false

        // Save on page unload
        this._boundUnload = this._onUnload.bind(this)
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this._boundUnload)
        }

        // Configuration: impact values (ASYMMETRIC — "she remembers pain")
        this.config = {
            // Negative events (decrease trust) — HARD HITS
            pokeImpact: -0.15,              // Each poke (painful!)
            fastApproachImpact: -0.10,      // Per frame of fast approach (scary!)
            trembleImpact: -0.08,           // Per second of trembling
            traumaImpact: -0.10,            // Per second in TRAUMA phase
            bleedingImpact: -0.05,          // Per second in BLEEDING phase

            // Positive events (increase trust) — SLOW RECOVERY
            strokeImpact: 0.02,             // Per second of stroking (helps, but not magic)
            slowApproachImpact: 0.01,       // Per frame of slow approach
            peaceImpact: 0.003,             // Per second in PEACE phase (very slow natural recovery)
            hoverImpact: 0.015,             // Per second of prolonged hover (>1s)

            // Trust change limits (ASYMMETRIC — pain is fast, healing is slow)
            maxNegativeChangePerSecond: 0.25,  // Can lose trust quickly
            maxPositiveChangePerSecond: 0.04,  // Recovery is slow and gradual

            // Ghost Traces (Cold — scares)
            ghostTraceLifetime: 4.0,        // Seconds until trace fades (longer for drama)
            ghostTraceThreshold: -0.25,     // approachSpeed that triggers trace (more sensitive)
            ghostTraceMinInterval: 0.4,     // Minimum seconds between traces

            // Warm Traces (gentle contact)
            warmTraceThreshold: 2.0,        // Seconds of stroke in zone to trigger
            warmTraceLifetime: 4.0,         // Symmetric with ghost traces
            warmTraceMinInterval: 0.5       // Minimum seconds between traces
        }

        // Internal state
        this.lastGhostTraceTime = -999
        this.lastWarmTraceTime = -999
        this.currentElapsed = 0
        this.trustChangeThisFrame = 0
    }

    /**
     * Record a discrete event (poke, stroke start, etc.)
     * Called from Sphere._processGesture()
     * @param {string} type - Event type: 'poke', 'stroke', 'tremble'
     * @param {number} intensity - Event intensity multiplier (default 1.0)
     */
    recordEvent(type, intensity = 1.0) {
        const config = this.config
        let impact = 0

        switch (type) {
            case 'poke':
                impact = config.pokeImpact * intensity
                this._log('poke', impact)
                break
            case 'stroke':
                // Stroke is continuous, so intensity = delta time
                impact = config.strokeImpact * intensity
                break
            case 'tremble':
                // Tremble is continuous, so intensity = delta time
                impact = config.trembleImpact * intensity
                break
        }

        this.trustChangeThisFrame += impact
    }

    /**
     * Update memory state each frame
     * @param {number} delta - Time since last frame (seconds)
     * @param {string} phase - Current emotional phase
     * @param {Object} inputState - Input state from InputManager
     */
    update(delta, phase, inputState) {
        this.currentElapsed += delta
        const config = this.config

        // Reset frame accumulator
        this.trustChangeThisFrame = 0

        // ═══════════════════════════════════════════════════════════
        // PHASE-BASED TRUST CHANGES
        // ═══════════════════════════════════════════════════════════
        switch (phase) {
            case 'peace':
                this.trustChangeThisFrame += config.peaceImpact * delta
                break
            case 'bleeding':
                this.trustChangeThisFrame += config.bleedingImpact * delta
                break
            case 'trauma':
                this.trustChangeThisFrame += config.traumaImpact * delta
                break
        }

        // ═══════════════════════════════════════════════════════════
        // APPROACH SPEED TRACKING
        // ═══════════════════════════════════════════════════════════
        const { approachSpeed = 0, hoverDuration = 0 } = inputState

        // Fast approach (negative = approaching)
        if (approachSpeed < config.ghostTraceThreshold) {
            this.trustChangeThisFrame += config.fastApproachImpact

            // Create ghost trace if enough time passed
            if (this.currentElapsed - this.lastGhostTraceTime > config.ghostTraceMinInterval) {
                this._createGhostTrace(inputState)
            }
        }
        // Slow approach (gentle)
        else if (approachSpeed < -0.05 && approachSpeed >= config.ghostTraceThreshold) {
            this.trustChangeThisFrame += config.slowApproachImpact * delta
        }

        // Prolonged hovering (patient presence)
        if (hoverDuration > 1.0) {
            this.trustChangeThisFrame += config.hoverImpact * delta
        }

        // ═══════════════════════════════════════════════════════════
        // APPLY TRUST CHANGE WITH ASYMMETRIC LIMITS
        // "Pain is felt immediately, healing takes time"
        // ═══════════════════════════════════════════════════════════
        let clampedChange = this.trustChangeThisFrame
        if (clampedChange < 0) {
            // Negative change: use faster limit
            const maxNegative = config.maxNegativeChangePerSecond * delta
            clampedChange = Math.max(-maxNegative, clampedChange)
        } else {
            // Positive change: use slower limit
            const maxPositive = config.maxPositiveChangePerSecond * delta
            clampedChange = Math.min(maxPositive, clampedChange)
        }

        this.trustIndex = Math.max(0, Math.min(1, this.trustIndex + clampedChange))

        // ═══════════════════════════════════════════════════════════
        // DEBOUNCED PERSISTENCE
        // ═══════════════════════════════════════════════════════════
        this._scheduleSave()

        // ═══════════════════════════════════════════════════════════
        // UPDATE TRACES LIFECYCLE (Ghost + Warm)
        // ═══════════════════════════════════════════════════════════
        this._updateGhostTraces(delta)
        this._updateWarmTraces(delta)
    }

    /**
     * Create a ghost trace at current cursor position (Cold Trace)
     * @private
     */
    _createGhostTrace(inputState) {
        // We need cursor world position — will be set via separate method
        // For now, create placeholder that Sphere will update
        if (this.ghostTraces.length >= this.maxGhostTraces) {
            // Remove oldest trace
            this.ghostTraces.shift()
        }

        this.ghostTraces.push({
            position: new THREE.Vector3(0, 0, 0), // To be set by Sphere
            birthTime: this.currentElapsed,
            intensity: 1.0,
            needsPosition: true  // Flag for Sphere to set position
        })

        this.lastGhostTraceTime = this.currentElapsed
        this._log('ghost_trace', -0.05)
    }

    /**
     * Create a warm trace at current cursor position
     * Called when prolonged stroke is detected
     */
    createWarmTrace() {
        if (this.warmTraces.length >= this.maxWarmTraces) {
            // Remove oldest trace
            this.warmTraces.shift()
        }

        this.warmTraces.push({
            position: new THREE.Vector3(0, 0, 0), // To be set by Sphere
            birthTime: this.currentElapsed,
            intensity: 1.0,
            needsPosition: true  // Flag for Sphere to set position
        })

        this.lastWarmTraceTime = this.currentElapsed
        this._log('warm_trace', 0.05)  // Positive log for gentle contact
    }

    /**
     * Set position for the most recent ghost trace (called by Sphere)
     * @param {THREE.Vector3} position - World position on sphere
     */
    setLatestGhostTracePosition(position) {
        const trace = this.ghostTraces.find(t => t.needsPosition)
        if (trace) {
            trace.position.copy(position)
            trace.needsPosition = false
        }
    }

    /**
     * Set position for the most recent warm trace (called by Sphere)
     * @param {THREE.Vector3} position - World position on sphere
     */
    setLatestWarmTracePosition(position) {
        const trace = this.warmTraces.find(t => t.needsPosition)
        if (trace) {
            trace.position.copy(position)
            trace.needsPosition = false
        }
    }

    /**
     * Update ghost trace lifecycle (fade out)
     * @private
     */
    _updateGhostTraces(delta) {
        const lifetime = this.config.ghostTraceLifetime

        this.ghostTraces = this.ghostTraces.filter(trace => {
            const age = this.currentElapsed - trace.birthTime
            if (age >= lifetime) return false

            // Fade intensity over time (ease out)
            trace.intensity = 1.0 - (age / lifetime)
            return true
        })
    }

    /**
     * Update warm trace lifecycle (fade out)
     * @private
     */
    _updateWarmTraces(delta) {
        const lifetime = this.config.warmTraceLifetime

        this.warmTraces = this.warmTraces.filter(trace => {
            const age = this.currentElapsed - trace.birthTime
            if (age >= lifetime) return false

            // Fade intensity over time (ease out)
            trace.intensity = 1.0 - (age / lifetime)
            return true
        })
    }

    /**
     * Log event for debugging
     * @private
     */
    _log(type, impact) {
        this.sessionLog.push({
            time: this.currentElapsed,
            type,
            impact,
            trustAfter: this.trustIndex
        })

        if (this.sessionLog.length > this.maxLogSize) {
            this.sessionLog.shift()
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API: Modifiers for Sphere
    // ═══════════════════════════════════════════════════════════

    /**
     * Get tension decay modifier based on trust level
     * Low trust = slower decay (she stays tense longer)
     * @returns {number} 0.5 (slow) to 1.5 (fast)
     */
    getTensionDecayModifier() {
        // Linear mapping: trustIndex 0→0.5, 0.5→1.0, 1→1.5
        return 0.5 + this.trustIndex
    }

    /**
     * Get trauma threshold modifier based on trust level
     * Low trust = lower threshold (easier to traumatize)
     * @returns {number} 0.6 (sensitive) to 1.0 (normal)
     */
    getTraumaThresholdModifier() {
        // trustIndex 0→0.6, 0.5→0.8, 1→1.0
        return 0.6 + this.trustIndex * 0.4
    }

    // ═══════════════════════════════════════════════════════════
    // PUBLIC API: Modifiers for ParticleSystem
    // ═══════════════════════════════════════════════════════════

    /**
     * Get PEACE baseline color modification based on trust
     * Low trust = greyer, less saturated color
     * @returns {Object} {saturationMod: 0.6-1.0, lightnessMod: 0.85-1.0}
     */
    getPeaceColorMod() {
        // trustIndex 0→{sat: 0.6, light: 0.85}, 1→{sat: 1.0, light: 1.0}
        return {
            saturationMod: 0.6 + this.trustIndex * 0.4,
            lightnessMod: 0.85 + this.trustIndex * 0.15
        }
    }

    /**
     * Get active ghost traces for rendering
     * @returns {Array<{position: THREE.Vector3, alpha: number}>}
     */
    getActiveGhostTraces() {
        return this.ghostTraces
            .filter(t => !t.needsPosition)
            .map(trace => ({
                position: trace.position,
                alpha: trace.intensity
            }))
    }

    /**
     * Get active warm traces for rendering
     * @returns {Array<{position: THREE.Vector3, alpha: number}>}
     */
    getActiveWarmTraces() {
        return this.warmTraces
            .filter(t => !t.needsPosition)
            .map(trace => ({
                position: trace.position,
                alpha: trace.intensity
            }))
    }

    // ═══════════════════════════════════════════════════════════
    // PERSISTENCE API
    // ═══════════════════════════════════════════════════════════

    /**
     * Load trust index from localStorage
     * @returns {number} Trust index (0-1), defaults to 0.5 if not found
     * @private
     */
    _loadTrust() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return 0.5  // SSR or no localStorage
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY)
            if (stored !== null) {
                const value = parseFloat(stored)
                if (!isNaN(value) && value >= 0 && value <= 1) {
                    return value
                }
            }
        } catch (e) {
            // localStorage access denied (incognito, etc.)
        }
        return 0.5  // Default: neutral
    }

    /**
     * Save trust index to localStorage
     * @private
     */
    _saveTrust() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return
        }

        try {
            localStorage.setItem(STORAGE_KEY, this.trustIndex.toFixed(4))
            this._lastSaveTime = this.currentElapsed
            this._pendingSave = false
        } catch (e) {
            // localStorage write denied
        }
    }

    /**
     * Schedule a debounced save (prevents saving every frame)
     * @private
     */
    _scheduleSave() {
        const timeSinceLastSave = this.currentElapsed - this._lastSaveTime

        if (timeSinceLastSave > this._saveInterval) {
            // Enough time has passed, save immediately
            this._saveTrust()
        } else if (!this._pendingSave) {
            // Not yet time to save, mark as pending
            this._pendingSave = true
        }
        // If pendingSave is true but time hasn't passed, do nothing and wait
    }

    /**
     * Handle page unload - save trust immediately
     * @private
     */
    _onUnload() {
        this._saveTrust()
    }

    /**
     * Cleanup event listeners
     */
    dispose() {
        if (typeof window !== 'undefined') {
            window.removeEventListener('beforeunload', this._boundUnload)
        }
        // Final save on dispose
        this._saveTrust()
    }

    // ═══════════════════════════════════════════════════════════
    // DEBUG API
    // ═══════════════════════════════════════════════════════════

    /**
     * Get debug info for console/overlay
     */
    getDebugInfo() {
        return {
            trustIndex: this.trustIndex.toFixed(3),
            ghostTraceCount: this.ghostTraces.length,
            warmTraceCount: this.warmTraces.length,
            tensionDecayMod: this.getTensionDecayModifier().toFixed(2),
            traumaThresholdMod: this.getTraumaThresholdModifier().toFixed(2),
            peaceColorMod: this.getPeaceColorMod()
        }
    }

    /**
     * Force set trust index (for testing)
     * @param {number} value - Trust index 0-1
     * @param {boolean} persist - Whether to save immediately (default: true)
     */
    setTrustIndex(value, persist = true) {
        this.trustIndex = Math.max(0, Math.min(1, value))
        if (persist) {
            this._saveTrust()
        }
    }

    /**
     * Clear persisted trust (reset for testing)
     */
    clearPersistedTrust() {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.removeItem(STORAGE_KEY)
            } catch (e) {
                // Ignore
            }
        }
        this.trustIndex = 0.5
    }
}
