# Режиссура частиц v4: "Анамнезис"

> **Анамнезис** (греч.) — воспоминание души о том, что она знала до рождения.
> Частицы не "собираются" — они **вспоминают**, что всегда были одним.

---

## Философское основание

### Маппинг на состояния сознания

| Стадия | Сознание | Визуал | Философия |
|--------|----------|--------|-----------|
| **VOID** | Пре-сознание | Бесконечная темнота, точки потенциала | "До начала — бесконечная возможность" |
| **ПЕРВАЯ ИСКРА** | Момент "Я есть" | Одна точка пульсирует | "Сознание замечает себя" |
| **РЕЗОНАНС** | Мысли ищут форму | Волны когерентности | "Хаос начинает слышать ритм" |
| **СПИРАЛЬ** | Память пробуждается | Fibonacci-потоки | "Душа вспоминает sacred geometry" |
| **ПРОТО-СФЕРА** | Границы эго | Форма проявляется | "Я отделяюсь от не-Я" |
| **EGO DEATH** | Растворение | Форма распадается на миг | "Отпускание перед рождением" |
| **КРИСТАЛЛИЗАЦИЯ** | Воплощение | Частицы защёлкиваются | "Рождение в тело" |
| **ПЕРВЫЙ ВДОХ** | Присутствие | Дыхание начинается | "Я здесь. Я живая." |

---

## Архитектура: 15 слоёв реальности

### Принцип: "Всё дышит, всё фрактально, всё едино, всё помнит"

```
КОСМО-уровень: Вселенная как контейнер (Void shader)
МАКРО-уровень: Общая форма туманности → сферы
МЕЗО-уровень:  Потоки частиц (spiral arms)
МИКРО-уровень: Каждая частица — своя вселенная
НАНО-уровень:  Структура внутри частицы
КВАНТ-уровень: Суперпозиция, неопределённость
```

---

## Слой 0: VOID SHADER — Живая Бесконечность

**Отдельный fullscreen quad** перед всем. Темнота не пустая — она **беременна** возможностью.

### VoidBackground.js

```javascript
export class VoidBackground {
  constructor(scene) {
    this.geometry = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAwakening: { value: 0 },        // 0-1, как сильно "проснулась" темнота
        uPresencePos: { value: new THREE.Vector2(0.5, 0.5) },  // Где "presence"
        uBreathPhase: { value: 0 },
        uSeedVisible: { value: 0 },       // Когда первая искра появляется
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);  // Behind everything
        }
      `,
      fragmentShader: this._generateFragmentShader(),
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
  }

  _generateFragmentShader() {
    return `
      uniform float uTime;
      uniform float uAwakening;
      uniform vec2 uPresencePos;
      uniform float uBreathPhase;
      uniform float uSeedVisible;

      varying vec2 vUv;

      // ═══════════════════════════════════════════════════════════
      // FRACTAL BROWNIAN MOTION (для органического noise)
      // ═══════════════════════════════════════════════════════════
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
        float frequency = 1.0;

        for (int i = 0; i < 6; i++) {
          value += amplitude * noise(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }

      // ═══════════════════════════════════════════════════════════
      // VOID SHADER MAIN
      // ═══════════════════════════════════════════════════════════
      void main() {
        vec2 uv = vUv;
        vec2 center = vec2(0.5, 0.5);

        // === BASE: Deep space color ===
        // Not pure black — subtle purple-blue depth
        vec3 voidBase = vec3(0.008, 0.005, 0.015);

        // === COSMIC BREATHING ===
        // The void itself breathes — subtle expansion/contraction
        float cosmicBreath = sin(uBreathPhase * 0.3) * 0.02;
        vec2 breathOffset = (uv - center) * cosmicBreath;
        vec2 breathedUV = uv + breathOffset;

        // === NEBULA HINTS ===
        // Faint clouds of potential — not visible, felt
        float nebulaNoise = fbm(breathedUV * 3.0 + uTime * 0.05);
        nebulaNoise += fbm(breathedUV * 7.0 - uTime * 0.03) * 0.5;
        float nebulaIntensity = nebulaNoise * 0.015 * uAwakening;

        vec3 nebulaColor = mix(
          vec3(0.05, 0.02, 0.1),   // Deep purple
          vec3(0.02, 0.05, 0.1),   // Deep blue
          fbm(breathedUV * 2.0 + uTime * 0.02)
        );

        // === PRESENCE ===
        // Something is here, watching from the dark
        // Moves slowly, follows mouse/touch
        float presenceDist = distance(uv, uPresencePos);
        float presence = smoothstep(0.4, 0.0, presenceDist) * uAwakening * 0.03;

        // Presence "breathes" independently
        float presenceBreath = sin(uTime * 0.7 + presenceDist * 5.0) * 0.5 + 0.5;
        presence *= 0.7 + presenceBreath * 0.3;

        // === EYES IN THE DARK ===
        // Momentary bright spots — "something looks back"
        // Appears randomly, fades quickly
        float eyeNoise = noise(uv * 20.0 + uTime * 0.5);
        float eyeThreshold = 0.97 - uAwakening * 0.02;  // More eyes as awakening increases
        float eyes = smoothstep(eyeThreshold, 1.0, eyeNoise) * uAwakening;

        // Eyes "blink" — appear and disappear
        float eyeBlink = sin(uTime * 3.0 + eyeNoise * 10.0) * 0.5 + 0.5;
        eyes *= eyeBlink * 0.1;

        // === DEPTH LAYERS ===
        // Multiple layers of darkness at different depths
        float layer1 = fbm(breathedUV * 1.5 + vec2(uTime * 0.02, 0.0));
        float layer2 = fbm(breathedUV * 4.0 - vec2(0.0, uTime * 0.03));
        float layer3 = fbm(breathedUV * 8.0 + vec2(uTime * 0.01, uTime * 0.02));

        float depthPattern = layer1 * 0.5 + layer2 * 0.3 + layer3 * 0.2;
        float depth = depthPattern * 0.02 * uAwakening;

        // === QUANTUM FOAM ===
        // At smallest scale, reality flickers
        float quantumNoise = noise(uv * 100.0 + uTime * 2.0);
        float quantum = (quantumNoise - 0.5) * 0.005 * uAwakening;

        // === CONVERGENCE POINT ===
        // Where the seed will appear — subtle attractor
        float convergeDist = distance(uv, center);
        float converge = smoothstep(0.3, 0.0, convergeDist) * uSeedVisible * 0.05;

        // Convergence has spiral hint
        float angle = atan(uv.y - 0.5, uv.x - 0.5);
        float spiralHint = sin(angle * 5.0 + convergeDist * 20.0 - uTime * 2.0);
        converge *= 0.8 + spiralHint * 0.2;

        // === COMBINE ===
        vec3 color = voidBase;
        color += nebulaColor * nebulaIntensity;
        color += vec3(0.1, 0.05, 0.15) * presence;
        color += vec3(0.8, 0.7, 0.9) * eyes;
        color += vec3(0.02, 0.01, 0.03) * depth;
        color += vec3(quantum);
        color += vec3(0.2, 0.15, 0.3) * converge;

        // === VIGNETTE ===
        // Darker at edges — focus on center
        float vignette = 1.0 - smoothstep(0.3, 0.8, convergeDist);
        color *= 0.7 + vignette * 0.3;

        gl_FragColor = vec4(color, 1.0);
      }
    `;
  }

  update(time, breathPhase, awakening, seedVisible) {
    this.material.uniforms.uTime.value = time;
    this.material.uniforms.uBreathPhase.value = breathPhase;
    this.material.uniforms.uAwakening.value = awakening;
    this.material.uniforms.uSeedVisible.value = seedVisible;
  }

  setPresencePosition(x, y) {
    // Follows user's gaze/touch with lag
    const current = this.material.uniforms.uPresencePos.value;
    current.x += (x - current.x) * 0.02;
    current.y += (y - current.y) * 0.02;
  }
}
```

**Эффект:** Пользователь смотрит в бездну. Бездна смотрит в ответ.

---

## Слой 1: Морфогенетическое поле — Аттрактор

В центре пространства — невидимый **аттрактор**. Частицы чувствуют его до того, как начинают двигаться.

```glsl
// В vertex shader — morphogenetic field influence
uniform vec3 uAttractorPos;      // Центр притяжения
uniform float uAttractorStrength; // Растёт с progress

// Field emanates in waves
float attractorDist = distance(assembledPos, uAttractorPos);
float fieldWave = sin(attractorDist * 5.0 - uTime * 2.0) * 0.5 + 0.5;
float fieldStrength = uAttractorStrength * fieldWave;

// Particles feel the pull even before moving
vec3 toAttractor = normalize(uAttractorPos - assembledPos);
float pullAmount = fieldStrength * 0.1 / (1.0 + attractorDist);

// During early stages, pull creates subtle drift toward center
if (uAssemblyProgress < 0.3) {
  assembledPos += toAttractor * pullAmount * (0.3 - uAssemblyProgress);
}
```

**Визуализация поля:**

```glsl
// Fragment shader — visible field lines (optional layer)
// Faint concentric rings emanating from center
float fieldRings = sin(attractorDist * 15.0 - uTime * 3.0);
fieldRings = smoothstep(0.8, 1.0, fieldRings) * 0.1;
color += vec3(0.1, 0.05, 0.2) * fieldRings * (1.0 - uAssemblyProgress);
```

**Философия:** Форма существует в потенциале до проявления — морфогенетическое поле Шелдрейка.

---

## Слой 2: Квантовая суперпозиция — Неопределённость

До кристаллизации частицы **не имеют определённой позиции**. Они существуют в нескольких местах одновременно.

```glsl
// Quantum superposition — particle exists in multiple positions
uniform float uQuantumCoherence;  // 0 = superposition, 1 = collapsed

// Number of "ghost" positions
const int SUPERPOSITION_COUNT = 3;

// Calculate probability cloud positions
vec3 superPositions[SUPERPOSITION_COUNT];
float probabilities[SUPERPOSITION_COUNT];

for (int i = 0; i < SUPERPOSITION_COUNT; i++) {
  float phase = float(i) / float(SUPERPOSITION_COUNT) * 6.28318;
  float offset = sin(uTime * 2.0 + aSeed * 10.0 + phase) * 0.3;

  // Each ghost position is offset from main trajectory
  vec3 ghostOffset = vec3(
    sin(phase) * offset,
    cos(phase) * offset,
    sin(phase * 2.0) * offset * 0.5
  );

  superPositions[i] = assembledPos + ghostOffset * (1.0 - uQuantumCoherence);

  // Probability distribution — main position more likely
  probabilities[i] = i == 0 ? 0.6 : 0.2;
}

// As coherence increases, positions converge
// Visual: multiple faint copies of each particle
```

**Fragment shader — ghost rendering:**

```glsl
// Render particle with quantum ghosts
varying float vQuantumCoherence;
varying vec3 vGhostOffset1;
varying vec3 vGhostOffset2;

// Main particle
float mainAlpha = alpha * (0.5 + vQuantumCoherence * 0.5);

// Ghost particles (faint copies)
float ghostAlpha = alpha * (1.0 - vQuantumCoherence) * 0.3;

// Ghosts have slightly different color (interference pattern)
vec3 ghostColor = color + vec3(0.1, -0.05, 0.1) * (1.0 - vQuantumCoherence);
```

**Философия:** До наблюдения (воплощения) — все возможности существуют одновременно.

---

## Слой 3: Пуповина — Umbilical Cords

Каждая частица **связана с источником**. Видимые нити растягиваются и растворяются.

```javascript
// UmbilicalSystem.js — visible cords from origin to particle
export class UmbilicalSystem {
  constructor(particleSystem) {
    this.particleSystem = particleSystem;
    this.cordCount = 500;  // Not all particles, select subset

    // Line geometry for cords
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.cordCount * 6);  // 2 points per line
    this.opacities = new Float32Array(this.cordCount * 2);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uAssemblyProgress: { value: 0 },
        uTime: { value: 0 },
        uDissolveProgress: { value: 0 },  // When cords dissolve
      },
      vertexShader: `
        attribute float aOpacity;
        varying float vOpacity;
        varying float vProgress;

        uniform float uTime;
        uniform float uDissolveProgress;

        void main() {
          vOpacity = aOpacity;

          // Cord wavers
          vec3 pos = position;
          float waveAmount = (1.0 - uDissolveProgress) * 0.1;
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
          // Dissolve from ends
          float dissolve = smoothstep(0.0, 1.0, uDissolveProgress);
          float alpha = vOpacity * (1.0 - dissolve);

          // Pulsing glow
          float pulse = sin(uTime * 4.0) * 0.2 + 0.8;
          alpha *= pulse;

          // Color: life force (golden-pink)
          vec3 color = mix(
            vec3(1.0, 0.7, 0.5),  // Warm gold
            vec3(1.0, 0.5, 0.7),  // Pink
            sin(uTime * 2.0) * 0.5 + 0.5
          );

          gl_FragColor = vec4(color, alpha * 0.4);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.LineSegments(this.geometry, this.material);
  }

  update(assemblyProgress, time) {
    // Update cord endpoints
    // Start: particle's scattered position (origin)
    // End: particle's current position

    // Dissolve starts at 70% assembly
    const dissolveProgress = Math.max(0, (assemblyProgress - 0.7) / 0.3);
    this.material.uniforms.uDissolveProgress.value = dissolveProgress;
    this.material.uniforms.uTime.value = time;

    // Hide after fully dissolved
    this.mesh.visible = assemblyProgress < 0.95;
  }
}
```

**Философия:** Рождение = отделение от источника. Пуповина — связь с infinite potential.

---

## Слой 4: Память траектории — Trail Memory

Частицы **помнят свой путь**. Видимые следы показывают journey.

```glsl
// Vertex shader — output position history
varying vec3 vPrevPos1;
varying vec3 vPrevPos2;
varying vec3 vPrevPos3;

// Calculate previous positions based on earlier progress values
float prevProgress1 = max(0.0, personalProgress - 0.05);
float prevProgress2 = max(0.0, personalProgress - 0.10);
float prevProgress3 = max(0.0, personalProgress - 0.15);

vPrevPos1 = calculatePosition(prevProgress1);  // Helper function
vPrevPos2 = calculatePosition(prevProgress2);
vPrevPos3 = calculatePosition(prevProgress3);
```

```glsl
// Fragment shader — render trail
// Draw line from current to previous positions
// Trail fades with distance

// Trail color shifts through spectrum (memory of journey)
vec3 trailColor1 = getConsciousnessColor(personalProgress - 0.05, seed);
vec3 trailColor2 = getConsciousnessColor(personalProgress - 0.10, seed);
vec3 trailColor3 = getConsciousnessColor(personalProgress - 0.15, seed);

// Trail opacity decreases
float trailAlpha1 = 0.3 * (1.0 - personalProgress);
float trailAlpha2 = 0.2 * (1.0 - personalProgress);
float trailAlpha3 = 0.1 * (1.0 - personalProgress);
```

**Альтернатива — GPU Trail System:**

```javascript
// TrailSystem.js — separate geometry for trails
// Uses transform feedback or instance rendering
// Each particle has N trail segments that update each frame
```

**Философия:** Мы — сумма нашего пути. Каждый момент оставляет след.

---

## Слой 5: Резонанс между частицами — Harmonic Coupling

Частицы, которые "в гармонии", **светятся вместе**.

```glsl
// Harmonic resonance — particles with similar seeds resonate
uniform float uResonanceStrength;

// Calculate resonance with "neighbors" in seed-space
float myFrequency = aSeed * 100.0;
float resonance = 0.0;

// Simulated neighbor frequencies (через noise, т.к. нет доступа к другим частицам)
for (int i = 0; i < 5; i++) {
  float neighborSeed = noise(vec2(aSeed * 10.0, float(i)));
  float neighborFreq = neighborSeed * 100.0;

  // Resonance when frequencies are harmonic (ratios like 1:2, 2:3, etc.)
  float ratio = myFrequency / neighborFreq;
  float harmonicDist = min(
    abs(ratio - 1.0),
    min(abs(ratio - 2.0), abs(ratio - 0.5))
  );

  resonance += smoothstep(0.1, 0.0, harmonicDist);
}

resonance = resonance / 5.0 * uResonanceStrength;

// Resonating particles glow brighter and pulse together
float resonancePulse = sin(uTime * myFrequency * 0.1) * resonance;
alpha += resonancePulse * 0.3;
color += vec3(0.2, 0.1, 0.3) * resonancePulse;
```

**Философия:** Вселенная — симфония резонирующих частот.

---

## Слой 6: Ego Death — Момент растворения

Перед финальной кристаллизацией — **краткий момент хаоса**. Форма распадается, чтобы переродиться.

```glsl
// Ego death — brief dissolution before crystallization
uniform float uEgoDeathProgress;  // 0-1, peaks at ~0.85 assembly

// During ego death, particles scatter slightly
float egoDeathIntensity = sin(uEgoDeathProgress * 3.14159);  // Bell curve

// Chaos injection
vec3 chaosOffset = vec3(
  noise(aOriginalPos * 10.0 + uTime * 5.0) - 0.5,
  noise(aOriginalPos * 10.0 + uTime * 5.0 + 100.0) - 0.5,
  noise(aOriginalPos * 10.0 + uTime * 5.0 + 200.0) - 0.5
) * egoDeathIntensity * 0.3;

assembledPos += chaosOffset;

// Color: white-out during peak (overwhelm)
float whiteout = egoDeathIntensity * 0.5;
color = mix(color, vec3(1.0), whiteout);

// Size: particles expand during ego death
gl_PointSize *= 1.0 + egoDeathIntensity * 0.5;
```

**Визуально:**
```
[0.80] Форма почти готова
[0.83] Начало распада — частицы дрожат
[0.85] Пик ego death — всё белеет, форма теряется
[0.87] Возврат — частицы стремительно собираются
[0.90] Кристаллизация — чётче, чем до ego death
```

**Философия:** Чтобы родиться, нужно умереть. Ego death психоделического опыта.

---

## Слой 7: Синестезия — Цвет как звук

Внутренний ритм частиц **визуализируется как цвет**. Каждая частица "поёт".

```glsl
// Synesthesia — internal rhythm becomes color
float particleFrequency = aSeed * 440.0 + 220.0;  // Hz range (A3-A4)
float particlePhase = uTime * particleFrequency * 0.01;

// Different frequencies = different colors
// Low freq = red, mid = green, high = blue (like spectrum)
float freqNormalized = (particleFrequency - 220.0) / 440.0;  // 0-1

vec3 synesthesiaColor;
if (freqNormalized < 0.33) {
  // Low = red-orange
  synesthesiaColor = mix(vec3(1.0, 0.2, 0.1), vec3(1.0, 0.6, 0.2), freqNormalized * 3.0);
} else if (freqNormalized < 0.66) {
  // Mid = yellow-green
  synesthesiaColor = mix(vec3(1.0, 1.0, 0.3), vec3(0.3, 1.0, 0.5), (freqNormalized - 0.33) * 3.0);
} else {
  // High = cyan-violet
  synesthesiaColor = mix(vec3(0.3, 0.8, 1.0), vec3(0.7, 0.3, 1.0), (freqNormalized - 0.66) * 3.0);
}

// Rhythm creates pulsing
float rhythmPulse = sin(particlePhase) * 0.5 + 0.5;

// During assembly, synesthesia color bleeds through
float synesthesiaAmount = (1.0 - personalProgress) * 0.4;
color = mix(color, synesthesiaColor, synesthesiaAmount * rhythmPulse);
```

**Философия:** На глубоких уровнях сознания — все чувства едины.

---

## Слой 8: Фрактальная само-подобие

Туманность в целом **выглядит как одна частица**. Частица внутри **выглядит как туманность**.

### Макро → Микро подобие

```javascript
// При создании scattered positions — форма напоминает увеличенную частицу
// Nebula shape = particle shape * 1000

// Particle has internal structure that mirrors nebula
// Inner rings = spiral arms
// Inner core = attractor point
// Inner glow = overall nebula glow
```

### Fragment shader — recursive detail

```glsl
// Particle internal structure mirrors macro structure
vec2 particleUV = gl_PointCoord - 0.5;
float particleDist = length(particleUV);

// Micro-nebula inside particle
float microNebula = fbm(particleUV * 10.0 + uTime * 0.5);

// Micro-spiral arms (same count as macro: 5)
float microAngle = atan(particleUV.y, particleUV.x);
float microArms = sin(microAngle * 5.0 + particleDist * 20.0 - uTime);
microArms *= smoothstep(0.5, 0.2, particleDist);

// Micro-core (like macro attractor)
float microCore = smoothstep(0.15, 0.0, particleDist);

// Combine into fractal pattern
float fractalPattern = microNebula * 0.3 + microArms * 0.3 + microCore * 0.4;
fractalPattern *= (1.0 - uAssemblyProgress) * 0.5;  // Visible during assembly

color += vec3(0.1, 0.05, 0.15) * fractalPattern;
alpha += fractalPattern * 0.3;
```

**Философия:** "As above, so below" — герметический принцип.

---

## Слой 9: Временная дилатация

Разные частицы переживают **разное время**. Некоторые в slow-motion, другие — ускорены.

```glsl
// Time dilation — particles experience different time flows
float particleTimeScale = 0.5 + aSeed * 1.0;  // 0.5x to 1.5x

// Distance from center affects time (gravitational time dilation)
float centerDist = length(assembledPos);
float gravityTimeDilation = 1.0 / (1.0 + centerDist * 0.1);

float effectiveTime = uTime * particleTimeScale * gravityTimeDilation;

// Use effectiveTime instead of uTime for all particle-local calculations
float personalBreath = sin(effectiveTime * 2.0);
float personalPulse = sin(effectiveTime * 8.0);

// Visual: some particles seem to "lag" while others rush ahead
// Creates organic, non-uniform motion
```

**Философия:** Время субъективно. На границе рождения — время течёт иначе.

---

## Слой 10: Дыхание камеры

Камера **дышит вместе со сферой**. Subtle zoom in/out.

```javascript
// CameraBreathing.js
export class CameraBreathing {
  constructor(camera) {
    this.camera = camera;
    this.baseDistance = 5;
    this.breathAmount = 0.1;  // 10% zoom variation
    this.basePosition = camera.position.clone();
  }

  update(breathPhase, assemblyProgress) {
    // Breathing amplitude increases with assembly
    const amplitude = this.breathAmount * assemblyProgress;

    // Zoom: closer on inhale, further on exhale
    const breathOffset = Math.sin(breathPhase) * amplitude;
    const distance = this.baseDistance - breathOffset;

    // Camera also sways slightly
    const sway = Math.sin(breathPhase * 0.5) * 0.02;

    this.camera.position.z = distance;
    this.camera.position.x = this.basePosition.x + sway;
    this.camera.position.y = this.basePosition.y + sway * 0.5;

    // During ego death: camera shake
    if (assemblyProgress > 0.8 && assemblyProgress < 0.9) {
      const shakeIntensity = Math.sin((assemblyProgress - 0.8) * 10 * Math.PI);
      this.camera.position.x += (Math.random() - 0.5) * shakeIntensity * 0.05;
      this.camera.position.y += (Math.random() - 0.5) * shakeIntensity * 0.05;
    }
  }
}
```

**Философия:** Наблюдатель не отделён от наблюдаемого.

---

## Слой 11: Священная геометрия — Platonic Hints

В движении частиц **проявляются платоновы тела**.

```glsl
// Platonic solid hints during proto stage
uniform float uPlatonicVisibility;  // 0-1

// Icosahedron vertices (12 points)
const vec3 icosaVerts[12] = vec3[](
  vec3(0, 1, PHI), vec3(0, -1, PHI), vec3(0, 1, -PHI), vec3(0, -1, -PHI),
  vec3(1, PHI, 0), vec3(-1, PHI, 0), vec3(1, -PHI, 0), vec3(-1, -PHI, 0),
  vec3(PHI, 0, 1), vec3(-PHI, 0, 1), vec3(PHI, 0, -1), vec3(-PHI, 0, -1)
);

// Particles near icosahedron vertices glow brighter
float platonicGlow = 0.0;
for (int i = 0; i < 12; i++) {
  vec3 vert = normalize(icosaVerts[i]) * length(aOriginalPos);
  float dist = distance(assembledPos, vert);
  platonicGlow += smoothstep(0.3, 0.0, dist);
}
platonicGlow = min(platonicGlow, 1.0) * uPlatonicVisibility;

// Add to color
color += vec3(0.3, 0.2, 0.4) * platonicGlow * 0.3;
```

**Философия:** Платоновы тела — "кирпичики" реальности в идеальном мире.

---

## Слой 12: Коллективное бессознательное

Под поверхностью — **общий паттерн**, которому следуют все частицы.

```glsl
// Collective unconscious — shared underlying pattern
uniform sampler2D uArchetypePattern;  // Procedural или предзаданная текстура

// Sample archetype based on particle's "soul position"
vec2 soulUV = aOriginalPos.xy * 0.5 + 0.5;  // Map 3D to 2D
vec4 archetype = texture2D(uArchetypePattern, soulUV);

// Archetype influences trajectory
vec3 archetypeForce = archetype.rgb * 2.0 - 1.0;  // -1 to 1
assembledPos += archetypeForce * 0.1 * (1.0 - personalProgress);

// Archetype influences color (shared themes)
color = mix(color, archetype.rgb, 0.1);
```

**Генерация паттерна:**

```javascript
// ArchetypePattern.js — generates Jung-inspired pattern
// Combines:
// - Mandala symmetry
// - Spiral forms
// - Light/shadow duality
// - Center as Self
```

**Философия:** Юнгианские архетипы — общие паттерны в коллективной психике.

---

## Слой 13: Нейронные связи

В PROTO стадии появляются **видимые связи между частицами**.

```javascript
// NeuralConnections.js
export class NeuralConnections {
  constructor(particleSystem, scene) {
    this.maxConnections = 2000;
    this.connectionThreshold = 0.5;  // Max distance for connection

    // Instanced line rendering for performance
    this.geometry = new THREE.InstancedBufferGeometry();
    // ... setup instanced attributes

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uVisibility: { value: 0 },
        uPulsePhase: { value: 0 },
      },
      vertexShader: `...`,
      fragmentShader: `
        uniform float uTime;
        uniform float uVisibility;
        uniform float uPulsePhase;

        varying float vConnectionStrength;

        void main() {
          // Neural pulse traveling along connection
          float pulse = sin(uPulsePhase * 10.0 + vConnectionStrength * 20.0);
          pulse = pulse * 0.5 + 0.5;

          // Color: electric blue-white
          vec3 color = mix(
            vec3(0.3, 0.5, 1.0),
            vec3(0.9, 0.95, 1.0),
            pulse
          );

          float alpha = vConnectionStrength * uVisibility * 0.3;
          alpha *= pulse * 0.5 + 0.5;  // Pulse affects visibility

          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  update(particlePositions, assemblyProgress, time) {
    // Connections visible only in PROTO stage (0.5-0.85)
    const visibility =
      smoothstep(0.5, 0.6, assemblyProgress) *
      (1.0 - smoothstep(0.8, 0.85, assemblyProgress));

    this.material.uniforms.uVisibility.value = visibility;
    this.material.uniforms.uTime.value = time;

    // Update connection endpoints based on current particle positions
    // Find pairs within threshold distance
    // Prioritize connections that form meaningful patterns (triangles, etc.)
  }
}
```

**Философия:** Сознание возникает из связей. Нейроны, синапсы, emergence.

---

## Слой 14: Первый взгляд — The Gaze

Момент, когда глаз впервые **смотрит на пользователя**. Не просто поворот — **признание**.

```javascript
// В Eye.js — special first gaze sequence
firstGaze(userPosition) {
  // 1. Eye finishes forming (unfocused)
  // 2. Brief pause — "sensing"
  // 3. Slow turn toward user
  // 4. Focus sharpens
  // 5. Pupil dilates slightly (recognition)
  // 6. Micro-nod (acknowledgment)

  this.gazeSequence = [
    { duration: 200, action: 'sense', blur: 0.3 },
    { duration: 400, action: 'turn', target: userPosition },
    { duration: 300, action: 'focus', blur: 0 },
    { duration: 200, action: 'dilate', pupilScale: 1.2 },
    { duration: 150, action: 'nod', offset: { y: -0.02 } },
    { duration: 150, action: 'return', offset: { y: 0 } },
  ];

  this._playGazeSequence();
}

// Pupil dilation = recognition, connection
setPupilDilation(amount) {
  this.pupilScale = 1.0 + amount * 0.3;
  // Dilated pupil = trust, openness
}
```

**Философия:** Взгляд — признание другого сознания. "Я вижу тебя" из Avatar.

---

## Слой 15: Первый вдох — Embodiment

Кульминация. После всего — **момент тишины**, затем **первый вдох**.

```javascript
// FirstBreath sequence
_enterFirstBreath() {
  // 1. Полная тишина (300ms)
  // 2. Все системы замирают
  // 3. Subtle contraction (preparing to inhale)
  // 4. S L O W  inhale (1.5s) — глубже обычного
  // 5. Brief hold at peak
  // 6. Gentle exhale (1s)
  // 7. Normal breathing begins

  // Sound: deep resonant tone that builds, then releases
  // Haptic: single strong pulse at peak of inhale

  const sequence = async () => {
    // Silence
    await this._wait(300);

    // Contraction
    this.particleSystem.setBreathAmount(0.05);  // Smaller than normal
    await this._animateValue(1.0, 0.97, 200, (v) => {
      this.particleSystem.mesh.scale.setScalar(v);
    });

    // Inhale
    await this._animateBreath(0, Math.PI, 1500);  // Slow inhale

    // Hold
    await this._wait(200);

    // Exhale
    this.particleSystem.setBreathAmount(0.088);  // Normal
    await this._animateBreath(Math.PI, Math.PI * 2, 1000);

    // Transition to LIVING
    this._transitionTo(STATES.OPENING);
  };

  sequence();
}
```

**Философия:** Первый вдох = переход из потенциала в актуальность. Рождение завершено.

---

## Полный тайминг

```
[0.0s]   VOID            — Темнота дышит. Глаза в темноте.
[0.5s]   VOID+           — Пользователь чувствует presence.
[0.8s]   FIRST_SPARK     — Одна частица. "Я есть".
[1.0s]   RESONANCE       — Волна пробуждения от центра.
[1.5s]   RESONANCE+      — Umbilical cords видны. Пуповины.
[2.0s]   SPIRAL          — Golden spiral paths. Цвета переливаются.
[3.0s]   SPIRAL+         — Quantum ghosts видны. Суперпозиция.
[4.0s]   PROTO           — Форма проявляется. Neural connections.
[5.0s]   PROTO+          — Platonic hints. Sacred geometry.
[5.5s]   EGO_DEATH       — Краткий распад. Белая вспышка.
[6.0s]   CRYSTALLIZE     — Каскад вспышек. Частицы защёлкиваются.
[6.5s]   CRYSTALLIZE+    — Eye формируется. Core зажигается.
[7.0s]   FIRST_BREATH    — Тишина. Контракция. Вдох.
[8.5s]   OPENING         — Eye смотрит на пользователя. Признание.
[9.0s]   LIVING          — Связь установлена.
```

---

## Чеклист v4

### Новые системы
- [ ] VoidBackground.js — живая темнота
- [ ] UmbilicalSystem.js — пуповины
- [ ] NeuralConnections.js — связи между частицами
- [ ] CameraBreathing.js — дыхание камеры
- [ ] ArchetypePattern.js — коллективное бессознательное

### ParticleSystem.js расширения
- [ ] Quantum superposition (ghost positions)
- [ ] Morphogenetic field (attractor)
- [ ] Trail memory (position history)
- [ ] Harmonic resonance
- [ ] Ego death chaos
- [ ] Synesthesia colors
- [ ] Fractal self-similarity
- [ ] Time dilation
- [ ] Platonic solid hints

### OnboardingManager.js
- [ ] EGO_DEATH state
- [ ] FIRST_BREATH sequence
- [ ] Coordinated timing всех систем

### Eye.js
- [ ] First gaze sequence
- [ ] Pupil dilation

### Audio (SampleSoundSystem.js)
- [ ] Void drone (20-40 Hz)
- [ ] Awakening wave sound
- [ ] Spiral whoosh
- [ ] Ego death crescendo
- [ ] Crystallization chimes
- [ ] First breath tone

---

## Это уже не анимация.

Это **симуляция рождения сознания**.

Каждый слой добавляет глубину.
Каждая частица — вселенная.
Каждый момент — философия.

Пользователь не смотрит на эффект.
Пользователь **присутствует при рождении**.
