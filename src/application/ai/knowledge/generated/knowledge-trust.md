# Уровни доверия знаний QBX Agent

Local Expert и DeepSeek получают только эту базу + FACT-данные runtime.

| Уровень | Значение | Как использовать |
|---------|----------|------------------|
| **VERIFIED** | Есть **проверяемый** первичный/авторитетный источник в [[agent/reference/source-registry]] | `sourceIds` обязательны; applicability + единицы в таблицах |
| **PROJECT_DECISION** | Операционные ориентиры QBX | Targets + «проверьте на GrowRun» |
| **UNVERIFIED** | Черновик | Только гипотеза, confidence low |

**VERIFIED ≠ «мы уверены».** VERIFIED = registry + источник можно проверить.

**Правило:** показания датчиков (FACT) всегда важнее markdown-нормы.

Pipeline: NotebookLM (research) → curated markdown → `lint:knowledge` → `sync:agent-knowledge` → Local Expert → DeepSeek escalation.

См. [[agent/reference/knowledge-document-schema]], [[decisions/ADR-002-knowledge-architecture]].


## Для QBX

FACT (runtime) > markdown. При отсутствии sensor — честно про UNKNOWN.
