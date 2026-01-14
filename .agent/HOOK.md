# HOOK: Onboarding + Cyberpunk UI

**Spec:** `docs/plans/2026-01-14-onboarding-ui-design.md`
**Status:** ACTIVE

---

## Molecules

### M1: OnboardingManager core
- [ ] Создать `src/OnboardingManager.js`
- [ ] State machine structure (states, transitions)
- [ ] localStorage check (awakened vs first time)
- [ ] Event emitter pattern для связи с компонентами
**Files:** 1
**Commit:** `M1: OnboardingManager core structure`

### M2: VOID + RESONANCE states
- [ ] VOID: темнота, subtle shader noise, audio init
- [ ] RESONANCE: breathing sync, glow появление
- [ ] Exit conditions с измеримыми порогами
- [ ] Fallback таймеры
**Files:** 1 (OnboardingManager.js)
**Commit:** `M2: VOID and RESONANCE states`

### M3: MEETING + THRESHOLD states
- [ ] MEETING: eye focus, wander, recognition, sacred pause
- [ ] THRESHOLD: wait for touch, reminders, give up
- [ ] Eye integration (blur→focus, look target)
**Files:** 1-2 (OnboardingManager.js, возможно Eye.js)
**Commit:** `M3: MEETING and THRESHOLD states`

### M4: OPENING + Splash
- [ ] OPENING: gentle response, blink, haptic, sound shift
- [ ] Splash mode для повторных запусков
- [ ] sideEffects: localStorage, analytics hook
**Files:** 1
**Commit:** `M4: OPENING state and splash mode`

### M5: UI base + SoundToggle
- [ ] Создать `src/ui/UIManager.js`
- [ ] Создать `src/ui/GlassButton.js`
- [ ] Создать `src/ui/SoundToggle.js`
- [ ] CSS: glassmorphism styles
**Files:** 3 + CSS
**Commit:** `M5: UI infrastructure and SoundToggle`

### M6: SettingsButton + Modal
- [ ] Создать `src/ui/SettingsButton.js`
- [ ] Создать `src/ui/SettingsModal.js`
- [ ] Progression system (unlock по trust/time)
**Files:** 2
**Commit:** `M6: SettingsButton and modal`

### M7: EntitySwitcher
- [ ] Создать `src/ui/EntitySwitcher.js`
- [ ] Integration с TransformationManager
- [ ] Visual: glow on new entity
**Files:** 1
**Commit:** `M7: EntitySwitcher component`

### M8: Integration + cleanup
- [ ] Изменить main.js: удалить click-to-start, добавить _initOnboarding
- [ ] Удалить #click-to-start из HTML
- [ ] Test full flow (onboarding → UI → interaction)
- [ ] Accessibility: reduced motion, screen reader
**Files:** 2-3 (main.js, index.html, style.css)
**Commit:** `M8: integration and cleanup`

---

## Progress

| Molecule | Status |
|----------|--------|
| M1 | pending |
| M2 | pending |
| M3 | pending |
| M4 | pending |
| M5 | pending |
| M6 | pending |
| M7 | pending |
| M8 | pending |

---

## Notes

- Каждая молекула = 1 коммит
- Между молекулами: `git status`, проверка работоспособности
- При 5+ файлов или 10+ tool calls → handoff
