import * as THREE from 'three'

/**
 * ParticleSystem - Core particle rendering and behavior
 * Handles breathing, attraction, bleeding, scars
 */
export class ParticleSystem {
  constructor(count = 5000, ghostRatio = 0.03, sizeMultiplier = 1.0) {
    this.count = count
    this.sizeMultiplier = sizeMultiplier  // Responsive sizing for mobile
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

    // Trust-based color modification (from MemoryManager)
    this.peaceSaturationMod = 1.0   // 0.6 (grey) - 1.0 (normal)
    this.peaceLightnessMod = 1.0    // 0.85 (dark) - 1.0 (normal)

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

    // Sensitivity Zones config
    this.sensitivityDriftOffset = new THREE.Vector3(0, 0, 0)
    this.sensitivityDriftSpeed = 0.03  // units/sec for zone drift
    this.sensitivityValues = null      // Will hold Float32Array after geometry creation

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

    // Create sensitivity map for organic zones
    this._createSensitivityMap()
  }

  /**
   * Create sensitivity map using 3D simplex noise
   * Generates 5-8 organic zones with varying sensitivity (0.4-1.6 range)
   * "Living skin — some parts softer, some rougher"
   */
  _createSensitivityMap() {
    const sensitivity = new Float32Array(this.count)
    const noiseScale = 3.0  // Controls number of zones (5-8 visible poles)

    for (let i = 0; i < this.count; i++) {
      const i3 = i * 3
      const x = this.originalPositions[i3] / this.baseRadius
      const y = this.originalPositions[i3 + 1] / this.baseRadius
      const z = this.originalPositions[i3 + 2] / this.baseRadius

      // 3 octaves of noise for organic feel
      const noise1 = this._simplex3D(x * noiseScale, y * noiseScale, z * noiseScale)
      const noise2 = this._simplex3D(x * noiseScale * 2.1, y * noiseScale * 2.1, z * noiseScale * 2.1) * 0.5
      const noise3 = this._simplex3D(x * noiseScale * 4.3, y * noiseScale * 4.3, z * noiseScale * 4.3) * 0.25

      // Combined noise → range 0.4-1.6
      const combinedNoise = (noise1 + noise2 + noise3) / 1.75  // -1 to 1
      sensitivity[i] = 1.0 + combinedNoise * 0.6  // 0.4 to 1.6
    }

    this.sensitivityValues = sensitivity
    this.geometry.setAttribute('aSensitivity', new THREE.BufferAttribute(sensitivity, 1))
  }

  /**
   * Simplex 3D noise implementation (CPU version)
   * Based on Stefan Gustavson's algorithm
   * @returns {number} -1 to 1
   */
  _simplex3D(x, y, z) {
    // Permutation table (Perlin's original 256-value table, duplicated)
    const perm = [
      151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142,
      8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117,
      35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71,
      134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41,
      55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89,
      18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226,
      250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182,
      189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43,
      172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97,
      228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239,
      107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
      138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180
    ]
    // Duplicate for wraparound
    const p = new Uint8Array(512)
    for (let i = 0; i < 256; i++) {
      p[i] = perm[i]
      p[256 + i] = perm[i]
    }

    // Gradients for 3D (12 gradient directions)
    const grad3 = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
    ]

    const dot3 = (g, x, y, z) => g[0] * x + g[1] * y + g[2] * z

    // Skewing factors for 3D
    const F3 = 1.0 / 3.0
    const G3 = 1.0 / 6.0

    // Skew input space
    const s = (x + y + z) * F3
    const i = Math.floor(x + s)
    const j = Math.floor(y + s)
    const k = Math.floor(z + s)

    const t = (i + j + k) * G3
    const X0 = i - t
    const Y0 = j - t
    const Z0 = k - t
    const x0 = x - X0
    const y0 = y - Y0
    const z0 = z - Z0

    // Determine simplex
    let i1, j1, k1, i2, j2, k2
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1 }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1 }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1 }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1 }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0 }
    }

    const x1 = x0 - i1 + G3
    const y1 = y0 - j1 + G3
    const z1 = z0 - k1 + G3
    const x2 = x0 - i2 + 2.0 * G3
    const y2 = y0 - j2 + 2.0 * G3
    const z2 = z0 - k2 + 2.0 * G3
    const x3 = x0 - 1.0 + 3.0 * G3
    const y3 = y0 - 1.0 + 3.0 * G3
    const z3 = z0 - 1.0 + 3.0 * G3

    const ii = i & 255
    const jj = j & 255
    const kk = k & 255
    const gi0 = p[ii + p[jj + p[kk]]] % 12
    const gi1 = p[ii + i1 + p[jj + j1 + p[kk + k1]]] % 12
    const gi2 = p[ii + i2 + p[jj + j2 + p[kk + k2]]] % 12
    const gi3 = p[ii + 1 + p[jj + 1 + p[kk + 1]]] % 12

    let n0, n1, n2, n3
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0
    if (t0 < 0) n0 = 0.0
    else { t0 *= t0; n0 = t0 * t0 * dot3(grad3[gi0], x0, y0, z0) }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1
    if (t1 < 0) n1 = 0.0
    else { t1 *= t1; n1 = t1 * t1 * dot3(grad3[gi1], x1, y1, z1) }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2
    if (t2 < 0) n2 = 0.0
    else { t2 *= t2; n2 = t2 * t2 * dot3(grad3[gi2], x2, y2, z2) }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3
    if (t3 < 0) n3 = 0.0
    else { t3 *= t3; n3 = t3 * t3 * dot3(grad3[gi3], x3, y3, z3) }

    return 32.0 * (n0 + n1 + n2 + n3)
  }

  _generateVertexShader() {
    return `
        attribute float aType;
        attribute float aSeed;
        attribute vec3 aOriginalPos;
        attribute float aBleedPhase;
        attribute float aSensitivity;  // 0.4-1.6, sensitivity per particle
        
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
        // Cursor proximity
        uniform vec3 uCursorWorldPos;
        uniform float uCursorInfluenceRadius;
        uniform float uCursorAttractionStrength;
        // Ripple effect
        uniform vec3 uRippleOrigin;
        uniform float uRippleTime;
        uniform float uRippleSpeed;
        uniform float uRippleDecay;
        // Ghost Traces (emotional memory)
        uniform vec3 uGhostTrace0Pos;
        uniform vec3 uGhostTrace1Pos;
        uniform vec3 uGhostTrace2Pos;
        uniform float uGhostTrace0Alpha;
        uniform float uGhostTrace1Alpha;
        uniform float uGhostTrace2Alpha;
        // Warm Traces (emotional memory - gentle contact)
        uniform vec3 uWarmTrace0Pos;
        uniform vec3 uWarmTrace1Pos;
        uniform vec3 uWarmTrace2Pos;
        uniform float uWarmTrace0Alpha;
        uniform float uWarmTrace1Alpha;
        uniform float uWarmTrace2Alpha;
        // Touch Glow (RECOGNITION phase)
        uniform vec3 uTouchGlowPos;
        uniform float uTouchGlowIntensity;
        uniform float uPulse;
        // Osmosis (Hold gesture)
        uniform float uOsmosisDepth;
        // Organic Ticks (autonomous micro-movements)
        uniform vec3 uTickZone;
        uniform float uTickRadius;
        uniform float uTickIntensity;
        uniform float uTickType;  // 0=none, 1=twitch, 2=stretch, 3=shiver
        // Sensitivity Zones
        uniform vec3 uSensitivityDrift;
        uniform float uSensitivityContrast;
        
        varying float vType;
        varying float vSeed;
        varying float vBleedPhase;
        varying float vDepth;
        varying float vUnifiedCurve;
        varying float vCursorInfluence;  // 0-1, proximity to cursor
        varying float vGhostInfluence;   // 0-1, proximity to ghost traces
        varying float vWarmInfluence;    // 0-1, proximity to warm traces
        varying float vTouchGlow;        // 0-1, glow for RECOGNITION phase
        varying float vDistanceToCenter; // For inner glow calculation
        varying float vSensitivity;      // For fragment shader warmth
        
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
          
          // ═══════════════════════════════════════════════════════════
          // SENSITIVITY ZONES: Calculate adjusted sensitivity with drift
          // "Living skin — some parts softer, some rougher"
          // ═══════════════════════════════════════════════════════════
          float baseSensitivity = aSensitivity;
          // Apply drift: shift noise sampling position over time
          vec3 driftedPos = aOriginalPos + uSensitivityDrift * 10.0;
          float driftNoise = snoise(driftedPos * 3.0) * 0.15;  // Small variation from drift
          float adjustedSensitivity = baseSensitivity + driftNoise;
          // Apply contrast: enhance difference between soft and hard zones
          adjustedSensitivity = 1.0 + (adjustedSensitivity - 1.0) * uSensitivityContrast;
          // Clamp to valid range
          adjustedSensitivity = clamp(adjustedSensitivity, 0.3, 1.8);
          vSensitivity = adjustedSensitivity;
          
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
            // SENSITIVITY ZONES: Scale displacement by adjusted sensitivity
            float totalBreathDisp = (unifiedOffset + boilOffset + heartbeat) * adjustedSensitivity;
            pos += dir * totalBreathDisp;
          }
          
          // Pass unified curve to fragment shader for aura effect
          vUnifiedCurve = unifiedCurve;
          
          // Pass distance to center for inner glow
          vDistanceToCenter = length(aOriginalPos);
          
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
            // SENSITIVITY ZONES: Scale by adjusted sensitivity
            float finalNoise = (baseNoise * uNoiseAmount + goosebumps * uGoosebumpsIntensity) * adjustedSensitivity;
            pos += dir * finalNoise;
          }
          
          // ═══════════════════════════════════════════════════════════
          // RIPPLE EFFECT (Poke reaction)
          // ═══════════════════════════════════════════════════════════
          if (uRippleTime >= 0.0 && aType < 1.5) {
            vec3 dir = normalize(aOriginalPos);
            
            // Distance from ripple origin (on sphere surface)
            float distFromOrigin = distance(aOriginalPos, uRippleOrigin);
            
            // Expanding ring: distance the ripple has traveled
            float rippleRadius = uRippleTime * uRippleSpeed;
            
            // Ring width and falloff
            float ringWidth = 0.4;
            float ringDist = abs(distFromOrigin - rippleRadius);
            float ringInfluence = 1.0 - smoothstep(0.0, ringWidth, ringDist);
            
            // Decay over time
            float decay = exp(-uRippleTime * uRippleDecay);
            
            // Final ripple displacement: outward bump
            // SENSITIVITY ZONES: Scale by adjusted sensitivity
            float rippleDisp = ringInfluence * decay * 0.12 * adjustedSensitivity;
            pos += dir * rippleDisp;
          }
          
          // ═══════════════════════════════════════════════════════════
          // ORGANIC TICK EFFECT (autonomous micro-movements)
          // "She twitches, stretches, shivers — alive even when unwatched"
          // ═══════════════════════════════════════════════════════════
          if (uTickIntensity > 0.0 && aType < 1.5) {
            vec3 dir = normalize(aOriginalPos);
            float tickDist = distance(aOriginalPos, uTickZone);
            // SENSITIVITY ZONES: Scale tick influence by adjusted sensitivity
            float tickInfluence = (1.0 - smoothstep(0.0, uTickRadius, tickDist)) * uTickIntensity * adjustedSensitivity;
            
            if (uTickType > 0.5 && uTickType < 1.5) {
              // TWITCH: Quick outward bump in localized zone
              pos += dir * tickInfluence * 0.08;
            } else if (uTickType > 1.5 && uTickType < 2.5) {
              // STRETCH: Directional pull toward tick zone
              vec3 stretchDir = normalize(uTickZone);
              pos += stretchDir * tickInfluence * 0.05;
            } else if (uTickType > 2.5) {
              // SHIVER: Noise-based displacement across whole surface
              float shiverNoise = snoise(aOriginalPos * 15.0 + uTime * 5.0);
              pos += dir * shiverNoise * uTickIntensity * adjustedSensitivity * 0.03;
            }
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
          
          // ═══════════════════════════════════════════════════════════
          // CURSOR PROXIMITY: Attraction + Glow
          // ═══════════════════════════════════════════════════════════
          
          // Calculate world position for cursor distance (apply mesh rotation)
          vec4 worldPos4 = modelMatrix * vec4(pos, 1.0);
          vec3 worldPos = worldPos4.xyz;
          
          // Distance to cursor in world space
          float cursorDist = distance(worldPos, uCursorWorldPos);
          
          // Influence falloff: 1.0 at cursor, 0.0 at radius edge
          // Using smoothstep for soft falloff
          vCursorInfluence = 1.0 - smoothstep(0.0, uCursorInfluenceRadius, cursorDist);
          
          // Attraction: pull particles toward cursor position
          if (uCursorAttractionStrength > 0.0 && vCursorInfluence > 0.0) {
            // Direction from particle to cursor (in local space for proper rotation)
            vec3 cursorLocal = (inverse(modelMatrix) * vec4(uCursorWorldPos, 1.0)).xyz;
            vec3 toCursor = normalize(cursorLocal - pos);
            
            // Displacement scaled by influence and strength
            // Max displacement ~0.15 units at full strength
            // SENSITIVITY ZONES: Scale by adjusted sensitivity
            float displacement = vCursorInfluence * uCursorAttractionStrength * 0.15 * adjustedSensitivity;
            pos += toCursor * displacement;
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
          
          // Cursor proximity: boost size slightly near cursor
          if (vCursorInfluence > 0.0) {
            gl_PointSize *= 1.0 + vCursorInfluence * 0.2;  // Max 20% bigger
          }
          
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
          
          // ═══════════════════════════════════════════════════════════
          // GHOST TRACES: Particles near scare points freeze partially
          // "She remembers where it hurt"
          // ═══════════════════════════════════════════════════════════
          vGhostInfluence = 0.0;
          float ghostRadius = 0.7;  // Influence radius in world units (increased for visibility)
          
          // Check each ghost trace
          if (uGhostTrace0Alpha > 0.0) {
            float dist0 = distance(aOriginalPos, uGhostTrace0Pos);
            float inf0 = (1.0 - smoothstep(0.0, ghostRadius, dist0)) * uGhostTrace0Alpha;
            vGhostInfluence = max(vGhostInfluence, inf0);
          }
          if (uGhostTrace1Alpha > 0.0) {
            float dist1 = distance(aOriginalPos, uGhostTrace1Pos);
            float inf1 = (1.0 - smoothstep(0.0, ghostRadius, dist1)) * uGhostTrace1Alpha;
            vGhostInfluence = max(vGhostInfluence, inf1);
          }
          if (uGhostTrace2Alpha > 0.0) {
            float dist2 = distance(aOriginalPos, uGhostTrace2Pos);
            float inf2 = (1.0 - smoothstep(0.0, ghostRadius, dist2)) * uGhostTrace2Alpha;
            vGhostInfluence = max(vGhostInfluence, inf2);
          }
          
          // ═══════════════════════════════════════════════════════════
          // WARM TRACES: Particles near gentle touch points glow warmly
          // "She remembers where it was soft"
          // ═══════════════════════════════════════════════════════════
          vWarmInfluence = 0.0;
          float warmRadius = 0.7;  // Same radius as ghost traces for symmetry
          
          // Check each warm trace
          if (uWarmTrace0Alpha > 0.0) {
            float dist0 = distance(aOriginalPos, uWarmTrace0Pos);
            float inf0 = (1.0 - smoothstep(0.0, warmRadius, dist0)) * uWarmTrace0Alpha;
            vWarmInfluence = max(vWarmInfluence, inf0);
          }
          if (uWarmTrace1Alpha > 0.0) {
            float dist1 = distance(aOriginalPos, uWarmTrace1Pos);
            float inf1 = (1.0 - smoothstep(0.0, warmRadius, dist1)) * uWarmTrace1Alpha;
            vWarmInfluence = max(vWarmInfluence, inf1);
          }
          if (uWarmTrace2Alpha > 0.0) {
            float dist2 = distance(aOriginalPos, uWarmTrace2Pos);
            float inf2 = (1.0 - smoothstep(0.0, warmRadius, dist2)) * uWarmTrace2Alpha;
            vWarmInfluence = max(vWarmInfluence, inf2);
          }
          
          // ═══════════════════════════════════════════════════════════
          // TOUCH GLOW: "She sees where you touched" (RECOGNITION phase)
          // ═══════════════════════════════════════════════════════════
          vTouchGlow = 0.0;
          if (uTouchGlowIntensity > 0.0) {
            float touchRadius = 0.5;  // Smaller radius for focused glow
            float touchDist = distance(aOriginalPos, uTouchGlowPos);
            vTouchGlow = (1.0 - smoothstep(0.0, touchRadius, touchDist)) * uTouchGlowIntensity;
            
            // Boost size slightly near touch point
            gl_PointSize *= 1.0 + vTouchGlow * 0.3;
          }
          
          // ═══════════════════════════════════════════════════════════
          // OSMOSIS: Particles indent under touch ("finger pressing membrane")
          // ═══════════════════════════════════════════════════════════
          if (uOsmosisDepth > 0.0 && vCursorInfluence > 0.0) {
            vec3 cursorLocal = (inverse(modelMatrix) * vec4(uCursorWorldPos, 1.0)).xyz;
            vec3 awayFromCursor = normalize(pos - cursorLocal);
            float indent = uOsmosisDepth * 0.15;  // Max 15% of radius
            // SENSITIVITY ZONES: Scale indent by adjusted sensitivity
            float indentFactor = vCursorInfluence * indent * adjustedSensitivity;
            
            // Push particles away from cursor (creates visual "dent")
            pos += awayFromCursor * indentFactor;
          }
          
          // ═══════════════════════════════════════════════════════════
          // PULSE: Heartbeat pulsation during RECOGNITION
          // ═══════════════════════════════════════════════════════════
          if (uPulse > 0.0) {
            gl_PointSize *= 1.0 + uPulse;
          }
        }
    `
  }

  _generateFragmentShader() {
    return `
        uniform vec3 uColorNormal;
        uniform vec3 uColorGhost;
        uniform vec3 uColorFalling;
        uniform float uTime;
        uniform float uColorTint;
        uniform float uEvapFadeOutEnd;
        uniform float uEvapFadeInStart;
        uniform float uSparkleIntensity;
        uniform float uCursorInfluenceStrength;  // 0-1, master glow control
        uniform float uOsmosisDepth;  // 0-1, hold gesture penetration depth
        // Inner Glow (Bioluminescence)
        uniform float uInnerGlowPhase;      // 0-1, independent glow phase
        uniform float uInnerGlowIntensity;  // Base intensity
        uniform vec3 uInnerGlowColor;       // Glow color (phase-dependent)
        uniform float uInnerGlowRadius;     // Core radius (0-1 of sphere)
        uniform float uSphereRadius;        // Sphere radius for normalization
        // Sensitivity Zones
        uniform float uSensitivityWarmth;   // Warm color shift for sensitive zones
        // Transformation
        uniform float uTransformFade;       // 1.0 = visible, 0 = hidden during shell transition
        
        varying float vType;
        varying float vSeed;
        varying float vBleedPhase;
        varying float vDepth;
        varying float vUnifiedCurve;
        varying float vCursorInfluence;  // 0-1, per-particle proximity
        varying float vGhostInfluence;   // 0-1, proximity to ghost traces
        varying float vWarmInfluence;    // 0-1, proximity to warm traces
        varying float vTouchGlow;        // 0-1, glow for RECOGNITION phase
        varying float vDistanceToCenter; // For inner glow calculation
        varying float vSensitivity;      // For warmth visualization
        
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
          
          // ═══════════════════════════════════════════════════════════
          // CURSOR PROXIMITY GLOW
          // ═══════════════════════════════════════════════════════════
          if (uCursorInfluenceStrength > 0.0 && vCursorInfluence > 0.0) {
            float glowAmount = vCursorInfluence * uCursorInfluenceStrength;
            
            // Warm highlight color (soft pink-white)
            vec3 glowColor = vec3(1.0, 0.85, 0.95);
            
            // Add glow to color (additive blend)
            color += glowColor * glowAmount * 0.4;
            
            // Boost alpha for brighter particles near cursor
            alpha = min(1.0, alpha + glowAmount * 0.35);
          }
          
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
          
          // ═══════════════════════════════════════════════════════════
          // GHOST TRACES: Cold glow near scare points
          // "The memory of fear lingers"
          // ═══════════════════════════════════════════════════════════
          if (vGhostInfluence > 0.0) {
            // Bright cold blue-white tint ("frozen memory" effect)
            vec3 ghostColor = vec3(0.85, 0.95, 1.0);
            color = mix(color, ghostColor, vGhostInfluence * 0.75);
            // Strong alpha boost for dramatic visibility
            alpha = min(1.0, alpha + vGhostInfluence * 0.5);
          }
          
          // ═══════════════════════════════════════════════════════════
          // WARM TRACES: Amber glow near gentle touch points
          // "The memory of softness glows"
          // ═══════════════════════════════════════════════════════════
          if (vWarmInfluence > 0.0) {
            // Warm amber-gold tint ("cherished memory" effect)
            vec3 warmColor = vec3(1.0, 0.75, 0.35);
            color = mix(color, warmColor, vWarmInfluence * 0.75);
            // Strong alpha boost for dramatic visibility
            alpha = min(1.0, alpha + vWarmInfluence * 0.5);
          }
          
          // ═══════════════════════════════════════════════════════════
          // TOUCH GLOW: "She sees you" (RECOGNITION phase)
          // Soft white glow where you're touching
          // ═══════════════════════════════════════════════════════════
          if (vTouchGlow > 0.0) {
            // Soft warm white glow
            vec3 touchColor = vec3(1.0, 0.95, 0.9);
            color = mix(color, touchColor, vTouchGlow * 0.6);
            // Alpha boost for visibility
            alpha = min(1.0, alpha + vTouchGlow * 0.4);
          }
          
          // ═══════════════════════════════════════════════════════════
          // OSMOSIS WARMTH: Amber glow spreading from touch
          // "Heat transfers between bodies"
          // ═══════════════════════════════════════════════════════════
          if (uOsmosisDepth > 0.0 && vCursorInfluence > 0.0) {
            float warmth = uOsmosisDepth * vCursorInfluence;
            vec3 amberGlow = vec3(1.0, 0.7, 0.3);  // Warm amber
            color = mix(color, amberGlow, warmth * 0.4);
            // Subtle alpha boost for warmth visibility
            alpha = min(1.0, alpha + warmth * 0.2);
          }
          
          // ═══════════════════════════════════════════════════════════
          // INNER GLOW (Bioluminescence): "Two rhythms — lungs and heart"
          // Particles closer to center glow with independent pulsation
          // ═══════════════════════════════════════════════════════════
          if (uInnerGlowIntensity > 0.0) {
            // Normalize distance to sphere radius
            float distNormalized = vDistanceToCenter / uSphereRadius;
            
            // Glow factor: stronger near center, fades toward surface
            float glowFactor = 1.0 - smoothstep(0.0, uInnerGlowRadius, distNormalized);
            glowFactor *= glowFactor;  // Quadratic falloff for core concentration
            
            // Pulsation (independent from breathing)
            float glowPulse = uInnerGlowPhase * uInnerGlowIntensity;
            
            // Additive glow contribution
            vec3 glowContribution = uInnerGlowColor * glowFactor * glowPulse;
            color += glowContribution * 0.5;
            
            // Subtle alpha boost for inner glow visibility
            alpha = min(1.0, alpha + glowFactor * glowPulse * 0.3);
          }
          
          // ═══════════════════════════════════════════════════════════
          // SENSITIVITY ZONES WARMTH: "Living skin — softer parts glow warmer"
          // ═══════════════════════════════════════════════════════════
          if (uSensitivityWarmth > 0.0 && vSensitivity > 1.0) {
            // warmthFactor: 0 for sensitivity=1.0, positive for higher sensitivity
            float warmthFactor = (vSensitivity - 1.0) * uSensitivityWarmth;
            
            // Warm color shift (adds red/orange, removes blue)
            vec3 warmShift = vec3(0.15, 0.05, -0.05) * warmthFactor;
            color += warmShift;
            
            // Subtle brightness boost for sensitive zones
            color *= 1.0 + warmthFactor * 0.3;
          }
          
          // TRANSFORMATION FADE: particles fade during shell transitions
          alpha *= uTransformFade;
          
          gl_FragColor = vec4(color, alpha);
        }
    `
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
        uSize: { value: 6.0 * this.sizeMultiplier },
        uPauseFactor: { value: 0 },
        uColorTint: { value: 1.0 },
        uEvapFadeOutEnd: { value: 0.45 },
        uEvapFadeInStart: { value: 0.55 },
        uNoiseAmount: { value: 0.08 },
        uNoiseSpeed: { value: 0.3 },
        uGoosebumpsIntensity: { value: 0.0 },
        uDynamicSizeAmount: { value: 0.0 },
        uSparkleIntensity: { value: 0.0 },
        uCursorWorldPos: { value: new THREE.Vector3(0, 0, 10) },
        uCursorInfluenceRadius: { value: 0.8 },
        uCursorInfluenceStrength: { value: 0.0 },
        uCursorAttractionStrength: { value: 0.0 },
        uRippleOrigin: { value: new THREE.Vector3(0, 0, 0) },
        uRippleTime: { value: -1.0 },
        uRippleSpeed: { value: 3.0 },
        uRippleDecay: { value: 2.0 },
        uGhostTrace0Pos: { value: new THREE.Vector3(0, 0, 0) },
        uGhostTrace1Pos: { value: new THREE.Vector3(0, 0, 0) },
        uGhostTrace2Pos: { value: new THREE.Vector3(0, 0, 0) },
        uGhostTrace0Alpha: { value: 0.0 },
        uGhostTrace1Alpha: { value: 0.0 },
        uGhostTrace2Alpha: { value: 0.0 },
        uWarmTrace0Pos: { value: new THREE.Vector3(0, 0, 0) },
        uWarmTrace1Pos: { value: new THREE.Vector3(0, 0, 0) },
        uWarmTrace2Pos: { value: new THREE.Vector3(0, 0, 0) },
        uWarmTrace0Alpha: { value: 0.0 },
        uWarmTrace1Alpha: { value: 0.0 },
        uWarmTrace2Alpha: { value: 0.0 },
        uTouchGlowPos: { value: new THREE.Vector3(0, 0, 10) },
        uTouchGlowIntensity: { value: 0.0 },
        uPulse: { value: 0.0 },
        uOsmosisDepth: { value: 0.0 },
        // Organic Ticks
        uTickZone: { value: new THREE.Vector3(0, 0, 0) },
        uTickRadius: { value: 0.0 },
        uTickIntensity: { value: 0.0 },
        uTickType: { value: 0 },
        // Inner Glow (Bioluminescence)
        uInnerGlowPhase: { value: 0.0 },
        uInnerGlowIntensity: { value: 0.4 },
        uInnerGlowColor: { value: new THREE.Color(0xFFE4B5) },  // Warm amber default
        uInnerGlowRadius: { value: 0.6 },
        uSphereRadius: { value: 1.5 },  // Match baseRadius
        // Sensitivity Zones
        uSensitivityDrift: { value: new THREE.Vector3(0, 0, 0) },
        uSensitivityContrast: { value: 1.0 },
        uSensitivityWarmth: { value: 0.2 },
        // Transformation fade (shells)
        uTransformFade: { value: 1.0 }  // 1.0 = visible, 0 = hidden
      },
      vertexShader: this._generateVertexShader(),
      fragmentShader: this._generateFragmentShader(),
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
   * 
   * Note: First stop (PEACE baseline) is modified by peaceSaturationMod and peaceLightnessMod
   * based on trust level from MemoryManager
   */
  setColorProgress(progress) {
    progress = Math.max(0, Math.min(1, progress))

    // Define color stops in HSL for precise hue control (~165° journey)
    // H values: 0=red, 0.083=orange, 0.125=gold, 0.166=yellow, 0.333=green, 0.5=cyan, 0.666=blue, 0.75=purple, 0.833=magenta
    // First stop modified by trust-based modifiers (greyer/darker when low trust)
    const stops = [
      { h: 0.66, s: 0.60 * this.peaceSaturationMod, l: 0.50 * this.peaceLightnessMod },   // 0.00: Deep Blue (240°) — PEACE baseline (trust-modified)
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
   * Set PEACE baseline color modification based on trust level
   * Low trust = greyer, less saturated color ("cold" sphere)
   * @param {number} satMod - saturation modifier 0.5-1.0 (lower = greyer)
   * @param {number} lightMod - lightness modifier 0.8-1.0 (lower = darker)
   */
  setPeaceColorMod(satMod, lightMod) {
    this.peaceSaturationMod = Math.max(0.5, Math.min(1.0, satMod))
    this.peaceLightnessMod = Math.max(0.8, Math.min(1.0, lightMod))
  }

  /**
   * Apply rolling rotation - sphere "rests on surface" and follows cursor
   * @param {Object} cursorDelta - {x, y} movement since last frame
   * @param {number} strength - rolling sensitivity
   */
  applyRolling(cursorDelta, strength) {
    // Add to velocity (with damping for smoothness)
    // Note: cursorDelta.y is negated because cursor up should roll sphere toward camera
    this.rollingVelocityX += -cursorDelta.y * strength * 0.5
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

  // ═══════════════════════════════════════════════════════════
  // CURSOR PROXIMITY API (Deep Interaction)
  // ═══════════════════════════════════════════════════════════

  /**
   * Set cursor position in world space (for proximity effects)
   * @param {THREE.Vector3} worldPos - cursor position on sphere surface
   */
  setCursorWorldPos(worldPos) {
    this.material.uniforms.uCursorWorldPos.value.copy(worldPos)
  }

  /**
   * Set cursor influence strength (glow intensity)
   * @param {number} strength - 0 (off) to 1 (full glow)
   */
  setCursorInfluence(strength) {
    this.material.uniforms.uCursorInfluenceStrength.value = Math.max(0, Math.min(1, strength))
  }

  /**
   * Set cursor attraction strength (pull toward cursor)
   * @param {number} strength - -1 (repel) to 1 (max attraction)
   */
  setCursorAttraction(strength) {
    this.material.uniforms.uCursorAttractionStrength.value = Math.max(-1, Math.min(1, strength))
  }

  /**
   * Set cursor influence radius
   * @param {number} radius - influence falloff radius in world units
   */
  setCursorInfluenceRadius(radius) {
    this.material.uniforms.uCursorInfluenceRadius.value = radius
  }

  /**
   * Trigger a ripple effect from a point on the sphere
   * @param {THREE.Vector3} origin - point on sphere surface (local space)
   */
  triggerRipple(origin) {
    this.material.uniforms.uRippleOrigin.value.copy(origin)
    this.material.uniforms.uRippleTime.value = 0.0  // Start ripple timer
  }

  /**
   * Update ripple animation
   * @param {number} delta - time delta
   */
  updateRipple(delta) {
    const rippleTime = this.material.uniforms.uRippleTime.value
    if (rippleTime >= 0) {
      this.material.uniforms.uRippleTime.value += delta
      // Deactivate after 2 seconds
      if (this.material.uniforms.uRippleTime.value > 2.0) {
        this.material.uniforms.uRippleTime.value = -1.0
      }
    }
  }

  /**
   * Set ghost traces for emotional memory visualization
   * @param {Array} traces - [{position: THREE.Vector3, alpha: number}]
   */
  setGhostTraces(traces) {
    const uniforms = this.material.uniforms

    // Reset all traces first
    uniforms.uGhostTrace0Alpha.value = 0.0
    uniforms.uGhostTrace1Alpha.value = 0.0
    uniforms.uGhostTrace2Alpha.value = 0.0

    // Set up to 3 traces
    if (traces.length > 0) {
      uniforms.uGhostTrace0Pos.value.copy(traces[0].position)
      uniforms.uGhostTrace0Alpha.value = traces[0].alpha
    }
    if (traces.length > 1) {
      uniforms.uGhostTrace1Pos.value.copy(traces[1].position)
      uniforms.uGhostTrace1Alpha.value = traces[1].alpha
    }
    if (traces.length > 2) {
      uniforms.uGhostTrace2Pos.value.copy(traces[2].position)
      uniforms.uGhostTrace2Alpha.value = traces[2].alpha
    }
  }

  /**
   * Set warm traces for emotional memory visualization
   * @param {Array} traces - [{position: THREE.Vector3, alpha: number}]
   */
  setWarmTraces(traces) {
    const uniforms = this.material.uniforms

    // Reset all traces first
    uniforms.uWarmTrace0Alpha.value = 0.0
    uniforms.uWarmTrace1Alpha.value = 0.0
    uniforms.uWarmTrace2Alpha.value = 0.0

    // Set up to 3 traces
    if (traces.length > 0) {
      uniforms.uWarmTrace0Pos.value.copy(traces[0].position)
      uniforms.uWarmTrace0Alpha.value = traces[0].alpha
    }
    if (traces.length > 1) {
      uniforms.uWarmTrace1Pos.value.copy(traces[1].position)
      uniforms.uWarmTrace1Alpha.value = traces[1].alpha
    }
    if (traces.length > 2) {
      uniforms.uWarmTrace2Pos.value.copy(traces[2].position)
      uniforms.uWarmTrace2Alpha.value = traces[2].alpha
    }
  }

  // ═══════════════════════════════════════════════════════════
  // RECOGNITION PHASE EFFECTS (Touch Glow & Pulse)
  // ═══════════════════════════════════════════════════════════

  /**
   * Set touch glow effect for RECOGNITION phase
   * @param {THREE.Vector3} worldPos - Position to glow around (world space)
   * @param {number} intensity - 0-1 glow intensity
   */
  setTouchGlow(worldPos, intensity) {
    // Transform to local space (undo mesh rotation)
    const localPos = worldPos.clone()
      .applyMatrix4(this.mesh.matrixWorld.clone().invert())
    // Normalize to sphere surface
    localPos.normalize().multiplyScalar(this.baseRadius)

    this.material.uniforms.uTouchGlowPos.value.copy(localPos)
    this.material.uniforms.uTouchGlowIntensity.value = Math.max(0, Math.min(1, intensity))
  }

  /**
   * Set pulse amount for RECOGNITION phase heartbeat effect
   * @param {number} amount - 0-1, percentage of size boost
   */
  setPulse(amount) {
    this.material.uniforms.uPulse.value = Math.max(0, Math.min(1, amount))
  }

  /**
   * Clear touch glow and pulse effects
   */
  clearTouchGlow() {
    this.material.uniforms.uTouchGlowIntensity.value = 0
    this.material.uniforms.uPulse.value = 0
  }

  /**
   * Set osmosis depth for hold gesture visual effect
   * @param {number} depth - 0 (no effect) to 1 (full penetration)
   */
  setOsmosisDepth(depth) {
    this.material.uniforms.uOsmosisDepth.value = Math.max(0, Math.min(1, depth))
  }

  /**
   * Set transformation fade for shell transitions
   * @param {number} fade - 1.0 (visible) to 0 (hidden during shell)
   */
  setTransformFade(fade) {
    this.material.uniforms.uTransformFade.value = Math.max(0, Math.min(1, fade))
  }

  /**
   * Set noise amount (for stroke calming effect)
   * @param {number} amount - noise amplitude
   */
  setNoiseAmount(amount) {
    this.material.uniforms.uNoiseAmount.value = Math.max(0, amount)
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

  /**
   * Set responsive size multiplier (for mobile/orientation changes)
   * @param {number} multiplier - 1.0 (desktop) to 1.8 (mobile)
   */
  setSizeMultiplier(multiplier) {
    this.sizeMultiplier = multiplier
    // Note: actual uSize value is managed by Sphere.js during updates
    // This stores the multiplier for reference
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

  /**
   * Set inner glow (bioluminescence) parameters
   * @param {number} phase - 0-1, pulsation phase
   * @param {number} intensity - 0-1, glow intensity
   * @param {THREE.Color|number} color - Glow color (hex or THREE.Color)
   */
  setInnerGlow(phase, intensity = null, color = null) {
    this.material.uniforms.uInnerGlowPhase.value = phase
    if (intensity !== null) {
      this.material.uniforms.uInnerGlowIntensity.value = intensity
    }
    if (color !== null) {
      if (typeof color === 'number') {
        this.material.uniforms.uInnerGlowColor.value.setHex(color)
      } else {
        this.material.uniforms.uInnerGlowColor.value.copy(color)
      }
    }
  }

  /**
   * Update sensitivity zone drift over time
   * Creates slow organic migration of sensitivity zones (~30-50 sec cycle)
   * "Living skin — zones breathe and shift"
   * @param {number} delta - Frame delta time in seconds
   */
  updateSensitivityDrift(delta) {
    const time = performance.now() * 0.0001  // Very slow progression

    // Organic drift using different frequencies for each axis
    this.sensitivityDriftOffset.x = Math.sin(time * 0.7) * this.sensitivityDriftSpeed
    this.sensitivityDriftOffset.y = Math.cos(time * 1.1) * this.sensitivityDriftSpeed
    this.sensitivityDriftOffset.z = Math.sin(time * 0.9) * this.sensitivityDriftSpeed

    this.material.uniforms.uSensitivityDrift.value.copy(this.sensitivityDriftOffset)
  }

  /**
   * Set sensitivity zones contrast (how much difference between soft/hard areas)
   * @param {number} contrast - 0.5 (subtle) to 2.0 (dramatic)
   */
  setSensitivityContrast(contrast) {
    this.material.uniforms.uSensitivityContrast.value = contrast
  }

  /**
   * Set sensitivity zones warmth visualization
   * @param {number} warmth - 0.0 (no tint) to 0.5 (strong warm tint)
   */
  setSensitivityWarmth(warmth) {
    this.material.uniforms.uSensitivityWarmth.value = warmth
  }
}
