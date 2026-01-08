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
import { Eye } from './Eye.js'
import { MemoryManager } from './MemoryManager.js'

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

        // Effect Conductor ("Living Chaos" system)
        this.effectConductor = new EffectConductor()
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

            // Sync eye rotation with sphere rolling
            this.eye.setSphereRotation(this.particleSystem.mesh.rotation)
            this.eye.update(delta, elapsed)

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
            const ghostTraces = this.memoryManager.getActiveGhostTraces()
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

    dispose() {
        this.memoryManager.dispose()
        this.particleSystem.dispose()
        this.inputManager.dispose()
        this.renderer.dispose()
    }
}

// Start app
window.app = new App()
