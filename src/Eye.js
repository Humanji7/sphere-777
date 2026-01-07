import * as THREE from 'three'

/**
 * Eye - Organic particle-based eye system
 * 
 * Renders an eye at the sphere's north pole using particles:
 * - Iris: Concentric rings of colored particles
 * - Pupil: Dark central cluster that dilates with tension
 * - Eyelid: Particles that descend to "close" the eye
 * 
 * Integrates with sphere's emotional states and cursor tracking.
 */
export class Eye {
    constructor(sphereRadius = 1.5) {
        this.sphereRadius = sphereRadius

        // Eye geometry parameters (scaled up for visibility)
        this.eyeRadius = 0.45         // Radius of the eye opening on sphere
        this.irisRadius = 0.35        // Iris outer radius
        this.pupilRadius = 0.12       // Base pupil radius
        this.pupilDilateMax = 0.20    // Max dilated pupil radius

        // Particle counts
        this.irisParticleCount = 120  // Particles in iris rings
        this.pupilParticleCount = 25  // Particles in pupil
        this.lidParticleCount = 50    // Particles for eyelid

        // State
        this.gazeOffset = new THREE.Vector2(0, 0)  // Current gaze direction (-1 to 1)
        this.targetGaze = new THREE.Vector2(0, 0)  // Target gaze
        this.pupilDilation = 0        // 0 = normal, 1 = fully dilated
        this.blinkProgress = 0        // 0 = open, 1 = closed
        this.isBlinking = false
        this.blinkTimer = 0
        this.nextBlinkTime = 3 + Math.random() * 4  // 3-7 seconds between blinks

        // Emotional states
        this.tension = 0              // 0-1, affects pupil size and movement speed
        this.isSleeping = false
        this.tearAmount = 0           // 0-1, for bleeding phase

        // Colors
        this.irisColor = new THREE.Color().setHSL(0.12, 0.7, 0.45)   // Amber/gold
        this.pupilColor = new THREE.Color(0x050505)                   // Near black
        this.lidColor = new THREE.Color().setHSL(0.66, 0.4, 0.25)    // Dark blue (skin)

        // Sphere rotation reference (will be set by parent)
        this.sphereRotation = new THREE.Euler(0, 0, 0)

        this._createGeometry()
        this._createMaterial()
        this._createMesh()
    }

    _createGeometry() {
        const totalCount = this.irisParticleCount + this.pupilParticleCount + this.lidParticleCount
        this.totalCount = totalCount

        this.geometry = new THREE.BufferGeometry()

        // Positions
        this.positions = new Float32Array(totalCount * 3)
        // Base positions (for animations)
        this.basePositions = new Float32Array(totalCount * 3)
        // Particle type: 0 = iris, 1 = pupil, 2 = lid
        this.types = new Float32Array(totalCount)
        // Ring index for iris (0-1, distance from center)
        this.ringIndex = new Float32Array(totalCount)
        // Random seed per particle
        this.seeds = new Float32Array(totalCount)

        let idx = 0

        // ═══════════════════════════════════════════════════════════
        // IRIS PARTICLES - Concentric rings
        // ═══════════════════════════════════════════════════════════
        const irisRings = 4
        const particlesPerRing = Math.floor(this.irisParticleCount / irisRings)

        for (let ring = 0; ring < irisRings; ring++) {
            const ringRadius = this.pupilRadius + (this.irisRadius - this.pupilRadius) * ((ring + 1) / irisRings)
            const ringNormalized = (ring + 1) / irisRings

            for (let p = 0; p < particlesPerRing; p++) {
                const angle = (p / particlesPerRing) * Math.PI * 2 + ring * 0.3  // Offset each ring

                // Position in eye-local 2D space
                const localX = Math.cos(angle) * ringRadius
                const localY = Math.sin(angle) * ringRadius

                // Project onto sphere surface (north pole)
                const pos = this._projectToSpherePole(localX, localY)

                const i3 = idx * 3
                this.positions[i3] = pos.x
                this.positions[i3 + 1] = pos.y
                this.positions[i3 + 2] = pos.z

                this.basePositions[i3] = pos.x
                this.basePositions[i3 + 1] = pos.y
                this.basePositions[i3 + 2] = pos.z

                this.types[idx] = 0  // iris
                this.ringIndex[idx] = ringNormalized
                this.seeds[idx] = Math.random()

                idx++
            }
        }

        // ═══════════════════════════════════════════════════════════
        // PUPIL PARTICLES - Central cluster
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

            idx++
        }

        // ═══════════════════════════════════════════════════════════
        // LID PARTICLES - Arc above the eye
        // ═══════════════════════════════════════════════════════════
        for (let p = 0; p < this.lidParticleCount; p++) {
            const t = p / (this.lidParticleCount - 1)
            const angle = Math.PI * 0.3 + t * Math.PI * 0.4  // Arc from 54° to 126°

            const lidRadius = this.eyeRadius + 0.03
            const localX = Math.cos(angle) * lidRadius
            const localY = this.eyeRadius + 0.08  // Above the eye (will slide down)

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

            idx++
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
        this.geometry.setAttribute('aBasePos', new THREE.BufferAttribute(this.basePositions, 3))
        this.geometry.setAttribute('aType', new THREE.BufferAttribute(this.types, 1))
        this.geometry.setAttribute('aRingIndex', new THREE.BufferAttribute(this.ringIndex, 1))
        this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(this.seeds, 1))
    }

    /**
     * Project 2D eye-local coordinates onto sphere surface at north pole
     * The eye is positioned at the "front" of the sphere (facing camera at z=5)
     * @param {number} x - local X (-0.3 to 0.3)
     * @param {number} y - local Y (-0.3 to 0.3)
     * @returns {THREE.Vector3} position on sphere
     */
    _projectToSpherePole(x, y) {
        const r = this.sphereRadius

        // Eye is at the front of sphere (facing camera)
        // Camera is at z=5, so "front" of sphere is at z=+radius
        // We place the eye in the XY plane at z=radius, with slight forward offset

        // Create a point on the sphere surface
        // Start from (x, y, 0) on a local plane, then project onto sphere at front
        const point = new THREE.Vector3(x, y, r)

        // Normalize to place on sphere surface (at radius distance from center)
        point.normalize().multiplyScalar(r)

        // Add tiny offset outward to prevent z-fighting with main particles
        const outwardOffset = 0.02
        point.multiplyScalar(1 + outwardOffset / r)

        return point
    }

    _createMaterial() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uSize: { value: 8.0 },
                uIrisColor: { value: this.irisColor },
                uPupilColor: { value: this.pupilColor },
                uLidColor: { value: this.lidColor },
                uGazeOffset: { value: new THREE.Vector2(0, 0) },
                uPupilDilation: { value: 0 },
                uBlinkProgress: { value: 0 },
                uTension: { value: 0 }
            },
            vertexShader: `
        attribute float aType;
        attribute float aRingIndex;
        attribute float aSeed;
        attribute vec3 aBasePos;
        
        uniform float uTime;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform vec2 uGazeOffset;
        uniform float uPupilDilation;
        uniform float uBlinkProgress;
        uniform float uTension;
        
        varying float vType;
        varying float vRingIndex;
        varying float vSeed;
        varying float vBlinkCover;
        
        void main() {
          vType = aType;
          vRingIndex = aRingIndex;
          vSeed = aSeed;
          vBlinkCover = 0.0;
          
          vec3 pos = position;
          vec3 basePos = aBasePos;
          
          // Get eye center (approximation: average of base positions)
          vec3 eyeCenter = vec3(0.0, 0.0, 1.5);  // North pole
          
          // ═══════════════════════════════════════════════════════════
          // GAZE: Shift iris and pupil based on cursor direction
          // ═══════════════════════════════════════════════════════════
          if (aType < 1.5) {  // Iris or pupil
            // Convert gaze offset to 3D displacement on sphere surface
            float maxGazeShift = 0.08;
            vec3 gazeShift = vec3(
              uGazeOffset.x * maxGazeShift,
              uGazeOffset.y * maxGazeShift,
              0.0
            );
            
            // Pupil moves more than iris (parallax effect)
            float gazeMultiplier = aType < 0.5 ? 1.0 : 1.5;
            pos += gazeShift * gazeMultiplier;
          }
          
          // ═══════════════════════════════════════════════════════════
          // PUPIL DILATION: Scale pupil particles outward
          // ═══════════════════════════════════════════════════════════
          if (aType > 0.5 && aType < 1.5) {  // Pupil
            vec3 fromCenter = pos - eyeCenter;
            float dilationScale = 1.0 + uPupilDilation * 0.8;  // Up to 1.8x size
            pos = eyeCenter + fromCenter * dilationScale;
          }
          
          // ═══════════════════════════════════════════════════════════
          // BLINK: Move lid particles down to cover eye
          // ═══════════════════════════════════════════════════════════
          if (aType > 1.5) {  // Lid
            // Lid slides down from above eye to cover it
            float lidTravel = 0.35;  // How far lid moves
            vec3 downDir = normalize(vec3(0.0, -1.0, 0.0));
            
            // Smooth easing for natural blink
            float blinkEased = uBlinkProgress * uBlinkProgress * (3.0 - 2.0 * uBlinkProgress);
            pos += downDir * blinkEased * lidTravel;
          }
          
          // Check if this particle is covered by blink
          // Iris/pupil particles fade when lid passes over them
          if (aType < 1.5) {
            float particleY = pos.y - eyeCenter.y;
            float lidY = 0.0 - uBlinkProgress * 0.35;
            vBlinkCover = smoothstep(lidY + 0.05, lidY - 0.02, particleY);
          }
          
          // ═══════════════════════════════════════════════════════════
          // MICRO-TREMOR: Subtle random movement (more when tense)
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
          
          // Pupil particles slightly larger
          if (aType > 0.5 && aType < 1.5) {
            baseSize *= 1.3;
          }
          
          // Lid particles
          if (aType > 1.5) {
            baseSize *= 1.1;
          }
          
          gl_PointSize = baseSize;
        }
      `,
            fragmentShader: `
        uniform vec3 uIrisColor;
        uniform vec3 uPupilColor;
        uniform vec3 uLidColor;
        uniform float uTime;
        uniform float uTension;
        
        varying float vType;
        varying float vRingIndex;
        varying float vSeed;
        varying float vBlinkCover;
        
        void main() {
          // Circular particle
          vec2 center = gl_PointCoord - 0.5;
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Soft edge
          float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
          
          vec3 color;
          
          // ═══════════════════════════════════════════════════════════
          // IRIS: Gradient from pupil edge to outer ring
          // ═══════════════════════════════════════════════════════════
          if (vType < 0.5) {
            // Inner rings darker, outer rings lighter
            float brightness = 0.7 + vRingIndex * 0.4;
            color = uIrisColor * brightness;
            
            // Subtle shimmer
            float shimmer = sin(uTime * 2.0 + vSeed * 20.0) * 0.1 + 0.9;
            color *= shimmer;
            
            // Tension: iris gets warmer/more intense
            color = mix(color, color * vec3(1.2, 0.9, 0.8), uTension * 0.3);
          }
          
          // ═══════════════════════════════════════════════════════════
          // PUPIL: Deep black core
          // ═══════════════════════════════════════════════════════════
          else if (vType < 1.5) {
            color = uPupilColor;
            // Slight purple tint at edges
            color = mix(color, vec3(0.1, 0.05, 0.15), dist * 0.5);
          }
          
          // ═══════════════════════════════════════════════════════════
          // LID: Skin-colored particles
          // ═══════════════════════════════════════════════════════════
          else {
            color = uLidColor;
            // Subtle variation
            color *= 0.9 + vSeed * 0.2;
          }
          
          // Blink coverage: fade out particles as lid passes
          if (vType < 1.5) {
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
     * Set target gaze direction (will smooth to this)
     * @param {THREE.Vector3} cursorWorldPos - cursor position in world space
     */
    lookAt(cursorWorldPos) {
        // Get eye center in world space
        const eyeCenter = new THREE.Vector3(0, 0, this.sphereRadius)
        eyeCenter.applyEuler(this.sphereRotation)

        // Direction from eye to cursor
        const toCursor = cursorWorldPos.clone().sub(eyeCenter).normalize()

        // Project to 2D gaze (eye-local space)
        // We want x = left/right, y = up/down relative to eye facing direction
        this.targetGaze.x = THREE.MathUtils.clamp(toCursor.x * 2, -1, 1)
        this.targetGaze.y = THREE.MathUtils.clamp(toCursor.y * 2, -1, 1)
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
     * Set pupil dilation (tension response)
     * @param {number} amount - 0 (normal) to 1 (fully dilated)
     */
    setDilation(amount) {
        this.pupilDilation = THREE.MathUtils.clamp(amount, 0, 1)
    }

    /**
     * Set tension level (affects micro-tremor and colors)
     * @param {number} tension - 0-1
     */
    setTension(tension) {
        this.tension = THREE.MathUtils.clamp(tension, 0, 1)
        this.material.uniforms.uTension.value = this.tension
    }

    /**
     * Set sleeping state (eyes close slowly)
     * @param {boolean} sleeping
     */
    setSleeping(sleeping) {
        this.isSleeping = sleeping
    }

    /**
     * Sync with sphere's rotation
     * @param {THREE.Euler} rotation
     */
    setSphereRotation(rotation) {
        this.sphereRotation.copy(rotation)
        this.mesh.rotation.copy(rotation)
    }

    /**
     * Update eye animation
     * @param {number} delta - time delta
     * @param {number} elapsed - total elapsed time
     */
    update(delta, elapsed) {
        this.material.uniforms.uTime.value = elapsed

        // ═══════════════════════════════════════════════════════════
        // GAZE SMOOTHING
        // ═══════════════════════════════════════════════════════════
        const gazeSpeed = 5.0 - this.tension * 2.0  // Slower when tense
        this.gazeOffset.x = THREE.MathUtils.lerp(this.gazeOffset.x, this.targetGaze.x, delta * gazeSpeed)
        this.gazeOffset.y = THREE.MathUtils.lerp(this.gazeOffset.y, this.targetGaze.y, delta * gazeSpeed)
        this.material.uniforms.uGazeOffset.value.copy(this.gazeOffset)

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
        // BLINKING
        // ═══════════════════════════════════════════════════════════
        if (this.isBlinking) {
            this.blinkTimer += delta
            const blinkDuration = 0.15  // 150ms for full close/open cycle

            if (this.blinkTimer < blinkDuration) {
                // Closing
                this.blinkProgress = this.blinkTimer / blinkDuration
            } else if (this.blinkTimer < blinkDuration * 2) {
                // Opening
                this.blinkProgress = 1 - (this.blinkTimer - blinkDuration) / blinkDuration
            } else {
                // Done
                this.isBlinking = false
                this.blinkProgress = 0
                this.nextBlinkTime = 3 + Math.random() * 4
            }
        } else if (!this.isSleeping) {
            // Random blink timer
            this.nextBlinkTime -= delta
            if (this.nextBlinkTime <= 0) {
                this.blink()
            }
        }

        // Sleeping: keep eyes closed
        if (this.isSleeping) {
            this.blinkProgress = THREE.MathUtils.lerp(this.blinkProgress, 1, delta * 2)
        }

        this.material.uniforms.uBlinkProgress.value = this.blinkProgress
    }

    /**
     * Get the mesh to add to scene
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
