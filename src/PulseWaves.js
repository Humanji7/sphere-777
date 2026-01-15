import * as THREE from 'three'
import { BioticNoise } from './utils/BioticNoise.js'

/**
 * PulseWaves — Concentric waves expanding from sphere center
 * "The sphere pulses with energy, waves ripple outward"
 *
 * Visual: Thin glowing rings that expand and fade
 * Performance: Single draw call via instanced mesh
 */
export class PulseWaves {
  constructor(baseRadius = 1.5) {
    this.baseRadius = baseRadius
    this.ringCount = 12
    this.intensity = 0.3  // Base intensity (0.3 idle, 0.6 interaction, 1.0 onboarding)

    // Ring state tracking
    this.rings = []
    for (let i = 0; i < this.ringCount; i++) {
      this.rings.push({
        phase: i / this.ringCount,  // Staggered start
        opacity: 0,
        scale: 0
      })
    }

    // BioticNoise for organic rhythm variations
    this.bioticNoise = new BioticNoise({ driftOffset: 4.2, pauseInterval: 30 })

    // Create ring geometry and material
    this._createGeometry()
    this._createMaterial()
    this._createMesh()
  }

  _createGeometry() {
    // Torus geometry for smooth ring with width
    // Inner radius 0.98, tube radius 0.02 for thin ring
    this.geometry = new THREE.TorusGeometry(
      this.baseRadius,  // radius
      0.008,            // tube radius (thin)
      4,                // radial segments
      64                // tubular segments (smooth circle)
    )
  }

  _createMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0.3 },
        uColor: { value: new THREE.Color(0x6699ff) },  // Soft blue glow
        uOpacity: { value: 1.0 },
        uGlobalOpacity: { value: 1.0 }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uGlobalOpacity;

        varying vec3 vNormal;
        varying vec3 vPosition;

        void main() {
          // Fresnel-like effect for edge glow
          float fresnel = 1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0)));
          float glow = pow(fresnel, 1.5) * 0.5 + 0.5;

          vec3 color = uColor * glow * uIntensity;
          float alpha = uOpacity * uIntensity * glow * uGlobalOpacity;

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  }

  _createMesh() {
    // Create group for all rings
    this.group = new THREE.Group()
    this.ringMeshes = []

    for (let i = 0; i < this.ringCount; i++) {
      const ring = new THREE.Mesh(this.geometry, this.material.clone())
      ring.rotation.x = Math.PI / 2  // Align with XZ plane
      ring.scale.setScalar(0)  // Start invisible
      ring.visible = false
      this.ringMeshes.push(ring)
      this.group.add(ring)
    }
  }

  /**
   * Update wave animation
   * @param {number} delta - Frame delta time
   * @param {number} time - Total elapsed time
   * @param {number} breathPhase - Sphere breathing phase (0-2π)
   */
  update(delta, time, breathPhase = 0) {
    // Update biotic noise state
    this.bioticNoise.updateFrame(delta)

    const waveSpeed = 0.3 + this.intensity * 0.7  // Faster at higher intensity
    const spawnRate = 0.8 + this.intensity * 0.4  // More frequent at higher intensity

    // Apply organic frequency variations
    const freqMult = this.bioticNoise.getFrequencyMultiplier(time)
    const shouldUpdate = this.bioticNoise.shouldUpdatePhase()

    for (let i = 0; i < this.ringCount; i++) {
      const ring = this.rings[i]
      const mesh = this.ringMeshes[i]

      // Update phase with organic variations (skip during micro-pauses)
      if (shouldUpdate) {
        ring.phase += delta * waveSpeed * spawnRate / this.ringCount * freqMult
      }

      if (ring.phase > 1) {
        ring.phase = ring.phase % 1
      }

      // Scale: expand from center (0.3 to 1.5 of base radius)
      const scaleEased = this._easeOutCubic(ring.phase)
      ring.scale = 0.3 + scaleEased * 1.2

      // Opacity: fade in then out
      // Peak opacity at 30% of phase
      if (ring.phase < 0.3) {
        ring.opacity = this._easeOutQuad(ring.phase / 0.3)
      } else {
        ring.opacity = this._easeInQuad(1 - (ring.phase - 0.3) / 0.7)
      }

      // Apply to mesh
      mesh.scale.setScalar(ring.scale)
      mesh.material.uniforms.uOpacity.value = ring.opacity * this.intensity
      mesh.material.uniforms.uIntensity.value = this.intensity
      mesh.visible = ring.opacity > 0.01 && this.intensity > 0.01
    }
  }

  /**
   * Set wave intensity
   * @param {number} value - 0 (off) to 1 (max)
   */
  setIntensity(value) {
    this.intensity = Math.max(0, Math.min(1, value))
  }

  /**
   * Set wave color
   * @param {THREE.Color|number} color - Color as THREE.Color or hex
   */
  setColor(color) {
    const c = color instanceof THREE.Color ? color : new THREE.Color(color)
    this.ringMeshes.forEach(mesh => {
      mesh.material.uniforms.uColor.value.copy(c)
    })
  }

  /**
   * Set global opacity (for onboarding fade)
   * @param {number} opacity - 0 to 1
   */
  setGlobalOpacity(opacity) {
    this.ringMeshes.forEach(mesh => {
      mesh.material.uniforms.uGlobalOpacity.value = opacity
    })
  }

  /**
   * Trigger a single dramatic pulse (for First Breath)
   */
  pulse() {
    // Reset first ring to create a strong pulse
    this.rings[0].phase = 0
    this.rings[0].opacity = 1
  }

  /**
   * Sync with sphere rotation
   * @param {THREE.Euler} rotation - Sphere rotation
   */
  syncRotation(rotation) {
    this.group.rotation.copy(rotation)
  }

  /**
   * Set visibility
   * @param {boolean} visible
   */
  setVisible(visible) {
    this.group.visible = visible
  }

  getMesh() {
    return this.group
  }

  // Easing functions
  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3)
  }

  _easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t)
  }

  _easeInQuad(t) {
    return t * t
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
    this.ringMeshes.forEach(mesh => {
      mesh.material.dispose()
    })
  }
}
