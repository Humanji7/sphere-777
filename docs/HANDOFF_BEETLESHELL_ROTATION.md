# BeetleShell Cursor-Guided Rotation — Handoff 2026-01-11

## Что сделано

Добавлен **поворот BeetleShell к точке касания курсора** — жук теперь реагирует на палец не только свечением, но и ориентацией.

## Изменения

### [BeetleShell.js](file:///Users/admin/projects/sphere-777/src/shells/BeetleShell.js)

**Добавлено состояние:**
```javascript
this.targetWorldPoint = null
this.rotationSpeed = 3.0
this._targetQuat = new THREE.Quaternion()
this._currentQuat = new THREE.Quaternion()
```

**Новый метод:**
```javascript
setTargetRotationPoint(worldPos)
```

**Модифицирован `_animate()`:**
- Если есть `targetWorldPoint` → quaternion slerp к точке
- Если нет → auto-rotation (как раньше)

### [TransformationManager.js](file:///Users/admin/projects/sphere-777/src/TransformationManager.js)

В `_forwardCursorToShell()`:
```javascript
shell.setTargetRotationPoint?.(hit.point)  // при raycast hit
shell.setTargetRotationPoint?.(null)        // при уходе курсора
```

## Визуально

| До | После |
|----|-------|
| Жук светится при касании | Жук светится **и поворачивается** к пальцу |
| Только auto-rotation | Cursor-guided rotation с slerp |

## Тестирование

```javascript
// В консоли браузера:
window.triggerTransform('beetle')
// Провести курсор по жуку — наблюдать glow и rotation
```

## Скриншоты

![BeetleShell с cursor glow](/Users/admin/projects/sphere-777/.playwright-mcp/beetle_rotation_cursor_right.png)

## Возможные улучшения

1. **Увеличить `rotationSpeed`** — сейчас 3.0, можно до 5.0 для более резкого отклика
2. **Добавить vertex displacement** — деформация mesh в точке касания
3. **Assymetric rotation** — если модель жука симметричная, rotation менее заметен. Можно добавить asymmetric details в Blender

## Статус

🟢 **Готово** — BeetleShell имеет cursor-guided rotation
