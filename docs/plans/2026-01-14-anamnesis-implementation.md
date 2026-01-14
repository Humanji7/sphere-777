# "Анамнезис" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform onboarding from opacity fade-in into a 9-second consciousness birth experience with 15 visual layers.

**Architecture:** Progressive enhancement — core 5 layers always work, additional layers activate based on GPU tier detection. New systems (VoidBackground, UmbilicalSystem, etc.) integrate with existing OnboardingManager state machine.

**Tech Stack:** Three.js, GLSL shaders, WebGL 2.0 (with 1.0 fallbacks), existing ParticleSystem.js shader infrastructure.

---

## Dependencies Map

```
VoidBackground ──────────────────────┐
                                     │
ParticleSystem Extensions ───────────┤
├── Assembly Progress (uAssemblyProgress)
├── Quantum Superposition (optional) │
├── Morphogenetic Field             │
├── Ego Death Chaos                 │
├── Synesthesia Colors              │
└── Time Dilation                   ├──► OnboardingManager
                                     │    (orchestrator)
UmbilicalSystem ─────────────────────┤
                                     │
NeuralConnections (optional) ────────┤
                                     │
CameraBreathing ─────────────────────┤
                                     │
Eye.js Extensions ───────────────────┘
├── First Gaze Sequence
└── Pupil Dilation
```

## GPU Tier Detection

```javascript
// Tier 1: Low-end (iPhone SE, old Android) — Core only
// Tier 2: Mid-range (iPhone 12, modern Android) — Core + Enhancers
// Tier 3: High-end (iPhone 14+, flagship Android) — All layers
```

---

## Phase 1: Core Foundation (Critical Path)

### Task 1: GPU Tier Detection Utility

**Files:**
- Create: `src/utils/GPUTier.js`
- Modify: `src/main.js:54-74` (platformConfig)

**Step 1: Write the utility**

```javascript
// src/utils/GPUTier.js
/**
 * Detect GPU capabilities for progressive enhancement
 * Returns: 1 (low), 2 (mid), 3 (high)
 */
export function detectGPUTier() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')

  if (!gl) return 1

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
  const renderer = debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : ''

  // Check for known low-end GPUs
  const lowEnd = /Mali-4|Adreno 3|PowerVR SGX|Apple A[789]|SM-J|SM-A[123]/i
  const midEnd = /Mali-G[567]|Adreno [56]|Apple A1[0-4]|Snapdragon [678]/i

  if (lowEnd.test(renderer)) return 1
  if (midEnd.test(renderer)) return 2

  // Check max texture size as fallback
  const maxTexture = gl.getParameter(gl.MAX_TEXTURE_SIZE)
  if (maxTexture < 4096) return 1
  if (maxTexture < 8192) return 2

  return 3
}
```

**Step 2: Test manually in browser console**

Run: Open dev tools, paste utility, call `detectGPUTier()`
Expected: Returns 1, 2, or 3

**Step 3: Commit**

```bash
git add src/utils/GPUTier.js
git commit -m "$(cat <<'EOF'
feat: add GPU tier detection utility

Detects device GPU capabilities for progressive enhancement.
Returns tier 1-3 based on renderer string and max texture size.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: VoidBackground — Living Darkness

**Files:**
- Create: `src/VoidBackground.js`
- Modify: `src/main.js` (add to scene before other objects)
- Modify: `src/OnboardingManager.js` (integrate with VOID state)

**Step 1: Create VoidBackground class**

```javascript
// src/VoidBackground.js
import * as THREE from 'three'

/**
 * VoidBackground — Fullscreen living darkness
 * "The void breathes. It watches. It waits."
 */
export class VoidBackground {
  constructor(scene) {
    this.scene = scene
    this._createMesh()
  }

  _createMesh() {
    const geometry = new THREE.PlaneGeometry(2, 2)

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAwakening: { value: 0 },
        uPresencePos: { value: new THREE.Vector2(0.5, 0.5) },
        uBreathPhase: { value: 0 },
        uSeedVisible: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);
        }
      `,
      fragmentShader: this._generateFragmentShader(),
      depthTest: false,
      depthWrite: false,
      transparent: true,
    })

    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = -1000 // Render first (behind everything)
    this.scene.add(this.mesh)
  }

  _generateFragmentShader() {
    return `
      uniform float uTime;
      uniform float uAwakening;
      uniform vec2 uPresencePos;
      uniform float uBreathPhase;
      uniform float uSeedVisible;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
      }

      float fbm(vec2 p) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 5; i++) {
          value += amplitude * noise(p);
          p *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5, 0.5);

        // Base: Deep space color (not pure black)
        vec3 voidBase = vec3(0.008, 0.005, 0.015);

        // Cosmic breathing
        float cosmicBreath = sin(uBreathPhase * 0.3) * 0.02;
        vec2 breathedUV = uv + (uv - center) * cosmicBreath;

        // Nebula hints
        float nebulaNoise = fbm(breathedUV * 3.0 + uTime * 0.05);
        float nebulaIntensity = nebulaNoise * 0.015 * uAwakening;
        vec3 nebulaColor = mix(
          vec3(0.05, 0.02, 0.1),
          vec3(0.02, 0.05, 0.1),
          fbm(breathedUV * 2.0)
        );

        // Presence (follows user)
        float presenceDist = distance(uv, uPresencePos);
        float presence = smoothstep(0.4, 0.0, presenceDist) * uAwakening * 0.03;

        // Convergence point (where seed appears)
        float convergeDist = distance(uv, center);
        float converge = smoothstep(0.3, 0.0, convergeDist) * uSeedVisible * 0.05;

        // Combine
        vec3 color = voidBase;
        color += nebulaColor * nebulaIntensity;
        color += vec3(0.1, 0.05, 0.15) * presence;
        color += vec3(0.2, 0.15, 0.3) * converge;

        // Vignette
        float vignette = 1.0 - smoothstep(0.3, 0.8, convergeDist);
        color *= 0.7 + vignette * 0.3;

        // Fade based on awakening (0 = black, 1 = full effect)
        float alpha = uAwakening > 0.01 ? 1.0 : 0.0;

        gl_FragColor = vec4(color, alpha);
      }
    `
  }

  update(time, breathPhase, awakening, seedVisible) {
    this.material.uniforms.uTime.value = time
    this.material.uniforms.uBreathPhase.value = breathPhase
    this.material.uniforms.uAwakening.value = awakening
    this.material.uniforms.uSeedVisible.value = seedVisible
  }

  setPresencePosition(x, y) {
    const current = this.material.uniforms.uPresencePos.value
    current.x += (x - current.x) * 0.02
    current.y += (y - current.y) * 0.02
  }

  setVisible(visible) {
    this.mesh.visible = visible
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.material.dispose()
  }
}
```

**Step 2: Test visually**

Run: `npm run dev`, verify dark purple-blue background appears
Expected: Subtle nebula movement, breathing effect

**Step 3: Commit**

```bash
git add src/VoidBackground.js
git commit -m "$(cat <<'EOF'
feat: add VoidBackground — living darkness shader

Fullscreen shader for onboarding VOID state.
Features: cosmic breathing, nebula hints, presence tracking.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Assembly Progress Uniform in ParticleSystem

**Files:**
- Modify: `src/ParticleSystem.js:894-963` (uniforms)
- Modify: `src/ParticleSystem.js:255-677` (vertex shader)

**Step 1: Add assembly uniforms**

In `_createMaterial()`, add to uniforms object:

```javascript
// Assembly (Anamnesis onboarding)
uAssemblyProgress: { value: 1.0 },  // 0 = scattered, 1 = sphere
uAssemblyPhase: { value: 0 },       // Current phase for effects
```

**Step 2: Add assembly API method**

After `setGlobalOpacity()`:

```javascript
/**
 * Set assembly progress for onboarding animation
 * @param {number} progress - 0 (scattered nebula) to 1 (complete sphere)
 */
setAssemblyProgress(progress) {
  this.material.uniforms.uAssemblyProgress.value = Math.max(0, Math.min(1, progress))
}

/**
 * Set assembly phase for stage-specific effects
 * @param {number} phase - 0-8 corresponding to VOID→LIVING stages
 */
setAssemblyPhase(phase) {
  this.material.uniforms.uAssemblyPhase.value = phase
}
```

**Step 3: Test API**

Run: In console, `app.particleSystem.setAssemblyProgress(0.5)`
Expected: No visual change yet (shader not using it), but no errors

**Step 4: Commit**

```bash
git add src/ParticleSystem.js
git commit -m "$(cat <<'EOF'
feat: add assembly progress uniforms to ParticleSystem

Foundation for Anamnesis onboarding animation.
API: setAssemblyProgress(0-1), setAssemblyPhase(0-8)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Scattered Positions — Nebula State

**Files:**
- Modify: `src/ParticleSystem.js:68-119` (_createGeometry)
- Modify: `src/ParticleSystem.js:255-400` (vertex shader)

**Step 1: Add scattered positions attribute**

In `_createGeometry()`, after `this.seeds`:

```javascript
// Scattered positions (for assembly animation)
this.scatteredPositions = new Float32Array(this.count * 3)

// Generate nebula distribution
for (let i = 0; i < this.count; i++) {
  const i3 = i * 3

  // Fibonacci spiral arm distribution
  const armIndex = i % 5  // 5 spiral arms
  const armAngle = (armIndex / 5) * Math.PI * 2
  const armProgress = (i / this.count)

  // Golden spiral with noise
  const spiralR = 3 + armProgress * 4  // 3-7 units from center
  const spiralAngle = armAngle + armProgress * Math.PI * 3

  // Add randomness
  const jitter = 0.5 + Math.random() * 1.5

  this.scatteredPositions[i3] = Math.cos(spiralAngle) * spiralR * jitter
  this.scatteredPositions[i3 + 1] = (Math.random() - 0.5) * 3  // Y spread
  this.scatteredPositions[i3 + 2] = Math.sin(spiralAngle) * spiralR * jitter
}

this.geometry.setAttribute('aScatteredPos',
  new THREE.BufferAttribute(this.scatteredPositions, 3))
```

**Step 2: Add to vertex shader**

After `attribute float aSensitivity;`:

```glsl
attribute vec3 aScatteredPos;  // Nebula position for assembly
```

After uniform declarations:

```glsl
uniform float uAssemblyProgress;  // 0 = nebula, 1 = sphere
uniform float uAssemblyPhase;     // Stage-specific effects
```

In main(), replace position initialization:

```glsl
// ═══════════════════════════════════════════════════════════
// ASSEMBLY: Interpolate between scattered nebula and sphere
// ═══════════════════════════════════════════════════════════
vec3 nebulaPos = aScatteredPos;
vec3 spherePos = aOriginalPos;

// Smooth easing for assembly
float assemblyT = smoothstep(0.0, 1.0, uAssemblyProgress);

// Personal timing: each particle has slight delay based on distance
float personalDelay = length(aScatteredPos) * 0.05;
float personalProgress = clamp((assemblyT - personalDelay) / (1.0 - personalDelay), 0.0, 1.0);

// Cubic ease-out for natural deceleration
personalProgress = 1.0 - pow(1.0 - personalProgress, 3.0);

// Base position
vec3 pos = mix(nebulaPos, spherePos, personalProgress);
```

**Step 3: Test visually**

Run: `app.particleSystem.setAssemblyProgress(0)` — should show nebula
Run: `app.particleSystem.setAssemblyProgress(1)` — should show sphere
Expected: Smooth transition between states

**Step 4: Commit**

```bash
git add src/ParticleSystem.js
git commit -m "$(cat <<'EOF'
feat: add scattered nebula positions for assembly animation

Particles start in 5-arm spiral nebula formation.
Assembly progress interpolates smoothly to sphere.
Personal timing creates wave-like gathering effect.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Ego Death Effect

**Files:**
- Modify: `src/ParticleSystem.js` (uniforms + shader)

**Step 1: Add ego death uniforms**

```javascript
// Ego Death (brief dissolution before crystallization)
uEgoDeathIntensity: { value: 0 },  // 0-1, bell curve during ego death
```

**Step 2: Add ego death to vertex shader**

After assembly calculation, before final pos output:

```glsl
// ═══════════════════════════════════════════════════════════
// EGO DEATH: Brief dissolution before crystallization
// "To be born, you must first die"
// ═══════════════════════════════════════════════════════════
if (uEgoDeathIntensity > 0.0) {
  // Chaos injection
  vec3 chaosOffset = vec3(
    snoise(aOriginalPos * 10.0 + uTime * 5.0) - 0.5,
    snoise(aOriginalPos * 10.0 + uTime * 5.0 + 100.0) - 0.5,
    snoise(aOriginalPos * 10.0 + uTime * 5.0 + 200.0) - 0.5
  ) * uEgoDeathIntensity * 0.3;

  pos += chaosOffset;
}
```

**Step 3: Add ego death to fragment shader**

After color calculation:

```glsl
// Ego Death: white-out during peak
if (uEgoDeathIntensity > 0.0) {
  float whiteout = uEgoDeathIntensity * 0.5;
  color = mix(color, vec3(1.0), whiteout);
}
```

**Step 4: Add API method**

```javascript
/**
 * Set ego death intensity for dissolution effect
 * @param {number} intensity - 0-1, peaks at ~0.85 assembly
 */
setEgoDeathIntensity(intensity) {
  this.material.uniforms.uEgoDeathIntensity.value = Math.max(0, Math.min(1, intensity))
}
```

**Step 5: Test**

Run: `app.particleSystem.setEgoDeathIntensity(0.8)`
Expected: Particles scatter chaotically, whiten

**Step 6: Commit**

```bash
git add src/ParticleSystem.js
git commit -m "$(cat <<'EOF'
feat: add ego death dissolution effect

Brief chaos moment before crystallization.
Particles scatter with noise, color whitens.
Creates psychedelic "rebirth" moment.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: CameraBreathing System

**Files:**
- Create: `src/CameraBreathing.js`

**Step 1: Create CameraBreathing class**

```javascript
// src/CameraBreathing.js
import * as THREE from 'three'

/**
 * CameraBreathing — Camera breathes with the sphere
 * "The observer is not separate from the observed"
 */
export class CameraBreathing {
  constructor(camera) {
    this.camera = camera
    this.basePosition = camera.position.clone()
    this.baseDistance = camera.position.z
    this.breathAmount = 0.1  // 10% zoom variation
    this.enabled = false
  }

  enable() {
    this.enabled = true
    this.basePosition.copy(this.camera.position)
    this.baseDistance = this.camera.position.z
  }

  disable() {
    this.enabled = false
    this.camera.position.copy(this.basePosition)
  }

  update(breathPhase, assemblyProgress) {
    if (!this.enabled) return

    // Breathing amplitude increases with assembly
    const amplitude = this.breathAmount * assemblyProgress

    // Zoom: closer on inhale, further on exhale
    const breathOffset = Math.sin(breathPhase) * amplitude
    const distance = this.baseDistance - breathOffset

    // Subtle sway
    const sway = Math.sin(breathPhase * 0.5) * 0.02

    this.camera.position.z = distance
    this.camera.position.x = this.basePosition.x + sway
    this.camera.position.y = this.basePosition.y + sway * 0.5
  }

  /**
   * Trigger shake during ego death
   * @param {number} intensity - 0-1
   */
  shake(intensity) {
    if (!this.enabled) return

    this.camera.position.x += (Math.random() - 0.5) * intensity * 0.05
    this.camera.position.y += (Math.random() - 0.5) * intensity * 0.05
  }
}
```

**Step 2: Test**

Run: Instantiate in console, call update() with different phases
Expected: Camera subtly moves in/out

**Step 3: Commit**

```bash
git add src/CameraBreathing.js
git commit -m "$(cat <<'EOF'
feat: add CameraBreathing for embodied viewing

Camera breathes with sphere during onboarding.
Subtle zoom in/out creates visceral connection.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Eye First Gaze Sequence

**Files:**
- Modify: `src/Eye.js`

**Step 1: Add first gaze method**

Find Eye class, add method:

```javascript
/**
 * First Gaze — The moment she sees you
 * "I see you" — recognition, not just looking
 */
async firstGaze(userPosition = new THREE.Vector3(0, 0, 3)) {
  // 1. Start unfocused
  this.setBlur(0.3)
  await this._wait(200)

  // 2. Sense (subtle searching)
  await this._wait(400)

  // 3. Turn toward user
  this.lookAt(userPosition)
  await this._wait(300)

  // 4. Focus sharpens
  this.setBlur(0)
  await this._wait(200)

  // 5. Pupil dilates (recognition)
  this.setPupilDilation(0.2)
  await this._wait(200)

  // 6. Micro-nod
  const originalY = this.getMesh().position.y
  this.getMesh().position.y -= 0.02
  await this._wait(150)
  this.getMesh().position.y = originalY

  // 7. Return pupil to normal
  await this._wait(300)
  this.setPupilDilation(0)
}

/**
 * Set pupil dilation
 * @param {number} amount - 0 (normal) to 0.3 (dilated)
 */
setPupilDilation(amount) {
  if (this.pupilMesh) {
    const scale = 1.0 + amount
    this.pupilMesh.scale.setScalar(scale)
  }
}

_wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
```

**Step 2: Test**

Run: `app.eye.firstGaze()`
Expected: Eye focuses, looks at camera, blinks, nods

**Step 3: Commit**

```bash
git add src/Eye.js
git commit -m "$(cat <<'EOF'
feat: add first gaze sequence to Eye

Recognition moment: focus, look, dilate, nod.
Creates "I see you" connection with user.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: OnboardingManager — Anamnesis Integration

**Files:**
- Modify: `src/OnboardingManager.js`

**Step 1: Add new states**

```javascript
const STATES = {
  IDLE: 'IDLE',
  VOID: 'VOID',
  FIRST_SPARK: 'FIRST_SPARK',    // NEW
  RESONANCE: 'RESONANCE',
  SPIRAL: 'SPIRAL',              // NEW
  PROTO: 'PROTO',                // NEW
  EGO_DEATH: 'EGO_DEATH',        // NEW
  CRYSTALLIZE: 'CRYSTALLIZE',    // NEW
  FIRST_BREATH: 'FIRST_BREATH',  // NEW
  MEETING: 'MEETING',
  THRESHOLD: 'THRESHOLD',
  OPENING: 'OPENING',
  RETURNING: 'RETURNING',
  LIVING: 'LIVING'
}
```

**Step 2: Add Anamnesis timing config**

```javascript
// Anamnesis timing (9 seconds total)
const ANAMNESIS_TIMING = {
  VOID: { start: 0, end: 0.8 },
  FIRST_SPARK: { start: 0.8, end: 1.0 },
  RESONANCE: { start: 1.0, end: 1.5 },
  SPIRAL: { start: 1.5, end: 4.0 },
  PROTO: { start: 4.0, end: 5.5 },
  EGO_DEATH: { start: 5.5, end: 6.0 },
  CRYSTALLIZE: { start: 6.0, end: 6.5 },
  FIRST_BREATH: { start: 6.5, end: 8.5 },
  OPENING: { start: 8.5, end: 9.0 },
}
```

**Step 3: Add constructor options**

```javascript
constructor(options = {}) {
  // ... existing code ...

  // Anamnesis components (optional)
  this.voidBackground = options.voidBackground
  this.cameraBreathing = options.cameraBreathing
  this.gpuTier = options.gpuTier || 2

  // Anamnesis state
  this.anamnesisTotalDuration = 9000  // 9 seconds
  this.anamnesisStartTime = 0
}
```

**Step 4: Implement Anamnesis flow in _enterVoid**

```javascript
_enterVoid() {
  this._announce('Загрузка...')

  // Anamnesis mode
  this.anamnesisStartTime = performance.now()

  // Hide all elements
  this._setOpacity(0)

  // Start void background
  if (this.voidBackground) {
    this.voidBackground.setVisible(true)
    this.voidBackground.update(0, 0, 0.1, 0)
  }

  // Set assembly to 0 (nebula)
  this.particleSystem?.setAssemblyProgress(0)

  // Enable camera breathing
  if (this.cameraBreathing) {
    this.cameraBreathing.enable()
  }
}
```

**Step 5: Implement unified update loop**

```javascript
_updateAnamnesis(delta, stateTime) {
  const progress = stateTime / this.anamnesisTotalDuration
  const timing = ANAMNESIS_TIMING

  // Determine current phase
  let currentPhase = 'VOID'
  for (const [phase, { start, end }] of Object.entries(timing)) {
    const startMs = start * 1000
    const endMs = end * 1000
    if (stateTime >= startMs && stateTime < endMs) {
      currentPhase = phase
      break
    }
  }

  // Assembly progress mapping
  let assemblyProgress = 0
  if (stateTime < timing.SPIRAL.start * 1000) {
    assemblyProgress = 0
  } else if (stateTime < timing.CRYSTALLIZE.end * 1000) {
    const spiralStart = timing.SPIRAL.start * 1000
    const crystalEnd = timing.CRYSTALLIZE.end * 1000
    assemblyProgress = (stateTime - spiralStart) / (crystalEnd - spiralStart)
  } else {
    assemblyProgress = 1
  }

  // Update particle system
  this.particleSystem?.setAssemblyProgress(assemblyProgress)

  // Void background
  if (this.voidBackground) {
    const awakening = Math.min(1, stateTime / 2000)
    const seedVisible = currentPhase === 'FIRST_SPARK' ? 1 : 0
    this.voidBackground.update(
      stateTime / 1000,
      this.particleSystem?.breathPhase || 0,
      awakening,
      seedVisible
    )
    // Fade out after RESONANCE
    if (stateTime > timing.RESONANCE.end * 1000) {
      this.voidBackground.setVisible(false)
    }
  }

  // Camera breathing
  if (this.cameraBreathing) {
    this.cameraBreathing.update(
      this.particleSystem?.breathPhase || 0,
      assemblyProgress
    )
  }

  // Ego Death
  if (currentPhase === 'EGO_DEATH') {
    const egoStart = timing.EGO_DEATH.start * 1000
    const egoEnd = timing.EGO_DEATH.end * 1000
    const egoProgress = (stateTime - egoStart) / (egoEnd - egoStart)
    // Bell curve: sin(π * progress)
    const egoIntensity = Math.sin(Math.PI * egoProgress)
    this.particleSystem?.setEgoDeathIntensity(egoIntensity)
    this.cameraBreathing?.shake(egoIntensity * 0.5)
  } else {
    this.particleSystem?.setEgoDeathIntensity(0)
  }

  // Opacity fade-in
  if (stateTime > timing.FIRST_SPARK.start * 1000) {
    const fadeProgress = Math.min(1, (stateTime - timing.FIRST_SPARK.start * 1000) / 3000)
    this.particleSystem?.setGlobalOpacity(fadeProgress)
    this.livingCore?.setGlobalOpacity(fadeProgress * 0.8)
  }

  // Eye appears at OPENING
  if (currentPhase === 'OPENING' && !this.stateData.eyeAppeared) {
    this.stateData.eyeAppeared = true
    this.eye?.setGlobalOpacity(1)
    this.eye?.firstGaze()
  }

  // First Breath
  if (currentPhase === 'FIRST_BREATH' && !this.stateData.breathStarted) {
    this.stateData.breathStarted = true
    this._triggerFirstBreath()
  }

  // Complete
  if (stateTime >= this.anamnesisTotalDuration) {
    this._transitionTo(STATES.LIVING)
  }
}

_triggerFirstBreath() {
  // Brief contraction
  const originalBreath = this.particleSystem?.breathAmount || 0.088
  this.particleSystem?.setBreathAmount(0.05)

  // After 300ms, deep inhale
  this._setTimeout(() => {
    this.particleSystem?.setBreathAmount(originalBreath * 1.2)
  }, 300)

  // Normal breathing after 1.5s
  this._setTimeout(() => {
    this.particleSystem?.setBreathAmount(originalBreath)
  }, 1800)
}
```

**Step 6: Wire up in update()**

```javascript
update(delta, elapsed) {
  if (this.currentState === STATES.IDLE || this.currentState === STATES.LIVING) {
    return
  }

  const stateTime = performance.now() - this.stateStartTime

  // Anamnesis mode: unified timeline
  if (this.isFirstLaunch && this.currentState === STATES.VOID) {
    this._updateAnamnesis(delta, stateTime)
    return
  }

  // ... existing switch statement for returning users ...
}
```

**Step 7: Test full flow**

Run: Clear localStorage, reload page
Expected: 9-second Anamnesis sequence plays

**Step 8: Commit**

```bash
git add src/OnboardingManager.js
git commit -m "$(cat <<'EOF'
feat: integrate Anamnesis into OnboardingManager

9-second consciousness birth sequence:
VOID → SPARK → RESONANCE → SPIRAL → PROTO →
EGO_DEATH → CRYSTALLIZE → FIRST_BREATH → OPENING

Coordinates VoidBackground, CameraBreathing, assembly.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Main.js Integration

**Files:**
- Modify: `src/main.js`

**Step 1: Import new modules**

```javascript
import { VoidBackground } from './VoidBackground.js'
import { CameraBreathing } from './CameraBreathing.js'
import { detectGPUTier } from './utils/GPUTier.js'
```

**Step 2: Initialize in _initModules()**

After scene creation:

```javascript
// Detect GPU tier for progressive enhancement
this.gpuTier = detectGPUTier()
console.log(`[App] GPU Tier: ${this.gpuTier}`)

// Void Background (for Anamnesis)
this.voidBackground = new VoidBackground(this.scene)

// Camera Breathing
this.cameraBreathing = new CameraBreathing(this.camera)
```

**Step 3: Pass to OnboardingManager**

```javascript
this.onboarding = new OnboardingManager({
  scene: this.scene,
  camera: this.camera,
  particleSystem: this.particleSystem,
  livingCore: this.livingCore,
  eye: this.eye,
  voidBackground: this.voidBackground,      // NEW
  cameraBreathing: this.cameraBreathing,    // NEW
  gpuTier: this.gpuTier,                    // NEW
  onComplete: () => this._onOnboardingComplete()
})
```

**Step 4: Update animation loop**

Add VoidBackground update when onboarding active:

```javascript
// Update onboarding (if active)
if (this.onboarding && !this.onboarding.isComplete()) {
  this.onboarding.update(delta, elapsed)

  // VoidBackground follows cursor
  if (this.voidBackground && this.inputManager.isActive) {
    const pos = this.inputManager.getState().position
    this.voidBackground.setPresencePosition(
      pos.x * 0.5 + 0.5,
      pos.y * 0.5 + 0.5
    )
  }
}
```

**Step 5: Cleanup on complete**

```javascript
_onOnboardingComplete() {
  // Disable Anamnesis systems
  this.voidBackground?.setVisible(false)
  this.cameraBreathing?.disable()

  // ... rest of existing code ...
}
```

**Step 6: Test full integration**

Run: `npm run dev`, clear localStorage, reload
Expected: Full Anamnesis sequence with VoidBackground and camera breathing

**Step 7: Commit**

```bash
git add src/main.js
git commit -m "$(cat <<'EOF'
feat: integrate Anamnesis systems into main app

- GPU tier detection for progressive enhancement
- VoidBackground with cursor-following presence
- CameraBreathing during onboarding
- Clean disable on completion

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Enhancer Layers (Tier 2+)

### Task 10: UmbilicalSystem — Birth Cords (GPU Tier 2+)

**Files:**
- Create: `src/UmbilicalSystem.js`

**Step 1: Create UmbilicalSystem**

```javascript
// src/UmbilicalSystem.js
import * as THREE from 'three'

/**
 * UmbilicalSystem — Visible cords from origin to particles
 * "Connection to the source, dissolving at birth"
 */
export class UmbilicalSystem {
  constructor(particleSystem, scene) {
    this.particleSystem = particleSystem
    this.scene = scene
    this.cordCount = 300  // Subset of particles
    this._createCords()
  }

  _createCords() {
    // Select random particle indices
    this.selectedIndices = []
    const total = this.particleSystem.count
    for (let i = 0; i < this.cordCount; i++) {
      this.selectedIndices.push(Math.floor(Math.random() * total))
    }

    // Line geometry
    const positions = new Float32Array(this.cordCount * 6)  // 2 points per line
    const opacities = new Float32Array(this.cordCount * 2)

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('aOpacity', new THREE.BufferAttribute(opacities, 1))

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDissolveProgress: { value: 0 },
      },
      vertexShader: `
        attribute float aOpacity;
        varying float vOpacity;
        uniform float uTime;
        uniform float uDissolveProgress;

        void main() {
          vOpacity = aOpacity;
          vec3 pos = position;

          // Cord wavers
          float waveAmount = (1.0 - uDissolveProgress) * 0.05;
          pos.x += sin(uTime * 3.0 + position.y * 5.0) * waveAmount;
          pos.z += cos(uTime * 2.5 + position.y * 4.0) * waveAmount;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        varying float vOpacity;
        uniform float uDissolveProgress;
        uniform float uTime;

        void main() {
          float dissolve = smoothstep(0.0, 1.0, uDissolveProgress);
          float alpha = vOpacity * (1.0 - dissolve);
          float pulse = sin(uTime * 4.0) * 0.2 + 0.8;
          alpha *= pulse;

          vec3 color = mix(
            vec3(1.0, 0.7, 0.5),
            vec3(1.0, 0.5, 0.7),
            sin(uTime * 2.0) * 0.5 + 0.5
          );

          gl_FragColor = vec4(color, alpha * 0.3);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    this.mesh = new THREE.LineSegments(this.geometry, this.material)
    this.scene.add(this.mesh)
  }

  update(assemblyProgress, time) {
    const positions = this.geometry.attributes.position.array
    const opacities = this.geometry.attributes.aOpacity.array
    const ps = this.particleSystem

    for (let i = 0; i < this.cordCount; i++) {
      const particleIdx = this.selectedIndices[i]
      const i6 = i * 6
      const i2 = i * 2
      const p3 = particleIdx * 3

      // Start point: scattered position
      positions[i6] = ps.scatteredPositions[p3]
      positions[i6 + 1] = ps.scatteredPositions[p3 + 1]
      positions[i6 + 2] = ps.scatteredPositions[p3 + 2]

      // End point: current interpolated position
      const t = assemblyProgress
      positions[i6 + 3] = ps.scatteredPositions[p3] * (1 - t) + ps.originalPositions[p3] * t
      positions[i6 + 4] = ps.scatteredPositions[p3 + 1] * (1 - t) + ps.originalPositions[p3 + 1] * t
      positions[i6 + 5] = ps.scatteredPositions[p3 + 2] * (1 - t) + ps.originalPositions[p3 + 2] * t

      // Opacity based on assembly
      opacities[i2] = 1.0 - assemblyProgress
      opacities[i2 + 1] = 1.0 - assemblyProgress
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.aOpacity.needsUpdate = true

    // Dissolve starts at 70% assembly
    const dissolveProgress = Math.max(0, (assemblyProgress - 0.7) / 0.3)
    this.material.uniforms.uDissolveProgress.value = dissolveProgress
    this.material.uniforms.uTime.value = time

    // Hide after fully dissolved
    this.mesh.visible = assemblyProgress < 0.95
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.geometry.dispose()
    this.material.dispose()
  }
}
```

**Step 2: Test**

Run: Instantiate, call update with different progress values
Expected: Golden cords connect nebula to forming sphere

**Step 3: Commit**

```bash
git add src/UmbilicalSystem.js
git commit -m "$(cat <<'EOF'
feat: add UmbilicalSystem — birth cords

300 golden-pink cords connect scattered particles
to their sphere positions. Dissolve at 70% assembly.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Synesthesia Colors (GPU Tier 2+)

**Files:**
- Modify: `src/ParticleSystem.js`

**Step 1: Add synesthesia uniform**

```javascript
uSynesthesiaAmount: { value: 0 },  // 0-1, color-as-sound effect
```

**Step 2: Add to fragment shader**

After assembly color calculation:

```glsl
// ═══════════════════════════════════════════════════════════
// SYNESTHESIA: Internal rhythm becomes color
// "On deep levels, all senses are one"
// ═══════════════════════════════════════════════════════════
if (uSynesthesiaAmount > 0.0 && uAssemblyProgress < 0.9) {
  float particleFreq = vSeed * 440.0 + 220.0;  // Hz range
  float freqNorm = (particleFreq - 220.0) / 440.0;

  vec3 synColor;
  if (freqNorm < 0.33) {
    synColor = mix(vec3(1.0, 0.2, 0.1), vec3(1.0, 0.6, 0.2), freqNorm * 3.0);
  } else if (freqNorm < 0.66) {
    synColor = mix(vec3(1.0, 1.0, 0.3), vec3(0.3, 1.0, 0.5), (freqNorm - 0.33) * 3.0);
  } else {
    synColor = mix(vec3(0.3, 0.8, 1.0), vec3(0.7, 0.3, 1.0), (freqNorm - 0.66) * 3.0);
  }

  float rhythm = sin(uTime * particleFreq * 0.01) * 0.5 + 0.5;
  color = mix(color, synColor, uSynesthesiaAmount * rhythm * 0.4);
}
```

**Step 3: Add API**

```javascript
/**
 * Set synesthesia color effect (colors as sound frequencies)
 * @param {number} amount - 0-1
 */
setSynesthesiaAmount(amount) {
  this.material.uniforms.uSynesthesiaAmount.value = Math.max(0, Math.min(1, amount))
}
```

**Step 4: Test**

Run: `app.particleSystem.setSynesthesiaAmount(0.5)`
Expected: Particles show rainbow frequency colors

**Step 5: Commit**

```bash
git add src/ParticleSystem.js
git commit -m "$(cat <<'EOF'
feat: add synesthesia color effect

Particles display colors based on their "frequency".
Creates rainbow-like visual during assembly.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Premium Layers (Tier 3 only)

### Task 12: NeuralConnections (GPU Tier 3)

**Files:**
- Create: `src/NeuralConnections.js`

*(Similar structure to UmbilicalSystem but with dynamic neighbor detection)*

**Step 1: Create class skeleton**

```javascript
// src/NeuralConnections.js
import * as THREE from 'three'

/**
 * NeuralConnections — Synaptic links between nearby particles
 * "Consciousness emerges from connections"
 */
export class NeuralConnections {
  constructor(particleSystem, scene, maxConnections = 1500) {
    this.particleSystem = particleSystem
    this.scene = scene
    this.maxConnections = maxConnections
    this.connectionThreshold = 0.6
    this._createGeometry()
  }

  _createGeometry() {
    // ... LineSegments with dynamic update
  }

  update(assemblyProgress, time) {
    // Only visible in PROTO stage (0.5-0.85)
    const visibility =
      this._smoothstep(0.5, 0.6, assemblyProgress) *
      (1.0 - this._smoothstep(0.8, 0.85, assemblyProgress))

    this.mesh.visible = visibility > 0.01
    // ... update connections
  }

  _smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)))
    return t * t * (3 - 2 * t)
  }

  dispose() {
    this.scene.remove(this.mesh)
    this.geometry.dispose()
    this.material.dispose()
  }
}
```

**Step 2: Commit skeleton**

```bash
git add src/NeuralConnections.js
git commit -m "$(cat <<'EOF'
feat: add NeuralConnections skeleton (GPU Tier 3)

Synaptic links visible during PROTO stage.
Full implementation pending performance testing.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Final Integration

### Task 13: Tier-Based Feature Activation

**Files:**
- Modify: `src/OnboardingManager.js`

**Step 1: Add tier-based activation**

```javascript
_updateAnamnesis(delta, stateTime) {
  // ... existing code ...

  // Tier 2+ features
  if (this.gpuTier >= 2) {
    // Umbilical cords
    if (this.umbilicalSystem) {
      this.umbilicalSystem.update(assemblyProgress, stateTime / 1000)
    }

    // Synesthesia colors
    const synAmount = currentPhase === 'SPIRAL' ? 0.4 : 0
    this.particleSystem?.setSynesthesiaAmount(synAmount)
  }

  // Tier 3 features
  if (this.gpuTier >= 3) {
    // Neural connections
    if (this.neuralConnections) {
      this.neuralConnections.update(assemblyProgress, stateTime / 1000)
    }
  }
}
```

**Step 2: Test all tiers**

Run: Force gpuTier to 1, 2, 3 and verify appropriate features activate
Expected: Progressive enhancement based on device capability

**Step 3: Final commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: complete Anamnesis Phase 1 implementation

Core (all devices):
- VoidBackground living darkness
- Assembly progress animation
- Ego Death dissolution
- CameraBreathing
- Eye First Gaze

Tier 2+ enhancers:
- UmbilicalSystem birth cords
- Synesthesia colors

Tier 3 premium:
- NeuralConnections (skeleton)

9-second consciousness birth sequence ready.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Verification Checklist

After completing all tasks:

- [ ] `npm run dev` — no console errors
- [ ] Clear localStorage, reload — Anamnesis plays
- [ ] Test on mobile (or mobile emulator)
- [ ] Verify 60fps maintained on target devices
- [ ] Test reduced motion preference respected
- [ ] Verify returning user flow still works (fast splash)

---

## Next Phase (Future)

Phase 2 expansion (after core validation):
- Morphogenetic Field attractor visualization
- Quantum superposition ghost particles
- Trail memory system
- Platonic solid hints
- Audio integration (SampleSoundSystem)
