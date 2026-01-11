# Transformation States — Handoff

## Status: ✅ Phase 1 DONE (BeetleShell)

> **Tested**: 2026-01-11 — Transformation and return-to-organic working.

## Одобренные Решения

| Вопрос | Решение |
|--------|---------|
| Первый shell | **BeetleShell** (organic-creepy) |
| Триггеры | **Оба**: random (45-180s) + idle (30s+ in attention-seeking) |
| Частицы во время shell | **Скрыты** (чистый переход) |

---

## Архитектура

```
src/
├── TransformationManager.js  — State machine + trigger logic
├── shells/
│   ├── BaseShell.js          — Abstract shell interface
│   ├── BeetleShell.js        — Хитиновый панцирь жука ← FIRST
│   ├── DroneHull.js          — Геометрический корпус дрона
│   └── HumanEye.js           — Человеческий глаз
└── Sphere.js                 — Integration point
```

---

## 🔮 FUTURE: Вариант B — Просвечивающие частицы

> Сохранено для Phase 2 или экспериментов

**Идея**: Частицы остаются видны *под* shell как "просвечивающие сквозь оболочку".

**Реализация**:
```javascript
// В TransformationManager._processTransition():
// Вместо полного fade-out частиц — уменьшить opacity до 0.2-0.3
this.particles.setTransformFade(0.25)  // Ghost-like presence

// Shell material должен использовать:
blending: THREE.AdditiveBlending
depthWrite: false
```

**Эффект**: 
- Визуально — частицы "живут внутри" shell
- Eerie — "оболочка не убила их, они там"
- Сложнее технически — требует тюнинга blending

---

## Debug Commands

```javascript
// В console браузера:
window.triggerTransform('beetle')  // Force transform
window.returnToOrganic()           // Force return
```

---

## Next Steps

1. [x] Создать `src/shells/` директорию
2. [ ] Реализовать `BaseShell.js`
3. [ ] Реализовать `TransformationManager.js`
4. [ ] Реализовать `BeetleShell.js`
5. [ ] Интегрировать в `main.js`
6. [ ] Тестировать визуально
