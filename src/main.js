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

        this._initThree()
        this._initPostProcessing()
        this._initModules()
        this._bindEvents()
        this._animate()
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

        // Particle system
        this.particleSystem = new ParticleSystem(particleCount, 0.03)
        this.scene.add(this.particleSystem.getMesh())

        // Sphere orchestrator (emotional state machine)
        this.sphere = new Sphere(this.particleSystem, this.inputManager, this.camera)
        // this.sphere.setDebug(true)  // Uncomment for debug logging

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

        // Audio would be initialized here
        // this.audioManager = new AudioManager()
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
        } else {
            // Before start - just breathe
            this.particleSystem.update(delta, elapsed)
        }

        // Render with post-processing
        this.composer.render()
    }

    dispose() {
        this.particleSystem.dispose()
        this.inputManager.dispose()
        this.renderer.dispose()
    }
}

// Start app
window.app = new App()
