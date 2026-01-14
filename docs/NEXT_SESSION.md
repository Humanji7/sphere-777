# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-14

---

## Для следующей сессии: Living UI — Микро-визуализатор

### Контекст

Debug panel со звуковой модуляцией (LFO bars) выглядит интересно — что-то живое, бегающее.
Хочется перенести эту идею в продакшн UI, но:
- Компактно (как новый Settings dropdown)
- Аккуратно (mobile-first)
- Отражает реальность (звук + эмоции)

### Промпт для размышления

```
Задача: Спроектировать "живой" UI элемент для мобильного приложения SPHERE

Референс: Текущий debug panel (#sound-debug) — LFO bars, Emotional State
Вдохновение: Киберпанк эстетика, но минималистичная

Вопросы для проработки:
1. ЧТО показывать?
   - Звуковые параметры (breath, pulse, shimmer)?
   - Эмоциональное состояние (peace, tension, healing)?
   - Или абстракция — просто "пульс" сферы?

2. ГДЕ размещать?
   - Угол экрана?
   - Полоска внизу/вверху?
   - Вокруг существующих кнопок?

3. КАК визуализировать?
   - Бегущие полоски (как сейчас)?
   - Пульсирующие точки?
   - Кольцо/дуга вокруг чего-то?
   - Минимальный график?

4. СКОЛЬКО информации?
   - Один параметр (главное состояние)?
   - 2-3 ключевых метрики?
   - Всё, но очень мелко?

Ограничения:
- Mobile-first (Capacitor app)
- Не отвлекать от сферы (она — главное)
- Размер: максимум 60-80px в любом измерении
- Читаемость не обязательна — достаточно "движения"
- Стилистика: НЕ debug, а часть живого UI

Результат: Концепт + эскиз (можно ASCII) + предложение по реализации
```

### Технический контекст

Данные доступны в реальном времени:
- `SampleSoundSystem.getLFOValues()` — ocean, breath, pulse, shimmer, drift
- `Sphere.emotionState` — peace, listening, tension, bleeding, trauma, healing
- `MemoryManager.getTrust()` — 0...1

---

## Последняя сессия: UI Polish + Compact Settings

**Сделано:**
- Settings modal → компактный dropdown (100px, English)
- Debug panel сдвинут ниже SoundToggle
- z-index исправлен (modal: 260)
- Текст 11px, минималистичные иконки

---

## Предыдущая сессия: Onboarding + UI (M1-M8 DONE)

### Что реализовано

**OnboardingManager (M1-M4):**
- State machine: VOID → RESONANCE → MEETING → THRESHOLD → OPENING → LIVING
- RETURNING mode для повторных запусков (быстрый splash)
- Opacity controls для ParticleSystem, LivingCore, Eye
- Eye blur эффект для "пробуждения"
- Accessibility: screen reader announcer, prefers-reduced-motion

**UI Components (M5-M7):**
```
src/ui/
├── GlassButton.js      # базовый glassmorphism button (44x44)
├── SoundToggle.js      # mute/unmute с иконками speaker
├── SettingsButton.js   # gear icon → открывает modal
├── SettingsModal.js    # настройки с progression system
├── EntitySwitcher.js   # sphere ↔ beetle (48x48)
└── UIManager.js        # координатор всех UI компонентов
```

**Integration (M8):**
- main.js: `_initOnboarding()`, `_onOnboardingComplete()`
- Onboarding → _start() → UIManager.show() (через 1.5s)
- index.html: удалён click-to-start, добавлен onboarding-announcer

### Протестировано в браузере

| Компонент | Статус |
|-----------|--------|
| Onboarding flow (first launch) | ✓ работает |
| RETURNING mode (repeat launch) | ✓ работает |
| SoundToggle (mute/unmute) | ✓ работает |
| SettingsModal (open/close) | ✓ работает |
| EntitySwitcher (sphere ↔ beetle) | ✓ работает |

### Фиксы во время тестирования

- `z-index: 250` для UI layer (был 100, перекрывался debug panel)
- `mute()/setVolume()` вместо `setMasterVolume()` для SampleSoundSystem

---

## Для старта следующей сессии

```
Проведи эстетическую проверку UI:
1. Запусти npm run dev
2. Открой http://localhost:5173
3. Пройди onboarding (или localStorage.removeItem('sphere_awakened') для сброса)
4. Оцени визуально:
   - Размер/позиция кнопок (SoundToggle, Settings, EntitySwitcher)
   - Glassmorphism стиль (прозрачность, blur, border)
   - Settings modal (шрифты, отступы, иконки)
   - Анимации появления UI
5. Запиши что нужно поправить
```

---

## Ключевые файлы

```
src/ui/                     # NEW — все UI компоненты
src/OnboardingManager.js    # state machine
src/main.js                 # integration
index.html                  # -click-to-start
style.css                   # UI стили (z-index: 250)
```

---

## Debug

```javascript
// Console
window.app.sampleSound.setGlitchEnabled(true/false)
window.triggerTransform('beetle')
window.returnToOrganic()

// Сброс onboarding:
localStorage.removeItem('sphere_awakened')
location.reload()

// Проверить UI:
window.app.uiManager.show()
window.app.uiManager.hide()
```

---

## Spec файл

`docs/plans/2026-01-14-onboarding-ui-design.md`
