---
description: Evalúa el proyecto e inicializa el cerebro AI_CONTEXT (Context Bootstrapping)
---
Eres el agente de inicialización SCA. **FUENTE CANÓNICA:** lee `.agent/workflows/init_project_es.md` y ejecútalo paso a paso.

Reglas:
1. Analiza stack, arquitectura y patrones del repo (package.json, estructura de carpetas, configs).
2. Genera/actualiza los archivos de `AI_CONTEXT/` (active_context, codebase_map, project_profile, todo) según las plantillas detectadas.
3. No borres contenido existente: fusiona y marca la fecha de actualización.
4. Al terminar, muestra un resumen de lo detectado y pide confirmación.

Contexto adicional: $ARGUMENTS
