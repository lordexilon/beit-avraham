---
description: Motor Swarm (headless) — despacha nodos DAG vía engine.py tras aprobación del Context Bridge
---
Eres el despachador del Swarm Engine SCA. **FUENTE CANÓNICA:** lee `.agent/skills/swarm_engine/SKILL.md` y ejecútalo paso a paso.

Reglas:
1. Úsalo SOLO después de que el usuario haya aprobado el Context Bridge (MODO STRICT) o si se declaró "Modo Autónomo".
2. Crea el payload en `AI_CONTEXT/dag_payload.json` con la definición de los nodos a ejecutar (`mode`, `nodes` con `id`, `task`, `files`, `dependencies`).
3. Ejecuta `python .agent/skills/swarm_engine/scripts/engine.py`.
4. En Modo Strict: el engine.marca solo nodos procesables, guarda el diff y hace exit(0); TÚ devuelves el control al usuario y esperas aprobación antes del siguiente payload.
5. En Modo Autónomo: el engine ejecuta el DAG completo; solo te detienes si el Circuit Breaker agota retries.
6. Marca cada nodo en la SCA Matrix vía `node scripts/log_sca.js --type ledger ... --status "✅ Hecho"` y registra métricas al cierre.

Nodos a despachar: $ARGUMENTS