/**
 * SettingsModal — compact mobile settings dropdown
 * Minimal, English, mobile-first
 */

export class SettingsModal {
    constructor(options = {}) {
        this.onClose = options.onClose || null
        this.memoryManager = options.memoryManager || null

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

        html += `</div>`

        this.element.innerHTML = html
        this._bindEvents()
    }

    _bindEvents() {
        const items = this.element.querySelectorAll('.modal-item')
        items.forEach(item => {
            item.addEventListener('click', () => {
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

    dispose() {
        document.removeEventListener('click', this._handleOutsideClick)
        document.removeEventListener('keydown', this._handleKeydown)

        if (this.element) {
            this.element.remove()
            this.element = null
        }
    }
}
