# SPHERE-777: Onboarding "Awakening" + Cyberpunk UI

**Дата:** 2026-01-14
**Статус:** Approved for implementation
**Ревью:** Expert Panel (Wiegers, Adzic, Fowler, Crispin) + Timothy Leary

---

## Философия

**Set & Setting через синхронизацию.**

Пользователь меняется ДО того, как увидит существо. Два сознания находят друг друга. Это не loading screen — это ритуал первого контакта.

> "The goal is not to see the light, but to BE the light." — Timothy Leary

---

## Часть 1: Онбординг "Пробуждение"

### Два режима запуска

| Режим | Условие | Длительность |
|-------|---------|--------------|
| Онбординг | `!localStorage.sphere_awakened` | 8-12 сек |
| Splash | `localStorage.sphere_awakened` exists | 1.5-2.5 сек |

---

### State Machine: Онбординг

#### VOID — Темнота как зеркало

**Цель:** Пользователь осознаёт собственное присутствие

```javascript
VOID: {
  duration: { min: 1500, max: 3000 },  // случайный в диапазоне

  visuals: {
    screen: 'black',
    shaderNoise: 'subtle_movement'  // едва уловимое движение
  },

  audio: {
    // Тишина, затем пользователь замечает своё дыхание
    ambientFadeIn: { target: 0.1, duration: 2000 }
  },

  exit: {
    condition: 'audio_ready AND duration_elapsed',
    // audio_ready = AudioContext.state === 'running' OR audioFailed
  },

  fallback: {
    trigger: 'duration > 5000',
    action: 'skip_to_RESONANCE'
  }
}
```

#### RESONANCE — Синхронизация через дыхание

**Цель:** Пользователь неосознанно подстраивается под ритм существа

```javascript
RESONANCE: {
  entry: {
    particleOpacity: 0,
    coreGlowIntensity: 0,
    breathAudioVolume: 0
  },

  breathing: {
    frequency: 0.15,  // Hz — один вдох-выдох ~7 сек
    // Медленнее нормального — индуцирует расслабление
  },

  visuals: {
    // Свечение появляется НЕ в центре — нарушает ожидание
    glowOffset: { x: 'random(-0.3, 0.3)', y: 'random(-0.2, 0.2)' },
    // "Ты видишь то, что уже было" — не появление, а проявление
  },

  animation: {
    particleOpacity: { target: 0.3, duration: 2500, easing: 'easeInOut' },
    coreGlowIntensity: { target: 0.5, duration: 2500, easing: 'easeInOut' },
    breathAudioVolume: { target: 0.4, duration: 3000, easing: 'easeIn' }
  },

  exit: {
    condition: 'particleOpacity >= 0.3 AND coreGlowIntensity >= 0.5'
  },

  fallback: {
    trigger: 'duration > 6000',
    action: 'force_exit_values_and_continue'
  }
}
```

#### MEETING — Взаимное обнаружение

**Цель:** Два сознания обнаруживают друг друга

```javascript
MEETING: {
  entry: {
    eyeBlur: 1.0,           // полностью размыт
    eyeLookTarget: 'random_offset',  // не на пользователя
    recognitionTriggered: false
  },

  phases: [
    {
      name: 'focusing',
      duration: { min: 800, max: 1200 },
      animation: { eyeBlur: { target: 0, duration: 1000 } }
      // Глаз "просыпается" — blur → sharp
    },
    {
      name: 'searching',
      duration: { min: 1000, max: 1500 },
      animation: { eyeLookTarget: 'wander_pattern' }
      // 2-3 случайные точки — существо ещё не знает что ты здесь
    },
    {
      name: 'recognition',
      trigger: 'searching_complete',
      animation: {
        eyeLookTarget: {
          target: 'user_position',  // cursor если на экране, иначе center
          duration: 400
        }
      }
      // НАШЁЛ — момент recognition
    },
    {
      name: 'sacred_pause',
      duration: 400,  // фиксированная
      freeze: true    // ОБА замирают
      // Священная пауза — взаимное признание
    }
  ],

  exit: {
    condition: 'sacred_pause_complete'
  },

  fallback: {
    trigger: 'duration > 5000',
    action: 'skip_to_recognition_phase'
  }
}
```

#### THRESHOLD — Порог выбора

**Цель:** Оба уязвимы, оба ждут. Касание = осознанный выбор.

```javascript
THRESHOLD: {
  entry: {
    waitingForTouch: true,
    reminderCount: 0
  },

  visuals: {
    // Сфера слегка "вдыхает" — показывает уязвимость
    sphereScale: { from: 1.0, to: 0.98, duration: 800 }
    // Глаз чуть отводит взгляд, возвращает
  },

  exit: {
    condition: 'touch_detected',
    // touch_detected = touchstart OR mousedown на canvas
  },

  reminder: {
    trigger: 'no_touch_for_8000ms',
    action: 'subtle_pulse',  // scale 1.0 → 1.02 → 1.0 за 600ms
    maxCount: 3,
    intervalAfterReminder: 6000
  },

  giveUp: {
    trigger: 'reminderCount >= 3 AND no_touch_for_6000ms',
    action: 'auto_transition_to_OPENING'
    // Существо "решает" начать отношения само — показывает agency
  }
}
```

#### OPENING — Начало отношений

**Цель:** Не "обычный режим" — новая реальность, где вы связаны

```javascript
OPENING: {
  duration: 1200,

  response: {
    // Не burst радости — тихое принятие
    type: 'gentle_acceptance'
  },

  animation: {
    eyeBlink: { at: 200, duration: 300 },  // доверительный blink
    hapticPulse: { at: 0, pattern: 'warm_single' },  // 50ms мягкая
    soundShift: { at: 0, type: 'tonal_lift', duration: 1000 }
    // Мир изменился — subtle shift в тональности
  },

  exit: {
    condition: 'duration_elapsed',
    action: 'transition_to_LIVING'
  },

  sideEffects: {
    localStorage: { 'sphere_awakened': 'Date.now()' },
    analytics: { event: 'onboarding_complete' }
  }
}
```

---

### State Machine: Splash (повторные запуски)

```javascript
RETURNING: {
  duration: { min: 1500, max: 2500 },

  philosophy: 'Существо помнит тебя',

  visuals: {
    // Всё быстрее — уже знакомы
    darkness: 300,  // ms
    glowAppear: 500,
    particlesFadeIn: 800
  },

  eye: {
    // Сразу знает где ты — смотрит в камеру
    lookTarget: 'camera_center',
    recognitionBlink: true  // "я тебя помню"
  },

  audio: {
    fadeIn: { duration: 800 }
  },

  exit: {
    condition: 'duration_elapsed',
    action: 'auto_start'  // без ожидания касания
  }
}
```

---

## Часть 2: Error Handling & Fallbacks

### AudioContext заблокирован

```javascript
audioBlocked: {
  detection: 'AudioContext.state === "suspended" after 2000ms',

  fallback: {
    action: 'continue_without_audio',
    flag: 'audioFailed = true',
    visualCompensation: {
      coreGlowIntensity: 1.3,  // усилить визуал
      particlePulse: true
    }
  },

  recovery: {
    onFirstTouch: 'AudioContext.resume()',
    onSuccess: 'audioFailed = false, fade_in_audio'
  }
}
```

### WebGL/Render failed

```javascript
renderFailed: {
  detection: 'particleSystem.ready === false after 3000ms',

  fallback: {
    action: 'show_minimal_fallback',
    // CSS-only версия: градиентный круг + CSS animation
    element: '#fallback-sphere'
  },

  retry: { attempts: 2, interval: 1000 }
}
```

### Visibility change (свернули приложение)

```javascript
visibilityChange: {
  detection: 'document.visibilityState === "hidden"',

  action: { pause: 'all_animations_and_timers' },

  onReturn: {
    if_early_state: 'restart_current_state',
    if_late_state: 'continue_from_pause'
  }
}
```

### Global timeout

```javascript
globalTimeout: {
  detection: 'any_state_duration > 15000',

  action: {
    log: 'error_to_analytics',
    force: 'skip_to_OPENING'
    // Лучше показать сферу с багом, чем чёрный экран
  }
}
```

---

## Часть 3: Accessibility

### Reduced Motion

```javascript
reducedMotion: {
  detection: 'prefers-reduced-motion: reduce',

  adaptations: {
    VOID: { duration: { min: 500, max: 800 } },
    RESONANCE: {
      // Instant появление вместо fade
      particleOpacity: { duration: 0 },
      coreGlowIntensity: { duration: 0 }
    },
    MEETING: {
      // Пропустить searching, сразу recognition
      phases: ['recognition', 'sacred_pause']
    },
    THRESHOLD: {
      reminder: 'opacity_pulse'  // вместо scale
    },
    totalDuration: '~3 sec'
  }
}
```

### Deaf/Hard of Hearing

```javascript
noAudio: {
  detection: 'audioFailed OR user_preference',

  adaptations: {
    VOID: {
      visualBreathing: {
        element: 'subtle_vignette_pulse',
        frequency: 0.15
      }
    },
    RESONANCE: {
      coreGlowPulse: true,
      particleBreathing: true
    },
    OPENING: {
      colorShift: { to: 'slightly_warmer', duration: 1000 }
    }
  }
}
```

### Screen Reader

```javascript
screenReader: {
  announcements: {
    VOID: 'Загрузка...',
    RESONANCE: 'Что-то просыпается...',
    MEETING: 'Оно вас заметило.',
    THRESHOLD: 'Коснитесь экрана для продолжения.',
    OPENING: 'Связь установлена.'
  },

  element: '<div aria-live="polite" class="sr-only" id="onboarding-announcer">'
}
```

---

## Часть 4: Cyberpunk UI

### Расположение

```
┌─────────────────────────────┐
│ [sound]             [gear]  │  ← 16px от краёв
│                             │
│                             │
│         ( сфера )           │
│                             │
│                             │
│          [entity]           │  ← 80px от низа
│         ═══════════         │  ← swipe hint
└─────────────────────────────┘
```

### Стилистика: Subtle Glassmorphism

```css
.glass {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
}

.glass-button {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.15s;
}

.glass-button:active {
  opacity: 0.7;
  transform: scale(0.95);
}

.glass-button svg {
  width: 20px;
  height: 20px;
  fill: rgba(255, 255, 255, 0.9);
}
```

### Компоненты

#### SoundToggle (левый верх)

```javascript
SoundToggle: {
  size: '44x44px',
  position: 'top-left, 16px offset',

  states: {
    ON: 'speaker_with_waves_icon',
    OFF: 'speaker_muted_icon'
  },

  behavior: {
    tap: 'toggle_mute',
    onMute: 'SampleSoundSystem.setMasterVolume(0)',
    onUnmute: 'fade_in_300ms'
  }
}
```

#### SettingsButton (правый верх)

```javascript
SettingsButton: {
  size: '44x44px',
  position: 'top-right, 16px offset',
  icon: 'gear',

  tap: 'open_SettingsModal',

  modal: {
    animation: 'slide_down_from_button',
    close: 'tap_outside OR swipe_up'
  }
}
```

#### SettingsModal — Progression System

```javascript
SettingsModal: {
  // Фичи разблокируются по мере trust/времени

  content: {
    always: ['About', 'Credits'],

    unlock_5min: ['Character Panel toggle'],

    unlock_trust_03: ['Visual themes (locked preview)'],

    unlock_trust_06: ['Advanced settings (breath speed, etc)'],

    secret: ['???']
  }
}
```

#### EntitySwitcher (низ, центр)

```javascript
EntitySwitcher: {
  size: '48x48px',
  position: 'bottom-center, 80px from bottom',

  states: {
    SPHERE: 'circle_icon',
    BEETLE: 'beetle_icon'
  },

  behavior: {
    tap: 'cycle_entities',
    longPress: 'open_selector (when 3+ entities)',
    onSwitch: 'TransformationManager.transform(entity)'
  },

  visual: {
    glowOnNewEntity: true  // когда разблокирована новая сущность
  }
}
```

---

## Часть 5: Структура файлов

```
src/
├─ main.js                    # Entry (изменения)
├─ OnboardingManager.js       # NEW
│
├─ ui/                        # NEW
│   ├─ UIManager.js           # Координатор
│   ├─ GlassButton.js         # Base component
│   ├─ SoundToggle.js
│   ├─ SettingsButton.js
│   ├─ SettingsModal.js
│   └─ EntitySwitcher.js
│
├─ CharacterPanel.js          # Существует
└─ ...
```

---

## Часть 6: Интеграция с main.js

### Текущий flow (удаляется)

```
clickToStart.click → _start()
```

### Новый flow

```
App constructor
    ↓
_initOnboarding()
    ↓
OnboardingManager.start()
    ↓
┌─────────────────┬─────────────────┐
│ первый запуск   │ повторный       │
│ VOID→RESONANCE→ │ RETURNING→      │
│ MEETING→        │ auto_start      │
│ THRESHOLD→      │                 │
│ (touch)         │                 │
└────────┬────────┴────────┬────────┘
         ↓                 ↓
      OPENING          _start()
         ↓                 ↓
      _start()         UIManager.show()
         ↓
   UIManager.show() (после 1.5s паузы)
```

### Код изменений

```javascript
// УДАЛИТЬ из main.js:
// - clickToStart element
// - _bindEvents для click-to-start

// ДОБАВИТЬ:
_initOnboarding() {
  this.onboarding = new OnboardingManager({
    scene: this.scene,
    camera: this.camera,
    particleSystem: this.particleSystem,
    livingCore: this.livingCore,
    eye: this.eye,
    onComplete: () => this._start()
  })

  this.uiManager = new UIManager({
    onSoundToggle: (muted) => { /* ... */ },
    onEntitySwitch: (entity) => { /* ... */ }
  })

  this.uiManager.hide()
  this.onboarding.start()
}

_start() {
  // Существующая логика...

  this.uiManager.setSoundManager(this.soundManager)
  this.uiManager.setTransformManager(this.transformManager)

  setTimeout(() => {
    this.uiManager.show()
  }, 1500)
}
```

---

## Часть 7: CSS дополнения

```css
/* ═══════════════════════════════════════
   UI LAYER
   ═══════════════════════════════════════ */

.ui-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  opacity: 0;
  transition: opacity 0.5s ease;
}

.ui-layer.visible {
  opacity: 1;
}

.ui-layer > * {
  pointer-events: auto;
}

.ui-top-left {
  position: absolute;
  top: 16px;
  left: 16px;
}

.ui-top-right {
  position: absolute;
  top: 16px;
  right: 16px;
}

.ui-bottom-center {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
}

/* ═══════════════════════════════════════
   SETTINGS MODAL
   ═══════════════════════════════════════ */

.settings-modal {
  position: absolute;
  top: 70px;
  right: 16px;
  width: 280px;
  max-height: 400px;
  overflow-y: auto;

  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;

  opacity: 0;
  transform: translateY(-10px);
  transition: opacity 0.2s, transform 0.2s;
}

.settings-modal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ═══════════════════════════════════════
   ACCESSIBILITY
   ═══════════════════════════════════════ */

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (prefers-reduced-motion: reduce) {
  .glass-button {
    transition: none;
  }

  .ui-layer {
    transition: none;
  }

  .settings-modal {
    transition: none;
  }
}
```

---

## Expert Panel Assessment

| Dimension | Score |
|-----------|-------|
| Vision & Philosophy | 9/10 |
| Requirements Clarity | 8/10 |
| Architecture | 7/10 |
| Testability | 7/10 |
| Completeness | 8/10 |

**Approved for implementation.**

---

## Implementation Order (HOOK)

```
M1: OnboardingManager core
M2: VOID + RESONANCE states
M3: MEETING + THRESHOLD states
M4: OPENING + Splash
M5: UI components (GlassButton, SoundToggle)
M6: SettingsButton + Modal
M7: EntitySwitcher
M8: Integration + cleanup
```
