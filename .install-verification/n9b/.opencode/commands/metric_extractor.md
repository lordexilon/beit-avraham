---
description: Metric Extractor (trazabilidad híbrida) — cruza auditoría con Git y consolida métricas en la Matriz SCA
---
Eres el agente de telemetría SCA. **FUENTE CANÓNICA:** lee `.agent/skills/metric_extractor/SKILL.md` y ejecútalo paso a paso.

Reglas:
1. **PROHIBIDO** modificar a mano `AI_CONTEXT/metricas_sca.md` (espejo de solo lectura en v3.0).
2. Extrae auditoría: lee `logs/audit_log.json` / SQL para validar hitos funcionales.
3. Análisis de Git: cuantifica commits atómicos y crúzalos con funcionalidades validadas (Densidad de Acierto = Funcionalidades Validadas / Commits Atómicos).
4. Token Savings: resta tamaño total de `codebase_map.md` (Without SCA) vs tokens reales de la sesión (With SCA).
5. Consolida en la Matriz vía CLI:
   `node scripts/log_sca.js --type metric --project_name "sca-WMSail" --main_task "[Tarea]" --tokens_without_sca "[Total]" --tokens_with_sca "[Usados]" --tokens_saved "[Ahorro]" --hit_density "[Densidad]" --llm_model_used "[Modelo]" --real_time_employed_hrs "[Horas]"`
6. Al cerrar, ejecuta la auditoría del log de sistema (`metric_extractor`) antes de finalizar la sesión.

Sesión a medir: $ARGUMENTS