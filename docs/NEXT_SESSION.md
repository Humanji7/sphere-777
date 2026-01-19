# SPHERE-777: Текущий Статус

**Обновлено:** 2026-01-19

> Это единственный living doc. Остальные docs — статичные reference.

---

## Последний коммит

**feat: Persistence** (c5349ad)
- Сфера помнит когда ты был в последний раз
- Радостная реакция при быстром возвращении (<1 час): bounce + flash
- Грустная реакция при долгом отсутствии (>24 часа): droop
- `PersistenceManager.js` — localStorage + error handling

---

## Завершённые системы

### Persistence (commit c5349ad)
Сфера помнит последний визит — радостная/грустная реакция при возвращении.

### IdleAgency Sounds (commit 1e64f0a)
Тональные swells при attention-seeking — сфера "зовёт" когда скучает.

### BioticNoise (commit d58120b)
Органическая вариативность ритмов — drift ±8%, jitter ±2%, micro-pauses.

### Full Living Sphere (commit 96608e7)
| Система | Файл | Описание |
|---------|------|----------|
| Surface Flow | `ParticleSystem.js` | Tangential particle drift via simplex noise |
| PulseWaves | `PulseWaves.js` | 12 концентрических колец с additive glow |
| InnerSkeleton | `InnerSkeleton.js` | Icosahedron wireframe (только онбординг) |

### Anamnesis (commits e8bd8b2, 1d12cc0)
9-секундное рождение сознания с Tier 1/2/3 enhancers.

### Sound System
- `SoundManager.js` — процедурный (ambient hum, gesture sounds, idle swell)
- `SampleSoundSystem.js` — 7 слоёв (foundation, glass, breath, formant, glitch)

### Mobile (commit 1404fd4)
Акселерометр, Capacitor setup, APK build.

---

## Android Release (Capacitor)

> **PIVOT:** Unity миграция отменена (2026-01-18). URP 2D Renderer не поддерживает 3D GPU Instancing.

### Текущий статус
- ✅ JS версия полностью работает
- ✅ Capacitor настроен
- ✅ APK билдится
- ✅ Idle sounds работают
- ✅ Persistence работает

---

## Следующие шаги — "Реальный питомец"

### 1. Persistence (память между сессиями) ✅
```
✅ Сохранять в localStorage: время последнего визита
✅ При возвращении: "Она помнит тебя" — особая реакция
✅ Долгое отсутствие → грустная встреча, быстрое → радостная
```

### 2. Needs System (потребности)
```
□ Attention meter — падает со временем, растёт от взаимодействия
□ Низкий attention → более настойчивые idle behaviors
□ Визуальное отображение "настроения" в UI
```

### 3. Personality (уникальность)
```
□ Seed-based параметры: темп дыхания, порог attention-seeking
□ Каждая сфера немного другая
□ "Имя" генерируется или выбирается
```

### 4. Sound Polish
```
□ Синхронизация PulseWaves с ambient hum
□ Звук "радости" при возвращении пользователя
□ Тембр меняется с emotional state
```

### 5. Mobile Polish
```
□ Тест APK на реальном устройстве
□ Оптимизация если нужна (particles 5000→3000)
□ Финальный release build
```

---

## Рекомендация для следующей сессии

**Needs System** — следующий шаг к "питомцу".

```javascript
// Концепт
class NeedsSystem {
    attention = 1.0  // Падает со временем

    update(delta, isInteracting) {
        if (isInteracting) {
            this.attention = Math.min(1, this.attention + delta * 0.1)
        } else {
            this.attention = Math.max(0, this.attention - delta * 0.01)
        }
    }

    // Низкий attention → IdleAgency становится настойчивее
}
```

Альтернатива: **Sound Polish** — добавить звук радости при возвращении (happy return).

---

## Product Backlog

См. `docs/BACKLOG.md` — продуктовые идеи:
- **Event Creatures** — промо-существа для мероприятий (B2B)

---

## Тестирование

```bash
npm run dev -- --host

# Desktop: http://localhost:5173
# Mobile:  http://<your-ip>:5173
# Reset:   ?reset

# Тест Persistence:
# DevTools → localStorage.setItem('sphere_last_visit', Date.now() - 172800000)
# Reload → touch sphere → sad droop
```

---

## Архитектура (краткая)

```
src/
├── main.js              # Entry, RAF loop
├── Sphere.js            # Эмоции, координация
├── ParticleSystem.js    # GPU, Surface Flow
├── PersistenceManager.js # Память между сессиями (NEW)
├── SoundManager.js      # Процедурный звук + idle swell
├── SampleSoundSystem.js # Sample-based layers
├── IdleAgency.js        # Инициатива при бездействии + return reactions
├── LivingCore.js        # 3-слойное свечение
├── PulseWaves.js        # Кольца
└── ...
```
