# CURSOR STOPS RESPONDING — Handoff

## 🔴 CRITICAL BUG

**Symptom**: Курсор работает первые 2-3 секунды после запуска, затем перестаёт реагировать на сферу.

**Tested**: 2026-01-11 14:39

---

## Diagnosis Needed

### Possible Causes

1. **InputManager loses active state**
   - Check if `inputManager.isActive` becomes false
   - `activeDecayTimer` может сбрасывать состояние

2. **Cursor influence disabled**
   - `uCursorInfluenceStrength` может устанавливаться в 0
   - Проверить `EffectConductor` — может отключать cursor glow

3. **Event listeners removed**
   - `mousemove` / `touchmove` могут unbind

4. **Z-fighting or rendering issue**
   - Canvas может терять focus
   - Renderer может перестать обновляться

---

## Quick Diagnostic Code

```javascript
// В консоли браузера:
setInterval(() => {
  console.log({
    inputActive: window.app?.inputManager?.isActive,
    cursorStrength: window.app?.particleSystem?.material?.uniforms?.uCursorInfluenceStrength?.value,
    cursorOnSphere: window.app?.sphere?.cursorOnSphere,
    mousePos: window.app?.inputManager?.getState()?.position
  })
}, 1000)
```

---

## Files to Check

1. [`InputManager.js`](file:///Users/admin/projects/sphere-777/src/InputManager.js)
   - Lines 200-250: `activeDecayTimer` logic
   - Event binding/unbinding

2. [`Sphere.js`](file:///Users/admin/projects/sphere-777/src/Sphere.js)
   - Cursor proximity calculation
   - `cursorOnSphere` logic

3. [`EffectConductor.js`](file:///Users/admin/projects/sphere-777/src/EffectConductor.js)
   - May disable cursor effects

---

## Next Session Action

1. Open browser console
2. Run diagnostic code above
3. Watch values when cursor stops working
4. Identify which variable goes to 0
5. Fix the root cause
