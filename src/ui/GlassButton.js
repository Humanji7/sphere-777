/**
 * GlassButton — базовый glassmorphism компонент
 * Subtle glass effect with blur backdrop
 */
export class GlassButton {
    constructor(options = {}) {
        this.icon = options.icon || ''
        this.ariaLabel = options.ariaLabel || 'Button'
        this.onClick = options.onClick || null
        this.className = options.className || ''

        this.element = null
        this._handleClick = this._handleClick.bind(this)
        this._handleTouchStart = this._handleTouchStart.bind(this)

        this._create()
    }

    _create() {
        this.element = document.createElement('button')
        this.element.className = `glass-button ${this.className}`.trim()
        this.element.setAttribute('aria-label', this.ariaLabel)
        this.element.setAttribute('type', 'button')

        if (this.icon) {
            this.element.innerHTML = this.icon
        }

        this.element.addEventListener('click', this._handleClick)
        this.element.addEventListener('touchstart', this._handleTouchStart, { passive: true })
    }

    _handleClick(e) {
        e.stopPropagation()
        if (this.onClick) {
            this.onClick(e)
        }
    }

    _handleTouchStart(e) {
        // Prevent double-fire on touch devices
        e.stopPropagation()
    }

    setIcon(iconSvg) {
        this.icon = iconSvg
        if (this.element) {
            this.element.innerHTML = iconSvg
        }
    }

    setAriaLabel(label) {
        this.ariaLabel = label
        if (this.element) {
            this.element.setAttribute('aria-label', label)
        }
    }

    show() {
        if (this.element) {
            this.element.style.display = 'flex'
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none'
        }
    }

    getElement() {
        return this.element
    }

    dispose() {
        if (this.element) {
            this.element.removeEventListener('click', this._handleClick)
            this.element.removeEventListener('touchstart', this._handleTouchStart)
            this.element.remove()
            this.element = null
        }
    }
}
