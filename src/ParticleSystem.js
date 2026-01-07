import * as THREE from 'three'

/**
 * ParticleSystem - Core particle rendering and behavior
 * Handles breathing, attraction, bleeding, scars
 */
export class ParticleSystem {
  constructor(count = 5000, ghostRatio = 0.03) {
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

    // Emotional controls
    this.pauseFactor = 0        // 0-1, for "listening" micro-pause
    this.colorTint = 1.0        // 0-1, dimming factor for tension
    this.colorHue = 0           // hue shift for tension
    this.responseLag = 1.0      // 1.0 = normal, lower = slower response

    // Rolling physics
    this.rotationX = 0          // accumulated rotation around X axis
    this.rotationY = 0          // accumulated rotation around Y axis  
    this.rollingVelocityX = 0   // inertia
    this.rollingVelocityY = 0

    // Evaporation bleeding state (replaces gravity-based falling)
    this.evaporatingParticles = new Map()  // index -> { phase, startTime }
    this.bleedingPhases = new Float32Array(count)  // 0-1 lifecycle per particle

    // Evaporation config
    this.evapFadeOutDuration = 0.5   // 500ms fade out
    this.evapFadeInDuration = 0.6    // 600ms fade in
    this.evapTotalDuration = this.evapFadeOutDuration + this.evapFadeInDuration

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
    this.geometry.setAttribute('aBleedPhase', new THREE.BufferAttribute(this.bleedingPhases, 1))
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
        uSize: { value: 6.0 },
        uPauseFactor: { value: 0 },
        uColorTint: { value: 1.0 },
        uEvapFadeOutEnd: { value: 0.45 },  // phase 0-0.45 = fade out
        uEvapFadeInStart: { value: 0.55 }, // phase 0.55-1.0 = fade in
        // Perlin noise dynamics
        uNoiseAmount: { value: 0.08 },     // displacement amplitude
        uNoiseSpeed: { value: 0.3 }        // animation speed
      },
      vertexShader: `
        attribute float aType;
        attribute float aSeed;
        attribute vec3 aOriginalPos;
        attribute float aBleedPhase;
        
        uniform float uTime;
        uniform float uBreathPhase;
        uniform float uBreathAmount;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uEvapFadeOutEnd;
        uniform float uEvapFadeInStart;
        uniform float uNoiseAmount;
        uniform float uNoiseSpeed;
        
        varying float vType;
        varying float vSeed;
        varying float vBleedPhase;
        
        // ========== Simplex 3D Noise ==========
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          
          vec3 i  = floor(v + dot(v, C.yyy));
          vec3 x0 = v - i + dot(i, C.xxx);
          
          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min(g.xyz, l.zxy);
          vec3 i2 = max(g.xyz, l.zxy);
          
          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;
          
          i = mod289(i);
          vec4 p = permute(permute(permute(
                   i.z + vec4(0.0, i1.z, i2.z, 1.0))
                 + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                 + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                 
          float n_ = 0.142857142857;
          vec3 ns = n_ * D.wyz - D.xzx;
          
          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
          
          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_);
          
          vec4 x = x_ * ns.x + ns.yyyy;
          vec4 y = y_ * ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);
          
          vec4 b0 = vec4(x.xy, y.xy);
          vec4 b1 = vec4(x.zw, y.zw);
          
          vec4 s0 = floor(b0) * 2.0 + 1.0;
          vec4 s1 = floor(b1) * 2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));
          
          vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
          vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
          
          vec3 p0 = vec3(a0.xy, h.x);
          vec3 p1 = vec3(a0.zw, h.y);
          vec3 p2 = vec3(a1.xy, h.z);
          vec3 p3 = vec3(a1.zw, h.w);
          
          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;
          
          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        // ========== End Simplex Noise ==========
        
        void main() {
          vType = aType;
          vSeed = aSeed;
          vBleedPhase = aBleedPhase;
          
          vec3 pos = position;
          
          // Breathing effect (only for normal particles not evaporating)
          if (aType < 1.5 && aBleedPhase < 0.01) {
            float breathOffset = sin(uBreathPhase + aSeed * 0.5) * uBreathAmount;
            vec3 dir = normalize(aOriginalPos);
            pos += dir * breathOffset;
          }
          
          // Organic surface noise (applied AFTER breathing)
          if (aType < 1.5 && aBleedPhase < 0.01) {
            float noiseVal = snoise(aOriginalPos * 2.0 + uTime * uNoiseSpeed);
            vec3 dir = normalize(aOriginalPos);
            pos += dir * noiseVal * uNoiseAmount;
          }
          
          // Evaporation: radial drift outward during fade-out
          if (aBleedPhase > 0.0 && aBleedPhase < uEvapFadeOutEnd) {
            float driftProgress = aBleedPhase / uEvapFadeOutEnd;
            vec3 dir = normalize(aOriginalPos);
            pos += dir * driftProgress * 0.15;  // Drift outward 15%
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
          float baseSize = uSize * uPixelRatio * (1.0 / -mvPosition.z);
          
          // Evaporation: size grows during fade-out (1.0 -> 1.6)
          if (aBleedPhase > 0.0 && aBleedPhase < uEvapFadeOutEnd) {
            float sizeProgress = aBleedPhase / uEvapFadeOutEnd;
            baseSize *= 1.0 + sizeProgress * 0.6;
          }
          // Evaporation: size shrinks during fade-in (1.3 -> 1.0)
          else if (aBleedPhase > uEvapFadeInStart) {
            float sizeProgress = (aBleedPhase - uEvapFadeInStart) / (1.0 - uEvapFadeInStart);
            baseSize *= 1.3 - sizeProgress * 0.3;
          }
          
          gl_PointSize = baseSize;
          
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
        uniform float uColorTint;
        uniform float uEvapFadeOutEnd;
        uniform float uEvapFadeInStart;
        
        varying float vType;
        varying float vSeed;
        varying float vBleedPhase;
        
        void main() {
          // Circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Soft edge
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          vec3 color = uColorNormal * uColorTint;
          
          // Evaporation fade-out: color dims to warm ember
          if (vBleedPhase > 0.0 && vBleedPhase < uEvapFadeOutEnd) {
            float fadeProgress = vBleedPhase / uEvapFadeOutEnd;
            // Ease out cubic for smooth fade
            float easedFade = 1.0 - pow(1.0 - fadeProgress, 3.0);
            alpha *= 1.0 - easedFade;
            // Shift to warm ember color (soft orange-pink)
            vec3 emberColor = vec3(0.9, 0.5, 0.4);
            color = mix(color, emberColor, easedFade * 0.7);
          }
          // Evaporation invisible phase
          else if (vBleedPhase >= uEvapFadeOutEnd && vBleedPhase < uEvapFadeInStart) {
            alpha = 0.0;
          }
          // Evaporation fade-in: gentle return
          else if (vBleedPhase >= uEvapFadeInStart) {
            float fadeProgress = (vBleedPhase - uEvapFadeInStart) / (1.0 - uEvapFadeInStart);
            // Ease in cubic for gentle appearance
            float easedFade = pow(fadeProgress, 2.0);
            alpha *= easedFade;
            // Subtle warm tint fading to normal
            vec3 warmColor = vec3(0.85, 0.7, 0.75);
            color = mix(warmColor, color, easedFade);
          }
          
          // Ghost particles
          if (vType > 0.5 && vType < 1.5) {
            color = uColorGhost * uColorTint;
            alpha *= 0.4 + 0.3 * sin(uTime * 3.0 + vSeed * 10.0);
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

  // ═══════════════════════════════════════════════════════════
  // EMOTIONAL CONTROL METHODS
  // ═══════════════════════════════════════════════════════════

  /**
   * Set pause factor for "listening" effect - slows breathing
   * @param {number} factor - 0 (normal) to 1 (fully paused = 20% breath)
   */
  setPauseFactor(factor) {
    this.pauseFactor = Math.max(0, Math.min(1, factor))
    // Slow down breathing instead of freezing positions
    this.material.uniforms.uBreathAmount.value =
      this.breathAmount * (1 - factor * 0.8)
  }

  /**
   * Set color tint for "tension" effect
   * @param {number} tint - 0 (dark) to 1 (normal)
   */
  setColorTint(tint) {
    this.colorTint = Math.max(0, Math.min(1, tint))
    this.material.uniforms.uColorTint.value = this.colorTint
  }

  /**
   * Set color hue shift for "tension" effect
   * @param {number} hue - negative = cooler, positive = warmer
   */
  setColorHue(hue) {
    this.colorHue = hue
    // Apply hue shift by adjusting color components
    const shifted = this.colorNormal.clone()
    shifted.offsetHSL(hue, 0, 0)
    this.material.uniforms.uColorNormal.value = shifted
  }

  /**
   * Apply rolling rotation - sphere "rests on surface" and follows cursor
   * @param {Object} cursorDelta - {x, y} movement since last frame
   * @param {number} strength - rolling sensitivity
   */
  applyRolling(cursorDelta, strength) {
    // Add to velocity (with damping for smoothness)
    this.rollingVelocityX += cursorDelta.y * strength * 0.5
    this.rollingVelocityY += cursorDelta.x * strength * 0.5
  }

  /**
   * Update rolling physics - apply rotation with inertia
   */
  updateRolling(delta) {
    // Apply velocity to rotation
    this.rotationX += this.rollingVelocityX * delta
    this.rotationY += this.rollingVelocityY * delta

    // Damping (inertia decay)
    const damping = 0.95
    this.rollingVelocityX *= damping
    this.rollingVelocityY *= damping

    // Apply rotation to mesh (not individual particles - more efficient)
    this.mesh.rotation.x = this.rotationX
    this.mesh.rotation.y = this.rotationY
  }

  /**
   * Set response lag factor (trauma memory)
   * @param {number} lag - 1.0 (normal) to 0.3 (very slow response)
   */
  setResponseLag(lag) {
    this.responseLag = Math.max(0.1, Math.min(1, lag))
  }

  /**
   * Start bleeding mode (evaporation)
   */
  startBleeding() {
    this.isBleeding = true
  }

  /**
   * Stop bleeding mode (evaporation) - particles in progress will complete
   */
  stopBleeding() {
    this.isBleeding = false
  }

  /**
   * Process evaporation: smooth fade-out → teleport → fade-in
   * @param {number} delta - time delta in seconds
   * @param {number} rate - fraction of particles to start evaporating per second
   */
  processEvaporation(delta, rate) {
    // Start new evaporations if bleeding is active
    if (this.isBleeding) {
      const particlesToStart = Math.ceil(this.count * rate * delta)

      for (let n = 0; n < particlesToStart; n++) {
        // Find a particle that's not already evaporating
        let attempts = 0
        while (attempts < 20) {
          const i = Math.floor(Math.random() * this.count)
          // Only normal particles, not ghosts, not already evaporating
          if (this.types[i] < 0.5 && !this.evaporatingParticles.has(i)) {
            this.evaporatingParticles.set(i, { phase: 0 })
            break
          }
          attempts++
        }
      }
    }

    // Update all evaporating particles
    const toRemove = []
    for (const [i, state] of this.evaporatingParticles) {
      state.phase += delta / this.evapTotalDuration

      // Update bleedingPhases attribute for shader
      this.bleedingPhases[i] = state.phase

      // At midpoint (invisible phase), teleport to scar position
      const midpoint = 0.5
      if (state.phase >= midpoint && state.phase - delta / this.evapTotalDuration < midpoint) {
        const i3 = i * 3
        // Apply scar offset (permanent memory of damage)
        this.scarOffsets[i3] += (Math.random() - 0.5) * 0.08
        this.scarOffsets[i3 + 1] += (Math.random() - 0.5) * 0.08
        this.scarOffsets[i3 + 2] += (Math.random() - 0.5) * 0.08

        // Teleport to new position
        this.positions[i3] = this.originalPositions[i3] + this.scarOffsets[i3]
        this.positions[i3 + 1] = this.originalPositions[i3 + 1] + this.scarOffsets[i3 + 1]
        this.positions[i3 + 2] = this.originalPositions[i3 + 2] + this.scarOffsets[i3 + 2]
      }

      // Particle finished evaporation cycle
      if (state.phase >= 1.0) {
        this.bleedingPhases[i] = 0  // Reset to normal
        toRemove.push(i)
      }
    }

    // Remove completed particles
    for (const i of toRemove) {
      this.evaporatingParticles.delete(i)
    }

    // Mark attribute as needing update
    if (this.evaporatingParticles.size > 0 || toRemove.length > 0) {
      this.geometry.attributes.aBleedPhase.needsUpdate = true
    }
  }

  /**
   * Apply scars to traumatized particles (now integrated into processEvaporation)
   * Kept for API compatibility with Sphere.js
   */
  applyScars() {
    // Scars are now applied during evaporation teleport phase
  }

  update(delta, time) {
    // Update breath phase
    this.breathPhase += this.breathSpeed * delta

    // Rolling physics update
    this.updateRolling(delta)

    // Update uniforms
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uBreathPhase.value = this.breathPhase

    // Mark attributes as needing update
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
