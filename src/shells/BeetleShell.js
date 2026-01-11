/**
 * BeetleShell.js — Хитиновый Панцирь Жука (State A)
 * 
 * Визуал: Сегментированная оболочка. Хитиновая текстура. 
 * Матовый органически-неприятный блеск с bio-luminescent швами.
 * 
 * Eerie-элемент: "Частицы были личинками?.. 
 * Или частицы — это была маскировка?"
 * 
 * Now supports GLB model loading with procedural fallback.
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { BaseShell } from './BaseShell.js'

// Singleton loader for efficiency
let gltfLoader = null

export class BeetleShell extends BaseShell {
    constructor(scene) {
        super(scene)

        this.config = {
            holdDuration: 15.0,      // Hold visible for 15 seconds before auto-return
            eerieIntensity: 1.2,
            // Beetle-specific
            segmentCount: 8,         // Horizontal segments
            chitinColor: 0x1a1a0f,   // Dark olive-brown
            highlightColor: 0x3d3d2b, // Lighter chitin sheen
            seamGlowColor: 0x2a4a3a, // Sickly green seams
            pulseSpeed: 0.3,         // Slow disturbing pulse
            seamGlow: 0.5,           // Glow intensity in seams
            modelPath: '/assets/models/beetle_shell_optimized.glb',
            targetSize: 3.0          // Target diameter in world units
        }

        this.modelLoaded = false
        this.loadingPromise = null

        // Cursor-guided rotation state with smooth transitions (like Sphere)
        this._cursorInfluence = 0           // Target influence (0 or 1)
        this._cursorInfluenceSmoothed = 0   // Smoothed value for transitions
        this._lastTargetPoint = null        // Last known cursor position (persists after cursor leaves)
        this.rotationSpeed = 3.0            // Slerp speed for smooth rotation
        this._targetQuat = new THREE.Quaternion()
        this._currentQuat = new THREE.Quaternion()

        // Initialize with procedural geometry (fallback)
        this._createProceduralGeometry()
        this._createMaterial()
        this._createMesh()
    }

    /**
     * Preload the GLB model. Call this early (e.g., in main.js init).
     * Returns a promise that resolves when loading is complete.
     */
    async preload() {
        if (this.loadingPromise) return this.loadingPromise

        this.loadingPromise = this._loadModel()
        return this.loadingPromise
    }

    async _loadModel() {
        if (!gltfLoader) {
            gltfLoader = new GLTFLoader()
        }

        return new Promise((resolve) => {
            gltfLoader.load(
                this.config.modelPath,
                (gltf) => {
                    console.log('[BeetleShell] GLB model loaded successfully')
                    this._processLoadedModel(gltf)
                    this.modelLoaded = true
                    resolve(true)
                },
                (progress) => {
                    // Loading progress
                    if (progress.total > 0) {
                        const percent = (progress.loaded / progress.total * 100).toFixed(0)
                        console.log(`[BeetleShell] Loading: ${percent}%`)
                    }
                },
                (error) => {
                    console.warn('[BeetleShell] GLB load failed, using procedural fallback:', error.message)
                    this.modelLoaded = false
                    resolve(false)
                }
            )
        })
    }

    _processLoadedModel(gltf) {
        // Find the mesh in the loaded scene
        let loadedMesh = null
        gltf.scene.traverse((child) => {
            if (child.isMesh && !loadedMesh) {
                loadedMesh = child
            }
        })

        if (!loadedMesh) {
            console.warn('[BeetleShell] No mesh found in GLB, using procedural')
            return
        }

        // Get geometry from loaded mesh
        const loadedGeometry = loadedMesh.geometry.clone()

        // Calculate bounding sphere to normalize size
        loadedGeometry.computeBoundingSphere()
        const currentRadius = loadedGeometry.boundingSphere.radius
        const targetRadius = this.config.targetSize / 2
        const scale = targetRadius / currentRadius

        // Scale geometry to target size
        loadedGeometry.scale(scale, scale, scale)

        // Center geometry
        loadedGeometry.computeBoundingBox()
        const center = new THREE.Vector3()
        loadedGeometry.boundingBox.getCenter(center)
        loadedGeometry.translate(-center.x, -center.y, -center.z)

        // Check for vertex colors (for seam detection)
        const hasVertexColors = loadedGeometry.attributes.color !== undefined
        console.log(`[BeetleShell] Vertex colors: ${hasVertexColors ? 'YES' : 'NO'}`)

        // Add segment attribute based on vertex colors or position
        this._addSegmentAttribute(loadedGeometry, hasVertexColors)

        // Replace geometry
        if (this.geometry) {
            this.geometry.dispose()
        }
        this.geometry = loadedGeometry

        // Update mesh with new geometry
        if (this.mesh) {
            this.mesh.geometry = this.geometry
        }

        console.log(`[BeetleShell] Model processed: ${loadedGeometry.attributes.position.count} vertices`)
    }

    _addSegmentAttribute(geometry, hasVertexColors) {
        const positions = geometry.attributes.position
        const colors = geometry.attributes.color
        const segments = new Float32Array(positions.count)

        for (let i = 0; i < positions.count; i++) {
            if (hasVertexColors && colors) {
                // Use red channel as seam indicator (0 = plate, 1 = seam)
                // Invert: high red = seam = low edge factor
                const r = colors.getX(i)
                segments[i] = r > 0.5 ? 0.0 : 1.0  // Binary seam detection
            } else {
                // Fallback: use vertical position for segments
                const y = positions.getY(i)
                const normalizedY = (y + 1.5) / 3.0
                segments[i] = Math.floor(normalizedY * this.config.segmentCount)
            }
        }

        geometry.setAttribute('aSegment', new THREE.BufferAttribute(segments, 1))
    }

    _createProceduralGeometry() {
        // Icosahedron for organic segmented feel
        const baseGeom = new THREE.IcosahedronGeometry(1.5, 2)
        this.geometry = baseGeom

        // Add segment ID attribute based on vertical position
        const positions = this.geometry.attributes.position
        const segments = new Float32Array(positions.count)

        for (let i = 0; i < positions.count; i++) {
            const y = positions.getY(i)
            // Assign segment based on vertical position (0-7)
            const normalizedY = (y + 1.5) / 3.0  // 0-1
            segments[i] = Math.floor(normalizedY * this.config.segmentCount)
        }

        this.geometry.setAttribute('aSegment', new THREE.BufferAttribute(segments, 1))
    }

    _createMaterial() {
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 },
                uChitinColor: { value: new THREE.Color(this.config.chitinColor) },
                uHighlightColor: { value: new THREE.Color(this.config.highlightColor) },
                uSeamGlowColor: { value: new THREE.Color(this.config.seamGlowColor) },
                uSeamGlow: { value: this.config.seamGlow },
                uPulseSpeed: { value: this.config.pulseSpeed },
                uSegmentCount: { value: this.config.segmentCount },
                uUseVertexColorSeams: { value: 0.0 },
                // Enhanced shader uniforms
                uIridescenceStrength: { value: 0.6 },
                uSubsurfaceColor: { value: new THREE.Color(0x331100) },  // Deep amber SSS
                uOrganicNoiseScale: { value: 3.0 },
                // Cursor interaction uniforms
                uCursorWorldPos: { value: new THREE.Vector3(0, 0, 10) },
                uCursorInfluenceRadius: { value: 1.5 },  // Larger radius for visible effect
                uCursorInfluenceStrength: { value: 0.0 }
            },
            vertexShader: `
        attribute float aSegment;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vSegment;
        varying float vEdgeFactor;
        varying vec3 vViewDir;
        varying float vCursorInfluence;
        
        uniform float uTime;
        uniform float uPulseSpeed;
        uniform float uSegmentCount;
        uniform float uUseVertexColorSeams;
        // Cursor interaction
        uniform vec3 uCursorWorldPos;
        uniform float uCursorInfluenceRadius;
        
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          vSegment = aSegment;
          
          // Calculate edge factor
          if (uUseVertexColorSeams > 0.5) {
            vEdgeFactor = aSegment;
          } else {
            float normalizedY = (position.y + 1.5) / 3.0;
            float segmentPos = fract(normalizedY * uSegmentCount);
            vEdgeFactor = min(segmentPos, 1.0 - segmentPos) * 2.0;
            vEdgeFactor = smoothstep(0.0, 0.15, vEdgeFactor);
          }
          
          // Organic breathing displacement
          float breathe = sin(uTime * uPulseSpeed * 0.5) * 0.01;
          float segmentBreath = sin(uTime * uPulseSpeed + vSegment * 0.3) * 0.008;
          vec3 displaced = position + normal * (breathe + segmentBreath);
          
          // Segment separation at seams
          vec3 dir = normalize(position);
          float separation = (1.0 - vEdgeFactor) * 0.025;
          // Animated seam opening
          separation += (1.0 - vEdgeFactor) * sin(uTime * 0.8) * 0.005;
          displaced += dir * separation;
          
          vWorldPosition = (modelMatrix * vec4(displaced, 1.0)).xyz;
          vViewDir = normalize(cameraPosition - vWorldPosition);
          
          // Calculate cursor influence (0-1, proximity to cursor)
          float cursorDist = distance(vWorldPosition, uCursorWorldPos);
          vCursorInfluence = 1.0 - smoothstep(0.0, uCursorInfluenceRadius, cursorDist);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        }
      `,
            fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uChitinColor;
        uniform vec3 uHighlightColor;
        uniform vec3 uSeamGlowColor;
        uniform float uSeamGlow;
        uniform float uPulseSpeed;
        uniform float uIridescenceStrength;
        uniform vec3 uSubsurfaceColor;
        uniform float uOrganicNoiseScale;
        // Cursor interaction
        uniform float uCursorInfluenceStrength;
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        varying float vSegment;
        varying float vEdgeFactor;
        varying vec3 vViewDir;
        varying float vCursorInfluence;
        
        // 3D Simplex noise for organic patterns
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
          const vec2 C = vec2(1.0/6.0, 1.0/3.0);
          const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
          
          vec3 i = floor(v + dot(v, C.yyy));
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
            i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
            i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
            i.x + vec4(0.0, i1.x, i2.x, 1.0));
            
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
        
        void main() {
          if (uOpacity < 0.01) discard;
          
          // === FRESNEL & IRIDESCENCE ===
          float fresnel = pow(1.0 - max(0.0, dot(vViewDir, vNormal)), 2.5);
          
          // Rainbow iridescence based on view angle (beetle wing effect)
          float iriPhase = dot(vViewDir, vNormal) * 3.14159 + uTime * 0.2;
          vec3 iridescence = vec3(
            sin(iriPhase) * 0.5 + 0.5,
            sin(iriPhase + 2.094) * 0.5 + 0.5,  // 2π/3
            sin(iriPhase + 4.188) * 0.5 + 0.5   // 4π/3
          );
          iridescence = mix(vec3(0.3, 0.4, 0.35), iridescence, uIridescenceStrength);
          
          // === BASE CHITIN COLOR ===
          vec3 baseColor = uChitinColor;
          
          // Organic noise patterns (chitin imperfections)
          float noiseVal = snoise(vPosition * uOrganicNoiseScale + vec3(0.0, 0.0, uTime * 0.05));
          float noiseVal2 = snoise(vPosition * uOrganicNoiseScale * 2.0 - vec3(uTime * 0.03, 0.0, 0.0));
          float organicPattern = noiseVal * 0.3 + noiseVal2 * 0.15;
          
          // Apply organic variation
          baseColor = mix(baseColor, baseColor * 0.7, organicPattern * 0.5 + 0.25);
          
          // Segment color variation
          float segmentShift = sin(vSegment * 1.2 + noiseVal * 2.0) * 0.08;
          baseColor.r += segmentShift;
          baseColor.g -= segmentShift * 0.3;
          baseColor.b += segmentShift * 0.2;
          
          // === IRIDESCENT HIGHLIGHT ===
          vec3 highlightColor = mix(uHighlightColor, iridescence, fresnel);
          baseColor = mix(baseColor, highlightColor, fresnel * 0.7);
          
          // === SUBSURFACE SCATTERING SIMULATION ===
          float sss = pow(max(0.0, dot(-vViewDir, vNormal)), 2.0) * 0.3;
          baseColor = mix(baseColor, uSubsurfaceColor, sss);
          
          // === BIO-LUMINESCENT SEAM GLOW ===
          float seamFactor = 1.0 - vEdgeFactor;
          
          // Animated seam pulse (creepy breathing)
          float seamPulse = sin(uTime * 1.5 + vSegment * 0.5) * 0.3 + 0.7;
          seamPulse *= sin(uTime * 0.3) * 0.2 + 0.8;  // Slower modulation
          
          // Glow intensity with noise
          float seamNoise = snoise(vPosition * 8.0 + vec3(uTime * 0.5, 0.0, 0.0)) * 0.3 + 0.7;
          float edgeGlow = seamFactor * uSeamGlow * seamPulse * seamNoise;
          
          // Seam color (sickly green with occasional flicker)
          vec3 seamColor = uSeamGlowColor;
          float flicker = step(0.98, fract(sin(uTime * 12.0 + vSegment) * 43758.5453));
          seamColor += vec3(0.2, 0.1, 0.0) * flicker;  // Brief amber flash
          
          baseColor = mix(baseColor, seamColor, edgeGlow);
          
          // === CURSOR PROXIMITY GLOW ===
          // Warm amber glow where user hovers — "she responds to touch"
          if (uCursorInfluenceStrength > 0.0 && vCursorInfluence > 0.0) {
            float glowAmount = vCursorInfluence * uCursorInfluenceStrength;
            
            // Warm amber-orange glow (different from sphere's pink-white)
            vec3 cursorGlowColor = vec3(1.0, 0.65, 0.25);
            
            // Add glow to color (boosted additive blend for visibility)
            baseColor += cursorGlowColor * glowAmount * 1.2;
            
            // Also boost seam glow near cursor for extra effect
            baseColor += uSeamGlowColor * glowAmount * 0.5;
          }
          
          // === OVERALL PULSING ===
          float globalPulse = sin(uTime * uPulseSpeed * 0.8) * 0.06 + 0.94;
          baseColor *= globalPulse;
          
          // === CHITIN MICRO-TEXTURE ===
          float microNoise = fract(sin(dot(vPosition.xy * 50.0, vec2(12.9898, 78.233))) * 43758.5453);
          baseColor *= 0.92 + microNoise * 0.08;
          
          // === EDGE DARKENING (organic depth) ===
          float edgeDark = pow(fresnel, 0.5) * 0.15;
          baseColor *= 1.0 - edgeDark;
          
          gl_FragColor = vec4(baseColor, uOpacity);
        }
      `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.NormalBlending
        })
    }

    _createMesh() {
        this.mesh = new THREE.Mesh(this.geometry, this.material)
        this.mesh.renderOrder = 10  // Render on top of particles
    }

    _animate(delta, elapsed) {
        if (this.material && this.material.uniforms) {
            this.material.uniforms.uTime.value = elapsed
            this.material.uniforms.uOpacity.value = this.opacity

            // Update seam mode based on whether model was loaded with vertex colors
            if (this.modelLoaded && this.geometry.attributes.color) {
                this.material.uniforms.uUseVertexColorSeams.value = 1.0
            }
        }

        // Smooth cursor influence transition (like Sphere)
        // Fast fade-in (8.0), slow fade-out (3.0)
        if (this.mesh && this.isVisible) {
            const smoothSpeed = this._cursorInfluence > this._cursorInfluenceSmoothed ? 8.0 : 3.0
            this._cursorInfluenceSmoothed += (this._cursorInfluence - this._cursorInfluenceSmoothed) *
                (1 - Math.exp(-smoothSpeed * delta))

            // Clamp near-zero for clean transition
            if (this._cursorInfluenceSmoothed < 0.001) {
                this._cursorInfluenceSmoothed = 0
            }

            const influence = this._cursorInfluenceSmoothed

            // ═══════════════════════════════════════════════════════════
            // CURSOR-GUIDED ROTATION — blended with influence
            // ═══════════════════════════════════════════════════════════
            if (influence > 0 && this._lastTargetPoint) {
                const meshPos = this.mesh.position
                const toTarget = new THREE.Vector3()
                    .copy(this._lastTargetPoint)
                    .sub(meshPos)
                    .normalize()

                const front = new THREE.Vector3(0, 0, 1)
                this._targetQuat.setFromUnitVectors(front, toTarget)

                // Speed modulated by influence (slows down as cursor fades)
                const effectiveSpeed = this.rotationSpeed * influence

                this._currentQuat.setFromEuler(this.mesh.rotation)
                this._currentQuat.slerp(this._targetQuat, effectiveSpeed * delta)
                this.mesh.rotation.setFromQuaternion(this._currentQuat)

                // Wobble diminishes with influence
                this.mesh.rotation.z += Math.sin(elapsed * 0.15) * 0.015 * influence
            }

            // ═══════════════════════════════════════════════════════════
            // AUTO-ROTATION — blended with (1 - influence)
            // ═══════════════════════════════════════════════════════════
            if (influence < 1) {
                const driftWeight = 1 - influence
                this.mesh.rotation.y += delta * 0.03 * driftWeight
                this.mesh.rotation.z += Math.sin(elapsed * 0.15) * 0.02 * driftWeight
                this.mesh.rotation.x += Math.sin(elapsed * 0.1) * 0.01 * driftWeight
            }
        }
    }

    /**
     * Set target point for cursor-guided rotation
     * BeetleShell will smoothly rotate to face this point
     * @param {THREE.Vector3|null} worldPos - target point in world space, or null to trigger fade-out
     */
    setTargetRotationPoint(worldPos) {
        if (worldPos) {
            if (!this._lastTargetPoint) {
                this._lastTargetPoint = new THREE.Vector3()
            }
            this._lastTargetPoint.copy(worldPos)
            this._cursorInfluence = 1.0  // Target: active
        } else {
            this._cursorInfluence = 0    // Target: fade out
            // Keep _lastTargetPoint — continue slerp toward it during fade
        }
    }

    /**
     * Set cursor position in world space (for proximity glow effect)
     * @param {THREE.Vector3} worldPos - cursor position on shell surface
     */
    setCursorWorldPos(worldPos) {
        if (this.material?.uniforms?.uCursorWorldPos) {
            this.material.uniforms.uCursorWorldPos.value.copy(worldPos)
        }
    }

    /**
     * Set cursor influence strength (glow intensity)
     * @param {number} strength - 0 (off) to 1 (full glow)
     */
    setCursorInfluence(strength) {
        if (this.material?.uniforms?.uCursorInfluenceStrength) {
            this.material.uniforms.uCursorInfluenceStrength.value = Math.max(0, Math.min(1, strength))
        }
    }
}
