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

// localStorage keys for persistence
const STORAGE_KEY = 'sphere_trust_index'
const STORAGE_KEY_PROFILE = 'sphere_user_profile'

// All gesture types in the system
const GESTURE_TYPES = ['idle', 'tap', 'flick', 'poke', 'spiral', 'hesitation', 'orbit', 'tremble', 'stroke', 'moving']

export class MemoryManager {
    constructor() {
        // Trust index: 0 = full distrust, 1 = full trust
        // Load from localStorage if available, otherwise start neutral
        this.trustIndex = this._loadTrust()

        // ═══════════════════════════════════════════════════════════
        // USER PROFILE (v3: "learns with you")
        // ═══════════════════════════════════════════════════════════
        this.userProfile = this._loadUserProfile()

        // Track current session gestures (will be saved on unload)
        this.currentSessionGestures = this._createEmptyGestureStats()
        this.sessionStartTime = Date.now()

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
     * Create a trace of specified type at current cursor position
     * @param {'ghost'|'warm'} type - Trace type
     * @private
     */
    _createTrace(type) {
        const isGhost = type === 'ghost'
        const traces = isGhost ? this.ghostTraces : this.warmTraces
        const maxTraces = isGhost ? this.maxGhostTraces : this.maxWarmTraces

        if (traces.length >= maxTraces) {
            traces.shift()  // Remove oldest trace
        }

        traces.push({
            position: new THREE.Vector3(0, 0, 0), // To be set by Sphere
            birthTime: this.currentElapsed,
            intensity: 1.0,
            needsPosition: true  // Flag for Sphere to set position
        })

        if (isGhost) {
            this.lastGhostTraceTime = this.currentElapsed
            this._log('ghost_trace', -0.05)
        } else {
            this.lastWarmTraceTime = this.currentElapsed
            this._log('warm_trace', 0.05)
        }
    }

    /**
     * Create a ghost trace at current cursor position (Cold Trace)
     * @private
     */
    _createGhostTrace(inputState) {
        this._createTrace('ghost')
    }

    /**
     * Create a warm trace at current cursor position
     * Called when prolonged stroke is detected
     */
    createWarmTrace() {
        this._createTrace('warm')
    }

    /**
     * Set position for the most recent trace of specified type
     * @param {'ghost'|'warm'} type - Trace type
     * @param {THREE.Vector3} position - World position on sphere
     * @private
     */
    _setLatestTracePosition(type, position) {
        const traces = type === 'ghost' ? this.ghostTraces : this.warmTraces
        const trace = traces.find(t => t.needsPosition)
        if (!trace) return

        trace.position.copy(position)
        trace.needsPosition = false
    }

    /**
     * Set position for the most recent ghost trace (called by Sphere)
     * @param {THREE.Vector3} position - World position on sphere
     */
    setLatestGhostTracePosition(position) {
        this._setLatestTracePosition('ghost', position)
    }

    /**
     * Set position for the most recent warm trace (called by Sphere)
     * @param {THREE.Vector3} position - World position on sphere
     */
    setLatestWarmTracePosition(position) {
        this._setLatestTracePosition('warm', position)
    }

    /**
     * Update trace lifecycle (fade out) for specified type
     * @param {'ghost'|'warm'} type - Trace type
     * @private
     */
    _updateTraces(type) {
        const isGhost = type === 'ghost'
        const traces = isGhost ? this.ghostTraces : this.warmTraces
        const lifetime = isGhost ? this.config.ghostTraceLifetime : this.config.warmTraceLifetime

        const filtered = traces.filter(trace => {
            const age = this.currentElapsed - trace.birthTime
            if (age >= lifetime) return false

            // Fade intensity over time (ease out)
            trace.intensity = 1.0 - (age / lifetime)
            return true
        })

        if (isGhost) {
            this.ghostTraces = filtered
        } else {
            this.warmTraces = filtered
        }
    }

    /**
     * Update ghost trace lifecycle (fade out)
     * @private
     */
    _updateGhostTraces(delta) {
        this._updateTraces('ghost')
    }

    /**
     * Update warm trace lifecycle (fade out)
     * @private
     */
    _updateWarmTraces(delta) {
        this._updateTraces('warm')
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
     * Handle page unload - save trust and session immediately
     * @private
     */
    _onUnload() {
        this._saveTrust()
        this.endSession()
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
        this.endSession()
    }

    // ═══════════════════════════════════════════════════════════
    // USER PROFILE API (v3)
    // ═══════════════════════════════════════════════════════════

    /**
     * Create empty gesture stats object
     * @private
     */
    _createEmptyGestureStats() {
        const stats = {}
        GESTURE_TYPES.forEach(type => stats[type] = 0)
        return stats
    }

    /**
     * Load user profile from localStorage
     * @returns {Object} User profile with session history and gesture totals
     * @private
     */
    _loadUserProfile() {
        const defaultProfile = {
            // Last visit timestamp (for return reaction)
            lastVisit: null,
            // Total time spent (seconds)
            totalTime: 0,
            // Total gesture counts (all-time)
            gestureTotals: this._createEmptyGestureStats(),
            // Session history (last 7 days detailed, then weekly aggregates)
            sessions: [],
            // First ever visit
            firstVisit: null,
            // Profile version for future migrations
            version: 1
        }

        if (typeof window === 'undefined' || !window.localStorage) {
            return defaultProfile
        }

        try {
            const stored = localStorage.getItem(STORAGE_KEY_PROFILE)
            if (stored) {
                const parsed = JSON.parse(stored)
                // Merge with defaults in case of missing fields
                return { ...defaultProfile, ...parsed }
            }
        } catch (e) {
            // JSON parse error or localStorage access denied
        }

        return defaultProfile
    }

    /**
     * Save user profile to localStorage
     * @private
     */
    _saveUserProfile() {
        if (typeof window === 'undefined' || !window.localStorage) {
            return
        }

        try {
            localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(this.userProfile))
        } catch (e) {
            // localStorage write denied or quota exceeded
        }
    }

    /**
     * Record a gesture occurrence (called every frame with current gesture)
     * @param {string} gestureType - Current gesture type
     * @param {number} delta - Frame delta time (seconds)
     */
    recordGesture(gestureType, delta) {
        if (!GESTURE_TYPES.includes(gestureType)) return

        // Accumulate time spent in this gesture (in seconds)
        this.currentSessionGestures[gestureType] += delta
    }

    /**
     * Get time since last visit
     * @returns {Object} {gap: seconds, level: 'short'|'medium'|'long'|'very_long'|'first'}
     */
    getReturnGap() {
        const { lastVisit, firstVisit } = this.userProfile

        // First ever visit
        if (!firstVisit) {
            return { gap: 0, level: 'first' }
        }

        if (!lastVisit) {
            return { gap: 0, level: 'first' }
        }

        const gap = (Date.now() - lastVisit) / 1000 // seconds

        let level
        if (gap < 3600) {          // < 1 hour
            level = 'short'
        } else if (gap < 86400) {  // < 1 day
            level = 'medium'
        } else if (gap < 604800) { // < 1 week
            level = 'long'
        } else {
            level = 'very_long'
        }

        return { gap, level }
    }

    /**
     * Get gesture profile (normalized distribution)
     * @returns {Object} {dominant: string, distribution: {gesture: 0-1}}
     */
    getGestureProfile() {
        const totals = this.userProfile.gestureTotals
        const sum = Object.values(totals).reduce((a, b) => a + b, 0)

        if (sum === 0) {
            return { dominant: null, distribution: {} }
        }

        const distribution = {}
        let dominant = null
        let maxValue = 0

        // Exclude 'idle' and 'moving' from personality calculation
        const personalityGestures = ['tap', 'flick', 'poke', 'spiral', 'hesitation', 'orbit', 'tremble', 'stroke']
        const personalitySum = personalityGestures.reduce((a, g) => a + (totals[g] || 0), 0)

        personalityGestures.forEach(gesture => {
            const value = totals[gesture] || 0
            distribution[gesture] = personalitySum > 0 ? value / personalitySum : 0
            if (value > maxValue) {
                maxValue = value
                dominant = gesture
            }
        })

        return { dominant, distribution }
    }

    /**
     * End current session and save to history
     * Called on page unload or manually
     */
    endSession() {
        const now = Date.now()
        const duration = (now - this.sessionStartTime) / 1000 // seconds

        // Only save if session was meaningful (> 5 seconds)
        if (duration < 5) return

        // Update totals
        GESTURE_TYPES.forEach(type => {
            this.userProfile.gestureTotals[type] += this.currentSessionGestures[type]
        })
        this.userProfile.totalTime += duration

        // Add to session history
        this.userProfile.sessions.push({
            ts: this.sessionStartTime,
            duration,
            gestures: { ...this.currentSessionGestures }
        })

        // Aggregate old sessions (keep last 7 days detailed)
        this._aggregateSessions()

        // Update last visit
        this.userProfile.lastVisit = now

        // Set first visit if not set
        if (!this.userProfile.firstVisit) {
            this.userProfile.firstVisit = this.sessionStartTime
        }

        // Save
        this._saveUserProfile()
    }

    /**
     * Aggregate old sessions to save space
     * Keep last 7 days detailed, compress older to weekly
     * @private
     */
    _aggregateSessions() {
        const now = Date.now()
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
        const sessions = this.userProfile.sessions

        // Split into recent and old
        const recent = sessions.filter(s => s.ts > sevenDaysAgo)
        const old = sessions.filter(s => s.ts <= sevenDaysAgo)

        // If too many old sessions, aggregate them
        if (old.length > 10) {
            // Group by week
            const weeks = {}
            old.forEach(s => {
                const weekStart = Math.floor(s.ts / (7 * 24 * 60 * 60 * 1000))
                if (!weeks[weekStart]) {
                    weeks[weekStart] = { duration: 0, count: 0 }
                }
                weeks[weekStart].duration += s.duration
                weeks[weekStart].count += 1
            })

            // Convert to aggregated sessions
            const aggregated = Object.entries(weeks).map(([weekStart, data]) => ({
                ts: parseInt(weekStart) * 7 * 24 * 60 * 60 * 1000,
                duration: data.duration,
                aggregated: true,
                sessionCount: data.count
            }))

            this.userProfile.sessions = [...aggregated, ...recent]
        }

        // Hard limit: keep max 50 sessions
        if (this.userProfile.sessions.length > 50) {
            this.userProfile.sessions = this.userProfile.sessions.slice(-50)
        }
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
