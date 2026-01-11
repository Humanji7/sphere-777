# HANDOFF: BeetleShell Декомпозиция

**Дата:** 2026-01-11  
**Сессия:** db5faea5-b2bb-4c74-8163-f23d91f0e288 → 9e10ab34-5647-4f8a-9f92-cee0ba5486b3

**Статус:** ⚠️ Планирование завершено, реализация не начата

---

## ✅ Что сделано

### 1. Декомпозиция Implementation Plan
Создан детальный [task.md](file:///Users/admin/.gemini/antigravity/brain/9e10ab34-5647-4f8a-9f92-cee0ba5486b3/task.md) с разбивкой на 4 фазы:

- **Phase 1** (3-4h): Blender моделирование — референсы → геометрия → скульпт → vertex colors → GLB
- **Phase 2** (1.5-2h): Three.js интеграция — DRACO setup → GLTFLoader → fallback → preload  
- **Phase 3** (1-2h): Шейдеры — vertex colors → seam glow animation → noise
- **Phase 4** (30-45m): Верификация — браузер + визуал + mobile 60fps

### 2. AI Text-to-3D Research
Выполнен research по AI генераторам:

| Сервис | Free Credits | GLB Export | Статус |
|--------|--------------|------------|--------|
| **Meshy.ai** | 200 | ✅ | Tested (timeout на регистрации) |
| **Tripo3D** | Free tier | ✅ | Not tested |
| **Luma AI Genie** | Unlimited | ✅ | Not tested |
| **Fast3D.io** | No login | ✅ | Not tested |

**Промпт для генерации:**
> "Beetle shell, closed elytra, chitinous surface, iridescent, low poly game asset, single mesh, clean topology"

---

## ❌ Что НЕ сделано

1. **3D модель не сгенерирована** — ни через AI, ни через Blender
2. **Phase 2-4 не начаты** — интеграция, шейдеры, тесты
3. **DRACO decoder не скачан** — нужно положить в `public/draco/`

---

## 🎯 Следующие шаги

### Вариант A: AI Text-to-3D (рекомендуется)
1. Зайти на **Tripo3D** или **Luma AI Genie** (без проблем с регистрацией)
2. Промпт: `"Beetle shell, closed elytra, chitinous surface, iridescent, low poly game asset, single mesh, clean topology"`
3. Скачать GLB → положить в `public/assets/models/beetle_shell.glb`
4. Запустить Phase 2 (код интеграции)

### Вариант B: Blender Python (полный контроль)
1. Установить Blender 4.x
2. Создать Python скрипт `create_beetle.py` (процедурная генерация mesh + vertex colors)
3. Запустить headless: `blender -b --python create_beetle.py`
4. Экспорт GLB → Phase 2

---

## 📋 Чеклист перед Phase 2

- [ ] `public/assets/models/beetle_shell.glb` существует
- [ ] Vertex colors Red channel = 1.0 на seams (для bio-luminescent швов)
- [ ] Mesh: ~2000-3000 triangles, diameter = 3.0 units
- [ ] DRACO decoder files копированы в `public/draco/`

---

## 🔗 Ссылки

- [Implementation Plan](file:///Users/admin/.gemini/antigravity/brain/db5faea5-b2bb-4c74-8163-f23d91f0e288/implementation_plan.md.resolved)
- [Task Decomposition](file:///Users/admin/.gemini/antigravity/brain/9e10ab34-5647-4f8a-9f92-cee0ba5486b3/task.md)
- [BeetleShell.js](file:///Users/admin/projects/sphere-777/src/shells/BeetleShell.js)
