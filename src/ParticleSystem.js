import * as THREE from 'three'

/**
 * ParticleSystem - Core particle rendering and behavior
 * Handles breathing, attraction, bleeding, scars
 */
export class ParticleSystem {
  constructor(count = 2000, ghostRatio = 0.03) {
    this.count = count
    this.ghostCount = Math.floor(count * ghostRatio)
    this.normalCount = count - this.ghostCount

    // Sphere parameters
    this.baseRadius = 1.5
    this.breathAmount = 0.05
    this.breathSpeed = 0.8 // radians per second (3-4 sec cycle)
    this.breathPhase = 0

    // Attraction parameters
    this.attractionStrength = 0.3
    this.attractionRadius = 2.0

    // Colors (brightened for visibility)
    this.colorNormal = new THREE.Color(0xBB9FDF)  // Bright purple
    this.colorGhost = new THREE.Color(0xDDCCFF)   // Even lighter for ghosts
    this.colorFalling = new THREE.Color(0x39FF14)

    // State
    this.isBleeding = false
    this.bleedIntensity = 0

    this._createGeometry()
    this._createMaterial()
    this._createMesh()
  }

  _createGeometry() {
    this.geometry = new THREE.BufferGeometry()

    // Positions (current)
    this.positions = new Float32Array(this.count * 3)
    // Original positions (for return)
    this.originalPositions = new Float32Array(this.count * 3)
    // Velocities (for falling)
    this.velocities = new Float32Array(this.count * 3)
    // Type: 0 = normal, 1 = ghost, 2 = falling
    this.types = new Float32Array(this.count)
    // Scar offset
    this.scarOffsets = new Float32Array(this.count * 3)
    // Random seed for each particle
    this.seeds = new Float32Array(this.count)

    // Initialize particles on sphere surface
    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3

      // Fibonacci sphere distribution for even spacing
      const phi = Math.acos(1 - 2 * (i + 0.5) / this.count)
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5)

      const x = this.baseRadius * Math.sin(phi) * Math.cos(theta)
      const y = this.baseRadius * Math.sin(phi) * Math.sin(theta)
      const z = this.baseRadius * Math.cos(phi)

      this.positions[i3] = x
      this.positions[i3 + 1] = y
      this.positions[i3 + 2] = z

      this.originalPositions[i3] = x
      this.originalPositions[i3 + 1] = y
      this.originalPositions[i3 + 2] = z

      // Mark ghosts
      this.types[i] = i < this.ghostCount ? 1 : 0

      // Random seed
      this.seeds[i] = Math.random()
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('aOriginalPos', new THREE.BufferAttribute(this.originalPositions, 3))
    this.geometry.setAttribute('aType', new THREE.BufferAttribute(this.types, 1))
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1))
  }

  _createMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBreathPhase: { value: 0 },
        uBreathAmount: { value: this.breathAmount },
        uColorNormal: { value: this.colorNormal },
        uColorGhost: { value: this.colorGhost },
        uColorFalling: { value: this.colorFalling },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 8.0 }
      },
      vertexShader: `
        attribute float aType;
        attribute float aSeed;
        attribute vec3 aOriginalPos;
        
        uniform float uTime;
        uniform float uBreathPhase;
        uniform float uBreathAmount;
        uniform float uPixelRatio;
        uniform float uSize;
        
        varying float vType;
        varying float vSeed;
        
        void main() {
          vType = aType;
          vSeed = aSeed;
          
          vec3 pos = position;
          
          // Breathing effect (only for non-falling particles)
          if (aType < 1.5) {
            float breathOffset = sin(uBreathPhase + aSeed * 0.5) * uBreathAmount;
            vec3 dir = normalize(aOriginalPos);
            pos += dir * breathOffset;
          }
          
          // Ghost shimmer
          if (aType > 0.5 && aType < 1.5) {
            pos += vec3(
              sin(uTime * 2.0 + aSeed * 10.0) * 0.02,
              cos(uTime * 2.0 + aSeed * 10.0) * 0.02,
              0.0
            );
          }
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size attenuation
          gl_PointSize = uSize * uPixelRatio * (1.0 / -mvPosition.z);
          
          // Ghosts slightly smaller
          if (aType > 0.5 && aType < 1.5) {
            gl_PointSize *= 0.7;
          }
        }
      `,
      fragmentShader: `
        uniform vec3 uColorNormal;
        uniform vec3 uColorGhost;
        uniform vec3 uColorFalling;
        uniform float uTime;
        
        varying float vType;
        varying float vSeed;
        
        void main() {
          // Circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Soft edge
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          vec3 color = uColorNormal;
          
          // Ghost particles
          if (vType > 0.5 && vType < 1.5) {
            color = uColorGhost;
            alpha *= 0.4 + 0.3 * sin(uTime * 3.0 + vSeed * 10.0);
          }
          
          // Falling particles
          if (vType > 1.5) {
            color = uColorFalling;
          }
          
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  }

  _createMesh() {
    this.mesh = new THREE.Points(this.geometry, this.material)
  }

  /**
   * Apply mouse/touch attraction
   * @param {Object} mousePos - {x, y} normalized -1 to 1
   * @param {number} strength - 0 to 1
   */
  applyAttraction(mousePos, strength) {
    if (strength < 0.001) return

    // Convert 2D mouse to 3D direction
    const mouseVec = new THREE.Vector3(mousePos.x * 2, mousePos.y * 2, 0.5)
    mouseVec.normalize()

    const attractForce = strength * this.attractionStrength

    for (let i = 0; i < this.count; i++) {
      // Skip falling particles
      if (this.types[i] > 1.5) continue

      const i3 = i * 3
      const originalX = this.originalPositions[i3] + this.scarOffsets[i3]
      const originalY = this.originalPositions[i3 + 1] + this.scarOffsets[i3 + 1]
      const originalZ = this.originalPositions[i3 + 2] + this.scarOffsets[i3 + 2]

      // Target position with attraction
      const targetX = originalX + mouseVec.x * attractForce
      const targetY = originalY + mouseVec.y * attractForce
      const targetZ = originalZ + mouseVec.z * attractForce * 0.3

      // Lerp to target
      this.positions[i3] += (targetX - this.positions[i3]) * 0.05
      this.positions[i3 + 1] += (targetY - this.positions[i3 + 1]) * 0.05
      this.positions[i3 + 2] += (targetZ - this.positions[i3 + 2]) * 0.05
    }
  }

  /**
   * Return particles to original positions
   */
  returnToOrigin() {
    for (let i = 0; i < this.count; i++) {
      // Skip falling particles
      if (this.types[i] > 1.5) continue

      const i3 = i * 3
      const targetX = this.originalPositions[i3] + this.scarOffsets[i3]
      const targetY = this.originalPositions[i3 + 1] + this.scarOffsets[i3 + 1]
      const targetZ = this.originalPositions[i3 + 2] + this.scarOffsets[i3 + 2]

      this.positions[i3] += (targetX - this.positions[i3]) * 0.03
      this.positions[i3 + 1] += (targetY - this.positions[i3 + 1]) * 0.03
      this.positions[i3 + 2] += (targetZ - this.positions[i3 + 2]) * 0.03
    }
  }

  /**
   * Set breathing speed (for adaptive breathing)
   * @param {number} speed - radians per second
   */
  setBreathSpeed(speed) {
    this.breathSpeed = speed
  }

  update(delta, time) {
    // Update breath phase
    this.breathPhase += this.breathSpeed * delta

    // Update uniforms
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uBreathPhase.value = this.breathPhase

    // Mark positions as needing update
    this.geometry.attributes.position.needsUpdate = true
  }

  getMesh() {
    return this.mesh
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
