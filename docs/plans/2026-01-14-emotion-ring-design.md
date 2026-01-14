# EmotionRing — Design Specification

**Created:** 2026-01-14
**Status:** Approved after expert review
**Expert Panel:** Wiegers, Fowler, Nygard, Adzic

---

## 1. Overview

### Concept
Living ring around EntitySwitcher that visualizes Sphere's emotional state through color and animation.

### Visual Metaphor
The button "breathes" — user sees Sphere's mood at a glance without reading text.

### Dimensions
- Wrapper: 64x64px
- Ring thickness: 4px
- EntitySwitcher inside: 48x48px (unchanged)

---

## 2. Emotional Modes

| State | Color | Animation | Timing | Source |
|-------|-------|-----------|--------|--------|
| **Peace/Listening** | Cyan `#00d4ff` | Slow rotation | 3s cycle | `peace`, `listening` |
| **Tension** | Orange `#ff6b35` | Fast pulse | 0.8s cycle | `tension` |
| **Trauma/Bleeding** | Red `#ff2d55` | Shake + flicker | 0.3s chaotic | `trauma`, `bleeding` |
| **Healing** | Green `#34c759` | Gentle pulse + glow | 2s cycle | `healing` |

---

## 3. Technical Implementation

### 3.1 HTML Structure

```html
<div class="entity-wrapper" data-testid="entity-wrapper">
  <div class="emotion-ring emotion-peace"
       data-testid="emotion-ring"
       role="status"
       aria-live="polite"
       aria-label="Sphere feeling peaceful"></div>
  <button class="entity-switcher">...</button>
</div>
```

### 3.2 CSS — Base Styles

```css
.entity-wrapper {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 64px;
  height: 64px;
}

.emotion-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;

  /* Smooth transitions between emotions */
  transition: opacity 0.3s ease;

  /* Modern: conic-gradient with mask */
  background: conic-gradient(
    from 0deg,
    var(--ring-color),
    transparent 30%,
    var(--ring-color) 60%,
    transparent 90%
  );
  mask: radial-gradient(
    circle,
    transparent 22px,
    black 23px,
    black 31px,
    transparent 32px
  );
  -webkit-mask: radial-gradient(
    circle,
    transparent 22px,
    black 23px,
    black 31px,
    transparent 32px
  );
}

/* Fallback for browsers without conic-gradient */
@supports not (background: conic-gradient(red, blue)) {
  .emotion-ring {
    background: transparent;
    border: 3px solid var(--ring-color);
    mask: none;
    -webkit-mask: none;
  }
}

.entity-wrapper .entity-switcher {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
```

### 3.3 CSS — Emotion Modes

```css
/* Peace — slow rotation */
.emotion-ring.emotion-peace {
  --ring-color: #00d4ff;
  animation: ring-rotate 3s linear infinite;
}

/* Tension — fast pulse */
.emotion-ring.emotion-tension {
  --ring-color: #ff6b35;
  animation: ring-pulse 0.8s ease-in-out infinite;
}

/* Trauma — shake and flicker */
.emotion-ring.emotion-trauma {
  --ring-color: #ff2d55;
  animation: ring-shake 0.3s ease-in-out infinite,
             ring-flicker 0.15s steps(2) infinite;
}

/* Healing — gentle pulse with glow */
.emotion-ring.emotion-healing {
  --ring-color: #34c759;
  animation: ring-heal 2s ease-in-out infinite;
  box-shadow: 0 0 12px var(--ring-color);
}
```

### 3.4 CSS — Animations

```css
@keyframes ring-rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ring-pulse {
  0%, 100% {
    opacity: 0.6;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

@keyframes ring-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px); }
  75% { transform: translateX(2px); }
}

@keyframes ring-flicker {
  0% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes ring-heal {
  0%, 100% {
    opacity: 0.7;
    transform: scale(1);
    box-shadow: 0 0 8px var(--ring-color);
  }
  50% {
    opacity: 1;
    transform: scale(1.03);
    box-shadow: 0 0 16px var(--ring-color);
  }
}
```

### 3.5 CSS — Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .emotion-ring {
    animation: ring-pulse-simple 2s ease-in-out infinite !important;
  }

  @keyframes ring-pulse-simple {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }
}
```

---

## 4. JavaScript — EmotionRing.js

```javascript
/**
 * EmotionRing.js — Emotional ring around EntitySwitcher
 *
 * Visualizes Sphere emotionState through color and animation.
 * Uses CSS conic-gradient + animations with fallback.
 */

export class EmotionRing {
  constructor() {
    this.ring = null
    this.currentEmotion = 'peace'
    this._debounceTimer = null

    // State → CSS class mapping
    this.emotionMap = {
      'peace': 'emotion-peace',
      'listening': 'emotion-peace',
      'tension': 'emotion-tension',
      'bleeding': 'emotion-trauma',
      'trauma': 'emotion-trauma',
      'healing': 'emotion-healing'
    }

    // Aria labels for accessibility
    this.ariaLabels = {
      'emotion-peace': 'Sphere feeling peaceful',
      'emotion-tension': 'Sphere feeling tense',
      'emotion-trauma': 'Sphere in distress',
      'emotion-healing': 'Sphere healing'
    }
  }

  /**
   * Creates ring element (UIManager handles wrapper creation)
   * @returns {HTMLElement} Ring element to append to wrapper
   */
  create() {
    this.ring = document.createElement('div')
    this.ring.className = 'emotion-ring emotion-peace'
    this.ring.dataset.testid = 'emotion-ring'
    this.ring.setAttribute('role', 'status')
    this.ring.setAttribute('aria-live', 'polite')
    this.ring.setAttribute('aria-label', this.ariaLabels['emotion-peace'])

    return this.ring
  }

  /**
   * Updates emotion with debounce (300ms min between changes)
   * @param {string} emotionState - Sphere emotion state
   */
  setEmotion(emotionState) {
    if (emotionState === this.currentEmotion) return

    clearTimeout(this._debounceTimer)
    this._debounceTimer = setTimeout(() => {
      this._applyEmotion(emotionState)
    }, 300)
  }

  /**
   * Immediately applies emotion (internal use)
   */
  _applyEmotion(emotionState) {
    if (!this.ring) {
      console.warn('[EmotionRing] Ring not created')
      return
    }

    const newClass = this.emotionMap[emotionState] || 'emotion-peace'
    const oldClass = this.emotionMap[this.currentEmotion] || 'emotion-peace'

    if (newClass === oldClass) return

    this.ring.classList.remove(oldClass)
    this.ring.classList.add(newClass)
    this.ring.setAttribute('aria-label', this.ariaLabels[newClass])

    this.currentEmotion = emotionState
  }

  /**
   * Force immediate emotion change (skip debounce)
   */
  setEmotionImmediate(emotionState) {
    clearTimeout(this._debounceTimer)
    this._applyEmotion(emotionState)
  }

  hide() {
    if (this.ring) this.ring.style.opacity = '0'
  }

  show() {
    if (this.ring) this.ring.style.opacity = ''
  }

  destroy() {
    clearTimeout(this._debounceTimer)
    if (this.ring && this.ring.parentNode) {
      this.ring.parentNode.removeChild(this.ring)
    }
    this.ring = null
  }
}
```

---

## 5. Integration

### 5.1 UIManager.js Changes

```javascript
import { EmotionRing } from './EmotionRing.js'

// In constructor:
this.emotionRing = new EmotionRing()

// In _createUI(), replace EntitySwitcher creation:
_createEntitySwitcher() {
  // Create wrapper
  this.entityWrapper = document.createElement('div')
  this.entityWrapper.className = 'entity-wrapper'
  this.entityWrapper.dataset.testid = 'entity-wrapper'

  // Create ring and add to wrapper
  const ring = this.emotionRing.create()
  this.entityWrapper.appendChild(ring)

  // Create EntitySwitcher and add to wrapper
  this.entitySwitcher = new EntitySwitcher(...)
  this.entityWrapper.appendChild(this.entitySwitcher.button)

  // Add wrapper to container
  this.container.appendChild(this.entityWrapper)
}

// New public method:
updateEmotion(emotionState) {
  this.emotionRing.setEmotion(emotionState)
}
```

### 5.2 Sphere.js Changes (Event-driven)

```javascript
// In constructor:
this.onEmotionChange = null
this._lastEmittedEmotion = null

// In _updateEmotionState() or wherever emotionState changes:
if (this.emotionState !== this._lastEmittedEmotion) {
  this._lastEmittedEmotion = this.emotionState
  if (this.onEmotionChange) {
    this.onEmotionChange(this.emotionState)
  }
}
```

### 5.3 main.js Changes

```javascript
// In _start() after creating UIManager and Sphere:
this.sphere.onEmotionChange = (state) => {
  this.uiManager.updateEmotion(state)
}

// Initial state sync:
this.uiManager.updateEmotion(this.sphere.emotionState)
```

---

## 6. Acceptance Scenarios

```gherkin
Feature: EmotionRing visualization

Scenario: Initial state is peace
  Given app starts
  When UI is shown
  Then ring displays cyan color
  And ring rotates slowly (3s cycle)

Scenario: Emotion changes to tension
  Given ring shows peace (cyan)
  When Sphere.emotionState becomes "tension"
  Then ring color changes to orange (#ff6b35)
  And animation changes to pulse (0.8s cycle)
  And change happens within 300-600ms (debounce + transition)

Scenario: Rapid emotion changes are debounced
  Given ring shows peace
  When emotionState changes 5 times within 500ms
  Then only the final state is displayed
  And no visual glitching occurs

Scenario: Trauma state shows distress
  Given any current state
  When emotionState becomes "trauma" or "bleeding"
  Then ring turns red (#ff2d55)
  And ring shakes and flickers

Scenario: Healing shows recovery
  Given trauma state
  When emotionState becomes "healing"
  Then ring turns green (#34c759)
  And ring pulses with soft glow

Scenario: Reduced motion preference respected
  Given user has prefers-reduced-motion: reduce
  When any emotion is displayed
  Then only simple opacity pulse animation is used
  And no rotation, shake, or scale effects occur

Scenario: Fallback for unsupported browsers
  Given browser doesn't support conic-gradient
  When ring is displayed
  Then solid border is shown instead
  And color still reflects emotion
```

---

## 7. Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `src/ui/EmotionRing.js` | **Create** | 1 |
| `style.css` | **Add** styles | 2 |
| `src/ui/UIManager.js` | **Modify** integration | 3 |
| `src/Sphere.js` | **Add** onEmotionChange | 4 |
| `src/main.js` | **Wire** event | 5 |

---

## 8. Visual Reference

```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│                                         │
│                                         │
│            ████████████                 │
│          ██     ↻      ██  ← rotating   │
│         █   ┌────────┐   █    gradient  │
│         █   │ Entity │   █              │
│         █   │Switcher│   █  64x64       │
│         █   └────────┘   █  wrapper     │
│          ██   48x48    ██               │
│            ████████████                 │
│                 ↑                       │
│            Emotion Ring                 │
│     cyan / orange / red / green         │
└─────────────────────────────────────────┘
```

---

## 9. Expert Review Summary

| Issue | Status | Resolution |
|-------|--------|------------|
| No fallback for conic-gradient | ✅ Fixed | @supports query with border fallback |
| No transition between emotions | ✅ Fixed | CSS transition: opacity 0.3s |
| create() manipulates foreign DOM | ✅ Fixed | UIManager creates wrapper |
| No debounce for setEmotion() | ✅ Fixed | 300ms debounce timer |
| Polling in RAF loop | ✅ Fixed | Event-driven via onEmotionChange |
| Healing animation unclear | ✅ Fixed | Gentle pulse with glow |
| No acceptance criteria | ✅ Fixed | Gherkin scenarios added |
| No data-testid | ✅ Fixed | Added to ring and wrapper |
