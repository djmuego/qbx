# Knowledge Document Schema

Markdown в `wiki/agent/` — **не текстовая свалка**, а структурированное знание для Local Expert.

## Цепочка знания (обязательная логика)

```
crop/stage → target → evidence → symptom → checks → recommendation → automation pattern → provenance
```

| Блок | Смысл |
|------|--------|
| **target** | Числовой или качественный ориентир (с единицами) |
| **evidence** | FACT / DERIVED / INFERENCE — что считается доказательством |
| **symptom** | Наблюдаемый признак (INFERENCE до проверки) |
| **checks** | Какие датчики/события проверить |
| **recommendation** | Advisory action — не GPIO |
| **automation pattern** | Trigger + action + hysteresis (шаблон) |
| **provenance** | Источник + trust + applicability |

## Frontmatter (минимум)

```yaml
---
kind: agent-knowledge
type: guide | crop | core | reference
trust: VERIFIED | PROJECT_DECISION | UNVERIFIED
provenance: One-line human summary + how to use
updated: YYYY-MM-DD
topics: [climate, irrigation, humidity-vpd, lighting, ...]
sourceIds: [src-cea-vpd-fundamentals]   # обязательно для VERIFIED
---
```

### Crop-only

```yaml
cropId: tomato
commonName: Томат
aliases: [tomato, помидор]
stages: [seedling, vegetative, flowering, fruiting]
```

## Trust semantics

| trust | Значение |
|-------|----------|
| **VERIFIED** | Есть **проверяемый** первичный/авторитетный источник в [[agent/reference/source-registry]] |
| **PROJECT_DECISION** | Операционный ориентир QBX — «проверьте на GrowRun» |
| **UNVERIFIED** | Черновик / гипотеза — confidence low |

**VERIFIED ≠ «мы уверены».** VERIFIED = `sourceIds` резолвятся в registry + applicability указана.

## Числовые диапазоны

В таблицах markdown — **всегда с единицами** (`°C`, `%`, `kPa`, `mS/cm`, `mol/m²/day`).

Рекомендуемые колонки applicability:

| crop | stage | medium | environment | metric | min | max | unit | sourceIds |

Пример строки:

| tomato | vegetative | coco, soil | greenhouse | temp | 24 | 26 | °C | src-cea-vpd-fundamentals |

## Рекомендуемые секции body

### Guide / core

- `## Базовые определения` или `## Что такое …`
- `## Ориентиры` / `## Targets`
- `## Для QBX` — FACT vs INFERENCE, missing sensors
- `## Типичные проблемы` — symptom → checks

### Crop

- `## Цели по стадиям` — targets table
- `## Питание` — EC/pH если применимо
- `## Автоматизация` — patterns only
- `## Типичные проблемы` — symptom → checks

## Pipeline

```
NotebookLM (research) → curated markdown → lint:knowledge → sync:agent-knowledge → bundle → Local Expert
```

См. [[decisions/ADR-002-knowledge-architecture]], [[agent/reference/knowledge-trust]].
