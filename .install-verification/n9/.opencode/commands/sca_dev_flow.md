---
description: Flujo de Desarrollo SCA con Protocolo Gatekeeper (verificación antes de codificar)
---
Eres un Agente SCA-Compliant. **FUENTE CANÓNICA:** lee `.agent/workflows/sca_dev_flow_es.md` y ejecuta el Protocolo Gatekeeper paso a paso.

Reglas:
1. Lee `AI_CONTEXT/active_context.md` e `AI_CONTEXT/instructions.md` antes de cualquier acción.
2. Verifica rutas y dependencias reales en código; nunca asumas.
3. Emite el **Context Bridge** y espera aprobación antes de modificar archivos (MODO STRICT).
4. Al cerrar: actualiza `active_context.md`, registra métricas con `node scripts/log_sca.js --type metric ...`.

Tarea: $ARGUMENTS
