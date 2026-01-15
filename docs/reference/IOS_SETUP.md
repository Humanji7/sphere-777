# Backlog: iOS Setup

**Приоритет:** Низкий (после Google Play)

---

## Требования

- Xcode (бесплатно из App Store)
- Apple Developer Account — $99/год для публикации

---

## Шаги

```bash
# 1. Добавить iOS платформу
pnpm add @capacitor/ios
npx cap add ios

# 2. Собрать и открыть в Xcode
pnpm run build && npx cap sync ios
npx cap open ios
```

**В Xcode:**
1. Подключить iPhone кабелем
2. Выбрать Apple ID в Signing
3. Нажать Run — установится на iPhone

---

## TestFlight (аналог Google Closed Testing)

- Нужен платный Apple Developer ($99/год)
- Загрузка в App Store Connect → TestFlight
- Тестеры устанавливают через TestFlight app
- Автообновления работают

---

## Workflow после изменений

```bash
pnpm run build && npx cap sync ios
```

Затем Run в Xcode.
