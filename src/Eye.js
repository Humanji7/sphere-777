import * as THREE from 'three'

/**
 * Eye - Mystical particle-based eye system
 * 
 * A spiritual artifact at the sphere's north pole:
 * - Sacred Geometry Iris: 5-petal hypotrochoid pattern (pentagram)
 * - Soul Spark: Glowing central point with emotional color transitions
 * - Ritual Blinking: Light trails and transcendental states
 * - Aura: Subtle glow that responds to cursor proximity
 * 
 * "The eye doesn't just look — it transmits the essence of the sphere."
 */
export class Eye {
  constructor(sphereRadius = 1.5, sizeMultiplier = 1.0) {
    this.sphereRadius = sphereRadius
    this.sizeMultiplier = sizeMultiplier  // Responsive sizing for mobile

    // Eye geometry parameters
    this.eyeRadius = 0.45
    this.irisRadius = 0.35
    this.pupilRadius = 0.12
    this.pupilDilateMax = 0.20

    // Particle counts (keeping ~200 total)
    this.irisParticleCount = 100   // Sacred geometry pattern
    this.pupilParticleCount = 20   // Dark core
    this.lidParticleCount = 50     // Eyelid
    this.soulSparkCount = 1        // The soul spark

    // State
    this.gazeOffset = new THREE.Vector2(0, 0)
    this.targetGaze = new THREE.Vector2(0, 0)
    this.pupilDilation = 0
    this.blinkProgress = 0
    this.isBlinking = false
    this.blinkTimer = 0
    this.nextBlinkTime = 3 + Math.random() * 4
    this.prevBlinkProgress = 0  // For velocity calculation

    // Emotional states
    this.tension = 0
    this.isSleeping = false
    this.tearAmount = 0

    // Mystical states
    this.irisRotation = 0           // Current rotation angle
    this.irisRotationSpeed = 0      // Current speed
    this.targetRotationSpeed = 0.1  // Base rotation speed
    this.listeningTime = 0          // Time in listening state
    this.emotionalState = 0         // 0=Peace, 1=Tension, 2=Trauma, 3=Healing
    this.auraIntensity = 0.2        // Base aura glow
    this.targetAuraIntensity = 0.2
    this.cursorProximity = 0        // 0-1, distance to cursor

    // Soul Spark colors
    this.soulSparkColors = {
      peace: new THREE.Color(0xE0E8FF),      // Cold white
      listening: new THREE.Color(0xA0C4FF),  // Soft blue
      tension: new THREE.Color(0xFFD700),    // Warm gold
      trauma: new THREE.Color(0x3D1A4F)      // Muted purple
    }
    this.currentSoulColor = this.soulSparkColors.peace.clone()
    this.targetSoulColor = this.soulSparkColors.peace.clone()

    // Colors
    this.irisColor = new THREE.Color().setHSL(0.12, 0.7, 0.45)   // Amber/gold
    this.pupilColor = new THREE.Color(0x050505)
    this.lidColor = new THREE.Color().setHSL(0.66, 0.4, 0.25)

    // Sphere rotation reference
    this.sphereRotation = new THREE.Euler(0, 0, 0)

    this._createGeometry()
    this._createMaterial()
    this._createMesh()
  }

  _createGeometry() {
    const totalCount = this.irisParticleCount + this.pupilParticleCount +
      this.lidParticleCount + this.soulSparkCount
    this.totalCount = totalCount

    this.geometry = new THREE.BufferGeometry()

    // Positions
    this.positions = new Float32Array(totalCount * 3)
    this.basePositions = new Float32Array(totalCount * 3)
    // Particle type: 0 = iris, 1 = pupil, 2 = lid, 3 = soul spark
    this.types = new Float32Array(totalCount)
    // Ring index for iris (0-1, distance from center)
    this.ringIndex = new Float32Array(totalCount)
    // Random seed per particle
    this.seeds = new Float32Array(totalCount)
    // Angle in sacred pattern (for rotation)
    this.angles = new Float32Array(totalCount)
    // Petal index (0-4 for 5-petal pattern)
    this.petals = new Float32Array(totalCount)

    let idx = 0

    // ═══════════════════════════════════════════════════════════
    // IRIS PARTICLES - Sacred Geometry (5-petal Rose + Spiral Layers)
    // ═══════════════════════════════════════════════════════════
    // Rose curve: r = cos(k*θ) where k=5 gives 5 petals
    // We layer multiple rings to fill the iris area
    const k = 5  // 5-petal rose
    const layers = 4  // Concentric layers
    const particlesPerLayer = Math.floor(this.irisParticleCount / layers)

    for (let layer = 0; layer < layers; layer++) {
      // Each layer is slightly smaller radius
      const layerRadius = this.irisRadius * (0.4 + 0.6 * (layer + 1) / layers)

      for (let p = 0; p < particlesPerLayer; p++) {
        // Angle wraps multiple times through the rose
        const t = (p / particlesPerLayer) * Math.PI * 2

        // Rose curve r = cos(k * t), scaled by layer
        // Add small offset per layer for visual richness
        const roseR = Math.abs(Math.cos(k * t + layer * 0.2))
        const finalRadius = layerRadius * (0.3 + roseR * 0.7)

        // Golden angle spiral for layer distribution
        const goldenAngle = Math.PI * (3 - Math.sqrt(5))
        const spiralOffset = layer * goldenAngle * 0.5

        let hx = Math.cos(t + spiralOffset) * finalRadius
        let hy = Math.sin(t + spiralOffset) * finalRadius

        // Organic jitter
        const seed = Math.random()
        const jitter = 0.012
        hx += (seed - 0.5) * jitter * 2
        hy += (Math.random() - 0.5) * jitter * 2

        // Calculate normalized distance from center
        const distFromCenter = Math.sqrt(hx * hx + hy * hy)
        const ringNormalized = distFromCenter / this.irisRadius

        // Determine which petal (0-4)
        const angle = Math.atan2(hy, hx)
        const petalIndex = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * k) % k

        const pos = this._projectToSpherePole(hx, hy)

        const i3 = idx * 3
        this.positions[i3] = pos.x
        this.positions[i3 + 1] = pos.y
        this.positions[i3 + 2] = pos.z

        this.basePositions[i3] = pos.x
        this.basePositions[i3 + 1] = pos.y
        this.basePositions[i3 + 2] = pos.z

        this.types[idx] = 0  // iris
        this.ringIndex[idx] = ringNormalized
        this.seeds[idx] = seed
        this.angles[idx] = t
        this.petals[idx] = petalIndex

        idx++
      }
    }

    // ═══════════════════════════════════════════════════════════
    // PUPIL PARTICLES - Dark central cluster
    // ═══════════════════════════════════════════════════════════
    for (let p = 0; p < this.pupilParticleCount; p++) {
      // Fibonacci spiral for even distribution
      const phi = Math.acos(1 - 2 * (p + 0.5) / this.pupilParticleCount)
      const theta = Math.PI * (1 + Math.sqrt(5)) * p

      const radius = this.pupilRadius * Math.sqrt((p + 1) / this.pupilParticleCount)
      const localX = Math.cos(theta) * radius * 0.8
      const localY = Math.sin(theta) * radius * 0.8

      const pos = this._projectToSpherePole(localX, localY)

      const i3 = idx * 3
      this.positions[i3] = pos.x
      this.positions[i3 + 1] = pos.y
      this.positions[i3 + 2] = pos.z

      this.basePositions[i3] = pos.x
      this.basePositions[i3 + 1] = pos.y
      this.basePositions[i3 + 2] = pos.z

      this.types[idx] = 1  // pupil
      this.ringIndex[idx] = 0
      this.seeds[idx] = Math.random()
      this.angles[idx] = theta
      this.petals[idx] = 0

      idx++
    }

    // ═══════════════════════════════════════════════════════════
    // LID PARTICLES - Arc above the eye
    // ═══════════════════════════════════════════════════════════
    for (let p = 0; p < this.lidParticleCount; p++) {
      const t = p / (this.lidParticleCount - 1)
      const angle = Math.PI * 0.3 + t * Math.PI * 0.4

      const lidRadius = this.eyeRadius + 0.03
      const localX = Math.cos(angle) * lidRadius
      const localY = this.eyeRadius + 0.08

      const pos = this._projectToSpherePole(localX, localY)

      const i3 = idx * 3
      this.positions[i3] = pos.x
      this.positions[i3 + 1] = pos.y
      this.positions[i3 + 2] = pos.z

      this.basePositions[i3] = pos.x
      this.basePositions[i3 + 1] = pos.y
      this.basePositions[i3 + 2] = pos.z

      this.types[idx] = 2  // lid
      this.ringIndex[idx] = t
      this.seeds[idx] = Math.random()
      this.angles[idx] = angle
      this.petals[idx] = 0

      idx++
    }

    // ═══════════════════════════════════════════════════════════
    // SOUL SPARK - The spiritual center
    // ═══════════════════════════════════════════════════════════
    {
      const pos = this._projectToSpherePole(0, 0)
      // Slightly more forward than pupil
      const forwardOffset = 0.02

      const i3 = idx * 3
      this.positions[i3] = pos.x
      this.positions[i3 + 1] = pos.y
      this.positions[i3 + 2] = pos.z + forwardOffset

      this.basePositions[i3] = pos.x
      this.basePositions[i3 + 1] = pos.y
      this.basePositions[i3 + 2] = pos.z + forwardOffset

      this.types[idx] = 3  // soul spark
      this.ringIndex[idx] = 0
      this.seeds[idx] = 0.5  // Consistent seed
      this.angles[idx] = 0
      this.petals[idx] = 0

      idx++
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('aBasePos', new THREE.BufferAttribute(this.basePositions, 3))
    this.geometry.setAttribute('aType', new THREE.BufferAttribute(this.types, 1))
    this.geometry.setAttribute('aRingIndex', new THREE.BufferAttribute(this.ringIndex, 1))
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1))
    this.geometry.setAttribute('aAngle', new THREE.BufferAttribute(this.angles, 1))
    this.geometry.setAttribute('aPetal', new THREE.BufferAttribute(this.petals, 1))
  }

  /**
   * Project 2D eye-local coordinates onto sphere surface at north pole
   */
  _projectToSpherePole(x, y) {
    const r = this.sphereRadius
    const point = new THREE.Vector3(x, y, r)
    point.normalize().multiplyScalar(r)
    const outwardOffset = 0.02
    point.multiplyScalar(1 + outwardOffset / r)
    return point
  }

  _createMaterial() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 8.0 * this.sizeMultiplier },
        uIrisColor: { value: this.irisColor },
        uPupilColor: { value: this.pupilColor },
        uLidColor: { value: this.lidColor },
        uSoulSparkColor: { value: this.currentSoulColor },
        uGazeOffset: { value: new THREE.Vector2(0, 0) },
        uPupilDilation: { value: 0 },
        uBlinkProgress: { value: 0 },
        uBlinkVelocity: { value: 0 },
        uTension: { value: 0 },
        uIrisRotation: { value: 0 },
        uAuraIntensity: { value: 0.2 },
        uListeningTime: { value: 0 },
        uEmotionalState: { value: 0 },
        uSoulSparkPhase: { value: 0 }
      },
      vertexShader: `
        attribute float aType;
        attribute float aRingIndex;
        attribute float aSeed;
        attribute float aAngle;
        attribute float aPetal;
        attribute vec3 aBasePos;
        
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform vec2 uGazeOffset;
        uniform float uPupilDilation;
        uniform float uBlinkProgress;
        uniform float uBlinkVelocity;
        uniform float uTension;
        uniform float uIrisRotation;
        uniform float uListeningTime;
        uniform float uEmotionalState;
        uniform float uSoulSparkPhase;
        
        varying float vType;
        varying float vRingIndex;
        varying float vSeed;
        varying float vBlinkCover;
        varying float vPetal;
        varying float vAuraFactor;
        
        void main() {
          vType = aType;
          vRingIndex = aRingIndex;
          vSeed = aSeed;
          vBlinkCover = 0.0;
          vPetal = aPetal;
          vAuraFactor = 0.0;
          
          vec3 pos = position;
          vec3 basePos = aBasePos;
          vec3 eyeCenter = vec3(0.0, 0.0, 1.5);
          
          // ═══════════════════════════════════════════════════════════
          // IRIS ROTATION - Sacred geometry spinning
          // ═══════════════════════════════════════════════════════════
          if (aType < 0.5) {
            vec3 fromCenter = pos - eyeCenter;
            float angle = uIrisRotation;
            float cosA = cos(angle);
            float sinA = sin(angle);
            vec3 rotated = vec3(
              fromCenter.x * cosA - fromCenter.y * sinA,
              fromCenter.x * sinA + fromCenter.y * cosA,
              fromCenter.z
            );
            pos = eyeCenter + rotated;
            
            // Pulsation - breathe from center outward
            float pulse = sin(uTime * 1.5 + aRingIndex * 3.14159) * 0.02;
            vec3 outDir = normalize(fromCenter);
            pos += outDir * pulse * (1.0 + uTension * 0.5);
            
            // Aura factor for outer particles
            vAuraFactor = smoothstep(0.6, 1.0, aRingIndex);
          }
          
          // ═══════════════════════════════════════════════════════════
          // GAZE: Shift iris and pupil based on cursor direction
          // ═══════════════════════════════════════════════════════════
          if (aType < 1.5) {
            float maxGazeShift = 0.08;
            vec3 gazeShift = vec3(
              uGazeOffset.x * maxGazeShift,
              uGazeOffset.y * maxGazeShift,
              0.0
            );
            
            // Eye roll during long listening
            float rollAmount = smoothstep(3.0, 6.0, uListeningTime) * 0.06;
            gazeShift.y += rollAmount;
            
            float gazeMultiplier = aType < 0.5 ? 1.0 : 1.5;
            pos += gazeShift * gazeMultiplier;
          }
          
          // ═══════════════════════════════════════════════════════════
          // PUPIL DILATION
          // ═══════════════════════════════════════════════════════════
          if (aType > 0.5 && aType < 1.5) {
            vec3 fromCenter = pos - eyeCenter;
            float dilationScale = 1.0 + uPupilDilation * 0.8;
            pos = eyeCenter + fromCenter * dilationScale;
          }
          
          // ═══════════════════════════════════════════════════════════
          // SOUL SPARK - Breathing with phase shift
          // ═══════════════════════════════════════════════════════════
          if (aType > 2.5) {
            // Breathe with slight phase offset from main sphere
            float breathe = sin(uSoulSparkPhase) * 0.015;
            pos.z += breathe;
            
            // Subtle orbital motion
            float orbit = uTime * 0.3;
            pos.x += sin(orbit) * 0.005;
            pos.y += cos(orbit) * 0.005;
          }
          
          // ═══════════════════════════════════════════════════════════
          // BLINK with trails
          // ═══════════════════════════════════════════════════════════
          if (aType > 1.5 && aType < 2.5) {
            float lidTravel = 0.35;
            vec3 downDir = normalize(vec3(0.0, -1.0, 0.0));
            
            // Smooth easing
            float blinkEased = uBlinkProgress * uBlinkProgress * (3.0 - 2.0 * uBlinkProgress);
            pos += downDir * blinkEased * lidTravel;
            
            // Trail effect - stretch particles based on velocity
            float trailStretch = abs(uBlinkVelocity) * 0.1;
            pos.y += trailStretch * sign(-uBlinkVelocity) * aSeed;
          }
          
          // Check blink coverage for iris/pupil
          if (aType < 1.5) {
            float particleY = pos.y - eyeCenter.y;
            float lidY = 0.0 - uBlinkProgress * 0.35;
            vBlinkCover = smoothstep(lidY + 0.05, lidY - 0.02, particleY);
          }
          
          // ═══════════════════════════════════════════════════════════
          // MICRO-TREMOR
          // ═══════════════════════════════════════════════════════════
          float tremorAmount = 0.003 + uTension * 0.008;
          pos += vec3(
            sin(uTime * 15.0 + aSeed * 100.0) * tremorAmount,
            cos(uTime * 13.0 + aSeed * 100.0) * tremorAmount,
            0.0
          );
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size attenuation
          float baseSize = uSize * uPixelRatio * (1.0 / -mvPosition.z);
          
          // Soul spark is larger and pulses
          if (aType > 2.5) {
            float sparkPulse = 0.8 + sin(uSoulSparkPhase * 1.5) * 0.4;
            baseSize *= 2.5 * sparkPulse;
          }
          // Pupil slightly larger
          else if (aType > 0.5 && aType < 1.5) {
            baseSize *= 1.3;
          }
          // Lid
          else if (aType > 1.5 && aType < 2.5) {
            baseSize *= 1.1;
          }
          // Outer iris particles (aura carriers) slightly larger
          else if (vAuraFactor > 0.5) {
            baseSize *= 1.2;
          }
          
          gl_PointSize = baseSize;
        }
      `,
      fragmentShader: `
        uniform vec3 uIrisColor;
        uniform vec3 uPupilColor;
        uniform vec3 uLidColor;
        uniform vec3 uSoulSparkColor;
        uniform float uTime;
        uniform float uTension;
        uniform float uAuraIntensity;
        uniform float uEmotionalState;
        uniform float uBlinkVelocity;
        
        varying float vType;
        varying float vRingIndex;
        varying float vSeed;
        varying float vBlinkCover;
        varying float vPetal;
        varying float vAuraFactor;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Soft edge
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          vec3 color;
          
          // ═══════════════════════════════════════════════════════════
          // SOUL SPARK - Glowing spiritual center
          // ═══════════════════════════════════════════════════════════
          if (vType > 2.5) {
            color = uSoulSparkColor;
            
            // Radial glow effect
            float glow = 1.0 - dist * 1.5;
            glow = max(0.0, glow);
            color *= 1.0 + glow * 2.0;
            
            // Bright center
            alpha = smoothstep(0.5, 0.0, dist);
            alpha = max(alpha, 0.3);  // Minimum visibility
            
            // Add sparkle
            float sparkle = sin(uTime * 8.0 + vSeed * 50.0) * 0.3 + 0.7;
            color *= sparkle;
          }
          
          // ═══════════════════════════════════════════════════════════
          // IRIS - Sacred geometry with gradient per petal
          // ═══════════════════════════════════════════════════════════
          else if (vType < 0.5) {
            // Base color with petal variation
            float petalHue = vPetal / 5.0 * 0.1;  // Slight hue shift per petal
            vec3 baseColor = uIrisColor;
            
            // Petal-based color variation (subtle rainbow)
            baseColor.r += sin(vPetal * 1.2) * 0.08;
            baseColor.g += cos(vPetal * 0.8) * 0.05;
            baseColor.b += sin(vPetal * 1.5 + 1.0) * 0.06;
            
            // Inner to outer gradient
            float brightness = 0.6 + vRingIndex * 0.5;
            color = baseColor * brightness;
            
            // Shimmer wave across petals
            float wave = sin(uTime * 2.0 + vPetal * 1.2 + vRingIndex * 3.0) * 0.15 + 0.85;
            color *= wave;
            
            // Tension: warmer, more intense
            color = mix(color, color * vec3(1.3, 0.95, 0.85), uTension * 0.4);
            
            // TRAUMA state: dim and desaturate
            if (uEmotionalState > 1.5 && uEmotionalState < 2.5) {
              float traumaDim = 0.4;
              color *= traumaDim;
              // Desaturate
              float gray = dot(color, vec3(0.299, 0.587, 0.114));
              color = mix(color, vec3(gray), 0.5);
            }
            
            // HEALING state: soft light waves
            if (uEmotionalState > 2.5) {
              float healWave = sin(uTime * 0.8 + vRingIndex * 2.0) * 0.2 + 1.0;
              color *= healWave;
              // Slight blue-white tint
              color = mix(color, vec3(0.9, 0.95, 1.0), 0.15);
            }
            
            // Aura glow for outer particles
            if (vAuraFactor > 0.0) {
              float auraGlow = vAuraFactor * uAuraIntensity * (1.0 + sin(uTime * 3.0) * 0.3);
              color += uIrisColor * auraGlow * 0.5;
              alpha = mix(alpha, alpha * 0.7, vAuraFactor * 0.3);  // Slightly transparent aura
            }
          }
          
          // ═══════════════════════════════════════════════════════════
          // PUPIL - Deep black with purple edge
          // ═══════════════════════════════════════════════════════════
          else if (vType < 1.5) {
            color = uPupilColor;
            // Purple tint at edges
            color = mix(color, vec3(0.12, 0.05, 0.18), dist * 0.6);
            
            // TRAUMA: slightly lighter (soul retreating)
            if (uEmotionalState > 1.5 && uEmotionalState < 2.5) {
              color = mix(color, vec3(0.15, 0.1, 0.2), 0.3);
            }
          }
          
          // ═══════════════════════════════════════════════════════════
          // LID - Skin with light trails
          // ═══════════════════════════════════════════════════════════
          else if (vType < 2.5) {
            color = uLidColor;
            color *= 0.9 + vSeed * 0.2;
            
            // Light trail during blink
            float trailGlow = abs(uBlinkVelocity) * 0.8;
            vec3 trailColor = vec3(0.6, 0.7, 1.0);  // Cool blue-white
            color = mix(color, trailColor, trailGlow * vSeed);
            
            // Slight glow at edges during movement
            if (trailGlow > 0.1) {
              alpha *= 1.0 + trailGlow * 0.5;
            }
          }
          
          // Blink coverage fade for iris/pupil/spark
          if (vType < 2.5) {
            alpha *= 1.0 - vBlinkCover;
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
   * Set target gaze direction
   */
  lookAt(cursorWorldPos) {
    const eyeCenter = new THREE.Vector3(0, 0, this.sphereRadius)
    eyeCenter.applyEuler(this.sphereRotation)

    const toCursor = cursorWorldPos.clone().sub(eyeCenter).normalize()

    this.targetGaze.x = THREE.MathUtils.clamp(toCursor.x * 2, -1, 1)
    this.targetGaze.y = THREE.MathUtils.clamp(toCursor.y * 2, -1, 1)
  }

  /**
   * Look away from a position (avoidance during trauma/high tension)
   * Eye tries to avoid looking at cursor
   * @param {THREE.Vector3} avoidPos - position to look away from
   * @param {number} intensity - 0-1, how strongly to avoid
   */
  lookAwayFrom(avoidPos, intensity) {
    const eyeCenter = new THREE.Vector3(0, 0, this.sphereRadius)
    eyeCenter.applyEuler(this.sphereRotation)

    // Direction FROM cursor (opposite of lookAt)
    const awayCursor = eyeCenter.clone().sub(avoidPos).normalize()

    // Blend between current gaze and avoidance direction
    const avoidX = THREE.MathUtils.clamp(awayCursor.x * 1.5, -1, 1)
    const avoidY = THREE.MathUtils.clamp(awayCursor.y * 1.5, -1, 1)

    // Stronger avoidance with higher intensity
    const blendFactor = intensity * 0.7  // Max 70% avoidance
    this.targetGaze.x = THREE.MathUtils.lerp(this.targetGaze.x, avoidX, blendFactor)
    this.targetGaze.y = THREE.MathUtils.lerp(this.targetGaze.y, avoidY, blendFactor)

    // Also slightly close the eyes during avoidance (mimics flinch)
    if (intensity > 0.6 && !this.isBlinking && Math.random() < 0.02) {
      this.blink()
    }
  }

  /**
   * Actively seek cursor contact (during healing/curiosity)
   * Eye is more eager to track cursor
   * @param {THREE.Vector3} targetPos - position to seek
   */
  seekCursor(targetPos) {
    // More direct gaze tracking (stronger than normal lookAt)
    const eyeCenter = new THREE.Vector3(0, 0, this.sphereRadius)
    eyeCenter.applyEuler(this.sphereRotation)

    const toCursor = targetPos.clone().sub(eyeCenter).normalize()

    // Amplified gaze (more "eager" to look)
    this.targetGaze.x = THREE.MathUtils.clamp(toCursor.x * 2.5, -1, 1)
    this.targetGaze.y = THREE.MathUtils.clamp(toCursor.y * 2.5, -1, 1)

    // Slight pupil dilation (curiosity/interest)
    this.pupilDilation = Math.min(1, this.pupilDilation + 0.02)
  }

  /**
   * Trigger a blink
   */
  blink() {
    if (!this.isBlinking) {
      this.isBlinking = true
      this.blinkTimer = 0
    }
  }

  /**
   * Set pupil dilation
   */
  setDilation(amount) {
    this.pupilDilation = THREE.MathUtils.clamp(amount, 0, 1)
  }

  /**
   * Set tension level
   */
  setTension(tension) {
    this.tension = THREE.MathUtils.clamp(tension, 0, 1)
    this.material.uniforms.uTension.value = this.tension

    // Tension affects rotation speed
    this.targetRotationSpeed = 0.1 + tension * 1.5  // Up to 1.6 rad/sec at max tension
  }

  /**
   * Set sleeping state
   */
  setSleeping(sleeping) {
    this.isSleeping = sleeping
  }

  /**
   * Set emotional state for visual effects
   * @param {string} phase - 'peace', 'listening', 'tension', 'bleeding', 'trauma', 'healing'
   */
  setEmotionalPhase(phase) {
    switch (phase) {
      case 'peace':
        this.emotionalState = 0
        this.targetSoulColor.copy(this.soulSparkColors.peace)
        this.targetAuraIntensity = 0.2
        this.listeningTime = 0
        break
      case 'listening':
        this.emotionalState = 0
        this.targetSoulColor.copy(this.soulSparkColors.listening)
        this.targetAuraIntensity = 0.35
        break
      case 'tension':
      case 'bleeding':
        this.emotionalState = 1
        this.targetSoulColor.copy(this.soulSparkColors.tension)
        this.targetAuraIntensity = 0.5
        this.listeningTime = 0
        break
      case 'trauma':
        this.emotionalState = 2
        this.targetSoulColor.copy(this.soulSparkColors.trauma)
        this.targetAuraIntensity = 0.05
        this.listeningTime = 0
        break
      case 'healing':
        this.emotionalState = 3
        this.targetSoulColor.copy(this.soulSparkColors.peace)
        this.targetAuraIntensity = 0.4
        this.listeningTime = 0
        break
    }
    this.material.uniforms.uEmotionalState.value = this.emotionalState
  }

  /**
   * Set cursor proximity for aura effect
   * @param {number} proximity - 0-1
   */
  setCursorProximity(proximity) {
    this.cursorProximity = THREE.MathUtils.clamp(proximity, 0, 1)
    // Boost aura when cursor is near
    const proximityBoost = proximity * 0.4
    this.targetAuraIntensity = Math.max(this.targetAuraIntensity, 0.2 + proximityBoost)
  }

  /**
   * Sync with sphere's rotation
   */
  setSphereRotation(rotation) {
    this.sphereRotation.copy(rotation)
    this.mesh.rotation.copy(rotation)
  }

  /**
   * Update eye animation
   */
  update(delta, elapsed) {
    this.material.uniforms.uTime.value = elapsed

    // ═══════════════════════════════════════════════════════════
    // IRIS ROTATION
    // ═══════════════════════════════════════════════════════════
    this.irisRotationSpeed = THREE.MathUtils.lerp(
      this.irisRotationSpeed,
      this.targetRotationSpeed,
      delta * 2.0
    )
    this.irisRotation += this.irisRotationSpeed * delta
    this.material.uniforms.uIrisRotation.value = this.irisRotation

    // ═══════════════════════════════════════════════════════════
    // GAZE SMOOTHING
    // ═══════════════════════════════════════════════════════════
    const gazeSpeed = 5.0 - this.tension * 2.0
    this.gazeOffset.x = THREE.MathUtils.lerp(this.gazeOffset.x, this.targetGaze.x, delta * gazeSpeed)
    this.gazeOffset.y = THREE.MathUtils.lerp(this.gazeOffset.y, this.targetGaze.y, delta * gazeSpeed)
    this.material.uniforms.uGazeOffset.value.copy(this.gazeOffset)

    // ═══════════════════════════════════════════════════════════
    // LISTENING TIME (for eye roll effect)
    // ═══════════════════════════════════════════════════════════
    if (this.emotionalState === 0 && !this.isSleeping) {
      this.listeningTime += delta
    }
    this.material.uniforms.uListeningTime.value = this.listeningTime

    // ═══════════════════════════════════════════════════════════
    // PUPIL DILATION SMOOTHING
    // ═══════════════════════════════════════════════════════════
    const currentDilation = this.material.uniforms.uPupilDilation.value
    this.material.uniforms.uPupilDilation.value = THREE.MathUtils.lerp(
      currentDilation,
      this.pupilDilation,
      delta * 3.0
    )

    // ═══════════════════════════════════════════════════════════
    // SOUL SPARK PHASE (slightly faster than sphere breathing)
    // ═══════════════════════════════════════════════════════════
    const soulSparkPhase = elapsed * 0.9 + Math.PI / 4  // Phase offset
    this.material.uniforms.uSoulSparkPhase.value = soulSparkPhase

    // ═══════════════════════════════════════════════════════════
    // SOUL SPARK COLOR INTERPOLATION
    // ═══════════════════════════════════════════════════════════
    this.currentSoulColor.lerp(this.targetSoulColor, delta * 2.0)
    this.material.uniforms.uSoulSparkColor.value.copy(this.currentSoulColor)

    // ═══════════════════════════════════════════════════════════
    // AURA INTENSITY SMOOTHING
    // ═══════════════════════════════════════════════════════════
    this.auraIntensity = THREE.MathUtils.lerp(
      this.auraIntensity,
      this.targetAuraIntensity,
      delta * 3.0
    )
    this.material.uniforms.uAuraIntensity.value = this.auraIntensity

    // ═══════════════════════════════════════════════════════════
    // BLINKING
    // ═══════════════════════════════════════════════════════════
    if (this.isBlinking) {
      this.blinkTimer += delta
      const blinkDuration = 0.15

      if (this.blinkTimer < blinkDuration) {
        this.blinkProgress = this.blinkTimer / blinkDuration
      } else if (this.blinkTimer < blinkDuration * 2) {
        this.blinkProgress = 1 - (this.blinkTimer - blinkDuration) / blinkDuration
      } else {
        this.isBlinking = false
        this.blinkProgress = 0
        this.nextBlinkTime = 3 + Math.random() * 4
      }
    } else if (!this.isSleeping) {
      this.nextBlinkTime -= delta
      if (this.nextBlinkTime <= 0) {
        this.blink()
      }
    }

    // Sleeping: keep eyes closed
    if (this.isSleeping) {
      this.blinkProgress = THREE.MathUtils.lerp(this.blinkProgress, 1, delta * 2)
    }

    // Blink velocity for trail effect
    const blinkVelocity = (this.blinkProgress - this.prevBlinkProgress) / Math.max(delta, 0.001)
    this.prevBlinkProgress = this.blinkProgress
    this.material.uniforms.uBlinkVelocity.value = blinkVelocity
    this.material.uniforms.uBlinkProgress.value = this.blinkProgress
  }

  /**
   * Set responsive size multiplier (for mobile/orientation changes)
   * @param {number} multiplier - 1.0 (desktop) to 1.8 (mobile)
   */
  setSizeMultiplier(multiplier) {
    this.sizeMultiplier = multiplier
    this.material.uniforms.uSize.value = 8.0 * multiplier
  }

  /**
   * Get the mesh
   */
  getMesh() {
    return this.mesh
  }

  /**
   * Cleanup
   */
  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
