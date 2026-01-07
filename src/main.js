import '../style.css'
import * as THREE from 'three'
import { InputManager } from './InputManager.js'
import { ParticleSystem } from './ParticleSystem.js'
import { Sphere } from './Sphere.js'

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

    _initModules() {
        // Input manager
        this.inputManager = new InputManager(this.canvas)

        // Particle system
        this.particleSystem = new ParticleSystem(2500, 0.03)
        this.scene.add(this.particleSystem.getMesh())

        // Sphere orchestrator (emotional state machine)
        this.sphere = new Sphere(this.particleSystem, this.inputManager)
        // this.sphere.setDebug(true)  // Uncomment for debug logging
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
        } else {
            // Before start - just breathe
            this.particleSystem.update(delta, elapsed)
        }

        // Render
        this.renderer.render(this.scene, this.camera)
    }

    dispose() {
        this.particleSystem.dispose()
        this.inputManager.dispose()
        this.renderer.dispose()
    }
}

// Start app
new App()
