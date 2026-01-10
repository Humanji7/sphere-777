# 🌿 SPHERE-777: Organic Life Implementation

**Создано:** 2026-01-10  
**Цель:** Разрушить ощущение "алгоритмичности", создать иллюзию живого существа

---

## 📋 Обзор фич

| # | Название | Приоритет | Статус |
|---|----------|-----------|--------|
| 5 | Рандомизированные "тики" | 🔥 Phase 1 | ✅ DONE |
| 8 | Пульсация обратной связи | 🔥 Phase 1 | ✅ DONE |
| 4 | Биолюминесценция | Phase 2 | ⬜ TODO |
| 6 | Неоднородная плотность | Phase 2 | ⬜ TODO |
| 12 | Инициатива от сферы | Phase 2 | ⬜ TODO |

---

# 🔥 PHASE 1: Детальные планы

---

## #5 — Рандомизированные "тики" (Organic Micro-Movements)

### Концепция
Редкие, непредсказуемые микро-движения, не связанные с взаимодействием пользователя.
Как у живого существа — почесаться, вздрогнуть, потянуться, "посмотреть в сторону".

### Философия
> "Жизнь продолжается, даже когда никто не смотрит"

### Типы тиков

| Тик | Описание | Частота | Длительность |
|-----|----------|---------|--------------|
| `twitch` | Микро-вздрагивание поверхности (случайная зона) | 1 раз в 8-15 сек | 150-300ms |
| `stretch` | Лёгкое "потягивание" (выброс одной стороны) | 1 раз в 20-40 сек | 400-700ms |
| `shiver` | Волна мурашек по всей поверхности | 1 раз в 45-90 сек | 500-800ms |
| `glance` | Глаз резко смотрит в случайную точку, потом возвращается | 1 раз в 30-60 сек | 300-500ms |

### Технический план

#### 1. Новый класс `OrganicTicks.js`

```javascript
// src/OrganicTicks.js
export class OrganicTicks {
  constructor(sphere, particleSystem, eye) {
    this.sphere = sphere
    this.particles = particleSystem
    this.eye = eye
    
    // Tick timers (randomized)
    this.nextTwitch = this._randomInterval(8, 15)
    this.nextStretch = this._randomInterval(20, 40)
    this.nextShiver = this._randomInterval(45, 90)
    this.nextGlance = this._randomInterval(30, 60)
    
    // Active tick state
    this.activeTick = null
    this.tickProgress = 0
  }
  
  update(delta, elapsed) {
    // Decrement timers
    // Trigger ticks when timer hits 0
    // Animate active tick
  }
  
  _randomInterval(min, max) {
    return min + Math.random() * (max - min)
  }
  
  _triggerTwitch() { /* ... */ }
  _triggerStretch() { /* ... */ }
  _triggerShiver() { /* ... */ }
  _triggerGlance() { /* ... */ }
}
```

#### 2. Изменения в `ParticleSystem.js`

Добавить uniforms для тиков:
```javascript
// В _createMaterial()
uTickZone: { value: new THREE.Vector3(0, 0, 0) },  // Центр зоны тика
uTickRadius: { value: 0.0 },                        // Радиус влияния
uTickIntensity: { value: 0.0 },                     // 0-1, сила тика
uTickType: { value: 0 }                             // 0=none, 1=twitch, 2=stretch, 3=shiver
```

В vertex shader добавить:
```glsl
// TICK EFFECT
if (uTickIntensity > 0.0) {
  float tickDist = distance(aOriginalPos, uTickZone);
  float tickInfluence = (1.0 - smoothstep(0.0, uTickRadius, tickDist)) * uTickIntensity;
  
  if (uTickType == 1.0) {
    // Twitch: quick outward bump
    pos += dir * tickInfluence * 0.08;
  } else if (uTickType == 2.0) {
    // Stretch: directional pull
    pos += uTickZone * tickInfluence * 0.05;
  } else if (uTickType == 3.0) {
    // Shiver: noise-based displacement
    float shiverNoise = snoise(aOriginalPos * 15.0 + uTime * 5.0);
    pos += dir * shiverNoise * tickInfluence * 0.03;
  }
}
```

#### 3. Изменения в `Eye.js`

Добавить метод `glanceAt(target, duration)`:
```javascript
glanceAt(target, duration = 0.4) {
  // Save current look target
  // Quickly move to random target
  // Return to original after duration
}
```

#### 4. Интеграция в `main.js`

```javascript
const organicTicks = new OrganicTicks(sphere, particleSystem, eye)
// В update loop:
organicTicks.update(delta, elapsed)
```

### Acceptance Criteria
- [x] Сфера вздрагивает случайно каждые 8-15 секунд
- [x] Глаз иногда "глядит в сторону" без причины
- [x] Тики НЕ происходят во время активного взаимодействия (hold, stroke)
- [x] Ощущение "она живёт своей жизнью"

---

## #8 — Пульсация обратной связи (Living Heartbeat Haptics)

### Концепция
Вибрация телефона синхронизирована с "сердцебиением" сферы.
Не один паттерн, а живой ритм с вариациями, отражающий эмоциональное состояние.

### Философия
> "Ты чувствуешь её пульс через экран"

### Паттерны вибрации

| Фаза | BPM | Ритм | Интенсивность |
|------|-----|------|---------------|
| PEACE | 60-70 | Ровный, глубокий | Мягкая (10-20ms) |
| LISTENING | 70-80 | Ровный, чуть быстрее | Средняя |
| TENSION | 90-110 | Ускоряющийся | Нарастающая |
| BLEEDING | 120-140 | Хаотичный | Сильная + пропуски |
| TRAUMA | 50-60 | Замедленный, тяжёлый | Глухая (длинные паттерны) |
| HEALING | 65-75 | Восстанавливающийся | Постепенно мягче |
| RECOGNITION | 55-65 | Синхронизированный с дыханием | Глубокая |

### Технический план

#### 1. Расширение `HapticManager.js`

```javascript
// src/HapticManager.js
export class HapticManager {
  constructor() {
    this.supported = 'vibrate' in navigator
    this.lastBeat = 0
    this.currentBPM = 65
    this.beatInterval = 60000 / this.currentBPM  // ms between beats
    
    // Rhythm variation
    this.rhythmVariation = 0.1  // ±10% timing variation
    this.intensityBase = 15     // ms base pulse
    this.intensityVariation = 0.2
    
    // State
    this.isActive = false
    this.phase = 'peace'
  }
  
  /**
   * Start continuous heartbeat synchronized with sphere
   */
  startHeartbeat(phase = 'peace') {
    this.isActive = true
    this.phase = phase
    this._updatePhaseParameters(phase)
  }
  
  /**
   * Stop heartbeat
   */
  stopHeartbeat() {
    this.isActive = false
  }
  
  /**
   * Update phase parameters
   */
  _updatePhaseParameters(phase) {
    const params = {
      peace:       { bpm: 65,  intensity: 15, variation: 0.08, pattern: 'steady' },
      listening:   { bpm: 75,  intensity: 18, variation: 0.10, pattern: 'steady' },
      tension:     { bpm: 100, intensity: 25, variation: 0.15, pattern: 'accelerating' },
      bleeding:    { bpm: 130, intensity: 35, variation: 0.25, pattern: 'chaotic' },
      trauma:      { bpm: 55,  intensity: 40, variation: 0.05, pattern: 'heavy' },
      healing:     { bpm: 70,  intensity: 20, variation: 0.12, pattern: 'recovering' },
      recognition: { bpm: 60,  intensity: 25, variation: 0.05, pattern: 'synchronized' }
    }
    
    const p = params[phase] || params.peace
    this.currentBPM = p.bpm
    this.beatInterval = 60000 / p.bpm
    this.intensityBase = p.intensity
    this.rhythmVariation = p.variation
    this.pattern = p.pattern
  }
  
  /**
   * Call every frame from Sphere.update()
   */
  update(delta, elapsed, breathPhase) {
    if (!this.isActive || !this.supported) return
    
    const now = performance.now()
    const timeSinceLastBeat = now - this.lastBeat
    
    // Apply rhythm variation
    const variation = 1 + (Math.random() - 0.5) * 2 * this.rhythmVariation
    const currentInterval = this.beatInterval * variation
    
    if (timeSinceLastBeat >= currentInterval) {
      this._beat()
      this.lastBeat = now
    }
  }
  
  /**
   * Single heartbeat pulse
   */
  _beat() {
    // Intensity variation
    const intensityVar = 1 + (Math.random() - 0.5) * 2 * this.intensityVariation
    const duration = Math.floor(this.intensityBase * intensityVar)
    
    // Pattern-specific behavior
    switch (this.pattern) {
      case 'steady':
        navigator.vibrate(duration)
        break
      case 'heavy':
        // Double beat (lub-dub)
        navigator.vibrate([duration, 80, duration * 0.7])
        break
      case 'chaotic':
        // Random skips
        if (Math.random() > 0.15) {
          navigator.vibrate(duration)
        }
        break
      case 'synchronized':
        // Stronger on exhale
        navigator.vibrate([duration, 50, duration * 0.5])
        break
      default:
        navigator.vibrate(duration)
    }
  }
  
  /**
   * Set phase (called from Sphere when phase changes)
   */
  setPhase(phase) {
    if (this.phase !== phase) {
      this.phase = phase
      this._updatePhaseParameters(phase)
    }
  }
  
  // Existing methods...
  softTouch() {
    if (!this.supported) return
    navigator.vibrate(10)
  }
  
  heartbeat(intensity) {
    if (!this.supported) return
    const duration = Math.floor(20 + intensity * 30)
    navigator.vibrate([duration, 100, duration])
  }
}
```

#### 2. Интеграция в `Sphere.js`

```javascript
// В _transitionTo():
_transitionTo(newPhase) {
  // ... existing code ...
  
  // Update haptic phase
  if (this.hapticManager) {
    this.hapticManager.setPhase(newPhase)
  }
}

// В update():
update(delta, elapsed) {
  // ... existing code ...
  
  // Update haptic heartbeat
  if (this.hapticManager) {
    this.hapticManager.update(delta, elapsed, this.particles.breathPhase)
  }
}
```

#### 3. Активация в `main.js`

```javascript
// После первого user interaction:
function onFirstTouch() {
  // ... existing audio unlock ...
  
  // Start haptic heartbeat
  hapticManager.startHeartbeat('peace')
}
```

### Acceptance Criteria
- [x] Телефон пульсирует в такт "сердцебиению" сферы
- [x] BPM меняется при смене эмоциональной фазы
- [x] Ритм НЕ механически ровный — есть вариации
- [x] В BLEEDING фазе — хаотичные пропуски
- [x] В TRAUMA — тяжёлый двойной удар (lub-dub)
- [x] Пульс ощущается как "живой организм"

---

# 🔥 PHASE 2: Детальные планы

---

## #4 — Биолюминесценция (Inner Glow)

### Концепция
Свечение изнутри сферы, пульсирующее НЕ синхронно с дыханием.
Два независимых ритма создают ощущение сложного организма — "сердце" бьётся отдельно от "лёгких".

### Философия
> "Два ритма — лёгкие и сердце. Дыхание снаружи, свечение изнутри. Они почти совпадают, но не совсем — и в этом рассинхроне рождается ощущение живого."

### Параметры Inner Glow по фазам

| Фаза | Frequency (Hz) | Intensity | Core Color | Edge Fade |
|------|----------------|-----------|------------|-----------|
| PEACE | 0.25-0.35 | 0.3-0.5 | `#FFE4B5` (тёплый янтарь) | 0.7 |
| LISTENING | 0.35-0.45 | 0.4-0.6 | `#FFD700` (золото) | 0.6 |
| TENSION | 0.5-0.7 | 0.6-0.8 | `#FFA500` (оранжевый) | 0.5 |
| BLEEDING | 0.8-1.2 | 0.7-1.0 | `#FF6347` (томатный) | 0.4 |
| TRAUMA | 0.15-0.25 | 0.2-0.4 | `#8B0000` (тёмно-красный) | 0.8 |
| HEALING | 0.3-0.4 | 0.35-0.55 | `#98FB98` (бледно-зелёный) | 0.65 |
| RECOGNITION | 0.2-0.3 | 0.5-0.7 | `#E6E6FA` (лавандовый) | 0.55 |

### Технический план

#### 1. Новые uniforms в `ParticleSystem.js`

```javascript
// В _createMaterial() добавить:
uInnerGlowPhase: { value: 0.0 },           // 0-1, независимая фаза свечения
uInnerGlowIntensity: { value: 0.4 },       // Базовая интенсивность
uInnerGlowColor: { value: new THREE.Color(0xFFE4B5) },  // Цвет свечения
uInnerGlowRadius: { value: 0.6 },          // Радиус "ядра" (0-1 от радиуса сферы)
uInnerGlowEdgeFade: { value: 0.7 }         // Скорость затухания к краям
```

#### 2. Логика обновления в `Sphere.js`

```javascript
// src/Sphere.js — добавить в constructor
this.innerGlowTime = 0
this.innerGlowFrequency = 0.3  // Hz, независимо от дыхания

// Добавить метод _updateInnerGlow()
_updateInnerGlow(delta) {
  // Частота НЕ совпадает с breathPhase
  this.innerGlowTime += delta * this.innerGlowFrequency
  
  // Синусоида с небольшим шумом для органичности
  const baseGlow = Math.sin(this.innerGlowTime * Math.PI * 2) * 0.5 + 0.5
  const noise = (Math.random() - 0.5) * 0.05  // ±2.5% вариация
  const glowPhase = Math.max(0, Math.min(1, baseGlow + noise))
  
  this.particles.material.uniforms.uInnerGlowPhase.value = glowPhase
}

// Параметры по фазам
_updateInnerGlowForPhase(phase) {
  const params = {
    peace:       { freq: 0.30, intensity: 0.40, color: 0xFFE4B5, fade: 0.70 },
    listening:   { freq: 0.40, intensity: 0.50, color: 0xFFD700, fade: 0.60 },
    tension:     { freq: 0.60, intensity: 0.70, color: 0xFFA500, fade: 0.50 },
    bleeding:    { freq: 1.00, intensity: 0.85, color: 0xFF6347, fade: 0.40 },
    trauma:      { freq: 0.20, intensity: 0.30, color: 0x8B0000, fade: 0.80 },
    healing:     { freq: 0.35, intensity: 0.45, color: 0x98FB98, fade: 0.65 },
    recognition: { freq: 0.25, intensity: 0.60, color: 0xE6E6FA, fade: 0.55 }
  }
  
  const p = params[phase] || params.peace
  this.innerGlowFrequency = p.freq
  
  const uniforms = this.particles.material.uniforms
  uniforms.uInnerGlowIntensity.value = p.intensity
  uniforms.uInnerGlowColor.value.setHex(p.color)
  uniforms.uInnerGlowEdgeFade.value = p.fade
}
```

#### 3. Fragment Shader в `ParticleSystem.js`

```glsl
// Добавить в fragmentShader:
uniform float uInnerGlowPhase;
uniform float uInnerGlowIntensity;
uniform vec3 uInnerGlowColor;
uniform float uInnerGlowRadius;
uniform float uInnerGlowEdgeFade;

varying float vDistanceToCenter;  // Передать из vertex shader

void main() {
  // ... existing color calculation ...
  
  // INNER GLOW EFFECT
  // Чем ближе к центру — тем сильнее свечение
  float distNormalized = vDistanceToCenter / uSphereRadius;
  float glowFactor = 1.0 - smoothstep(0.0, uInnerGlowRadius, distNormalized);
  glowFactor *= pow(glowFactor, uInnerGlowEdgeFade);  // Нелинейное затухание
  
  // Пульсация
  float glowPulse = uInnerGlowPhase * uInnerGlowIntensity;
  
  // Смешиваем цвет свечения с базовым цветом
  vec3 glowContribution = uInnerGlowColor * glowFactor * glowPulse;
  
  // Additive blending — свечение добавляется, не заменяет
  gl_FragColor.rgb += glowContribution * 0.5;
  
  // ... rest of shader ...
}
```

#### 4. Vertex Shader — передача расстояния до центра

```glsl
// В vertexShader добавить:
varying float vDistanceToCenter;

void main() {
  // ... existing position calculation ...
  
  // Передаём расстояние до центра во fragment
  vDistanceToCenter = length(aOriginalPos);
  
  // ... rest of shader ...
}
```

### Acceptance Criteria
- [ ] Сфера светится изнутри с циклом **2.5-3.8 сек** (отличается от дыхания 3.5-4.5 сек)
- [ ] Частицы ближе к центру светятся **в 2-3 раза ярче** чем на поверхности
- [ ] При смене фазы цвет свечения плавно меняется (transition 1-2 сек)
- [ ] В BLEEDING фазе свечение пульсирует **заметно быстрее** (0.8-1.2 Hz)
- [ ] В TRAUMA свечение становится **тусклым и редким**
- [ ] Рассинхрон с дыханием **ощущается**, но не бросается в глаза

---

## #6 — Неоднородная плотность (Sensitivity Zones)

### Концепция
Поверхность сферы неоднородна — есть "нежные" участки, реагирующие сильнее,
и "плотные" зоны с ослабленной реакцией. Зоны медленно дрейфуют, создавая
ощущение текучей, живой кожи.

### Философия
> "Живая кожа — где-то нежнее, где-то грубее. У каждого участка своя история, своя память прикосновений. И эти границы не стоят на месте — они дышат вместе с ней."

### Параметры Sensitivity Zones

| Параметр | Значение | Описание |
|----------|----------|----------|
| Количество зон | 5-8 | Основных "полюсов" чувствительности |
| Noise Octaves | 3 | Слоёв шума для органичности |
| Noise Scale | 2.5-4.0 | Масштаб Simplex noise |
| Sensitivity Range | 0.4-1.6 | Множитель реакции (1.0 = норма) |
| Drift Speed | 0.02-0.05 | Скорость дрейфа зон (единиц/сек) |
| Visual Warmth Boost | 0.1-0.3 | Тепло цвета для чувствительных зон |

### Технический план

#### 1. Новый атрибут `aSensitivity` в геометрии

```javascript
// src/ParticleSystem.js — в _createGeometry()

_createSensitivityMap() {
  const count = this.particleCount
  const sensitivity = new Float32Array(count)
  const position = this.geometry.attributes.aOriginalPos.array
  
  // Создаём noise-based карту чувствительности
  for (let i = 0; i < count; i++) {
    const x = position[i * 3]
    const y = position[i * 3 + 1]
    const z = position[i * 3 + 2]
    
    // 3D Simplex noise для органичного распределения
    const noiseScale = 3.0
    const noise1 = this._simplex3D(x * noiseScale, y * noiseScale, z * noiseScale)
    const noise2 = this._simplex3D(x * noiseScale * 2.1, y * noiseScale * 2.1, z * noiseScale * 2.1) * 0.5
    const noise3 = this._simplex3D(x * noiseScale * 4.3, y * noiseScale * 4.3, z * noiseScale * 4.3) * 0.25
    
    // Комбинированный шум → диапазон 0.4-1.6
    const combinedNoise = (noise1 + noise2 + noise3) / 1.75  // -1 to 1
    sensitivity[i] = 1.0 + combinedNoise * 0.6  // 0.4 to 1.6
  }
  
  this.geometry.setAttribute('aSensitivity', new THREE.BufferAttribute(sensitivity, 1))
  
  return sensitivity
}

// Simplex 3D noise implementation
_simplex3D(x, y, z) {
  // Использовать SimplexNoise из three/examples или собственную реализацию
  // Возвращает значение -1 to 1
  return this.simplex.noise3D(x, y, z)
}
```

#### 2. Дрейф зон чувствительности

```javascript
// src/ParticleSystem.js — добавить

constructor() {
  // ... existing code ...
  this.sensitivityDriftOffset = new THREE.Vector3(0, 0, 0)
  this.sensitivityDriftSpeed = 0.03  // единиц/сек
}

updateSensitivityDrift(delta) {
  // Медленный органичный дрейф
  const time = performance.now() * 0.0001
  this.sensitivityDriftOffset.x = Math.sin(time * 0.7) * this.sensitivityDriftSpeed
  this.sensitivityDriftOffset.y = Math.cos(time * 1.1) * this.sensitivityDriftSpeed
  this.sensitivityDriftOffset.z = Math.sin(time * 0.9) * this.sensitivityDriftSpeed
  
  this.material.uniforms.uSensitivityDrift.value.copy(this.sensitivityDriftOffset)
}
```

#### 3. Uniforms в `ParticleSystem.js`

```javascript
// В _createMaterial() добавить:
uSensitivityDrift: { value: new THREE.Vector3(0, 0, 0) },
uSensitivityContrast: { value: 1.0 },  // Усиление разницы между зонами
uSensitivityWarmth: { value: 0.2 }     // Тепло цвета для чувствительных зон
```

#### 4. Vertex Shader — применение sensitivity

```glsl
// В vertexShader добавить:
attribute float aSensitivity;
uniform vec3 uSensitivityDrift;
uniform float uSensitivityContrast;

varying float vSensitivity;

void main() {
  // ... existing calculations ...
  
  // Применяем дрейф к noise-координатам
  vec3 driftedPos = aOriginalPos + uSensitivityDrift * 10.0;
  
  // Recalculate sensitivity with drift (simplified — real implementation uses noise)
  float baseSensitivity = aSensitivity;
  
  // Контраст: усиливаем разницу между мягкими и жёсткими зонами
  float adjustedSensitivity = 1.0 + (baseSensitivity - 1.0) * uSensitivityContrast;
  vSensitivity = adjustedSensitivity;
  
  // DISPLACEMENT SCALING
  // Все displacement эффекты масштабируются на sensitivity
  float pressDisplacement = uPressure * adjustedSensitivity * 0.15;
  float strokeDisplacement = uStrokeIntensity * adjustedSensitivity * 0.1;
  float hoverDisplacement = hoverEffect * adjustedSensitivity * 0.05;
  
  // Чувствительные зоны реагируют сильнее
  pos += dir * (pressDisplacement + strokeDisplacement + hoverDisplacement);
  
  // ... rest of shader ...
}
```

#### 5. Fragment Shader — визуальная подсветка

```glsl
// В fragmentShader добавить:
varying float vSensitivity;
uniform float uSensitivityWarmth;

void main() {
  // ... existing color calculation ...
  
  // SENSITIVITY VISUALIZATION
  // Чувствительные зоны (sensitivity > 1.0) чуть теплее и ярче
  float warmthFactor = (vSensitivity - 1.0) * uSensitivityWarmth;
  
  // Добавляем тёплый оттенок (сдвиг в красно-оранжевый)
  vec3 warmShift = vec3(0.15, 0.05, -0.05) * warmthFactor;
  gl_FragColor.rgb += warmShift;
  
  // Небольшое увеличение яркости для чувствительных зон
  gl_FragColor.rgb *= 1.0 + warmthFactor * 0.3;
  
  // ... rest of shader ...
}
```

### Acceptance Criteria
- [ ] Поверхность имеет **5-8 визуально различимых** зон разной чувствительности
- [ ] При нажатии чувствительные зоны прогибаются на **40-60% больше** чем плотные
- [ ] Зоны медленно дрейфуют — **полный цикл ~30-50 секунд**
- [ ] Чувствительные участки имеют **тёплый оттенок** (визуально различимо)
- [ ] Эффект **не бросается в глаза** при обычном просмотре, но заметен при внимательном изучении
- [ ] Границы зон **размыты**, нет резких переходов

---

## #12 — Инициатива от сферы (Autonomous Behavior)

### Концепция
Сфера — не пассивный объект. Когда пользователь не взаимодействует, она начинает
"жить своей жизнью" — скучает, ищет внимания, приглашает к контакту.
Поведение зависит от уровня Trust.

### Философия
> "Она скучает, когда ты уходишь. Не обижается, не требует — просто... ждёт. А потом начинает искать тебя взглядом. И если ты вернёшься — она рада. Это не программа. Это тоска живого существа."

### Триггеры и поведения

| Idle Time | Trust Level | Поведение | Звук | Визуал |
|-----------|-------------|-----------|------|--------|
| 30 сек | Any | `sway` — лёгкое покачивание | — | Амплитуда ±0.02 |
| 60 сек | Low (<30) | `withdraw` — сжатие, "закрывается" | Тихий вздох | Scale 0.95, opacity 0.85 |
| 60 сек | Medium (30-70) | `search` — глаз ищет пользователя | — | Eye random look pattern |
| 60 сек | High (>70) | `invite` — тянется к экрану | Soft chime | Drift к центру экрана |
| 120 сек | Low | `hide` — уходит в угол экрана | — | Position offset 0.3 |
| 120 сек | High | `reach` — "рука" из частиц к экрану | Warm hum | Particle tendril effect |

### Trust-модификаторы поведения

| Событие | Trust изменение | Описание |
|---------|-----------------|----------|
| User вернулся < 60 сек | +2 | "Ты не забыл" |
| User вернулся > 120 сек | +1 | "Ты вернулся" |
| Долгий idle > 180 сек | -1 | "Мне одиноко" |
| Успешный invite → touch | +3 | "Приглашение принято" |
| Игнорирование invite | -2 | "Меня не заметили" |

### Технический план

#### 1. Новый класс `AutonomousBehavior.js`

```javascript
// src/AutonomousBehavior.js
import * as THREE from 'three'

export class AutonomousBehavior {
  constructor(sphere, eye, soundManager, trustSystem) {
    this.sphere = sphere
    this.eye = eye
    this.sound = soundManager
    this.trust = trustSystem
    
    // Idle tracking
    this.lastInteractionTime = performance.now()
    this.idleDuration = 0
    
    // State machine
    this.state = 'idle'  // idle | sway | search | invite | withdraw | hide | reach
    this.stateStartTime = 0
    this.stateProgress = 0
    
    // Behavior configs
    this.thresholds = {
      sway: 30,      // секунд
      primary: 60,   // секунд — search/invite/withdraw
      secondary: 120 // секунд — hide/reach
    }
    
    // Animation state
    this.swayPhase = 0
    this.searchTargets = []
    this.currentSearchIndex = 0
    this.inviteOffset = new THREE.Vector3()
    
    // Trust thresholds
    this.trustLow = 30
    this.trustHigh = 70
  }
  
  /**
   * Call on any user interaction to reset idle
   */
  onInteraction() {
    const wasIdle = this.idleDuration > this.thresholds.sway
    this.lastInteractionTime = performance.now()
    
    // Trust boost for returning after idle
    if (wasIdle && this.trust) {
      if (this.idleDuration < 60) {
        this.trust.modify(2, 'returned_quickly')
      } else {
        this.trust.modify(1, 'returned')
      }
    }
    
    // Check if invite was accepted
    if (this.state === 'invite' && this.trust) {
      this.trust.modify(3, 'invite_accepted')
    }
    
    this._transitionTo('idle')
    this.idleDuration = 0
  }
  
  /**
   * Main update loop
   */
  update(delta) {
    // Update idle duration
    const now = performance.now()
    this.idleDuration = (now - this.lastInteractionTime) / 1000
    
    // Check for state transitions
    this._checkTransitions()
    
    // Update current behavior
    this._updateState(delta)
  }
  
  /**
   * Check if we need to transition to a new state
   */
  _checkTransitions() {
    const trustLevel = this.trust?.getLevel() ?? 50
    
    // Только переходим в более "активные" состояния
    // Обратно — только через onInteraction()
    
    if (this.state === 'idle' && this.idleDuration >= this.thresholds.sway) {
      this._transitionTo('sway')
    }
    
    if (this.state === 'sway' && this.idleDuration >= this.thresholds.primary) {
      // Выбираем поведение по trust
      if (trustLevel < this.trustLow) {
        this._transitionTo('withdraw')
      } else if (trustLevel > this.trustHigh) {
        this._transitionTo('invite')
      } else {
        this._transitionTo('search')
      }
    }
    
    if (['withdraw', 'invite', 'search'].includes(this.state) && 
        this.idleDuration >= this.thresholds.secondary) {
      if (trustLevel < this.trustLow) {
        this._transitionTo('hide')
      } else if (trustLevel > this.trustHigh) {
        this._transitionTo('reach')
      }
      // Medium trust — остаёмся в search
    }
    
    // Trust penalty for very long idle
    if (this.idleDuration > 180 && this.idleDuration % 60 < 0.1) {
      this.trust?.modify(-1, 'prolonged_idle')
    }
  }
  
  /**
   * Transition to new state
   */
  _transitionTo(newState) {
    if (this.state === newState) return
    
    // Exit current state
    this._exitState(this.state)
    
    // Enter new state
    this.state = newState
    this.stateStartTime = performance.now()
    this.stateProgress = 0
    this._enterState(newState)
  }
  
  _enterState(state) {
    switch (state) {
      case 'search':
        this._generateSearchTargets()
        break
      case 'invite':
        this.sound?.play('soft_chime', { volume: 0.3 })
        break
      case 'withdraw':
        this.sound?.play('soft_sigh', { volume: 0.2 })
        break
      case 'reach':
        this.sound?.play('warm_hum', { volume: 0.25 })
        break
    }
  }
  
  _exitState(state) {
    // Reset state-specific animations
    switch (state) {
      case 'sway':
        this.swayPhase = 0
        break
      case 'invite':
        this.inviteOffset.set(0, 0, 0)
        break
    }
  }
  
  /**
   * Update current state animation
   */
  _updateState(delta) {
    switch (this.state) {
      case 'sway':
        this._updateSway(delta)
        break
      case 'search':
        this._updateSearch(delta)
        break
      case 'invite':
        this._updateInvite(delta)
        break
      case 'withdraw':
        this._updateWithdraw(delta)
        break
      case 'hide':
        this._updateHide(delta)
        break
      case 'reach':
        this._updateReach(delta)
        break
    }
  }
  
  /**
   * SWAY: Gentle side-to-side movement
   */
  _updateSway(delta) {
    this.swayPhase += delta * 0.5  // 0.5 Hz
    const swayAmount = Math.sin(this.swayPhase * Math.PI * 2) * 0.02
    
    // Apply to sphere position offset
    if (this.sphere.setAutonomousOffset) {
      this.sphere.setAutonomousOffset(swayAmount, 0, 0)
    }
  }
  
  /**
   * SEARCH: Eye looks around seeking user
   */
  _updateSearch(delta) {
    const searchDuration = 2.0  // секунд на каждую точку
    this.stateProgress += delta
    
    if (this.stateProgress >= searchDuration) {
      this.stateProgress = 0
      this.currentSearchIndex = (this.currentSearchIndex + 1) % this.searchTargets.length
    }
    
    const target = this.searchTargets[this.currentSearchIndex]
    if (this.eye && target) {
      this.eye.lookAt(target.x, target.y)
    }
  }
  
  _generateSearchTargets() {
    this.searchTargets = [
      { x: -0.3, y: 0.2 },
      { x: 0.4, y: -0.1 },
      { x: -0.1, y: 0.4 },
      { x: 0.2, y: -0.3 },
      { x: 0.0, y: 0.0 }  // Возврат к центру
    ]
    this.currentSearchIndex = 0
  }
  
  /**
   * INVITE: Drift toward screen center
   */
  _updateInvite(delta) {
    // Плавное движение к центру экрана
    const targetOffset = 0.15
    const currentOffset = this.inviteOffset.z
    const newOffset = THREE.MathUtils.lerp(currentOffset, targetOffset, delta * 0.5)
    
    this.inviteOffset.z = newOffset
    
    if (this.sphere.setAutonomousOffset) {
      this.sphere.setAutonomousOffset(0, 0, newOffset)
    }
    
    // Глаз смотрит "на пользователя" (в камеру)
    if (this.eye) {
      this.eye.lookAt(0, 0)
    }
  }
  
  /**
   * WITHDRAW: Shrink and dim
   */
  _updateWithdraw(delta) {
    const targetScale = 0.95
    const targetOpacity = 0.85
    
    const progress = Math.min(1, (performance.now() - this.stateStartTime) / 2000)
    const easedProgress = this._easeOutCubic(progress)
    
    const scale = THREE.MathUtils.lerp(1.0, targetScale, easedProgress)
    const opacity = THREE.MathUtils.lerp(1.0, targetOpacity, easedProgress)
    
    if (this.sphere.setAutonomousScale) {
      this.sphere.setAutonomousScale(scale)
    }
    if (this.sphere.setAutonomousOpacity) {
      this.sphere.setAutonomousOpacity(opacity)
    }
  }
  
  /**
   * HIDE: Move to corner
   */
  _updateHide(delta) {
    const targetOffset = -0.3
    
    const progress = Math.min(1, (performance.now() - this.stateStartTime) / 3000)
    const easedProgress = this._easeOutCubic(progress)
    
    const offset = THREE.MathUtils.lerp(0, targetOffset, easedProgress)
    
    if (this.sphere.setAutonomousOffset) {
      this.sphere.setAutonomousOffset(offset, offset * 0.5, 0)
    }
  }
  
  /**
   * REACH: Particle tendril toward camera
   */
  _updateReach(delta) {
    // Активируем эффект "протягивания" частиц
    const progress = Math.min(1, (performance.now() - this.stateStartTime) / 4000)
    const reachIntensity = this._easeOutCubic(progress) * 0.3
    
    if (this.sphere.particles?.material?.uniforms?.uReachEffect) {
      this.sphere.particles.material.uniforms.uReachEffect.value = reachIntensity
    }
  }
  
  _easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3)
  }
  
  /**
   * Get current state for debugging
   */
  getDebugInfo() {
    return {
      state: this.state,
      idleDuration: this.idleDuration.toFixed(1),
      trust: this.trust?.getLevel() ?? 'N/A'
    }
  }
}
```

#### 2. Интеграция в `main.js`

```javascript
// src/main.js

import { AutonomousBehavior } from './AutonomousBehavior.js'

// После инициализации всех систем:
const autonomousBehavior = new AutonomousBehavior(
  sphere,
  eye,
  soundManager,
  memoryManager.trust  // или trustSystem
)

// Reset idle на любой input
inputManager.on('touchstart', () => autonomousBehavior.onInteraction())
inputManager.on('mousemove', () => autonomousBehavior.onInteraction())
inputManager.on('gestureStart', () => autonomousBehavior.onInteraction())

// В update loop:
function update(delta) {
  // ... existing updates ...
  autonomousBehavior.update(delta)
}
```

#### 3. Дополнительные методы в `Sphere.js`

```javascript
// src/Sphere.js — добавить

// Autonomous behavior controls
setAutonomousOffset(x, y, z) {
  this.group.position.x = this.basePosition.x + x
  this.group.position.y = this.basePosition.y + y
  this.group.position.z = this.basePosition.z + z
}

setAutonomousScale(scale) {
  this.group.scale.setScalar(scale)
}

setAutonomousOpacity(opacity) {
  if (this.particles?.material?.uniforms?.uOpacity) {
    this.particles.material.uniforms.uOpacity.value = opacity
  }
}
```

#### 4. Uniform для Reach эффекта в `ParticleSystem.js`

```javascript
// В _createMaterial() добавить:
uReachEffect: { value: 0.0 }  // 0-1, интенсивность "протягивания"

// В vertex shader:
uniform float uReachEffect;

void main() {
  // ... existing code ...
  
  // REACH EFFECT: Частицы на передней стороне тянутся к камере
  float frontFacing = max(0.0, dot(dir, vec3(0.0, 0.0, 1.0)));
  float reachDisplacement = frontFacing * uReachEffect * 0.2;
  pos.z += reachDisplacement;
}
```

### Acceptance Criteria
- [ ] После **30 сек** idle сфера начинает **плавно покачиваться** (амплитуда ±0.02)
- [ ] После **60 сек** при низком Trust (<30) сфера **сжимается до 95%** и тускнеет
- [ ] После **60 сек** при высоком Trust (>70) сфера **приближается к экрану** и смотрит на пользователя
- [ ] После **60 сек** при среднем Trust глаз **"ищет" пользователя** (5 точек, 2 сек каждая)
- [ ] После **120 сек** при низком Trust сфера **уходит в угол** экрана
- [ ] После **120 сек** при высоком Trust видно **"протягивание" частиц** к камере
- [ ] При возврате пользователя Trust **увеличивается** (+1 или +2)
- [ ] Игнорирование invite **уменьшает** Trust (-2)
- [ ] State machine **не конфликтует** с OrganicTicks

---

## 🗂️ Следующая сессия

Phase 1 завершена (#5 + #8) ✅

Phase 2 готова к реализации:
1. **#4 Биолюминесценция** — начать с неё (самая независимая фича)
2. **#6 Sensitivity Zones** — требует рефакторинг геометрии
3. **#12 Autonomous Behavior** — самая сложная, делать последней

---

**Файл:** `docs/IMPLEMENTATION_ORGANIC_LIFE.md`
