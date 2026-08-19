# Automation Playbook (QBX шаблоны)

> Agent **предлагает**, пользователь **создаёт**. Никогда auto-execute.

## Вентиляция по температуре

```
IF temp > target_max (напр. 28°C)
THEN exhaust ON
UNTIL temp < target_max - hysteresis (2°C)
```

Проверка: если fan уже ON → «оценить достаточность», не дублировать команду.

## Полив по soil moisture

```
IF soil < 40%
THEN pump ON 30–120 sec
UNTIL soil > 55% OR max duration safety
```

При падении moisture после 3+ циклов → INFERENCE: проблема подачи/утечки, confidence medium.

## RH ночью

```
IF RH > 75% AND lights OFF
THEN exhaust pulse
```

## Schedule освещения

```
ON 07:00 / OFF 21:00 — adjust per crop photoperiod table
```

## Safety

- maxContinuousOn на насосах
- Emergency Off overrides all AI suggestions


## Для QBX

FACT (runtime) > markdown. При отсутствии sensor — честно про UNKNOWN.
