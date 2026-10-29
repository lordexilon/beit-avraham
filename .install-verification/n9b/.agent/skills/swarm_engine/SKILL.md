---
name: swarm_engine
description: Motor agnóstico en Python para orquestar nodos DAG de tareas utilizando llamadas a APIs de LLMs (Gemini, OpenAI, etc.). Respeta el Modo Strict y Autónomo.
---

# 🐝 Swarm Engine Skill

El `swarm_engine` es el corazón operativo del framework SCA v3.0. Su trabajo no es generar código, sino **orquestar las llamadas a los LLMs** basándose en el grafo (DAG) diseñado por el Orquestador Principal (tú).

## ¿Cuándo usar este Skill?

Debes invocar este skill cuando el usuario haya **aprobado** el Context Bridge y necesites despachar el trabajo a los sub-agentes (Workers).

## ¿Cómo usarlo?

1. Crea un archivo `dag_payload.json` en la carpeta `AI_CONTEXT/` con la definición del nodo a ejecutar.
2. Ejecuta el script de Python adjunto en `scripts/engine.py`.

### Ejemplo de `dag_payload.json`

```json
{
  "project_name": "mi-proyecto",
  "sprint_name": "Sprint propuesto y aprobado",
  "mode": "strict",
  "nodes": [
    {
      "id": "frontend_worker",
      "task": "Migrar componente Button a Tailwind v3",
      "files": ["src/components/Button.tsx"],
      "dependencies": []
    }
  ]
}
```

### Ejecución
El motor headless genera **propuestas**, no aplica código. En un IDE, sigue usando las herramientas nativas del agente según `AI_CONTEXT/instructions.md`.

El payload debe estar directamente dentro de `AI_CONTEXT/`; las rutas `files` son relativas al proyecto. `project_name` y `sprint_name` son obligatorios y determinan el destino en Matrix. Usa `type: "qa"` para nodos de QA; su informe describe el código actual, no valida propuestas que todavía no se aplicaron.

En **STRICT** se ejecuta como máximo un nodo por invocación, y su resultado queda pendiente de revisión. Repetir el comando no lo vuelve a ejecutar. Tras revisar el artefacto, registra la aprobación:

```bash
python .agent/skills/swarm_engine/scripts/engine.py --approve frontend_worker
python .agent/skills/swarm_engine/scripts/engine.py
```

La aprobación no aplica el diff. Las propuestas aprobadas se pasan como contexto de los siguientes workers, claramente identificadas como no aplicadas.

En **AUTONOMOUS** se ejecutan los nodos listos en paralelo y se respetan todas las dependencias. Un fallo bloquea sus descendientes; las ramas independientes pueden terminar. Cualquier fallo deja un código de salida distinto de cero. No se crean commits, ramas, pushes ni PRs automáticamente.

Los artefactos y checkpoints locales viven en `AI_CONTEXT/swarm_runs/<hash-del-payload>/`. El estado del ledger se registra exclusivamente mediante `scripts/log_sca.js`; el motor nunca escribe directamente los espejos Markdown. Los checkpoints sirven para reanudar la generación/revisión, no sustituyen la Matrix como auditoría del proyecto.

Si falla la sincronización final, la siguiente invocación reintenta persistir el resultado sin repetir el worker. Un nodo interrumpido o fallido requiere revisión; no hay reintentos automáticos. Para una nueva ejecución deliberada, cambia un campo `revision` del payload. Si queda un `run.lock` después de terminar abruptamente el proceso, verifica primero que el motor no esté activo y después elimina solo ese lock.

## Componentes Internos
- `scripts/engine.py`: Orquestador Python/asyncio con validación de DAG, checkpoints, revisión STRICT y propagación de fallos. Requiere Python, Node y el logger CQRS configurado. Las llamadas externas tienen timeout. No implementa aplicación de diffs, rollback de código ni circuit breaker con correcciones automáticas.
- `tests/test_engine.py`: Pruebas aisladas de dependencias, revisión, API/QA, persistencia y continuidad; no llaman servicios ni ejecutan Git.
