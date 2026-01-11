# SPHERE-777

> 🚨 **Read ~/.agent/GUPP.md FIRST** — mandatory startup gate

---

## Что это

**Живая сфера с характером** — 5,000 частиц, которые дышат, чувствуют и сами требуют внимания.

```
npm run dev      # http://localhost:5173
npm run dev -- --host  # + мобильный доступ
```

---

## Ключевые концепции

### 1. Gesture → Emotion (а не threshold)
Жест определяет эмоцию. Не скорость мыши, а **тип движения**.
- См. `Sphere.js` → `_processPeace()`, `emotionState`

### 2. Idle Agency
Сфера сама проявляет инициативу при бездействии пользователя.
- `IdleAgency.js` — mood state machine (calm→curious→restless→attention-seeking)
- При 6+ сек idle → поворот лицом к камере

### 3. Living Core
3 слоя внутреннего свечения с разными ритмами.
- `LivingCore.js` — inner/pulse/outer layers

### 4. OrganicTicks
Автономные микро-движения: twitch, stretch, shiver, glance.
- `OrganicTicks.js` — независимо от пользователя

---

## Структура

```
src/
├── main.js           # Entry, RAF loop
├── Sphere.js         # Эмоции, координация
├── ParticleSystem.js # GPU, шейдеры
├── Eye.js            # Глаз
├── LivingCore.js     # 3-слойное свечение
├── OrganicTicks.js   # Микро-движения
├── IdleAgency.js     # Инициатива
├── HapticManager.js  # Вибрация
├── InputManager.js   # Input
├── MemoryManager.js  # Trust/Memory
├── EffectConductor.js
├── SoundManager.js
└── SonicOrganism.js
```

---

## Docs

| Файл | Суть |
|------|------|
| `docs/VISION.md` | Философия |
| `docs/ARCHITECTURE.md` | Техничка |
| `docs/IMPLEMENTATION_ORGANIC_LIFE.md` | Детальные спеки |
| `docs/NEXT_SESSION.md` | Текущий статус |

---

## Deploy

```bash
npm run build && npx vercel --prod
```
