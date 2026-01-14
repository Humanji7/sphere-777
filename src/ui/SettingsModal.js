/**
 * SettingsModal — compact mobile settings dropdown
 * Minimal, English, mobile-first
 */

export class SettingsModal {
    constructor(options = {}) {
        this.onClose = options.onClose || null
        this.memoryManager = options.memoryManager || null
        this.accelerometer = options.accelerometer || null

        this.element = null
        this.isVisible = false

        this._handleOutsideClick = this._handleOutsideClick.bind(this)
        this._handleKeydown = this._handleKeydown.bind(this)

        this._create()
    }

    _create() {
        this.element = document.createElement('div')
        this.element.className = 'settings-modal'
        this.element.setAttribute('role', 'dialog')
        this.element.setAttribute('aria-label', 'Settings')

        this._renderContent()
        document.body.appendChild(this.element)
    }

    _renderContent() {
        const sessionTime = this._getSessionTime()

        let html = `<div class="modal-items">`

        // About
        html += `
            <div class="modal-item" data-action="about">
                <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                <span>About</span>
            </div>
        `

        // Stats (unlock after 5 min)
        if (sessionTime >= 300) {
            html += `
                <div class="modal-item" data-action="stats">
                    <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                    <span>Stats</span>
                </div>
            `
        }

        // Credits
        html += `
            <div class="modal-item" data-action="credits">
                <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>Credits</span>
            </div>
        `

        // Motion toggle (accelerometer)
        const motionOn = this._isMotionEnabled()
        const motionSupported = this.accelerometer?.isSupported !== false
        if (motionSupported) {
            html += `
                <div class="modal-item modal-item-toggle" data-action="motion">
                    <svg viewBox="0 0 24 24"><path d="M17.66 17.66l-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06L9.7 9.7l-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06L4 4v16h16l-2.34-2.34zM7 17v-5.76L12.76 17H7z"/></svg>
                    <span>Motion</span>
                    <span class="toggle-indicator">${motionOn ? 'ON' : 'OFF'}</span>
                </div>
            `
        }

        // Debug toggle
        const debugOn = this._isDebugVisible()
        html += `
            <div class="modal-item modal-item-toggle" data-action="debug">
                <svg viewBox="0 0 24 24"><path d="M20 8h-2.81c-.45-.78-1.07-1.45-1.82-1.96L17 4.41 15.59 3l-2.17 2.17C12.96 5.06 12.49 5 12 5c-.49 0-.96.06-1.41.17L8.41 3 7 4.41l1.62 1.63C7.88 6.55 7.26 7.22 6.81 8H4v2h2.09c-.05.33-.09.66-.09 1v1H4v2h2v1c0 .34.04.67.09 1H4v2h2.81c1.04 1.79 2.97 3 5.19 3s4.15-1.21 5.19-3H20v-2h-2.09c.05-.33.09-.66.09-1v-1h2v-2h-2v-1c0-.34-.04-.67-.09-1H20V8zm-6 8h-4v-2h4v2zm0-4h-4v-2h4v2z"/></svg>
                <span>Debug</span>
                <span class="toggle-indicator">${debugOn ? 'ON' : 'OFF'}</span>
            </div>
        `

        html += `</div>`

        this.element.innerHTML = html
        this._bindEvents()
    }

    _bindEvents() {
        const items = this.element.querySelectorAll('.modal-item')
        items.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation()
                const action = item.dataset.action
                this._handleAction(action)
            })
        })
    }

    _handleAction(action) {
        switch (action) {
            case 'about':
                this._showAbout()
                break
            case 'credits':
                this._showCredits()
                break
            case 'stats':
                this._toggleStats()
                break
            case 'debug':
                this._toggleDebug()
                break
            case 'motion':
                this._toggleMotion()
                break
        }
    }

    _showAbout() {
        this.element.innerHTML = `
            <div class="modal-view">
                <div class="view-title">SPHERE</div>
                <div class="view-sub">v0.7.7</div>
                <div class="view-back" data-back>←</div>
            </div>
        `
        this.element.querySelector('[data-back]').addEventListener('click', () => {
            this._renderContent()
        })
    }

    _showCredits() {
        this.element.innerHTML = `
            <div class="modal-view">
                <div class="view-text">Three.js</div>
                <div class="view-text">Web Audio</div>
                <div class="view-back" data-back>←</div>
            </div>
        `
        this.element.querySelector('[data-back]').addEventListener('click', () => {
            this._renderContent()
        })
    }

    _toggleStats() {
        window.dispatchEvent(new CustomEvent('toggle-character-panel'))
        this.hide()
    }

    _isDebugVisible() {
        return localStorage.getItem('sphere_debug_panel') === 'true'
    }

    _toggleDebug() {
        const panel = document.getElementById('sound-debug')
        if (!panel) return

        const isVisible = this._isDebugVisible()
        const newState = !isVisible

        localStorage.setItem('sphere_debug_panel', String(newState))

        if (newState) {
            panel.classList.remove('hidden')
        } else {
            panel.classList.add('hidden')
        }

        // Re-render to update toggle indicator
        this._renderContent()
    }

    _isMotionEnabled() {
        return localStorage.getItem('sphere_motion') === 'true'
    }

    async _toggleMotion() {
        if (!this.accelerometer) return

        const isEnabled = this._isMotionEnabled()

        if (!isEnabled) {
            // Enabling — need to request permission first
            const granted = await this.accelerometer.requestPermission()
            if (!granted) {
                // Permission denied — show message briefly
                console.log('[Settings] Motion permission denied')
                return
            }

            this.accelerometer.enable()
            localStorage.setItem('sphere_motion', 'true')
        } else {
            // Disabling
            this.accelerometer.disable()
            localStorage.setItem('sphere_motion', 'false')
        }

        // Re-render to update toggle indicator
        this._renderContent()
    }

    _getSessionTime() {
        const awakened = localStorage.getItem('sphere_awakened')
        if (!awakened) return 0
        return (Date.now() - parseInt(awakened, 10)) / 1000
    }

    _handleOutsideClick(e) {
        if (this.isVisible && !this.element.contains(e.target)) {
            this.hide()
        }
    }

    _handleKeydown(e) {
        if (e.key === 'Escape' && this.isVisible) {
            this.hide()
        }
    }

    show() {
        if (this.isVisible) return

        this._renderContent()
        this.isVisible = true
        this.element.classList.add('visible')

        setTimeout(() => {
            document.addEventListener('click', this._handleOutsideClick)
            document.addEventListener('keydown', this._handleKeydown)
        }, 100)
    }

    hide() {
        if (!this.isVisible) return

        this.isVisible = false
        this.element.classList.remove('visible')

        document.removeEventListener('click', this._handleOutsideClick)
        document.removeEventListener('keydown', this._handleKeydown)

        if (this.onClose) {
            this.onClose()
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide()
        } else {
            this.show()
        }
    }

    setMemoryManager(memoryManager) {
        this.memoryManager = memoryManager
    }

    setAccelerometer(accelerometer) {
        this.accelerometer = accelerometer
    }

    dispose() {
        document.removeEventListener('click', this._handleOutsideClick)
        document.removeEventListener('keydown', this._handleKeydown)

        if (this.element) {
            this.element.remove()
            this.element = null
        }
    }
}
