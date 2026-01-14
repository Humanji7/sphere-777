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
    // Note: Sphere uses 'peace', 'alert', 'trust', 'bleeding'
    // We map: peace→peace, alert→tension, trust→peace, bleeding→trauma
    this.emotionMap = {
      'peace': 'emotion-peace',
      'listening': 'emotion-peace',
      'alert': 'emotion-tension',
      'tension': 'emotion-tension',
      'trust': 'emotion-peace',
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
