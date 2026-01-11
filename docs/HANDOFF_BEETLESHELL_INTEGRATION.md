# BeetleShell Shader Integration — 2026-01-11

## Problem

BeetleShell имел две критические проблемы:

1. **"Серый ореол"** — LivingCore + Eye + частицы сферы оставались видимыми под жуком во время трансформации
2. **Нет интерактивности** — жук не реагировал на курсор, в отличие от органической сферы

## Solution

### 1. Visibility Management

Добавили систему скрытия компонентов в `TransformationManager`:

- `setComponents(livingCore, eye)` — регистрация компонентов для управления
- `_setLivingCoreOpacity()` / `_setEyeOpacity()` — управление прозрачностью
- Обновлён `_processTransition()` — LivingCore + Eye fade вместе с particles
- В shell-состоянии компоненты остаются скрытыми (opacity = 0)

### 2. Cursor Interactivity

Добавили cursor integration в `BeetleShell`:

**Shader uniforms:**
- `uCursorWorldPos` — позиция курсора в мировых координатах
- `uCursorInfluenceRadius` — радиус влияния (0.8)
- `uCursorInfluenceStrength` — сила glow (0.5 hover, 0.9 touch)

**Vertex shader:**
- Вычисляет `vCursorInfluence` через distance от курсора
- Передаёт в fragment shader

**Fragment shader:**
- Применяет **warm amber glow** (`vec3(1.0, 0.65, 0.25)`) при proximity
- Усиливает seam glow рядом с курсором

**Input forwarding:**
- `_forwardCursorToShell()` в TransformationManager делает raycast
- При попадании в mesh — устанавливает cursor position и glow intensity

## Files Changed

### Core Integration
- [TransformationManager.js](file:///Users/admin/projects/sphere-777/src/TransformationManager.js)
  - Added: `setComponents()`, `setInput()`, `_forwardCursorToShell()`
  - Added: `_setLivingCoreOpacity()`, `_setEyeOpacity()`
  - Modified: `_processTransition()`, `update()`

### Shell Enhancement  
- [BeetleShell.js](file:///Users/admin/projects/sphere-777/src/shells/BeetleShell.js)
  - Added cursor uniforms to material
  - Updated vertex shader (cursor influence calculation)
  - Updated fragment shader (amber glow effect)
  - Added: `setCursorWorldPos()`, `setCursorInfluence()`

### Application Setup
- [main.js](file:///Users/admin/projects/sphere-777/src/main.js)
  - Connected: `transformManager.setComponents(livingCore, eye)`
  - Connected: `transformManager.setInput(inputManager)`

## Visual Results

### ✅ Before/After: Grey Halo Fixed

**Before:** Particles + LivingCore visible behind beetle (grey halo effect)

**After:** Clean rendering, no artifacts

![Clean beetle rendering - no grey halo](file:///Users/admin/.gemini/antigravity/brain/0966af01-eb05-447c-9183-efd1e51dd819/beetleshell_fixed_no_halo.png)

### ✅ Cursor Glow Working

![Cursor glow on beetle surface](file:///Users/admin/.gemini/antigravity/brain/0966af01-eb05-447c-9183-efd1e51dd819/beetleshell_cursor_glow_working.png)

Warm amber-orange glow появляется при наведении курсора на поверхность жука.

## Verification

| Test | Status | Notes |
|------|--------|-------|
| No grey halo | ✅ Pass | LivingCore/Eye fully hidden |
| Cursor glow on hover | ✅ Pass | Amber glow at 0.5 intensity |
| Cursor glow on touch | ✅ Pass | Amber glow at 0.9 intensity |
| Raycast hit detection | ✅ Pass | 2 intersections at center |
| Smooth transitions | ✅ Pass | Fade in/out synchronized |

## Testing Commands

```javascript
// Trigger beetle transformation (with extended hold)
window.app.transformManager.shells.beetle.config.holdDuration = 120;
window.triggerTransform('beetle');

// Return to organic
window.returnToOrganic();

// Check cursor influence (while hovering beetle)
window.app.transformManager.shells.beetle.material.uniforms.uCursorInfluenceStrength.value
```

## Next Steps (Optional Enhancements)

1. **Mesh deformation** — добавить vertex displacement при cursor proximity
2. **Seam synchronization** — усилить seam pulsing рядом с курсором
3. **Sound integration** — звук при touch на BeetleShell
4. **Multiple shells** — применить тот же паттерн к drone/eye shells

## Status

🟢 **Complete** — BeetleShell полностью интегрирован в shader систему с интерактивностью
