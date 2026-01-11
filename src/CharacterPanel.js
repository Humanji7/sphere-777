/**
 * CharacterPanel.js — UI for displaying sphere character stats
 *
 * v3: Shows real data from MemoryManager
 * - Total time together
 * - Emotional phase distribution
 * - Trust index
 * - Gesture profile
 *
 * Access: Swipe up from bottom
 */

// Phase labels in Russian
const PHASE_LABELS = {
    peace: 'Покой',
    listening: 'Внимание',
    tension: 'Напряжение',
    bleeding: 'Погружение',
    trauma: 'Травма',
    healing: 'Исцеление'
}

// Gesture labels in Russian
const GESTURE_LABELS = {
    stroke: 'поглаживание',
    tap: 'касание',
    poke: 'тычок',
    hold: 'удержание',
    orbit: 'орбита',
    spiral: 'спираль',
    tremble: 'дрожь',
    flick: 'щелчок',
    hesitation: 'колебание'
}

export class CharacterPanel {
    constructor(memoryManager) {
        this.memory = memoryManager
        this.isOpen = false
        this.startY = 0
        this.currentY = 0
        this.isDragging = false

        // DOM elements
        this.panel = document.getElementById('character-panel')
        this.swipeHint = document.getElementById('swipe-hint')
        this.phaseBars = document.getElementById('phase-bars')
        this.trustFill = document.getElementById('trust-fill')
        this.trustValue = document.getElementById('trust-value')
        this.gestureStats = document.getElementById('gesture-stats')
        this.totalTime = document.getElementById('panel-total-time')

        if (!this.panel) {
            console.warn('[CharacterPanel] Panel element not found')
            return
        }

        this._initSwipeDetection()
        this._initPhaseBars()

        // Show swipe hint after 3 seconds
        setTimeout(() => {
            if (this.swipeHint) {
                this.swipeHint.classList.remove('hidden')
            }
        }, 3000)
    }

    /**
     * Initialize swipe detection for opening/closing panel
     * @private
     */
    _initSwipeDetection() {
        const app = document.getElementById('app')
        if (!app) return

        // Touch events
        app.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: true })
        app.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false })
        app.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: true })

        // Click on panel handle to toggle
        const handle = this.panel.querySelector('.panel-handle')
        if (handle) {
            handle.addEventListener('click', () => this.toggle())
        }
    }

    /**
     * Initialize phase bar elements
     * @private
     */
    _initPhaseBars() {
        if (!this.phaseBars) return

        const phases = ['peace', 'listening', 'tension', 'bleeding', 'trauma', 'healing']
        this.phaseBars.innerHTML = phases.map(phase => `
            <div class="phase-row">
                <span class="phase-label">${PHASE_LABELS[phase]}</span>
                <div class="phase-bar">
                    <div class="phase-fill ${phase}" id="phase-${phase}" style="width: 0%"></div>
                </div>
                <span class="phase-value" id="phase-value-${phase}">0%</span>
            </div>
        `).join('')
    }

    /**
     * Handle touch start
     * @private
     */
    _onTouchStart(e) {
        if (e.touches.length !== 1) return

        const touch = e.touches[0]
        this.startY = touch.clientY
        this.currentY = touch.clientY

        // Check if starting from bottom area (for opening)
        const screenHeight = window.innerHeight
        const isBottomArea = touch.clientY > screenHeight - 100

        // Check if touching panel (for closing)
        const isOnPanel = this.panel.contains(e.target)

        if (isBottomArea || isOnPanel) {
            this.isDragging = true
        }
    }

    /**
     * Handle touch move
     * @private
     */
    _onTouchMove(e) {
        if (!this.isDragging) return

        const touch = e.touches[0]
        const deltaY = this.startY - touch.clientY

        // Swipe up to open
        if (!this.isOpen && deltaY > 50) {
            this.open()
            this.isDragging = false
        }
        // Swipe down to close
        else if (this.isOpen && deltaY < -50) {
            this.close()
            this.isDragging = false
        }

        this.currentY = touch.clientY
    }

    /**
     * Handle touch end
     * @private
     */
    _onTouchEnd(e) {
        this.isDragging = false
    }

    /**
     * Open the panel
     */
    open() {
        if (!this.panel) return

        this.isOpen = true
        this.panel.classList.remove('hidden')
        this.panel.classList.add('visible')

        // Hide swipe hint
        if (this.swipeHint) {
            this.swipeHint.classList.add('hidden')
        }

        // Update with latest data
        this.update()
    }

    /**
     * Close the panel
     */
    close() {
        if (!this.panel) return

        this.isOpen = false
        this.panel.classList.remove('visible')
        this.panel.classList.add('hidden')
    }

    /**
     * Toggle panel open/close
     */
    toggle() {
        if (this.isOpen) {
            this.close()
        } else {
            this.open()
        }
    }

    /**
     * Update panel with current stats
     */
    update() {
        if (!this.memory) return

        const stats = this.memory.getCharacterStats()

        // Update total time
        if (this.totalTime) {
            this.totalTime.textContent = this._formatTime(stats.totalTime)
        }

        // Update phase bars
        this._updatePhaseBars(stats.phaseDistribution)

        // Update trust
        this._updateTrust(stats.trustIndex)

        // Update gesture stats
        this._updateGestures(stats.gestureDistribution, stats.dominantGesture)
    }

    /**
     * Update phase distribution bars
     * @private
     */
    _updatePhaseBars(distribution) {
        const phases = ['peace', 'listening', 'tension', 'bleeding', 'trauma', 'healing']

        phases.forEach(phase => {
            const fill = document.getElementById(`phase-${phase}`)
            const value = document.getElementById(`phase-value-${phase}`)
            const percent = (distribution[phase] || 0) * 100

            if (fill) {
                fill.style.width = `${percent}%`
            }
            if (value) {
                value.textContent = `${Math.round(percent)}%`
            }
        })
    }

    /**
     * Update trust bar
     * @private
     */
    _updateTrust(trustIndex) {
        const percent = trustIndex * 100

        if (this.trustFill) {
            this.trustFill.style.width = `${percent}%`
        }
        if (this.trustValue) {
            this.trustValue.textContent = `${Math.round(percent)}%`
        }
    }

    /**
     * Update gesture tags
     * @private
     */
    _updateGestures(distribution, dominant) {
        if (!this.gestureStats) return

        // Get top gestures (> 5%)
        const gestures = Object.entries(distribution)
            .filter(([_, value]) => value > 0.05)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)

        if (gestures.length === 0) {
            this.gestureStats.innerHTML = '<span class="gesture-tag">ещё нет данных</span>'
            return
        }

        this.gestureStats.innerHTML = gestures.map(([gesture, value]) => {
            const label = GESTURE_LABELS[gesture] || gesture
            const percent = Math.round(value * 100)
            const isDominant = gesture === dominant
            return `<span class="gesture-tag ${isDominant ? 'dominant' : ''}">${label} ${percent}%</span>`
        }).join('')
    }

    /**
     * Format seconds to human-readable time
     * @private
     */
    _formatTime(seconds) {
        if (seconds < 60) {
            return `${Math.round(seconds)}с`
        }
        if (seconds < 3600) {
            const mins = Math.floor(seconds / 60)
            return `${mins}м`
        }
        const hours = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        return `${hours}ч ${mins}м`
    }

    /**
     * Cleanup
     */
    dispose() {
        // Event listeners are on app element, will be cleaned up with it
    }
}
