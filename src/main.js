import '../style.css'
import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js'
import { InputManager } from './InputManager.js'
import { ParticleSystem } from './ParticleSystem.js'
import { Sphere } from './Sphere.js'
import { EffectConductor } from './EffectConductor.js'
import { SoundManager } from './SoundManager.js'
import { SampleSoundSystem } from './SampleSoundSystem.js'
import { Eye } from './Eye.js'
import { MemoryManager } from './MemoryManager.js'
import { HapticManager } from './HapticManager.js'
import { OrganicTicks } from './OrganicTicks.js'
import { LivingCore } from './LivingCore.js'
import { IdleAgency } from './IdleAgency.js'
import { TransformationManager } from './TransformationManager.js'
import { BeetleShell } from './shells/BeetleShell.js'
import { CharacterPanel } from './CharacterPanel.js'

/**
 * Main application entry point
 * Orchestrates scene, camera, renderer, and modules
 */
class App {
    constructor() {
        this.canvas = document.getElementById('canvas')
        this.clickToStart = document.getElementById('click-to-start')

        this.isStarted = false
        this.clock = new THREE.Clock()
        this.sizeMultiplier = 1.0  // Responsive size for mobile

        this._initThree()
        this._initPostProcessing()
        this._initModules()
        this._bindEvents()
        this._animate()
    }

    /**
     * Calculate responsive size multiplier based on screen width
     * Mobile devices need larger particles for visibility and touch
     */
    _getDeviceSizeMultiplier() {
        const width = window.innerWidth
        // Breakpoints: < 480px = 1.8x (phones), < 768px = 1.4x (tablets), else = 1.0x
        if (width < 480) return 1.8
        if (width < 768) return 1.4
        return 1.0
    }

    _initThree() {
        // Scene
        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x000000)

        // Camera
        const aspect = window.innerWidth / window.innerHeight
        this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 100)
        this.camera.position.z = 5

        // Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        })
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    _initPostProcessing() {
        const width = window.innerWidth
        const height = window.innerHeight

        // Effect composer
        this.composer = new EffectComposer(this.renderer)

        // Render pass (base scene)
        const renderPass = new RenderPass(this.scene, this.camera)
        this.composer.addPass(renderPass)

        // Bloom pass (glow effect)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            0.8,    // strength (0-3, will be dynamic)
            0.4,    // radius (blur spread)
            0.2     // threshold (brightness cutoff, low = more glow)
        )
        this.composer.addPass(this.bloomPass)

        // Chromatic Aberration (RGB shift) - controlled by EffectConductor
        this.rgbShiftPass = new ShaderPass(RGBShiftShader)
        this.rgbShiftPass.uniforms.amount.value = 0  // Start at 0, driven by conductor
        this.rgbShiftPass.uniforms.angle.value = 0   // Horizontal shift
        this.composer.addPass(this.rgbShiftPass)
    }

    _initModules() {
        // Input manager
        this.inputManager = new InputManager(this.canvas)

        // Adaptive particle count for mobile
        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent)
        const particleCount = isMobile ? 2000 : 5000

        // Calculate responsive size multiplier
        this.sizeMultiplier = this._getDeviceSizeMultiplier()

        // Particle system (with size multiplier for mobile)
        this.particleSystem = new ParticleSystem(particleCount, 0.03, this.sizeMultiplier)
        this.scene.add(this.particleSystem.getMesh())

        // Eye (organic particle-based, with size multiplier)
        this.eye = new Eye(this.particleSystem.baseRadius, this.sizeMultiplier)
        this.scene.add(this.eye.getMesh())

        // Sphere orchestrator (emotional state machine)
        this.sphere = new Sphere(this.particleSystem, this.inputManager, this.camera)
        this.sphere.setSizeMultiplier(this.sizeMultiplier)  // Apply responsive sizing
        this.sphere.setEye(this.eye)  // Connect eye to emotional system
        // this.sphere.setDebug(true)  // Uncomment for debug logging

        // Memory Manager (emotional memory / trust system)
        this.memoryManager = new MemoryManager()
        this.sphere.setMemoryManager(this.memoryManager)

        // Character Panel (v3: swipe up to see stats)
        this.characterPanel = new CharacterPanel(this.memoryManager)

        // Effect Conductor ("Living Chaos" system)
        this.effectConductor = new EffectConductor()

        // Living Core (inner glow layers — heartbeat, pulse, outer glow)
        this.livingCore = new LivingCore(this.particleSystem.baseRadius)
        this.scene.add(this.livingCore.getMesh())

        // Transformation Manager (Eerie shell states)
        // TEMPORARILY DISABLED — needs proper 3D shell implementation
        this.transformManager = new TransformationManager(
            this.scene,
            this.particleSystem,
            this.camera
        )
        // BeetleShell with GLB model loading (falls back to procedural if load fails)
        const beetleShell = new BeetleShell(this.scene)
        this.transformManager.registerShell('beetle', beetleShell)
        // Preload GLB model asynchronously
        beetleShell.preload().then((loaded) => {
            console.log(`[App] BeetleShell model: ${loaded ? 'GLB loaded' : 'using procedural fallback'}`)
        })

        // Connect components for visibility management during shell transitions
        this.transformManager.setComponents(this.livingCore, this.eye)
        // Connect input for cursor forwarding to active shell
        this.transformManager.setInput(this.inputManager)

        // this.transformManager.DEBUG = true  // Uncomment for debug logging
    }

    _bindEvents() {
        // Resize
        window.addEventListener('resize', this._onResize.bind(this))

        // Click to start
        this.clickToStart.addEventListener('click', this._start.bind(this))
        this.clickToStart.addEventListener('touchstart', (e) => {
            e.preventDefault()
            this._start()
        })
    }

    _start() {
        if (this.isStarted) return
        this.isStarted = true
        this.clickToStart.classList.add('hidden')

        // Initialize audio after user interaction (respects autoplay policy)
        this.soundManager = new SoundManager()
        this.sphere.setSoundManager(this.soundManager)

        // Initialize sample-based sound system
        this.sampleSound = new SampleSoundSystem(this.soundManager.audioContext)
        this.sampleSound.loadSamples().catch(err => {
            console.error('[App] Failed to load samples:', err)
        })

        // Initialize haptic feedback (Vibration API)
        this.hapticManager = new HapticManager()
        this.sphere.setHapticManager(this.hapticManager)

        // Initialize organic ticks (autonomous micro-movements)
        this.organicTicks = new OrganicTicks(this.sphere, this.particleSystem, this.eye)
        this.organicTicks.setInputManager(this.inputManager)

        // Initialize idle agency (autonomous behavior when user is inactive)
        this.idleAgency = new IdleAgency(this.sphere, this.organicTicks, this.eye, this.particleSystem)
        this.idleAgency.setInputManager(this.inputManager)

        // Start haptic heartbeat (continuous pulse tied to emotional state)
        this.hapticManager.startHeartbeat('peace')
    }

    _onResize() {
        const width = window.innerWidth
        const height = window.innerHeight

        this.camera.aspect = width / height
        this.camera.updateProjectionMatrix()

        this.renderer.setSize(width, height)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

        // Update bloom pass resolution
        this.composer.setSize(width, height)

        // Update particle size uniform
        this.particleSystem.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)

        // Recalculate responsive size multiplier (for orientation changes)
        const newMultiplier = this._getDeviceSizeMultiplier()
        if (newMultiplier !== this.sizeMultiplier) {
            this.sizeMultiplier = newMultiplier
            this.sphere.setSizeMultiplier(newMultiplier)
            this.eye.setSizeMultiplier(newMultiplier)
            this.particleSystem.setSizeMultiplier(newMultiplier)
        }
    }

    _animate() {
        requestAnimationFrame(this._animate.bind(this))

        const delta = this.clock.getDelta()
        const elapsed = this.clock.getElapsedTime()

        // Update input
        this.inputManager.update(delta)

        // Delegate all behavior to the Sphere orchestrator
        if (this.isStarted) {
            this.sphere.update(delta, elapsed)

            // ═══════════════════════════════════════════════════════════
            // LIVING CORE: Inner glow layers — "heart", "pulse", "aura"
            // ═══════════════════════════════════════════════════════════
            const breathPhase = this.particleSystem.material.uniforms.uBreathPhase?.value || 0
            const rotation = this.particleSystem.mesh.rotation
            const touch = this.sphere.cursorOnSphere ? {
                position: this.sphere.cursorWorldPos || new THREE.Vector3(),
                intensity: this.sphere.osmosisDepth || 0.5
            } : null

            this.livingCore.update(
                delta,
                elapsed,
                this.sphere.getEmotionPhase?.() || 'peace',
                breathPhase,
                touch,
                rotation
            )

            // Trigger emotional reactions
            if (this.sphere.currentPhase === 'bleeding') {
                this.livingCore.onBleeding()
            }
            if (this.sphere.osmosisActive) {
                this.livingCore.onOsmosis(this.sphere.osmosisDepth || 0)
            }

            // Sync eye rotation with sphere rolling
            this.eye.setSphereRotation(this.particleSystem.mesh.rotation)
            this.eye.update(delta, elapsed)

            // ═══════════════════════════════════════════════════════════
            // IDLE AGENCY: Autonomous behavior when user is inactive
            // "She doesn't just wait — she wonders, fidgets, beckons"
            // ═══════════════════════════════════════════════════════════
            if (this.idleAgency) {
                this.idleAgency.update(delta, elapsed)
            }

            // ═══════════════════════════════════════════════════════════
            // ORGANIC TICKS: Autonomous micro-movements when idle
            // "She twitches, stretches, shivers — alive even when unwatched"
            // ═══════════════════════════════════════════════════════════
            if (this.organicTicks) {
                this.organicTicks.update(delta, elapsed)
            }

            // ═══════════════════════════════════════════════════════════
            // TRANSFORMATION MANAGER: Eerie shell states
            // "She becomes something else. Briefly. Disturbingly."
            // ═══════════════════════════════════════════════════════════
            if (this.transformManager) {
                const idleMood = this.idleAgency?.getMood?.() || null
                this.transformManager.update(delta, elapsed, idleMood)
            }

            // ═══════════════════════════════════════════════════════════
            // HAPTIC HEARTBEAT: Continuous pulse synchronized with sphere
            // "You feel her pulse through the screen"
            // ═══════════════════════════════════════════════════════════
            if (this.hapticManager) {
                this.hapticManager.update(delta, elapsed)
            }

            // Collect traces once per frame (used by ParticleSystem)
            const ghostTraces = this.memoryManager.getActiveGhostTraces()

            // ═══════════════════════════════════════════════════════════
            // SAMPLE SOUND SYSTEM: Living sound with LFO modulation
            // ═══════════════════════════════════════════════════════════
            if (this.sampleSound) {
                const inputState = this.inputManager.getState()
                this.sampleSound.update({
                    isActive: this.inputManager.isActive,
                    touchIntensity: inputState.touchIntensity || 0,
                    velocity: inputState.velocity || 0,
                    // Emotional parameters for L7 Glitch
                    colorProgress: this.sphere.currentColorProgress || 0,
                    holdSaturation: this.sphere.osmosisDepth || 0
                }, elapsed)

                // Update debug UI
                this._updateSoundDebug(elapsed)
            }

            // Dynamic bloom based on emotional state
            const colorProgress = this.sphere.currentColorProgress || 0
            // Bloom intensifies with tension (0.4 baseline, up to 1.5 at max)
            this.bloomPass.strength = 0.4 + colorProgress * 1.1

            // Effect Conductor: probabilistic effect system
            this.effectConductor.update(delta, elapsed, colorProgress)
            const fx = this.effectConductor.getOutputs()

            // Apply conductor outputs to particle system
            this.particleSystem.material.uniforms.uDynamicSizeAmount.value = fx.dynamicSizeAmount
            this.particleSystem.material.uniforms.uSparkleIntensity.value = fx.sparkleIntensity

            // Chromatic aberration: intensity 0-1 → amount 0-0.008
            this.rgbShiftPass.uniforms.amount.value = fx.chromaticAberration * 0.008

            // Memory Manager: Apply trust-based visual effects
            const colorMod = this.memoryManager.getPeaceColorMod()
            this.particleSystem.setPeaceColorMod(colorMod.saturationMod, colorMod.lightnessMod)

            // Pass traces to particle system for rendering
            this.particleSystem.setGhostTraces(ghostTraces)

            const warmTraces = this.memoryManager.getActiveWarmTraces()
            this.particleSystem.setWarmTraces(warmTraces)
        } else {
            // Before start - just breathe
            this.particleSystem.update(delta, elapsed)
            this.eye.update(delta, elapsed)
        }

        // Render with post-processing
        this.composer.render()
    }

    /**
     * Update sound debug panel with LFO values and emotional parameters
     */
    _updateSoundDebug(elapsed) {
        if (!this.sampleSound) return

        // Get debug panel elements (cache them on first call)
        if (!this._debugElements) {
            const panel = document.getElementById('sound-debug')
            if (!panel) return

            // Show panel
            panel.classList.remove('hidden')

            this._debugElements = {
                // LFO bars
                ocean: document.getElementById('lfo-ocean'),
                breath: document.getElementById('lfo-breath'),
                pulse: document.getElementById('lfo-pulse'),
                shimmer: document.getElementById('lfo-shimmer'),
                drift: document.getElementById('lfo-drift'),
                status: document.getElementById('debug-status'),
                // Emotional params
                emoColor: document.getElementById('emo-color'),
                emoColorVal: document.getElementById('emo-color-val'),
                emoHold: document.getElementById('emo-hold'),
                emoHoldVal: document.getElementById('emo-hold-val'),
                emoTension: document.getElementById('emo-tension'),
                emoTensionVal: document.getElementById('emo-tension-val'),
                emoGlitch: document.getElementById('emo-glitch'),
                emoGlitchVal: document.getElementById('emo-glitch-val'),
                glitchStatus: document.getElementById('glitch-status')
            }
        }

        const debug = this.sampleSound.getDebugInfo(elapsed)
        const els = this._debugElements

        // Update LFO bars
        if (els.ocean) els.ocean.style.width = `${debug.lfo.ocean * 100}%`
        if (els.breath) els.breath.style.width = `${debug.lfo.breath * 100}%`
        if (els.pulse) els.pulse.style.width = `${debug.lfo.pulse * 100}%`
        if (els.shimmer) els.shimmer.style.width = `${debug.lfo.shimmer * 100}%`
        if (els.drift) els.drift.style.width = `${debug.lfo.drift * 100}%`

        // Update status
        if (els.status) {
            els.status.textContent = debug.isPlaying ? `PLAYING (${(debug.intensity * 100).toFixed(0)}%)` : 'idle'
            els.status.className = 'debug-status' + (debug.isPlaying ? ' playing' : '')
        }

        // Update emotional parameters
        const colorProgress = this.sphere.currentColorProgress || 0
        const holdSaturation = this.sphere.osmosisDepth || 0
        const tension = Math.max(colorProgress, holdSaturation * 0.8)
        const threshold = 0.35
        const glitchMix = tension > threshold ? (tension - threshold) / (1 - threshold) : 0

        if (els.emoColor) els.emoColor.style.width = `${colorProgress * 100}%`
        if (els.emoColorVal) els.emoColorVal.textContent = colorProgress.toFixed(2)

        if (els.emoHold) els.emoHold.style.width = `${holdSaturation * 100}%`
        if (els.emoHoldVal) els.emoHoldVal.textContent = holdSaturation.toFixed(2)

        if (els.emoTension) els.emoTension.style.width = `${tension * 100}%`
        if (els.emoTensionVal) els.emoTensionVal.textContent = tension.toFixed(2)

        if (els.emoGlitch) els.emoGlitch.style.width = `${glitchMix * 100}%`
        if (els.emoGlitchVal) els.emoGlitchVal.textContent = glitchMix.toFixed(2)

        if (els.glitchStatus) {
            const isActive = glitchMix > 0
            els.glitchStatus.textContent = isActive
                ? `GLITCH: ON (${(glitchMix * 100).toFixed(0)}%)`
                : `glitch: OFF (tension ${tension.toFixed(2)} < ${threshold})`
            els.glitchStatus.className = isActive ? 'debug-status active' : 'debug-status'
        }
    }

    dispose() {
        this.memoryManager.dispose()
        this.particleSystem.dispose()
        this.inputManager.dispose()
        this.renderer.dispose()
    }
}

// Start app
window.app = new App()

// Debug commands for TransformationManager
window.triggerTransform = (state = 'beetle') => {
    if (window.app.transformManager) {
        window.app.transformManager.forceTransform(state)
        console.log(`[DEBUG] Triggering transform to: ${state}`)
    } else {
        console.warn('[DEBUG] TransformationManager not initialized')
    }
}
window.returnToOrganic = () => {
    if (window.app.transformManager) {
        window.app.transformManager.returnToOrganic()
        console.log('[DEBUG] Returning to organic')
    }
}

