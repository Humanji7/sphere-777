# CURSOR STOPS RESPONDING — ✅ RESOLVED

## � BUG FIXED

**Symptom**: Курсор работает первые 2-3 секунды после запуска, затем перестаёт реагировать на сферу.

**Fixed**: 2026-01-11 14:45

---

## Root Cause

The `activeDecayTimer` in `InputManager.js` was designed for **mobile idle detection** — after touch ends, it decays `isActive` to `false` after 150ms so `IdleAgency` can detect idle state.

**Problem**: On desktop, the `_onMouseMove` handler **did not reset** `activeDecayTimer`. Since desktop never sets `isTouching = true`, the decay logic kicked in after just 150ms of "no touch", even though the mouse was still active.

---

## The Fix

Added timer reset in `_onMouseMove`:

```javascript
_onMouseMove(e) {
    const coords = this._normalizeCoords(e.clientX, e.clientY)
    this.position.x = coords.x
    this.position.y = coords.y
    this.isActive = true
    // Reset active decay timer (user is actively moving mouse)
    this.activeDecayTimer = 0  // ← NEW LINE
}
```

**File**: [`InputManager.js`](file:///Users/admin/projects/sphere-777/src/InputManager.js) — line 175

---

## Verification

Tested via Playwright:
- ✅ Mouse move resets `activeDecayTimer` to 0
- ✅ `isActive` stays `true` during continuous movement
- ✅ `isActive` correctly decays to `false` after 150ms of no movement
- ✅ Position tracking works as expected

---

## Lesson Learned

When adding mobile-specific fixes (like `activeDecayTimer` for touch idle detection), **always verify they don't break desktop behavior**. The decay timer was correctly reset on `touchstart` and `touchmove`, but the symmetric `mousemove` handler was missed.
