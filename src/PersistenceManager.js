/**
 * PersistenceManager.js — Session Memory
 *
 * Tracks when user last visited. Enables emotional responses:
 * - Long absence (>24h): "Where were you?" — sad greeting
 * - Quick return (<1h): "You're back!" — happy greeting
 * - Normal (1-24h): neutral
 */

const STORAGE_KEY = 'sphere_last_visit'

export class PersistenceManager {
    constructor() {
        this.lastVisit = this._load()
        this.hoursSince = this._calculateHoursSince()
        this.returnType = this._determineReturnType()

        // Save current visit on unload
        window.addEventListener('beforeunload', () => this._save())
        // Also save periodically (mobile doesn't always fire beforeunload)
        setInterval(() => this._save(), 30000)
    }

    _load() {
        const stored = localStorage.getItem(STORAGE_KEY)
        return stored ? parseInt(stored, 10) : null
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
    }

    _calculateHoursSince() {
        if (!this.lastVisit) return null  // First visit
        return (Date.now() - this.lastVisit) / 3600000
    }

    _determineReturnType() {
        if (this.hoursSince === null) return 'first'  // First ever visit
        if (this.hoursSince > 24) return 'sad'        // "Где ты был?"
        if (this.hoursSince < 1) return 'happy'       // "Ты вернулся!"
        return 'neutral'
    }

    /** @returns {'first' | 'happy' | 'neutral' | 'sad'} */
    getReturnType() {
        return this.returnType
    }

    /** @returns {number | null} Hours since last visit */
    getHoursSince() {
        return this.hoursSince
    }

    /** @returns {boolean} */
    isFirstVisit() {
        return this.returnType === 'first'
    }
}
