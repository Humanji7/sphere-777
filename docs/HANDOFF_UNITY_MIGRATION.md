# Handoff: Unity Migration — День 1 Complete

**Дата:** 2026-01-16
**Статус:** Валидация успешна ✅

---

## Что сделано

### День 1: Валидация ✅

| Задача | Статус |
|--------|--------|
| Unity 6.3 LTS установлен | ✅ |
| MCP Unity подключен | ✅ |
| Claude ↔ Unity работает | ✅ |
| 5000 частиц тест | ✅ 100-200 FPS |

### Результат бенчмарка

| Метрика | Three.js + Capacitor | Unity 6 |
|---------|---------------------|---------|
| FPS (5000 частиц) | 30-45 | **100-200** |
| CPU time | ~30ms | **5-10ms** |
| Улучшение | — | **3-6x** |

---

## Текущее состояние Unity проекта

**Путь:** `/Users/admin/projects/My project/`

**Сцена:** `SampleScene`
- Main Camera
- Global Light 2D
- TestSphere
- Sphere
- Particle System (5000 частиц, настроен)

**MCP Unity:** работает на порту 8090

**Конфиг Claude:** `/Users/admin/projects/sphere-777/.mcp.json`

---

## Следующие шаги (День 2-3)

### P0: Core Systems
```
□ Particle Sphere (VFX Graph, Fibonacci distribution)
□ Eye (sprite, pupil tracking, blink)
□ Emotion FSM (peace → tension → bleeding → trauma)
□ Touch Input (tap, hold, swipe, pinch)
□ Build APK → тест на Android
```

### Файлы-референсы из Three.js
```
src/Sphere.js           → EmotionStateMachine.cs
src/ParticleSystem.js   → VFX Graph
src/Eye.js              → EyeController.cs
src/InputManager.js     → InputHandler.cs
```

---

## Как продолжить

### 1. Открыть Unity
```
Unity Hub → My project → Open
```

### 2. Запустить MCP Server
```
Unity → Tools → MCP Unity → Server Window → Start Server
```

### 3. Запустить Claude в sphere-777
```
cd ~/projects/sphere-777
claude
```

---

## План миграции

**Полный план:** `docs/plans/2026-01-15-unity-migration.md`

| День | Задачи |
|------|--------|
| 1 | ✅ Валидация |
| 2-3 | Core: Particles, Eye, FSM, Input |
| 4-5 | Life: LivingCore, PulseWaves, IdleAgency |
| 6-7 | Polish: Sound, Haptics, Onboarding |
| 8-10 | Buffer: bugs, optimization |
