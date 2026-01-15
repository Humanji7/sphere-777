# Unity Migration Plan: sphere-777

**Создано:** 2026-01-15
**Цель:** Миграция с Three.js + Capacitor на Unity для 60 FPS на mobile

---

## Почему Unity

| Критерий | Three.js + Capacitor | Unity Native |
|----------|---------------------|--------------|
| FPS на mobile | 30-45 (WebView overhead) | 60 стабильно |
| Particle systems | Ручной код | VFX Graph |
| Анимации | Ручной код | Animator |
| AI-assisted dev | Ограничено | MCP Unity (30+ tools) |

**Источники:**
- [Unity MCP Server](https://github.com/CoderGamester/mcp-unity)
- [My Talking Tom: Unity → Starlite](https://outfit7.com/blog/tech/building-the-ultimate-mobile-game-engine-starlite)

---

## Требования

| Компонент | Версия |
|-----------|--------|
| Unity | 6.0+ LTS |
| Node.js | 18+ |
| npm | 9+ |

### MCP Unity Setup

```bash
# Unity Package Manager → "+" → Add git URL:
https://github.com/CoderGamester/mcp-unity.git

# Claude Code config:
{
  "mcpServers": {
    "mcp-unity": {
      "command": "node",
      "args": ["/path/to/mcp-unity/Server~/build/index.js"]
    }
  }
}
```

---

## Scope миграции

### P0 — MVP (День 1-3)

| Система | Unity инструмент |
|---------|------------------|
| Particle Sphere (5000) | VFX Graph |
| Eye (радужка, зрачок, моргание) | Sprite + Animator |
| Emotion State Machine | C# FSM |
| Gesture Input (9 типов) | Input System |

### P1 — Life Systems (День 4-5)

| Система | Unity инструмент |
|---------|------------------|
| LivingCore (3 glow layers) | Shader Graph |
| PulseWaves (12 rings) | VFX Graph |
| IdleAgency (mood states) | C# state machine |
| OrganicTicks | Coroutines |
| BioticNoise | Mathf.PerlinNoise |

### P2 — Polish (День 6-7)

| Система | Unity инструмент |
|---------|------------------|
| Sound System (7 layers) | Audio Mixer + C# |
| Haptic feedback | Vibration API |
| Onboarding/Anamnesis | Timeline |
| UI | UI Toolkit |

### Не переносим (YAGNI)

- BeetleShell transform — позже
- MemoryManager (trust/traces) — упростить
- NeuralConnections — визуальный шум
- UmbilicalSystem — только онбординг

---

## План по дням

### День 1: Валидация

```
□ Установить Unity 6 LTS
□ Создать проект "sphere-unity"
□ Установить MCP Unity package
□ Подключить Claude Code к Unity
□ Тест: "Create sphere with 1000 particles"
□ Build APK → тест FPS на телефоне
```

**Критерий успеха:** 60 FPS с частицами на Android

### День 2-3: Core Systems

```
□ Particle Sphere (VFX Graph, 5000 частиц, Fibonacci)
□ Eye (sprite, pupil tracking, blink)
□ Emotion FSM (peace → tension → bleeding → trauma)
□ Touch Input (tap, hold, swipe, pinch)
□ Camera setup
```

### День 4-5: Life Systems

```
□ LivingCore (Shader Graph, 3 glow layers)
□ PulseWaves (VFX Graph, 12 rings)
□ IdleAgency (mood progression)
□ OrganicTicks (twitch, stretch, shiver)
□ BioticNoise (drift, jitter, pauses)
```

### День 6-7: Polish + Sound

```
□ Sound System (Audio Mixer, 7 layers)
□ Haptic feedback
□ Onboarding sequence (Timeline)
□ UI (Settings, About)
□ Final APK build + тестирование
```

### День 8-10: Буфер

Баги, оптимизация, edge cases.

---

## Структура проекта

```
sphere-unity/
├── Assets/
│   ├── Scripts/
│   │   ├── Core/
│   │   │   ├── SphereController.cs
│   │   │   ├── EmotionStateMachine.cs
│   │   │   └── InputHandler.cs
│   │   ├── Life/
│   │   │   ├── IdleAgency.cs
│   │   │   ├── OrganicTicks.cs
│   │   │   └── BioticNoise.cs
│   │   ├── Visual/
│   │   │   ├── EyeController.cs
│   │   │   └── LivingCore.cs
│   │   └── Audio/
│   │       └── SoundManager.cs
│   ├── VFX/
│   │   ├── ParticleSphere.vfx
│   │   └── PulseWaves.vfx
│   ├── Shaders/
│   │   └── LivingCoreGlow.shadergraph
│   ├── Prefabs/
│   │   └── Sphere.prefab
│   └── Scenes/
│       └── Main.unity
├── Packages/
└── ProjectSettings/
```

---

## Принципы

- **Один файл < 300 строк**
- **ScriptableObjects** для конфигов
- **Events** вместо прямых зависимостей
- **VFX Graph** вместо кастомных шейдеров

---

## Следующий шаг

1. Установить Unity 6 LTS
2. Создать проект
3. Установить MCP Unity
4. День 1 валидация
