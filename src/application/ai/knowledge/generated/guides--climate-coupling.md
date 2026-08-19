# Климатическая связка (Climate AI lite)

Изменение одного параметра двигает другие.

## Temp ↓ через вентиляцию

- Часто **RH ↑** (абсолютная влажность та же, относительная растёт).
- **VPD может упасть** — растение «закрывает» transpiration.
- Не рекомендуй «только вентилятор» без проверки RH/VPD trend.

## Temp ↑ (свет/нагрев)

- VPD ↑ → жажда, нужен полив/ RH контроль.
- CO₂ uptake ↑ при достаточном свете.

## Модель для Local Expert

```
FACT: temp, RH
DERIVED: VPD
INFERENCE: «перегрев + вент ON + RH растёт» → проверить приток/осушитель
```

## Equipment roles (будущее)

- exhaust, intake, heater, humidifier, dehumidifier — intent mapping, не GPIO.
