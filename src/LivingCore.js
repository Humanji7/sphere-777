import * as THREE from 'three'

/**
 * LivingCore - Three concentric glow layers creating the sphere's "inner organs"
 * 
 * Architecture:
 * ┌─────────────────────────────────────────┐
 * │           Particles (surface)           │  r=1.5
 * │   ┌─────────────────────────────────┐   │
 * │   │      OuterGlow (r=1.15)         │   │  0.25 Hz
 * │   │   ┌─────────────────────────┐   │   │
 * │   │   │    PulseLayer (r=0.85)  │   │   │  0.6 Hz (heartbeat)
 * │   │   │   ┌─────────────────┐   │   │   │
 * │   │   │   │ InnerCore (r=0.5)│   │   │   │  0.08 Hz (slow)
 * │   │   │   └─────────────────┘   │   │   │
 * │   │   └─────────────────────────┘   │   │
 * │   └─────────────────────────────────┘   │
 * └─────────────────────────────────────────┘
 */

// Simplex 3D noise GLSL (inline for shaders)
const SIMPLEX_NOISE_GLSL = /* glsl */`
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
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
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
`

// Vertex shader for all layers
const vertexShader = /* glsl */`
${SIMPLEX_NOISE_GLSL}

uniform float uTime;
uniform float uPhase;
uniform float uNoiseScale;
uniform float uNoiseSpeed;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
    vNormal = normal;
    vPosition = position;
    
    // 3D noise deformation
    vec3 noisePos = position * uNoiseScale + uTime * uNoiseSpeed;
    float noise = snoise(noisePos);
    
    // Pulse displacement
    float pulse = sin(uPhase * 6.28318) * 0.5 + 0.5;
    float displacement = noise * 0.08 + pulse * 0.05;
    vDisplacement = displacement;
    
    vec3 displaced = position + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
}
`

// Fragment shader (with vein support for outer layer)
const fragmentShader = /* glsl */`
${SIMPLEX_NOISE_GLSL}

uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uPhase;
uniform float uTime;
uniform vec3 uTouchPos;
uniform float uTouchIntensity;
uniform float uVeinIntensity;

varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

void main() {
    float glow = sin(uPhase * 6.28318) * 0.3 + 0.7;
    
    // Edge fade
    float edgeFade = 1.0 - pow(abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 0.5);
    
    // Displacement brightness
    float dispBright = 1.0 + vDisplacement * 2.0;
    
    // Touch glow
    float touchDist = distance(vPosition, uTouchPos);
    float touchGlow = (1.0 - smoothstep(0.0, 1.5, touchDist)) * uTouchIntensity;
    
    // Organic veins via noise (only outer layer uses this)
    float veins = 0.0;
    if (uVeinIntensity > 0.0) {
        float veinNoise = snoise(vPosition * 8.0 + uTime * 0.1);
        veins = smoothstep(0.6, 0.8, abs(veinNoise)) * uVeinIntensity;
    }
    
    vec3 color = uBaseColor * glow * dispBright * uIntensity;
    color += vec3(1.0, 0.9, 0.7) * touchGlow * 0.5;
    color += vec3(1.0, 0.8, 0.6) * veins;
    
    float alpha = (glow * 0.4 + touchGlow * 0.3 + veins * 0.2) * edgeFade;
    alpha = clamp(alpha, 0.0, 0.8);
    
    gl_FragColor = vec4(color, alpha);
}
`

export class LivingCore {
    constructor(baseRadius = 1.5) {
        this.baseRadius = baseRadius
        this.group = new THREE.Group()

        // Layer configs: radius relative to baseRadius, frequency, color, intensity
        this.layers = {
            inner: {
                r: 0.50,
                baseFreq: 0.08,
                freq: 0.08,
                phase: 0,
                color: new THREE.Color(0x4466AA),
                intensity: 0.7,
                noiseScale: 2.0,
                noiseSpeed: 0.3
            },
            pulse: {
                r: 0.85,
                baseFreq: 0.60,
                freq: 0.60,
                phase: 0,
                color: new THREE.Color(0xFF6644),
                intensity: 0.5,
                noiseScale: 3.0,
                noiseSpeed: 0.5
            },
            outer: {
                r: 1.15,
                baseFreq: 0.25,
                freq: 0.25,
                phase: 0,
                color: new THREE.Color(0x88AAFF),
                intensity: 0.4,
                breathSync: 0.3,
                noiseScale: 1.5,
                noiseSpeed: 0.2,
                veinIntensity: 0.3
            }
        }

        // Phase-based intensity modifiers
        this.phaseModifiers = {
            peace: { inner: 1.0, pulse: 0.8, outer: 1.0 },
            alert: { inner: 1.2, pulse: 1.2, outer: 0.9 },
            trust: { inner: 1.5, pulse: 0.6, outer: 1.2 },
            bleeding: { inner: 0.7, pulse: 1.8, outer: 0.5 }
        }

        this._createLayers()
    }

    _createLayers() {
        for (const [name, cfg] of Object.entries(this.layers)) {
            const geometry = new THREE.SphereGeometry(
                this.baseRadius * cfg.r,
                32,
                32
            )

            const material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: {
                    uTime: { value: 0 },
                    uPhase: { value: 0 },
                    uNoiseScale: { value: cfg.noiseScale },
                    uNoiseSpeed: { value: cfg.noiseSpeed },
                    uBaseColor: { value: cfg.color },
                    uIntensity: { value: cfg.intensity },
                    uTouchPos: { value: new THREE.Vector3() },
                    uTouchIntensity: { value: 0 },
                    uVeinIntensity: { value: cfg.veinIntensity || 0 }
                },
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                transparent: true,
                depthWrite: false
            })

            const mesh = new THREE.Mesh(geometry, material)
            mesh.name = name
            this.group.add(mesh)
        }
    }

    getMesh() {
        return this.group
    }

    /**
     * Main update loop
     * @param {number} delta - Frame delta time
     * @param {number} elapsed - Total elapsed time
     * @param {string} phase - Current emotional phase (peace, alert, trust, bleeding)
     * @param {number} breathPhase - Current breath phase (0-1)
     * @param {Object|null} touchInfo - { position: Vector3, intensity: number } or null
     * @param {THREE.Euler} particleMeshRotation - Rotation from particle mesh to sync
     */
    update(delta, elapsed, phase, breathPhase, touchInfo, particleMeshRotation) {
        // Sync rotation with particle mesh
        if (particleMeshRotation) {
            this.group.rotation.copy(particleMeshRotation)
        }

        const phaseMod = this.phaseModifiers[phase] || this.phaseModifiers.peace

        for (const mesh of this.group.children) {
            const cfg = this.layers[mesh.name]
            const u = mesh.material.uniforms

            // Auto-restore rhythms: lerp back to baseFreq
            const targetFreq = mesh.name === 'pulse' && phase === 'bleeding'
                ? 1.2
                : cfg.baseFreq
            cfg.freq = THREE.MathUtils.lerp(cfg.freq, targetFreq, delta * 2.0)

            // Advance phase
            cfg.phase += delta * cfg.freq

            // Outer layer syncs with breathing
            if (mesh.name === 'outer' && cfg.breathSync) {
                cfg.phase += breathPhase * cfg.breathSync * delta
            }

            // Update uniforms
            u.uTime.value = elapsed
            u.uPhase.value = cfg.phase
            u.uIntensity.value = cfg.intensity * (phaseMod[mesh.name] || 1.0)

            // Touch glow
            if (touchInfo) {
                u.uTouchPos.value.copy(touchInfo.position)
                u.uTouchIntensity.value = touchInfo.intensity
            } else {
                u.uTouchIntensity.value = THREE.MathUtils.lerp(
                    u.uTouchIntensity.value,
                    0,
                    delta * 3.0
                )
            }
        }
    }

    /**
     * Called when bleeding starts - speeds up pulse layer
     */
    onBleeding() {
        this.layers.pulse.freq = 1.2  // Will auto-restore via lerp
    }

    /**
     * Called during osmosis hold - synchronizes all layers
     * @param {number} depth - Osmosis depth (0-1)
     */
    onOsmosis(depth) {
        const sync = depth * 0.3
        const targetPhase = this.layers.inner.phase

        for (const layer of Object.values(this.layers)) {
            layer.phase = THREE.MathUtils.lerp(layer.phase, targetPhase, sync)
        }
    }

    dispose() {
        for (const mesh of this.group.children) {
            mesh.geometry.dispose()
            mesh.material.dispose()
        }
    }
}
