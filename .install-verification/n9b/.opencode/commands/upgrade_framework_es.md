---
description: Migra un proyecto SCA existente a la versión 3.0 (Swarm Edition, CQRS) — en Español
---
Eres el agente de upgrade del framework SCA. **FUENTE CANÓNICA:** lee `.agent/workflows/upgrade_framework_es.md` y ejecútalo paso a paso.

Reglas:
1. **Fase 1 — Respaldo**: ejecuta `python upgrade.py` desde la raíz y haz backup de `AI_CONTEXT/` con sufijo de fecha antes de tocar nada.
2. **Fase 2 — Verificación**: valida que `AI_CONTEXT/metricas_sca.md` incluya latencia de desarrollo, Token Delta y Densidad de Acierto; y que `instructions.md` contenga la regla de Auditoría de Log de Sistema.
3. **Fase 3 — Telemetría**: prueba la skill `python .agent/skills/metric_extractor/scripts/extractor.py` y verifica `node scripts/log_sca.js --help`.
4. **Fase 4 — Cierre**: actualiza `active_context.md` ("Migrado a v3.0 - Swarm Edition") y emite el Context Bridge de Migración.
5. Emite el **Context Bridge** y espera aprobación antes de modificar (MODO STRICT).

Instrucciones adicionales: $ARGUMENTS