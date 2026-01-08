/**
 * HapticManager - Vibration API wrapper for physical feedback
 * 
 * Provides haptic patterns for osmosis touch experience:
 * - softTouch: Initial contact feedback
 * - heartbeat: Rhythmic pulse during deep contact
 */
export class HapticManager {
    constructor() {
        this.supported = 'vibrate' in navigator
        this.lastPulse = 0
    }

    /**
     * Soft impulse on initial touch
     */
    softTouch() {
        if (!this.supported) return
        navigator.vibrate(10)
    }

    /**
     * Heartbeat pattern for deep contact
     * @param {number} intensity - 0 to 1, affects pulse duration
     */
    heartbeat(intensity) {
        if (!this.supported) return
        const duration = Math.floor(20 + intensity * 30)
        navigator.vibrate([duration, 100, duration])
    }
}
