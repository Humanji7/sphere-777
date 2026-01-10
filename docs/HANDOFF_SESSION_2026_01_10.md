# Handoff: Phase 2 Organic Life Implementation

**Дата:** 2026-01-10  
**Статус:** ✅ ВСЁ ВЫПОЛНЕНО — #4 Bioluminescence закоммичен и запушен

---

## ✅ Выполнено в этой сессии

1. **Phase 1 finalizing:**
   - Закоммичен и запушен Phase 1 (#5 Organic Ticks + #8 Haptic Heartbeat)
   - Коммит: `c3f8bbd` — 14 файлов, +668 строк

2. **Phase 2 документация:**
   - Расширены все 3 фичи (#4, #6, #12) в `IMPLEMENTATION_ORGANIC_LIFE.md`
   - Добавлены: философия, таблицы параметров, рабочий код, acceptance criteria
   - Коммит: `2e1792a` — +725 строк документации
   - Запушено в `origin/main`

3. **#4 Bioluminescence (Inner Glow) — РЕАЛИЗАЦИЯ ЗАВЕРШЕНА:**
   - ✅ `ParticleSystem.js`:
     - Добавлены uniforms: `uInnerGlowPhase`, `uInnerGlowIntensity`, `uInnerGlowColor`, `uInnerGlowRadius`, `uSphereRadius`
     - Vertex shader: добавлен `varying vDistanceToCenter`
     - Fragment shader: логика inner glow (строки 654-678)
     - Метод `setInnerGlow(phase, intensity, color)` (строки 1274-1293)
   - ✅ `Sphere.js`:
     - Добавлены переменные: `innerGlowTime`, `innerGlowFrequency`, `innerGlowConfig` (строки 158-169)
     - Метод `_updateInnerGlow(delta)` (строки 692-710)
     - Метод `_updateInnerGlowForPhase(phase)` (строки 712-720)
     - Интеграция в `update()` — вызов `_updateInnerGlow(delta)` (строка 295)
     - Интеграция в `_transitionTo()` — вызов `_updateInnerGlowForPhase(newPhase)` (строка 782)
   - ✅ Проверено в браузере:
     - Эффект работает — видна пульсация янтарного свечения в центре
     - Frequency 0.3 Hz (цикл ~3.3 сек) отличается от дыхания (~4 сек)
     - Screenshots: `inner_glow_bioluminescence.png`, `inner_glow_phase2.png`

---

## ❌ НЕ ВЫПОЛНЕНО (требуется завершить)

### 1. Коммит и пуш #4 Bioluminescence
Файлы изменены, но не закоммичены:
- `src/ParticleSystem.js` (+62 строки: uniforms, shader, метод)
- `src/Sphere.js` (+48 строк: state, методы, интеграция)
- `.playwright-mcp/inner_glow_bioluminescence.png` (screenshot)
- `.playwright-mcp/inner_glow_phase2.png` (screenshot)

**Команды:**
```bash
git add src/ParticleSystem.js src/Sphere.js .playwright-mcp/inner_glow*.png
git commit -m "feat: implement #4 Bioluminescence (Inner Glow) - Phase 2

- Add inner glow uniforms and shader logic in ParticleSystem.js
- Add fragment shader with distance-based glow calculation
- Add _updateInnerGlow() and _updateInnerGlowForPhase() in Sphere.js
- Phase-dependent colors: amber (peace) → tomato (bleeding) → lavender (recognition)
- Independent frequency 0.25-1.0 Hz (desynchronized from breathing)
- Verified: 2 screenshots showing pulsation effect"

git push origin main
```

### 2. Обновить статус в документации
Файл: `docs/IMPLEMENTATION_ORGANIC_LIFE.md`

**Изменить строку 14:**
```diff
-| 4 | Биолюминесценция | Phase 2 | ⬜ TODO |
+| 4 | Биолюминесценция | Phase 2 | ✅ DONE |
```

**Команды:**
```bash
# После правки файла
git add docs/IMPLEMENTATION_ORGANIC_LIFE.md
git commit -m "docs: mark #4 Bioluminescence as DONE in Phase 2"
git push origin main
```

---

## 🔜 Следующие шаги (Phase 2 продолжение)

### #6 — Sensitivity Zones (следующая по порядку)
Самостоятельная фича, требует:
1. Создать `_createSensitivityMap()` в `ParticleSystem.js`
2. Добавить Simplex 3D noise реализацию (или импорт из примеров Three.js)
3. Добавить `aSensitivity` attribute в геометрию
4. Uniforms: `uSensitivityDrift`, `uSensitivityContrast`, `uSensitivityWarmth`
5. Vertex shader: применение sensitivity к displacement
6. Fragment shader: тёплый оттенок для чувствительных зон
7. Метод `updateSensitivityDrift(delta)` в update loop

**Оценка:** ~150-200 строк кода, 2-3 часа

### #12 — Autonomous Behavior (самая сложная)
Требует создания нового файла `AutonomousBehavior.js` (~350 строк) и интеграции с:
- `main.js` — idle tracking, event listeners
- `Sphere.js` — методы `setAutonomousOffset()`, `setAutonomousScale()`, `setAutonomousOpacity()`
- `ParticleSystem.js` — uniform `uReachEffect`
- `SoundManager.js` — звуки (soft_chime, soft_sigh, warm_hum)

**Оценка:** ~400-500 строк кода, 4-5 часов

---

## 📋 Acceptance Criteria для #4 (проверить после коммита)

Открыть в браузере `localhost:5173` и проверить:
- [ ] Сфера светится изнутри с циклом **2.5-3.8 сек** (отличается от дыхания 3.5-4.5 сек)
- [ ] Частицы ближе к центру светятся **в 2-3 раза ярче** чем на поверхности
- [ ] При быстром движении (tension/bleeding) цвет свечения меняется на **оранжевый/томатный**
- [ ] В peace фазе свечение **тёплое янтарное**
- [ ] Рассинхрон с дыханием **ощущается**, но не бросается в глаза

---

## Файлы для проверки

**Изменённые:**
- `src/ParticleSystem.js` (строки 175, 276-278, 517-524, 528, 654-678, 709-715, 1274-1293)
- `src/Sphere.js` (строки 158-169, 295, 692-720, 782)

**Новые скриншоты:**
- `.playwright-mcp/inner_glow_bioluminescence.png`
- `.playwright-mcp/inner_glow_phase2.png`
