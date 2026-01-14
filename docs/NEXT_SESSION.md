# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-14

---

## Последняя сессия: Capacitor + APK

### Что сделано
- Capacitor setup для Android
- APK собран и протестирован на Pixel
- Platform-specific scaling (camera + sphere scale для APK)
- Всё работает: рендер, touch, звук, вибрация

### Ключевые файлы
- `capacitor.config.json` — конфиг Capacitor
- `android/` — Android проект
- `src/main.js` → `_getPlatformConfig()` — настройки под платформу

### Workflow
```bash
# Web (Vercel)
npm run build && npx vercel --prod

# APK
npm run build && npx cap sync android
# Затем Run в Android Studio
```

---

## Следующая сессия: Визуал

### Приоритет 1: Онбординг "Пробуждение"

**Философия:** Set & Setting (без слов, без туториала)

```
Шаг 1: Тишина (2 сек)
├─ Чёрный экран
└─ Слабое дыхание (звук)

Шаг 2: Свет (3-4 сек)
├─ Центр — слабое свечение
└─ Пульсирует в ритме дыхания

Шаг 3: Пробуждение
├─ Свет усиливается → сфера
├─ Глаз открывается
└─ Находит пользователя

Шаг 4: Приглашение
├─ Сфера тянется к экрану
└─ Ждёт первого касания

Шаг 5: Первый контакт
├─ Пользователь касается
└─ Эмоциональный отклик
```

**Задачи:**
- [ ] OnboardingManager.js — state machine
- [ ] Анимация появления (opacity, scale)
- [ ] Синхронизация со звуком
- [ ] Первый launch detection (localStorage)

---

### Приоритет 2: Киберпанк UI

**Концепция:** Техно-стеклянные пузырьки

- Минималистичные меню по краям
- Glassmorphism эстетика
- Без текста где возможно

**Элементы:**
- [ ] Кнопка переключения сущностей (Сфера ↔ Жук)
- [ ] Настройки звука
- [ ] Панель характера (swipe up)

---

### Приоритет 3: Visual Enrichment

**Отдельный трек** — психоделик-эстетика:
- Фрактальность
- Частицы как формы
- Многослойность
- Color palettes

---

## Реализовано

### Core
- 5,000 частиц (2,000 на mobile)
- 6 эмоциональных фаз
- 9 жестов
- Глаз с отслеживанием
- Trust/Memory система

### Audio
- L1-L7 layers
- 5 LFO модуляторов
- Glitch система

### Organic Life
- OrganicTicks
- LivingCore
- IdleAgency
- HapticManager

### Mobile
- APK работает
- Platform-specific scaling
- iOS в бэклоге

---

## Debug

```javascript
// Console
window.app.sampleSound.setGlitchEnabled(true/false)
window.triggerTransform('beetle')
window.returnToOrganic()
```

---

## Backlog

- [ ] iOS setup (docs/BACKLOG_IOS_SETUP.md)
- [ ] Google Play публикация ($25 + 12 тестеров + 14 дней)
- [ ] Cloud sync (YAGNI для MVP)
