# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-13

---

## Последняя сессия: Философия v2

### Что сделано
Зафиксирована новая философия и требования:
- `docs/plans/2026-01-13-techno-pet-philosophy.md` — полный документ

### Ключевые решения
1. **Продукт для людей** — не эксперимент
2. **Play Store** — цель (Capacitor)
3. **Три столпа**: не умирает, нет геймификации, уникальный характер
4. **MVP**: онбординг + 2 сущности + киберпанк UI + локальная память
5. **Cloud — YAGNI** — только localStorage для MVP
6. **Visual Enrichment** — отдельный трек (психоделик-эстетика)

---

## Реализовано

### Core
- 5,000 частиц с Fibonacci-распределением
- 6 эмоциональных фаз (PEACE → TRAUMA → HEALING)
- 9 жестов с Gesture → Emotion маппингом
- Глаз (радужка, зрачок, моргание, слежение)
- Trust/Memory система (localStorage)

### Audio (SampleSoundSystem)
- L1-L2: Foundation + Glass layers
- L4: Tail reverb
- L5: Breath
- L6: Formant (vowel morphing)
- L7: Glitch (bitcrush + stutter)
- 5 LFO модуляторов

### Organic Life
- OrganicTicks — 4 типа микро-движений
- LivingCore — 3 слоя внутреннего свечения
- IdleAgency — mood state machine
- HapticManager — 7 BPM паттернов

### Transformations
- Жук (BeetleShell) — работает
- Автопереключение (временно)

---

## Следующие шаги

### Приоритет 1: Capacitor Setup
```bash
npm install @capacitor/core @capacitor/cli
npx cap init
npx cap add android
```
- Собрать APK
- Протестировать на Pixel
- Проверить производительность 5000 частиц

### Приоритет 2: Онбординг
Сценарий "Пробуждение":
1. Чёрный экран + дыхание
2. Свет появляется
3. Сфера пробуждается
4. Первый контакт (stroke)
5. Свобода исследования

**Без слов. Без туториала. Без имени.**

### Приоритет 3: Киберпанк UI
- Техно-стеклянные пузырьки по краям
- Меню: звуки, характер, трансформации
- Минимализм + характер

### Приоритет 4: Персонализация
- 5 осей (темперамент, тембр, палитра, форма, память)
- Seed-based уникальность
- localStorage хранение

### Отдельный трек: Visual Enrichment
- Психоделик-эстетика
- Фрактальность
- Частицы как формы
- Многослойность

---

## Debug Commands

```javascript
// Console
window.app.sampleSound.setGlitchEnabled(true/false)
window.app.sampleSound.setVolume(0.5)
window.app.sampleSound.mute() / .unmute()

// Transform
window.triggerTransform('beetle')
window.returnToOrganic()
```

---

## Ключевые файлы

| Файл | Роль |
|------|------|
| `src/main.js` | Оркестрация, RAF loop, debug UI |
| `src/Sphere.js` | Эмоции, colorProgress, osmosisDepth |
| `src/SampleSoundSystem.js` | Audio layers, LFO, glitch |
| `src/InputManager.js` | Жесты, velocity, holdDuration |

---

## Документация

| Файл | Содержание |
|------|------------|
| `docs/VISION.md` | Краткое видение |
| `docs/plans/2026-01-13-techno-pet-philosophy.md` | Полная философия v2 |
| `docs/ARCHITECTURE.md` | Техническая архитектура |

---

## Команды

```bash
npm run dev              # Dev server
npm run dev -- --host    # + mobile
npm run build && npx vercel --prod  # Deploy web
```
