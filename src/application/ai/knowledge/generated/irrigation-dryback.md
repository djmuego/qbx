# Полив и Dryback (Crop Steering lite)

## Dryback

**Dryback** — падение влажности субстрата (WC/VWC) между поливами. Ключ к корневому здоровью и generative/vegetative steering в pro-системах.

| Паттерн | Интерпретация |
|---------|---------------|
| Малый dryback | Постоянная сырость → риск anaerobic roots |
| Целевой dryback | Зависит от культуры/фазы (см. crop profile) |
| Слишком быстрый dryback | Пересушка, stress, возможен малый объём полива |

## QBX с soil moisture % (не WC)

- Используй **тренд** (1h/6h) из telemetry summary.
- Alert: `substrate_dryback_anomaly` — падение >2%/h при «нормальном» поливе.
- Не поливай по таймеру без датчика — только если нет альтернативы.

## Smart irrigation (без LLM)

1. FACT: soil moisture vs optimalMin/Max
2. DERIVED: trend falling/rising
3. FACT: pump ON/OFF + recent events
4. INFERENCE: «возможна проблема подачи» если pump ON + soil падает

## Рекомендации (advisory)

- Generative (цвет/плод): чуть сильнее dryback между поливами.
- Vegetative: умеренный dryback, стабильная влага.
- Ночью: снижать частоту при падении transpiration.


## Для QBX

FACT (runtime) > markdown. При отсутствии sensor — честно про UNKNOWN.
