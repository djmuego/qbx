# Стадии цикла (Grow Stages)

Универсальная модель QBX — не все стадии применимы к каждой культуре.

| stageId | Название | Типичный фокус |
|---------|----------|----------------|
| germination | Прорастание | Влага, тепло, низкий свет |
| seedling | Рассада | Умеренный VPD, мягкий свет |
| vegetative | Вегетация | Рост листьи, питание N, стабильный VPD |
| flowering | Цветение | Снижение RH, Ca/B, стабильный свет |
| fruiting | Плодоношение | Полив dryback, EC, нагрузка на растение |
| ripening | Созревание | Снижение N, контроль влаги |
| harvest | Уборка | Минимальные воздействия |

## Автопереход (будущее)

Grow Cycle: `currentDay` + Blueprint → suggested stage change (human confirm).

## Для Agent

- Бери targets из crop profile + stageId из GrowContext.
- При смене стадии — пересчитай VPD/RH/полив ожидания.


## Для QBX

FACT (runtime) > markdown. При отсутствии sensor — честно про UNKNOWN.
