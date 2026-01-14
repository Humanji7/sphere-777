# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-14 (вечер)

---

## Последняя сессия: Onboarding Fix + Safe Area

### Сделано

#### 1. Онбординг сокращён до ~10 сек
**Проблема:** Онбординг длился 15+ секунд, сфера не реагировала на касания.
**Решение:**
- VOID: 0.6–1 сек (было 1.5–3)
- RESONANCE: 1.8 сек анимация (было 2.5), timeout 2.5 сек (было 6)
- MEETING: ускорены фазы (focusing 600–900ms, searching 800–1200ms)
- **THRESHOLD пропущен** — сразу переход к OPENING (убрано ожидание касания)
- RETURNING (повторные визиты): 1.2–1.8 сек (было 1.5–2.5)
- Global timeout: 10 сек (было 15)

**Файлы:** `src/OnboardingManager.js`

#### 2. UI кнопки — safe-area-inset-top
**Проблема:** Верхние кнопки (звук, настройки) скрыты под "бровью" телефона.
**Решение:** Добавлен `env(safe-area-inset-top)` для `.ui-top-left`, `.ui-top-right`, `.settings-modal`.

**Файлы:** `style.css`

#### 3. APK собран
- Debug APK: `sphere-777-v1.0-debug.apk` (18 MB)
- Команда: `JAVA_HOME="..." ./gradlew assembleDebug`

---

## Для следующей сессии

### Backlog: Режиссура частиц (Onboarding v2)
**Идея:** Красивое "нарядное" появление сферы — не типичное для обычного поведения.
- Специальная анимация частиц при первом появлении
- Отдельная от emotion-based поведения режиссура
- Возможно: частицы собираются из хаоса в сферу

### Backlog: Психоделик-эстетика визуального движка
**Spec:** `docs/VISION.md` → раздел "Визуальное направление"
**Цель:** Обогащение визуала до психоделик-уровня
- Всё дышит (более выраженное)
- Фрактальные паттерны
- Многослойность (микро + макро одновременно)
- Частицы как формы (не только точки — кольца, спирали, волны)
- Шейдерные эффекты: distortion, chromatic aberration, glow trails

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
- iOS Capacitor setup (`docs/BACKLOG_IOS_SETUP.md`)
- Release APK с подписью для Google Play

---

## История последних коммитов

| Коммит | Описание |
|--------|----------|
| 1404fd4 | AccelerometerManager + Settings toggles |
| c85b491 | EmotionRing — живое кольцо вокруг EntitySwitcher |
| 30624b5 | Compact mobile settings + onboarding polish |
| e036029 | Capacitor Android setup + platform-specific scaling |
| 73b23e0 | L7 Glitch fix + debug UI |

---

## Архитектура (краткая)

```
src/
├── main.js              # Entry, RAF loop, orchestration
├── Sphere.js            # Эмоции, координация систем
├── ParticleSystem.js    # 5000 частиц, GPU шейдеры
├── Eye.js               # Глаз с блюром, взглядом
├── LivingCore.js        # 3-слойное внутреннее свечение
├── OrganicTicks.js      # Автономные микро-движения
├── IdleAgency.js        # Инициатива при бездействии
├── OnboardingManager.js # State machine для пробуждения
├── AccelerometerManager.js # Motion: shake, tilt, jolt
├── InputManager.js      # Touch/mouse gestures
├── MemoryManager.js     # Trust/Memory persistence
├── HapticManager.js     # Вибрация
├── SampleSoundSystem.js # Sample-based звук с LFO
└── ui/
    ├── UIManager.js     # Координатор UI
    ├── SettingsModal.js # Настройки (About, Debug, Motion)
    ├── EntitySwitcher.js # Переключатель сущностей
    ├── EmotionRing.js   # Кольцо эмоций
    └── SoundToggle.js   # Mute/unmute
```

---

## Ключевые концепции

### 1. Gesture → Emotion
Жест определяет эмоцию. Тип движения, а не скорость.
- `Sphere.js` → `_processPeace()`, `emotionState`

### 2. Idle Agency
Сфера проявляет инициативу при бездействии (6+ сек idle → поворот к камере).
- `IdleAgency.js` — mood state machine

### 3. Living Core
3 слоя внутреннего свечения с разными ритмами дыхания.

### 4. OrganicTicks
Автономные микро-движения: twitch, stretch, shiver, glance.

### 5. EmotionRing
Визуальное кольцо вокруг EntitySwitcher, отражающее текущую эмоцию.
- peace → синий, медленное вращение
- tension → оранжевый, быстрый пульс
- trauma → красный, тряска
- healing → зелёный, мягкое свечение

---

## Debug консоль

```javascript
// Accelerometer
window.app.accelerometer.enable()
window.app.accelerometer.getState()
window.app.sphere.applyMotionGesture('shake', 20)

// EmotionRing
window.app.sphere._setEmotion('alert', 1, 0.1)
window.app.sphere._setEmotion('peace', 0, 0)

// Onboarding reset
localStorage.removeItem('sphere_awakened')
location.reload()

// Settings reset
localStorage.removeItem('sphere_motion')
localStorage.removeItem('sphere_debug_panel')
location.reload()
```

---

## Spec файлы

- `docs/plans/2026-01-14-accelerometer-design.md` — Accelerometer spec
- `docs/plans/2026-01-14-emotion-ring-design.md` — EmotionRing spec
- `docs/plans/2026-01-14-onboarding-ui-design.md` — Onboarding spec

---

## Build

```bash
# Dev
npm run dev
npm run dev -- --host  # + мобильный доступ

# Android APK
npm run build
npx cap sync android
cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug

# APK location
android/app/build/outputs/apk/debug/app-debug.apk
```
