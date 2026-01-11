/**
 * BaseShell.js — Abstract Shell Interface
 * 
 * Base class for transformation shells (Beetle, Drone, Eye).
 * Handles fade in/out, auto-return timing, and lifecycle.
 */

import * as THREE from 'three'

export class BaseShell {
    constructor(scene) {
        this.scene = scene
        this.mesh = null
        this.material = null
        this.isVisible = false
        this.opacity = 0
        this.targetOpacity = 0
        this.fadeDuration = 1.5

        // Shell-specific config (override in subclasses)
        this.config = {
            holdDuration: 5.0,     // How long before auto-return
            eerieIntensity: 1.0    // Visual intensity
        }

        this.timeVisible = 0
        this.autoReturnCallback = null
    }

    // Override in subclasses
    _createGeometry() { }
    _createMaterial() { }
    _createMesh() { }

    getMesh() {
        return this.mesh
    }

    show(duration = 1.5) {
        this.fadeDuration = duration
        this.targetOpacity = 1.0
        this.isVisible = true
        this.timeVisible = 0

        if (this.mesh && !this.mesh.parent) {
            this.scene.add(this.mesh)
        }
    }

    hide(duration = 1.5) {
        this.fadeDuration = duration
        this.targetOpacity = 0
    }

    update(delta, elapsed) {
        // Opacity fade
        const fadeSpeed = 1 / this.fadeDuration
        if (this.opacity < this.targetOpacity) {
            this.opacity = Math.min(this.targetOpacity, this.opacity + delta * fadeSpeed)
        } else if (this.opacity > this.targetOpacity) {
            this.opacity = Math.max(this.targetOpacity, this.opacity - delta * fadeSpeed)
        }

        // Apply opacity to material
        if (this.material && this.material.uniforms && this.material.uniforms.uOpacity) {
            this.material.uniforms.uOpacity.value = this.opacity
        } else if (this.material) {
            this.material.opacity = this.opacity
        }

        // Remove from scene when fully hidden
        if (this.opacity <= 0 && this.isVisible) {
            this.isVisible = false
            if (this.mesh && this.mesh.parent) {
                this.scene.remove(this.mesh)
            }
        }

        // Auto-return after holdDuration
        if (this.isVisible && this.opacity >= 0.9) {
            this.timeVisible += delta
            if (this.timeVisible > this.config.holdDuration) {
                if (this.autoReturnCallback) {
                    this.autoReturnCallback()
                }
            }
        }

        // Shell-specific animations (override in subclasses)
        this._animate(delta, elapsed)
    }

    // Override in subclasses for custom animations
    _animate(delta, elapsed) { }

    setAutoReturnCallback(callback) {
        this.autoReturnCallback = callback
    }

    dispose() {
        if (this.mesh) {
            if (this.mesh.parent) {
                this.scene.remove(this.mesh)
            }
            if (this.mesh.geometry) {
                this.mesh.geometry.dispose()
            }
            if (this.material) {
                this.material.dispose()
            }
        }
    }
}
