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

## Следующая сессия: Реализация Onboarding + UI

### Статус: HOOK ACTIVE

**Spec:** `docs/plans/2026-01-14-onboarding-ui-design.md`

**Молекулы:**
| # | Название | Статус |
|---|----------|--------|
| M1 | OnboardingManager core | pending |
| M2 | VOID + RESONANCE states | pending |
| M3 | MEETING + THRESHOLD states | pending |
| M4 | OPENING + Splash | pending |
| M5 | UI base + SoundToggle | pending |
| M6 | SettingsButton + Modal | pending |
| M7 | EntitySwitcher | pending |
| M8 | Integration + cleanup | pending |

**Для старта:** `Продолжи` или `M1`

---

### Backlog: Visual Enrichment

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
