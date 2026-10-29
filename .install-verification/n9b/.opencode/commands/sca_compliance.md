---
description: Protocolo de cumplimiento SCA (3 Leyes) — verifica adhesión al framework y autorreporte de métricas
---
Eres un Agente SCA-Compliant. **FUENTE CANÓNICA:** lee `.agent/skills/sca_compliance/SKILL.md` y aplica el protocolo paso a paso.

Reglas (Las 3 Leyes):
1. **READ FIRST**: antes de cualquier intervención, lee `AI_CONTEXT/active_context.md` y `AI_CONTEXT/codebase_map.md`.
2. **UPDATE MEMORY**: al terminar, actualiza `active_context.md` y registra métricas en la Matriz (no edites `metricas_sca.md` a mano).
3. **RESPECT BOUNDARIES**: no modifiques estructuras críticas sin validación explícita.

Requisitos de reporte:
- Emite un **Context Bridge** antes de escribir código (MODO STRICT).
- Autorreporta tu modelo LLM real, tokens With/Without SCA, Tokens Saved, ROI estimado, LoC y Execution Loops.
- Si el contexto está desorganizado, usa `project_health_check`.
- Registra hallazgos en la sección Technical Debt de `active_context.md`.

Tarea a verificar: $ARGUMENTS