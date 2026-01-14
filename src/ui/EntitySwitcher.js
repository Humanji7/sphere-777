/**
 * EntitySwitcher — переключатель сущностей
 * Tap: cycle entities (sphere → beetle → sphere)
 * Long press: open selector (when 3+ entities)
 */
import { GlassButton } from './GlassButton.js'

// SVG icons
const ICON_SPHERE = `<svg viewBox="0 0 24 24" fill="currentColor">
  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
  <circle cx="12" cy="12" r="4"/>
</svg>`

const ICON_BEETLE = `<svg viewBox="0 0 24 24" fill="currentColor">
  <ellipse cx="12" cy="14" rx="6" ry="7"/>
  <circle cx="12" cy="6" r="3"/>
  <line x1="6" y1="10" x2="3" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="18" y1="10" x2="21" y2="7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="5" y1="14" x2="1" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="19" y1="14" x2="23" y2="14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="6" y1="18" x2="3" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
  <line x1="18" y1="18" x2="21" y2="21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
</svg>`

const ENTITIES = [
    { id: 'organic', icon: ICON_SPHERE, label: 'Сфера' },
    { id: 'beetle', icon: ICON_BEETLE, label: 'Жук' }
]

export class EntitySwitcher {
    constructor(options = {}) {
        this.onSwitch = options.onSwitch || null
        this.transformManager = null

        this.currentIndex = 0
        this.entities = [...ENTITIES]
        this.hasNewEntity = false

        this._handleClick = this._handleClick.bind(this)
        this._handleLongPress = this._handleLongPress.bind(this)

        this.longPressTimer = null
        this.longPressThreshold = 500

        this.button = new GlassButton({
            icon: this.entities[0].icon,
            ariaLabel: `Текущая сущность: ${this.entities[0].label}. Нажмите для переключения`,
            onClick: this._handleClick,
            className: 'entity-switcher'
        })

        this._bindLongPress()
    }

    _bindLongPress() {
        const el = this.button.getElement()

        el.addEventListener('pointerdown', (e) => {
            if (this.entities.length < 3) return

            this.longPressTimer = setTimeout(() => {
                this._handleLongPress()
            }, this.longPressThreshold)
        })

        el.addEventListener('pointerup', () => {
            this._clearLongPress()
        })

        el.addEventListener('pointerleave', () => {
            this._clearLongPress()
        })

        el.addEventListener('pointercancel', () => {
            this._clearLongPress()
        })
    }

    _clearLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer)
            this.longPressTimer = null
        }
    }

    _handleClick() {
        // If long press was triggered, skip click
        if (this.longPressTimer === null && this.entities.length >= 3) {
            return
        }

        this._cycleEntity()
    }

    _cycleEntity() {
        this.currentIndex = (this.currentIndex + 1) % this.entities.length
        const entity = this.entities[this.currentIndex]

        this._updateIcon()
        this._clearNewEntityGlow()

        // Trigger transformation
        if (this.transformManager) {
            if (entity.id === 'organic') {
                this.transformManager.returnToOrganic()
            } else {
                this.transformManager.forceTransform(entity.id)
            }
        }

        if (this.onSwitch) {
            this.onSwitch(entity.id)
        }
    }

    _handleLongPress() {
        this.longPressTimer = null
        // TODO: Open entity selector popup when 3+ entities
        console.log('[EntitySwitcher] Long press — selector not implemented yet')
    }

    _updateIcon() {
        const entity = this.entities[this.currentIndex]
        this.button.setIcon(entity.icon)
        this.button.setAriaLabel(`Текущая сущность: ${entity.label}. Нажмите для переключения`)
    }

    setTransformManager(transformManager) {
        this.transformManager = transformManager
    }

    getCurrentEntity() {
        return this.entities[this.currentIndex].id
    }

    setEntity(entityId) {
        const index = this.entities.findIndex(e => e.id === entityId)
        if (index !== -1) {
            this.currentIndex = index
            this._updateIcon()
        }
    }

    addEntity(entity) {
        if (!this.entities.find(e => e.id === entity.id)) {
            this.entities.push(entity)
            this._showNewEntityGlow()
        }
    }

    _showNewEntityGlow() {
        this.hasNewEntity = true
        const el = this.button.getElement()
        if (el) {
            el.classList.add('has-new-entity')
        }
    }

    _clearNewEntityGlow() {
        this.hasNewEntity = false
        const el = this.button.getElement()
        if (el) {
            el.classList.remove('has-new-entity')
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
        this._clearLongPress()
        this.button.dispose()
    }
}
