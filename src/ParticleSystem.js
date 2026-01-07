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
    this.breathAmount = 0.088
    this.breathSpeed = 0.8 // radians per second (3-4 sec cycle)
    this.breathPhase = 0

    // Attraction parameters
    this.attractionStrength = 0.3
    this.attractionRadius = 2.0

    // Colors (Deep Blue baseline for "Cosmic Blue" palette)
    this.colorNormal = new THREE.Color().setHSL(0.66, 0.60, 0.50)  // Deep Blue (240°)
    this.colorGhost = new THREE.Color().setHSL(0.66, 0.40, 0.75)   // Lighter blue for ghosts
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
        uNoiseAmount: { value: 0.08 },     // base displacement amplitude
        uNoiseSpeed: { value: 0.3 },       // base animation speed (kept constant)
        uGoosebumpsIntensity: { value: 0.0 }, // high-freq layer intensity (0→0.05)
        // Effect Conductor uniforms
        uDynamicSizeAmount: { value: 0.0 },   // pulsation intensity (0-1)
        uSparkleIntensity: { value: 0.0 }     // sparkle brightness (0-1)
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
        uniform float uGoosebumpsIntensity;
        uniform float uDynamicSizeAmount;
        
        varying float vType;
        varying float vSeed;
        varying float vBleedPhase;
        varying float vDepth;
        varying float vUnifiedCurve;
        
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
          
          // Combined Breathing, Boiling, and Heartbeat
          float unifiedCurve = 0.5; // Default for non-breathing particles
          
          if (aType < 1.5 && aBleedPhase < 0.01) {
            float breathT = uBreathPhase;
            
            // 1. Unified Organic Breathing (Synchronized bellows)
            // Asymmetrical expansion: sharper peak, longer valley (heavy inhale)
            unifiedCurve = pow(sin(breathT) * 0.5 + 0.5, 1.6); 
            float unifiedOffset = (unifiedCurve - 0.5) * uBreathAmount * 1.8;
            
            // 2. Micro-boiling (Individual particle activity)
            // Much faster frequency for a "micro-shimmer" feel
            float boilT = uBreathPhase * 12.0 + aSeed * 30.0;
            float boilOffset = sin(boilT) * 0.006;
            
            // 3. Heartbeat: Subtle rapid pulse (80 bpm ≈ 8.4 rad/s)
            float heartbeat = sin(uTime * 8.4) * 0.0035;
            
            vec3 dir = normalize(aOriginalPos);
            pos += dir * (unifiedOffset + boilOffset + heartbeat);
          }
          
          // Pass unified curve to fragment shader for aura effect
          vUnifiedCurve = unifiedCurve;
          
          // Organic surface noise: Dual-Layer Goosebumps
          // Layer 1: Base waves (low freq, slow) - always present, organic
          // Layer 2: Goosebumps (high freq, medium speed) - modulated by tension
          if (aType < 1.5 && aBleedPhase < 0.01) {
            vec3 dir = normalize(aOriginalPos);
            
            // Base layer: slow, low-frequency organic waves
            float baseNoise = snoise(aOriginalPos * 2.0 + uTime * 0.3);
            
            // Goosebumps layer: faster, high-frequency ripples
            float goosebumps = snoise(aOriginalPos * 8.0 + uTime * 0.5);
            
            // Combine: base always present + goosebumps scaled by intensity
            float finalNoise = baseNoise * uNoiseAmount + goosebumps * uGoosebumpsIntensity;
            pos += dir * finalNoise;
          }
          
          // Evaporation: radial drift outward during fade-out
          if (aBleedPhase > 0.0 && aBleedPhase < uEvapFadeOutEnd) {
            float driftProgress = aBleedPhase / uEvapFadeOutEnd;
            vec3 dir = normalize(aOriginalPos);
            pos += dir * driftProgress * 0.50;  // Drift outward 50% (was 15%)
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
          
          // Capture view-space depth for bokeh effect
          vDepth = mvPosition.z;
          
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
          
          // Dynamic Size: heartbeat-synced pulsation (80 bpm = 8.377 rad/s)
          if (uDynamicSizeAmount > 0.0) {
            float heartbeatPulse = sin(uTime * 8.377) * 0.5 + 0.5;
            // Subtle: max 15% size variation at full intensity
            gl_PointSize *= 1.0 + uDynamicSizeAmount * heartbeatPulse * 0.15;
          }
          
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
        uniform float uSparkleIntensity;
        
        varying float vType;
        varying float vSeed;
        varying float vBleedPhase;
        varying float vDepth;
        varying float vUnifiedCurve;
        
        void main() {
          // Circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Soft edge
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          // === AURA: Breath-synchronized glow ===
          // When sphere "inhales" (unifiedCurve high), particles glow brighter
          float aura = 0.7 + vUnifiedCurve * 0.3;
          alpha *= aura;
          
          // === BOKEH: Depth-based fade ===
          // Background particles (further from camera, z more negative) are dimmer
          float depthFade = smoothstep(-5.0, 0.5, vDepth);
          alpha *= 0.65 + 0.35 * depthFade;
          
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
          
          // Sparkles: random bright flashes on select particles
          if (uSparkleIntensity > 0.0) {
            // Pseudo-random based on seed and time
            float sparkleRandom = fract(sin(vSeed * 12.9898 + uTime * 0.7) * 43758.5453);
            // Only ~5% of particles sparkle at any moment
            float sparkle = step(0.95, sparkleRandom) * uSparkleIntensity;
            // Warm white sparkle color
            color += sparkle * vec3(1.0, 0.95, 0.85);
            // Boost alpha for visible sparkle
            alpha = min(1.0, alpha + sparkle * 0.5);
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
   * Helper: lerp between two HSL colors with proper hue wrapping
   * @param {Object} hsl1 - {h, s, l} values (h in 0-1)
   * @param {Object} hsl2 - {h, s, l} values (h in 0-1)
   * @param {number} t - interpolation factor 0-1
   * @returns {THREE.Color}
   */
  _lerpHSL(hsl1, hsl2, t) {
    // Hue wrapping: find shortest path around the wheel
    let h1 = hsl1.h
    let h2 = hsl2.h

    // Calculate the difference
    let hDiff = h2 - h1

    // If the difference is more than 0.5, wrap around
    if (hDiff > 0.5) {
      h1 += 1.0  // Wrap h1 up
    } else if (hDiff < -0.5) {
      h2 += 1.0  // Wrap h2 up
    }

    // Lerp and normalize back to 0-1
    let h = h1 + (h2 - h1) * t
    if (h > 1.0) h -= 1.0
    if (h < 0.0) h += 1.0

    const s = hsl1.s + (hsl2.s - hsl1.s) * t
    const l = hsl1.l + (hsl2.l - hsl1.l) * t

    const result = new THREE.Color()
    result.setHSL(h, s, l)
    return result
  }

  /**
   * Set color progress for smooth gradient transition
   * @param {number} progress - 0 (deep blue) to 1 (nova gold), smooth HSL lerp through hue wheel
   * 
   * Color journey: Deep Blue(240°) → Purple → Magenta → Pink/Rose → Coral/Orange → Nova Gold(45°)
   * Spans ~165° of the hue wheel, going THROUGH 0° (red) for maximum micro-tone richness
   */
  setColorProgress(progress) {
    progress = Math.max(0, Math.min(1, progress))

    // Define color stops in HSL for precise hue control (~165° journey)
    // H values: 0=red, 0.083=orange, 0.125=gold, 0.166=yellow, 0.333=green, 0.5=cyan, 0.666=blue, 0.75=purple, 0.833=magenta
    const stops = [
      { h: 0.66, s: 0.60, l: 0.50 },   // 0.00: Deep Blue (240°) — Baseline Peace
      { h: 0.76, s: 0.55, l: 0.58 },   // 0.20: Purple (275°)
      { h: 0.86, s: 0.60, l: 0.55 },   // 0.40: Magenta (310°)
      { h: 0.96, s: 0.65, l: 0.55 },   // 0.60: Pink/Rose (345°)
      { h: 0.04, s: 0.70, l: 0.55 },   // 0.80: Coral/Orange (15°) - past 0°!
      { h: 0.125, s: 0.80, l: 0.70 }   // 1.00: Nova Gold (45°) — Max Tension
    ]

    // Find which segment we're in
    const segmentCount = stops.length - 1
    const scaledProgress = progress * segmentCount
    const segmentIndex = Math.min(Math.floor(scaledProgress), segmentCount - 1)
    const segmentT = scaledProgress - segmentIndex

    const hsl1 = stops[segmentIndex]
    const hsl2 = stops[segmentIndex + 1]

    const resultColor = this._lerpHSL(hsl1, hsl2, segmentT)
    this.material.uniforms.uColorNormal.value = resultColor
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
