# Handoff: Unity Migration — День 2 Complete

**Дата:** 2026-01-17
**Статус:** Частицы работают, эмоции не визуализируются

---

## Что сделано

### День 1: Валидация ✅
- Unity 6.3 LTS установлен
- MCP Unity подключен
- 5000 частиц тест: 100-200 FPS

### День 2: Core Systems ✅
| Задача | Статус |
|--------|--------|
| EmotionStateMachine.cs | ✅ |
| InputHandler.cs | ✅ |
| EyeController.cs | ✅ |
| SphereController.cs | ✅ |
| SphereParticleController.cs | ✅ |
| Particle System в сцене | ✅ Дышит |
| Skill unity-sphere-vfx | ✅ Создан |

---

## Известная проблема: Частицы не меняют цвет

**Симптомы:**
- Частицы дышат (радиус пульсирует) ✅
- Debug info показывает gesture/velocity ✅
- Логи показывают смену эмоций (Peace ↔ Listening) ✅
- Цвет частиц НЕ меняется визуально ❌

**Причина:**
Эмоции застревают на Peace/Listening (colorProgress 0.0-0.1). Не достигают Tension/Bleeding.

**Что пробовали:**
- Уменьшили пороги: tensionVelocity 0.03, bleedingVelocity 0.06
- Всё равно не достаточно

**Что нужно проверить:**
1. Velocity в InputHandler — возможно нормализация неправильная
2. EmotionStateMachine логика перехода в Tension
3. SphereParticleController.UpdateColor() — применяется ли цвет к mainModule

---

## Unity проект

**Путь:** `/Users/admin/projects/My project/`

**Сцена:** `SampleScene`
```
├── Main Camera
├── Global Light 2D
├── Sphere (EmotionStateMachine, SphereController)
├── SphereParticles (ParticleSystem, SphereParticleController)
├── GameManager (InputHandler, debugMode=true)
├── SphereVFX (не используется)
└── TestSphere (не используется)
```

**Скрипты:** `Assets/Scripts/`
- EmotionStateMachine.cs
- InputHandler.cs
- EyeController.cs
- SphereController.cs
- SphereParticleController.cs

---

## Skill создан

**Путь:** `~/.claude/skills/unity-sphere-vfx/`

```
├── SKILL.md              # Документация MCP + Unity
├── references/
│   └── mcp-unity-tools.md
└── assets/templates/
    ├── VFXController.cs.template
    └── ParticleSystemController.cs.template
```

**Trigger:** `unity-vfx`, `unity particles`, `mcp unity`

**Ключевые находки:**
- MCP НЕ может редактировать VFX Graph ноды
- Particle System (legacy) — полная поддержка
- VFX Graph на мобильных требует Vulkan

---

## Следующие шаги (День 3)

### P0: Исправить визуализацию эмоций
```
1. Дебаг InputHandler — вывести velocity в консоль
2. Дебаг EmotionStateMachine — почему не переходит в Tension
3. Проверить SphereParticleController.UpdateColor()
4. Тест: форсировать SetColorProgress(0.5) и проверить цвет
```

### P1: Eye sprite
```
- Создать простой sprite для глаза
- Pupil tracking
- Blink
```

### P2: Build APK
```
- Player Settings → Android
- Build and Run
```

---

## Как продолжить

### 1. Открыть Unity
```
Unity Hub → My project
```

### 2. Запустить MCP Server
```
Tools → MCP Unity → Start Server
```

### 3. Промпт для Claude
```
Продолжаем Unity Migration День 3.

Читай docs/HANDOFF_UNITY_MIGRATION.md

Проблема: частицы дышат, но цвет не меняется при движении курсора.
Эмоции в логах: Peace ↔ Listening (colorProgress 0.0-0.1).
Не достигают Tension/Bleeding.

Задача: дебаг и исправление визуализации эмоций через цвет частиц.
```

---

## Three.js версия

**Статус:** Работает независимо
**Путь:** `/Users/admin/projects/sphere-777/`
**Запуск:** `npm run dev`

Код Three.js не изменялся, Unity — отдельный проект.
