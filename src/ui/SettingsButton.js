/**
 * SettingsButton — кнопка настроек (gear icon)
 * Открывает SettingsModal при клике
 */
import { GlassButton } from './GlassButton.js'

const ICON_GEAR = `<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
</svg>`

export class SettingsButton {
    constructor(options = {}) {
        this.onOpen = options.onOpen || null

        this._handleClick = this._handleClick.bind(this)

        this.button = new GlassButton({
            icon: ICON_GEAR,
            ariaLabel: 'Настройки',
            onClick: this._handleClick,
            className: 'settings-button'
        })
    }

    _handleClick() {
        if (this.onOpen) {
            this.onOpen()
        }
    }

    getElement() {
        return this.button.getElement()
    }

    show() {
        this.button.show()
    }

    hide() {
        this.button.hide()
    }

    dispose() {
        this.button.dispose()
    }
}
