# BeetleShell Cursor Glow Fix — 2026-01-11

## Problem

BeetleShell cursor glow был реализован в предыдущей сессии, но визуально **не был виден** при наведении курсора или тапе пальцем.

Пользователь тестировал мышкой — glow не появлялся.

## Root Cause Analysis

### Первоначальная гипотеза (неверная)
- Предположил, что проблема в mobile-специфичном поведении `isActive` decay
- Или что raycast не попадает в mesh

### Браузерная диагностика (через Playwright)

**Выявленные факты:**

1. ✅ **Raycast работает корректно** — `intersectsCount: 2`, попадания определяются
2. ✅ **Cursor forwarding работает** — `_forwardCursorToShell` вызывается каждый кадр
3. ✅ **Uniforms обновляются** — `uCursorWorldPos` получает актуальные координаты
4. ✅ **`uCursorInfluenceStrength` устанавливается** — 0.5 (hover) или 0.9 (touch)

**Но: shader glow визуально не виден!**

### Тесты с boosted параметрами

```javascript
// Установили вручную:
uCursorInfluenceRadius = 2.0  // было 0.8
uCursorInfluenceStrength = 1.0
```

**Результат:** Glow стал **отчётливо виден** (скриншот `beetleshell_boosted_glow.png`)

### Корневая причина

**Параметры glow были слишком слабыми для визуальной заметности:**

1. **`uCursorInfluenceRadius = 0.8`** — радиус влияния слишком мал
2. **Shader multiplier `* 0.5`** — additive blending слишком слабый
3. **Seam boost `* 0.3`** — дополнительный glow тоже слабый

При hover (0.5 strength) итоговый эффект: `cursorGlowColor * 0.5 * 0.5 = 0.25x` — практически невидим.

## Solution

Обновлены параметры в [BeetleShell.js](file:///Users/admin/projects/sphere-777/src/shells/BeetleShell.js):

### 1. Increased influence radius
```diff
-uCursorInfluenceRadius: { value: 0.8 }
+uCursorInfluenceRadius: { value: 1.5 }  // Larger radius for visible effect
```

### 2. Boosted shader additive multipliers
```diff
 // Fragment shader cursor glow section
-baseColor += cursorGlowColor * glowAmount * 0.5;
+baseColor += cursorGlowColor * glowAmount * 1.2;  // Boosted for visibility
 
-baseColor += uSeamGlowColor * glowAmount * 0.3;
+baseColor += uSeamGlowColor * glowAmount * 0.5;
```

**Новые эффективные множители:**
- Hover (0.5): `1.2 * 0.5 = 0.6x` — заметен
- Touch (0.9): `1.2 * 0.9 = 1.08x` — яркий

## Verification

### Browser testing (Playwright)
```javascript
// Beetle active, cursor hovering
{
  currentState: "beetle",
  cursorInfluence: 0.5,
  cursorRadius: 1.5  // ✅ новое значение применено
}
```

### Visual confirmation
![Cursor glow working](/Users/admin/projects/sphere-777/.playwright-mcp/beetleshell_cursor_glow_fixed.png)

**Янтарно-жёлтый glow виден справа** — эффект работает!

## Technical Details

### Cursor forwarding pipeline (работает корректно)

```
InputManager (mousemove/touchmove)
  ↓ updates position, sets isActive
TransformationManager.update()
  ↓ calls _forwardCursorToShell(activeShell)
Raycaster.intersectObject(shell.mesh)
  ↓ finds intersection points
shell.setCursorWorldPos(hit.point)
shell.setCursorInfluence(0.5 | 0.9)
  ↓ updates uniforms
Shader reads uniforms каждый кадр
  ↓ vertex shader вычисляет vCursorInfluence
  ↓ fragment shader применяет glow
```

### Shader glow logic

**Vertex shader:**
```glsl
float cursorDist = distance(vWorldPosition, uCursorWorldPos);
vCursorInfluence = 1.0 - smoothstep(0.0, uCursorInfluenceRadius, cursorDist);
// At center: influence = 1.0
// At radius edge: influence = 0.0
```

**Fragment shader:**
```glsl
if (uCursorInfluenceStrength > 0.0 && vCursorInfluence > 0.0) {
  float glowAmount = vCursorInfluence * uCursorInfluenceStrength;
  vec3 cursorGlowColor = vec3(1.0, 0.65, 0.25);  // Warm amber
  baseColor += cursorGlowColor * glowAmount * 1.2;  // Additive blend
  baseColor += uSeamGlowColor * glowAmount * 0.5;   // Boost seams too
}
```

## Files Changed

### Modified
- [BeetleShell.js](file:///Users/admin/projects/sphere-777/src/shells/BeetleShell.js)
  - Line 200: `uCursorInfluenceRadius: 1.5` (was 0.8)
  - Line 413: `* 1.2` (was * 0.5)
  - Line 416: `* 0.5` (was * 0.3)

## Status

🟢 **Fixed** — Cursor glow теперь визуально заметен при hover/touch на BeetleShell

## Next Steps (Optional)

1. **Touch intensity mapping** — использовать `touchIntensity` для динамической силы glow
2. **Vertex displacement** — добавить деформацию mesh при cursor proximity
3. **Sound feedback** — звук при касании BeetleShell
