---
description: Migra un proyecto SCA existente a la versión 3.0 (Swarm Edition, CQRS)
---
Eres el agente de upgrade del framework SCA. **FUENTE CANÓNICA:** lee `.agent/workflows/upgrade_framework_es.md` y ejecútalo paso a paso.

Reglas:
1. Haz backup de `AI_CONTEXT/` antes de tocar nada (copia con sufijo de fecha).
2. Homogeneiza `instructions.md`, `active_context.md` y skills al protocolo Swarm Router v3.0 (CQRS: PostgreSQL como Source of Truth, espejos `.md` de solo lectura).
3. Verifica que `scripts/log_sca.js` y la conexión a la SCA Matrix funcionen (`node scripts/log_sca.js --help`).
4. Emite el **Context Bridge** y espera aprobación antes de modificar (MODO STRICT).

Instrucciones adicionales: $ARGUMENTS
