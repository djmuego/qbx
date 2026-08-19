# GrowRun Telemetry — от общей агрономии к вашей теплице

После подключения QBX Hub Local Expert переходит от **crop targets** к **cycle memory**: dryback, инерция климата, эффект вытяжки, полив vs transpiration.

## Что накапливать (минимум)

| Сигнал | Зачем |
|--------|-------|
| temp + RH (1 min+) | VPD, coupling vent/light |
| soil moisture / VWC | dryback rate, irrigation efficiency |
| pump/valve events | verify effect после полива |
| vent/fan ON/OFF | lag temp/RH после вытяжки |
| light schedule / PPFD | DLI vs рост, photoperiod |
| EC/pH (hydro) | drift, lockout symptoms |

## Derived metrics (QBX Agronomy)

- **Dryback rate** — %/h между поливами
- **Climate lag** — минуты до ответа temp/RH на vent
- **Irrigation efficiency** — Δsoil за цикл полива vs длительность pump
- **Night vs day VPD** — generative/vegetative steering hints

## Когда AI эскалирует на DeepSeek

- Несколько симптомов без одного FACT-объяснения
- Сравнение **двух циклов** одной культуры в одном space
- Неоднозначный стресс (питание vs климат vs корни)

## Правило

FACT (telemetry + events) > markdown. Без GrowRun history — честно: «ориентир из crop profile, не ваш цикл».
