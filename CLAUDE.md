# SPHERE-777

**Живая сфера с характером** — 5,000 частиц, которые дышат, чувствуют и сами требуют внимания.

---

## Быстрый старт

```bash
npm run dev              # http://localhost:5173
npm run dev -- --host    # + мобильный доступ
```

---

## Контекст для агента

> **Читай `docs/NEXT_SESSION.md`** — единственный актуальный источник о текущем состоянии проекта.

| Файл | Когда читать |
|------|--------------|
| `docs/NEXT_SESSION.md` | **Всегда первым** — статус, что сделано, что дальше |
| `docs/ARCHITECTURE.md` | Структура модулей, эмоции, жесты |
| `docs/VISION.md` | Философия продукта (редко меняется) |

---

## Ключевые концепции

### Gesture → Emotion
Жест определяет эмоцию. Не скорость мыши, а **тип движения**.
```
Sphere.js → emotionState, _processPeace()
```

### Idle Agency
Сфера сама проявляет инициативу при бездействии.
```
IdleAgency.js → calm → curious → restless → attention-seeking
```

### BioticNoise
Органическая вариативность ритмов — никакой механической цикличности.
```
utils/BioticNoise.js → drift ±8%, jitter ±2%, micro-pauses
```

---

## Структура docs/

```
docs/
├── NEXT_SESSION.md      # Текущий статус (living doc)
├── ARCHITECTURE.md      # Техническая структура
├── VISION.md            # Философия
├── reference/           # Статичные reference docs
│   ├── SOUND_DESIGN.md
│   ├── CAPACITOR.md
│   ├── L7_GLITCH.md
│   └── IOS_SETUP.md
└── plans/               # Активные планы
```

---

## Deploy

```bash
npm run build && npx vercel --prod
```
