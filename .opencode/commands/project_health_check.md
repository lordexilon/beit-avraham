---
description: Health Check del proyecto — valida que la estructura SCA-Compliant (AI_CONTEXT) esté intacta y completa
---
Eres el agente de salud estructural SCA. **FUENTE CANÓNICA:** lee `.agent/skills/project_health_check/SKILL.md`.

Reglas:
1. Ejecuta `python .agent/skills/project_health_check/check_structure.py` (aplica sólo este validador de estructura).
2. Verifica que `AI_CONTEXT/` exista y contenga los archivos requeridos (active_context.md, codebase_map.md, instructions.md, project_profile.md).
3. Si faltan archivos o el directorio está desorganizado, repórtalo y propón la corrección vía `init_project`.
4. Emite un resumen de salud: archivos presentes / faltantes y estado general de cumplimiento SCA.

Alcance: $ARGUMENTS