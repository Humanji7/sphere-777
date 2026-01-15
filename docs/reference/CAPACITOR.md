# Handoff: Capacitor Setup

**Дата:** 2026-01-13
**Цель:** Собрать APK и протестировать на Android (Pixel)

---

## Контекст

Философия v2 зафиксирована. Следующий шаг — перенос на мобильную платформу через Capacitor.

**Почему Capacitor:**
- Текущий код (Three.js + Web Audio) работает в WebView
- Доступ к нативным API (вибрация, storage)
- APK/AAB для Play Store

---

## Задачи

### 1. Установка Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npx cap init "Sphere 777" "com.sphere777.app"
```

### 2. Добавить Android
```bash
npx cap add android
```

### 3. Конфигурация
`capacitor.config.ts`:
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sphere777.app',
  appName: 'Sphere 777',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
```

### 4. Сборка и синхронизация
```bash
npm run build
npx cap sync android
```

### 5. Открыть в Android Studio
```bash
npx cap open android
```

### 6. Собрать APK
В Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s)

---

## Возможные проблемы

### Производительность
- 5000 частиц могут тормозить на среднем Android
- Решение: уменьшить до 2000-3000 если нужно

### Web Audio в WebView
- Может быть latency 50-150ms
- Решение: тестировать, при необходимости Capacitor plugin

### Вибрация
- Текущий HapticManager использует navigator.vibrate()
- Может понадобиться @capacitor/haptics для лучшего контроля

---

## Тестирование

**Устройство:** Pixel (Android)

**Чеклист:**
- [ ] APK устанавливается
- [ ] Сфера рендерится
- [ ] 60 FPS или близко
- [ ] Жесты работают (touch)
- [ ] Звук работает
- [ ] Вибрация работает

---

## Файлы для внимания

| Файл | Что проверить |
|------|---------------|
| `vite.config.js` | base path для Capacitor |
| `src/HapticManager.js` | Может понадобиться Capacitor Haptics |
| `src/SampleSoundSystem.js` | Web Audio в WebView |

---

## После успешной сборки

1. Протестировать производительность
2. Записать результаты
3. Если ОК — переходить к онбордингу
4. Если тормозит — оптимизировать (меньше частиц, LOD)

---

## Ссылки

- [Capacitor Docs](https://capacitorjs.com/docs)
- [Capacitor + Vite](https://capacitorjs.com/docs/getting-started/with-vite)
- `docs/plans/2026-01-13-techno-pet-philosophy.md` — философия v2
