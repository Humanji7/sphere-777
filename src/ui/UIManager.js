/**
 * UIManager — координатор UI компонентов
 * Управляет: SoundToggle, SettingsButton, SettingsModal, EntitySwitcher
 */
import { SoundToggle } from './SoundToggle.js'
import { SettingsButton } from './SettingsButton.js'
import { SettingsModal } from './SettingsModal.js'
import { EntitySwitcher } from './EntitySwitcher.js'
import { EmotionRing } from './EmotionRing.js'

export class UIManager {
    constructor(options = {}) {
        this.onSoundToggle = options.onSoundToggle || null
        this.onEntitySwitch = options.onEntitySwitch || null

        this.layer = null
        this.soundToggle = null
        this.settingsButton = null
        this.settingsModal = null
        this.entitySwitcher = null
        this.emotionRing = null
        this.entityWrapper = null
        this.soundManager = null
        this.sampleSound = null
        this.memoryManager = null
        this.transformManager = null

        this._create()
    }

    _create() {
        // Create UI layer container
        this.layer = document.createElement('div')
        this.layer.id = 'ui-layer'
        this.layer.className = 'ui-layer'

        // Top-left container (SoundToggle)
        const topLeft = document.createElement('div')
        topLeft.className = 'ui-top-left'

        // Top-right container (SettingsButton)
        const topRight = document.createElement('div')
        topRight.className = 'ui-top-right'

        // Bottom-center container (EntitySwitcher — M7)
        const bottomCenter = document.createElement('div')
        bottomCenter.className = 'ui-bottom-center'

        // Create SoundToggle
        this.soundToggle = new SoundToggle({
            onToggle: (muted) => this._handleSoundToggle(muted)
        })
        topLeft.appendChild(this.soundToggle.getElement())

        // Create SettingsButton
        this.settingsButton = new SettingsButton({
            onOpen: () => this._handleSettingsOpen()
        })
        topRight.appendChild(this.settingsButton.getElement())

        // Create SettingsModal (hidden by default)
        this.settingsModal = new SettingsModal({
            onClose: () => this._handleSettingsClose()
        })

        // Create EntitySwitcher with EmotionRing wrapper
        this.entityWrapper = document.createElement('div')
        this.entityWrapper.className = 'entity-wrapper'
        this.entityWrapper.dataset.testid = 'entity-wrapper'

        // Create EmotionRing and add to wrapper
        this.emotionRing = new EmotionRing()
        this.entityWrapper.appendChild(this.emotionRing.create())

        // Create EntitySwitcher and add to wrapper
        this.entitySwitcher = new EntitySwitcher({
            onSwitch: (entityId) => this._handleEntitySwitch(entityId)
        })
        this.entityWrapper.appendChild(this.entitySwitcher.getElement())

        bottomCenter.appendChild(this.entityWrapper)

        // Assemble layer
        this.layer.appendChild(topLeft)
        this.layer.appendChild(topRight)
        this.layer.appendChild(bottomCenter)

        // Add to DOM
        document.body.appendChild(this.layer)
    }

    _handleEntitySwitch(entityId) {
        if (this.onEntitySwitch) {
            this.onEntitySwitch(entityId)
        }
    }

    _handleSettingsOpen() {
        if (this.settingsModal) {
            this.settingsModal.toggle()
        }
    }

    _handleSettingsClose() {
        // Optional callback when settings close
    }

    _handleSoundToggle(muted) {
        // Mute/unmute SampleSoundSystem
        if (this.sampleSound) {
            if (muted) {
                this.sampleSound.mute()
            } else {
                // Fade in over 300ms
                this._fadeInSound(0.3)
            }
        }

        // Mute/unmute SoundManager (legacy)
        if (this.soundManager && this.soundManager.setMasterVolume) {
            if (muted) {
                this.soundManager.setMasterVolume(0)
            } else {
                this.soundManager.setMasterVolume(1)
            }
        }

        // Callback
        if (this.onSoundToggle) {
            this.onSoundToggle(muted)
        }
    }

    _fadeInSound(duration) {
        if (!this.sampleSound) return

        const targetVolume = 0.35  // Default unmute volume
        const steps = 10
        const stepTime = (duration * 1000) / steps
        let currentStep = 0

        const interval = setInterval(() => {
            currentStep++
            const volume = (currentStep / steps) * targetVolume
            this.sampleSound.setVolume(volume)

            if (currentStep >= steps) {
                clearInterval(interval)
            }
        }, stepTime)
    }

    /**
     * Update emotion ring visualization
     * @param {string} emotionState - Current emotion from Sphere
     */
    updateEmotion(emotionState) {
        if (this.emotionRing) {
            this.emotionRing.setEmotion(emotionState)
        }
    }

    setSoundManager(soundManager) {
        this.soundManager = soundManager
    }

    setSampleSound(sampleSound) {
        this.sampleSound = sampleSound
    }

    setMemoryManager(memoryManager) {
        this.memoryManager = memoryManager
        if (this.settingsModal) {
            this.settingsModal.setMemoryManager(memoryManager)
        }
    }

    setTransformManager(transformManager) {
        this.transformManager = transformManager
        if (this.entitySwitcher) {
            this.entitySwitcher.setTransformManager(transformManager)
        }
    }

    setAccelerometer(accelerometer) {
        this.accelerometer = accelerometer
        if (this.settingsModal) {
            this.settingsModal.setAccelerometer(accelerometer)
        }
    }

    show() {
        if (this.layer) {
            this.layer.classList.add('visible')
        }
    }

    hide() {
        if (this.layer) {
            this.layer.classList.remove('visible')
        }
        // Also hide modal when UI hides
        if (this.settingsModal) {
            this.settingsModal.hide()
        }
    }

    dispose() {
        if (this.soundToggle) {
            this.soundToggle.dispose()
        }
        if (this.settingsButton) {
            this.settingsButton.dispose()
        }
        if (this.settingsModal) {
            this.settingsModal.dispose()
        }
        if (this.entitySwitcher) {
            this.entitySwitcher.dispose()
        }
        if (this.emotionRing) {
            this.emotionRing.destroy()
        }
        if (this.layer) {
            this.layer.remove()
            this.layer = null
        }
    }
}
