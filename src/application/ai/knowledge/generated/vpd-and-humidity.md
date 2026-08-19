# VPD и влажность (практика CEA)

## Что такое VPD

Vapor Pressure Deficit — «сухость» воздуха для transpiration листа.

- **Низкий VPD** (высокая RH): растение «не тянет» воду, риск грибка
- **Высокий VPD** (низкая RH): закрытие устьиц, стресс, tip burn

## Ориентиры kPa

| Стадия | VPD |
|--------|-----|
| Рассада | 0.6–0.9 |
| Вегетация | 0.8–1.1 |
| Цветение | 1.0–1.3 |

QBX рассчитывает VPD **только** при наличии temp + RH (DERIVED, не выдумывать).

## Паттерн AC Infinity / AROYA

- Контроллер держит **VPD band**, не только RH
- При активной вентиляции — не рекомендовать «включить вентилятор» без проверки state

## Действия

1. Смотреть FACT: temp, RH, VPD derived
2. Смотреть equipment: fan/humidifier state
3. Рекомендация — adjust setpoints или automation, не ручной guess


## Для QBX

FACT (runtime) > markdown. При отсутствии sensor — честно про UNKNOWN.
