# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-14

---

## Для следующей сессии: UI Fixes + Accelerometer

### Задачи

#### 1. Settings Modal — фикс закрытия после выбора
**Проблема:** При нажатии на пункт в Settings (About, Credits) модал сразу закрывается, ничего не показывая.

**Ожидаемое поведение:** Должен открываться контент выбранного пункта.

**Файл:** `src/ui/SettingsModal.js`

---

#### 2. Debug Panel — toggle для скрытия
**Задача:** Добавить возможность скрыть/показать LFO debug panel (sound-debug).

**Варианты:**
- Кнопка в Settings
- Скрытый жест (тройной тап в углу)
- Автоскрытие для production build

**Файл:** `index.html` (#sound-debug), `src/main.js`

---

#### 3. Accelerometer — новый слой interaction
**Идея:** Использовать акселерометр/гироскоп телефона для взаимодействия со сферой.

**Возможности:**
- Наклон телефона → сфера "катится" в сторону наклона
- Встряхивание → эмоциональная реакция (tension/trauma)
- Плавный поворот → сфера следит за движением

**Технический контекст:**
- Capacitor app (Android готов)
- DeviceMotion API или Capacitor Motion plugin
- Нужно учесть permission request на iOS

**Вопросы для проработки:**
```
1. Какой тип движения маппить на какую эмоцию?
   - Shake → tension/trauma?
   - Tilt → направление взгляда сферы?
   - Rotate → вращение particle system?

2. Как совмещать с touch input?
   - Приоритет touch над motion?
   - Или комбинированный эффект?

3. Sensitivity и thresholds
   - Какой угол наклона считать значимым?
   - Как отфильтровать случайные микро-движения?
```

---

## Последняя сессия: EmotionRing

**Сделано:**
- EmotionRing — живое кольцо вокруг EntitySwitcher
- 4 эмоциональных режима (peace/tension/trauma/healing)
- CSS conic-gradient с fallback
- Event-driven architecture (не polling)
- Accessibility: aria-live, prefers-reduced-motion

**Коммиты:**
- `ee63395` — дизайн-документ с expert review
- `c85b491` — имплементация

**Файлы:**
```
src/ui/EmotionRing.js      # NEW — компонент кольца
src/ui/UIManager.js        # интеграция wrapper
src/Sphere.js              # onEmotionChange callback
src/main.js                # event wiring
style.css                  # стили + анимации
```

---

## Ключевые файлы

```
src/ui/
├── EmotionRing.js      # эмоциональное кольцо
├── EntitySwitcher.js   # sphere ↔ beetle
├── SettingsModal.js    # настройки (нужен фикс)
├── SoundToggle.js      # mute/unmute
└── UIManager.js        # координатор

src/Sphere.js           # emotionState + onEmotionChange
src/main.js             # интеграция всего
index.html              # #sound-debug panel
```

---

## Debug

```javascript
// Console
window.app.sampleSound.setGlitchEnabled(true/false)
window.triggerTransform('beetle')
window.returnToOrganic()

// EmotionRing test:
window.app.sphere._setEmotion('tension', 1, 0.1)
window.app.sphere._setEmotion('bleeding', 1, 0.1)
window.app.sphere._setEmotion('peace', 0, 0)

// Сброс onboarding:
localStorage.removeItem('sphere_awakened')
location.reload()
```

---

## Spec файлы

- `docs/plans/2026-01-14-emotion-ring-design.md` — EmotionRing spec
- `docs/plans/2026-01-14-onboarding-ui-design.md` — Onboarding spec
