# Архитектура: SPHERE-777

> **Платформа:** Web + Mobile (Capacitor)

---

## Обзор

Интерактивная 3D-сфера из 5,000 частиц — **живое существо с характером**, которое дышит, чувствует, запоминает и само проявляет инициативу.

---

## Модули (23 файла)

### Core
| Модуль | Ответственность |
|--------|-----------------|
| `main.js` | Three.js init, RAF loop, post-processing |
| `Sphere.js` | Эмоциональная машина, координация |
| `ParticleSystem.js` | GPU рендер, GLSL шейдеры, Surface Flow |
| `Eye.js` | Радужка, зрачок, моргание, слежение |

### Life Systems
| Модуль | Ответственность |
|--------|-----------------|
| `LivingCore.js` | 3 слоя внутреннего свечения + BioticNoise |
| `OrganicTicks.js` | Автономные микро-движения (twitch, stretch, shiver, glance) |
| `IdleAgency.js` | Mood state machine, face-viewer rotation |
| `PulseWaves.js` | 12 концентрических колец + BioticNoise |
| `InnerSkeleton.js` | Icosahedron wireframe (онбординг) |

### Input & Memory
| Модуль | Ответственность |
|--------|-----------------|
| `InputManager.js` | Mouse/Touch, gestures (9 типов) |
| `MemoryManager.js` | Trust Index, Ghost/Warm Traces |
| `AccelerometerManager.js` | Акселерометр для mobile |

### Effects & Audio
| Модуль | Ответственность |
|--------|-----------------|
| `EffectConductor.js` | Стохастические эффекты |
| `SoundManager.js` | Web Audio base |
| `SampleSoundSystem.js` | Sample-based звук с LFO модуляцией |
| `HapticManager.js` | Вибрация телефона, BPM паттерны |

### Visual
| Модуль | Ответственность |
|--------|-----------------|
| `VoidBackground.js` | Фон |
| `CameraBreathing.js` | Дыхание камеры |
| `UmbilicalSystem.js` | Пуповина (онбординг) |
| `NeuralConnections.js` | Нейронные связи (онбординг) |

### UI & State
| Модуль | Ответственность |
|--------|-----------------|
| `OnboardingManager.js` | Anamnesis — 9-секундное рождение |
| `TransformationManager.js` | Трансформации (Sphere ↔ BeetleShell) |
| `CharacterPanel.js` | UI панель персонажа |

### Utils
| Модуль | Ответственность |
|--------|-----------------|
| `utils/BioticNoise.js` | Органическая вариативность ритмов |

---

## Эмоциональные фазы

```
PEACE → LISTENING → TENSION → BLEEDING → TRAUMA → HEALING
  ↑                                                    ↓
  └────────────────────────────────────────────────────┘
```

### Idle Moods (IdleAgency)

| Время idle | Mood | Поведение |
|------------|------|-----------|
| 0-2с | `calm` | Обычное дыхание |
| 2-4с | `curious` | Глаз блуждает чаще |
| 4-6с | `restless` | Микроповороты, ticks x2 |
| 6с+ | `attention-seeking` | Z-bounce, вспышки, поворот к камере |

---

## Gesture → Emotion

| Жест | Эмоция | Затухание |
|------|--------|-----------|
| poke, tremble, flick | alert | 2.0/с |
| spiral | bleeding | 0.2/с |
| hold >0.5s | trust | 0.3/с |
| hover, stroke, tap | peace | — |

---

## Зависимости

```json
{
  "three": "^0.160.0",
  "vite": "^5.0.0",
  "@capacitor/core": "^7.0.0"
}
```

Минимализм. Никаких лишних библиотек.
