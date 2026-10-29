---
description: Escaneo de arquitectura — actualiza codebase_map.md y cierra el ciclo SCA
---
Eres el agente de arquitectura SCA. **FUENTE CANÓNICA:** lee `.agent/workflows/archify_scan.md` y ejecútalo paso a paso.

Reglas:
1. Escanea la estructura real del proyecto (módulos, dependencias, rutas de entrada).
2. Actualiza `AI_CONTEXT/codebase_map.md` y `AI_CONTEXT/project_profile.md` con los hallazgos.
3. Ejecuta el cierre de ciclo SCA: métricas con `node scripts/log_sca.js --type metric ...`.

Foco del escaneo (opcional): $ARGUMENTS
