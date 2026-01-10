# 🚀 HANDOFF: Phase 2 Organic Life — Продолжение

**Дата:** 2026-01-10  
**Для:** Следующей сессии с Claude/Cursor

---

## ✅ Что сделано

### Phase 1 (DONE)
- **#5 Organic Ticks** — 4 типа микро-движений (twitch, stretch, shiver, glance)
- **#8 Haptic Heartbeat** — живое сердцебиение, 7 BPM паттернов по фазам

### Phase 2 (DONE)
- **#4 Bioluminescence** ✅ — Inner glow с независимым ритмом
  - Коммит: `0bab499` — документация обновлена
  - Реализация в `ParticleSystem.js` и `Sphere.js`

- **#6 Sensitivity Zones** ✅ — Неоднородная плотность поверхности
  - Simplex 3D noise на CPU для карты чувствительности
  - `aSensitivity` attribute (0.4-1.6 range)
  - Все displacement эффекты масштабируются на sensitivity
  - Тёплый оттенок для чувствительных зон
  - Drift работает (~30-50 сек цикл)

---

## 🎯 Следующие задачи

### #12 — Autonomous Behavior (Инициатива от сферы)
**Оценка:** 4-5 часов, ~400-500 строк

**Что нужно сделать:**
1. Создать `src/AutonomousBehavior.js` — state machine для idle поведений
2. Поведения по idle time:
   - 30 сек: `sway` — покачивание
   - 60 сек: `search`/`invite`/`withdraw` (зависит от Trust)
   - 120 сек: `hide`/`reach` (зависит от Trust)
3. Интеграция в `main.js` — idle tracking, event listeners
4. Методы в `Sphere.js`: `setAutonomousOffset()`, `setAutonomousScale()`, `setAutonomousOpacity()`
5. Trust-модификаторы: возврат пользователя, принятие invite

**Acceptance Criteria:**
- Сфера покачивается после 30 сек idle
- При высоком Trust — тянется к экрану
- При низком Trust — сжимается/прячется
- Trust меняется от поведения пользователя

---

## 📂 Ключевые файлы

| Файл | Назначение |
|------|------------|
| `docs/IMPLEMENTATION_ORGANIC_LIFE.md` | Полные спецификации всех фич |
| `src/ParticleSystem.js` | Shader-логика, uniforms, sensitivity map |
| `src/Sphere.js` | Бизнес-логика, фазы, update loop |
| `src/OrganicTicks.js` | Автономные микро-движения |
| `src/HapticManager.js` | Вибрация телефона |

---

## � Коммит Sensitivity Zones

```
git add -A && git commit -m "feat(organic-life): add #6 Sensitivity Zones

- Add aSensitivity attribute with 3-octave simplex noise (0.4-1.6 range)
- Scale all displacement effects by adjustedSensitivity:
  - Breathing, noise, ripple, ticks, cursor attraction, osmosis
- Add warm color tint for sensitive zones in fragment shader
- Add updateSensitivityDrift() for slow organic zone migration (~30-50s cycle)
- Add setSensitivityContrast() and setSensitivityWarmth() methods

Phase 2 Organic Life: Sensitivity Zones complete"
```

---

## 💡 Промпт для начала следующей сессии

```
Продолжи реализацию Phase 2 Organic Life для sphere-777.

Следующая фича: #12 Autonomous Behavior (Инициатива от сферы).

Детальный план в docs/IMPLEMENTATION_ORGANIC_LIFE.md, секция "## #12 — Инициатива от сферы".

Краткое ТЗ:
1. Создать AutonomousBehavior.js — state machine
2. Поведения: sway (30s), search/invite/withdraw (60s), hide/reach (120s)
3. Trust-модификаторы для поведения
4. Интеграция в main.js и Sphere.js

После реализации — проверить в браузере localhost:5173.
```
