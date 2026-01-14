# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-14

---

## Последняя сессия: UI Fixes + Accelerometer MVP

### Сделано

#### 1. Settings Modal — фикс закрытия
**Проблема:** При нажатии на пункт (About, Credits) модал закрывался.
**Причина:** Event bubbling — после innerHTML замены e.target удалялся из DOM, `contains()` возвращал false.
**Решение:** Добавлен `e.stopPropagation()` в `_bindEvents()`.

#### 2. Debug Panel — toggle в Settings
- Пункт "Debug" с ON/OFF индикатором
- Состояние сохраняется в `localStorage` (ключ: `sphere_debug_panel`)
- По умолчанию скрыт

#### 3. Accelerometer — MVP имплементация
- **AccelerometerManager.js** — новый модуль
- **Shake detection** → emotion alert (0.9, decay 1.5)
- **Jolt detection** → emotion alert (1.0, decay 2.0)
- **Motion toggle** в Settings с iOS permission request
- Состояние сохраняется в `localStorage` (ключ: `sphere_motion`)

**Файлы:**
```
src/AccelerometerManager.js     # NEW
src/main.js                     # integration
src/Sphere.js                   # applyMotionGesture()
src/ui/SettingsModal.js         # Motion + Debug toggles
src/ui/UIManager.js             # setAccelerometer()
docs/plans/2026-01-14-accelerometer-design.md  # spec
```

---

## Для следующей сессии

### Phase 2: Accelerometer Enhancements

1. **Tilt → visual effects**
   - Частицы "стекают" в сторону наклона (gravityOffset)
   - Глаз следит за направлением
   - LivingCore смещается

2. **Eye.startle() метод**
   - Визуальная реакция глаза на shake/jolt

3. **ParticleSystem.applyImpulse()**
   - Хаотичное смещение частиц при shake

### Другие задачи

- Тестирование на реальном мобильном устройстве
- Capacitor build с motion permissions

---

## Ключевые файлы

```
src/
├── AccelerometerManager.js  # motion input (shake, tilt, jolt)
├── Sphere.js                # applyMotionGesture(), emotionState
├── InputManager.js          # touch/mouse gestures
├── main.js                  # orchestration
└── ui/
    ├── SettingsModal.js     # Motion + Debug toggles
    └── UIManager.js         # UI coordination
```

---

## Debug

```javascript
// Console
window.app.accelerometer.enable()
window.app.accelerometer.getState()
window.app.sphere.applyMotionGesture('shake', 20)

// EmotionRing test:
window.app.sphere._setEmotion('alert', 1, 0.1)
window.app.sphere._setEmotion('peace', 0, 0)

// Сброс settings:
localStorage.removeItem('sphere_motion')
localStorage.removeItem('sphere_debug_panel')
location.reload()
```

---

## Spec файлы

- `docs/plans/2026-01-14-accelerometer-design.md` — Accelerometer spec
- `docs/plans/2026-01-14-emotion-ring-design.md` — EmotionRing spec
- `docs/plans/2026-01-14-onboarding-ui-design.md` — Onboarding spec
