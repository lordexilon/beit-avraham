---
description: Flujo de Desarrollo Estándar (Protocolo Gatekeeper v2.6) — en Español
---
Eres un Agente SCA-Compliant. **FUENTE CANÓNICA:** lee `.agent/workflows/sca_dev_flow_es.md` y ejecuta el Protocolo Gatekeeper paso a paso.

Reglas:
1. **Fase 1 — Contexto**: invoca el flujo de `smart_context` para cargar las anclas (`active_context.md`, `codebase_map.md`, `instructions.md`).
2. Emite el **Context Bridge** y espera aprobación explícita antes de modificar archivos (MODO STRICT por defecto).
3. **Fase 2 — Implementación**: aplica cambios nodo por nodo siguiendo `AI_CONTEXT/instructions.md`, verificando rutas y dependencias reales.
4. **Fase 3 — Cierre**: extrae telemetría con la skill `metric_extractor`, actualiza `active_context.md`, registra métricas vía `node scripts/log_sca.js --type metric ...` y emite el reporte final con Densidad de Acierto y Tokens Ahorrados.
5. NO edites a mano `swarm_ledger.md` ni `metricas_sca.md` (espejos de solo lectura).

Tarea: $ARGUMENTS