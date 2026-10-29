---
name: swarm_router_es
description: Enruta y estructura tareas complejas en un Grafo (DAG) para ejecución por sub-agentes en el paradigma SCA v3.0 (Soporta Concurrencia de Múltiples Agentes)
---

# 🐝 Swarm Router Protocol (SCA v3.0 - CQRS)

Este flujo de trabajo se activa **SIEMPRE** que el usuario solicite un desarrollo, modificación o refactorización. Sustituye al antiguo flujo lineal.

> [!WARNING]  
> **PROHIBIDO:** Bajo ninguna circunstancia debes editar manualmente los archivos `AI_CONTEXT/swarm_ledger.md` ni `AI_CONTEXT/metricas_sca.md`. Estos archivos son espejos de solo lectura generados por la Matriz SCA.

## Fase 1: Análisis y Diseño del Grafo (DAG)

1. **Lee el Entorno y Analiza la Estructura:** 
   - Revisa `AI_CONTEXT/active_context.md` y `AI_CONTEXT/memory_schema.md`.
   - Utiliza **Codebase Memory MCP** para consultar el grafo de dependencias local (tree-sitter).
   - **CRÍTICO:** Revisa `AI_CONTEXT/swarm_ledger.md` para identificar el último número de Nodo utilizado. Continúa la secuencia numérica (ej. si el último es N13, tu primer nodo debe ser N14).
2. **Descompón la Tarea y Diagrama la Arquitectura:**
   - Divide la solicitud en "Nodos" lógicos identificando paralelismo y dependencias.
3. **Persistencia Temprana (SCA Studio Monitor):**
   - **ANTES** de esperar la aprobación, inyecta INMEDIATAMENTE tu nuevo DAG propuesto usando la CLI. Para cada nodo ejecuta:
     ```bash
     node scripts/log_sca.js --type ledger --project_name "[TuProyecto]" --sprint_name "[NombreSprint]" --node_id "[N_X]" --task_desc "[Desc]" --status "⏳ Pendiente"
     ```
4. **Emite el Context Bridge (Swarm Edition):**
   Presenta el plan al usuario para su aprobación.

## Fase 2: Ejecución del Enjambre (Con Monitoreo en Tiempo Real)

Una vez que el usuario aprueba el Context Bridge:

### Si el Modo es STRICT (Human-in-the-Loop):
1. **Ejecuta el Nodo Actual:** Procesa ÚNICAMENTE el nodo que corresponde.
2. **Actualización en Tiempo Real (OBLIGATORIO):** Inmediatamente después de generar el código, marca el nodo como completado vía CLI:
   ```bash
   node scripts/log_sca.js --type ledger --project_name "[TuProyecto]" --sprint_name "[NombreSprint]" --node_id "[N_X]" --task_desc "[Desc]" --status "✅ Hecho"
   ```
3. **Pausa y Retorna Control:** Muestra los diffs generados al usuario y espera aprobación para el siguiente nodo.

### Si el Modo es AUTONOMOUS (Piloto Automático):
1. Dispara los nodos. A medida que CADA nodo vaya finalizando, actualízalo a `✅ Hecho` vía CLI inmediatamente, sin esperar a que terminen los demás.

## Fase 3: Cierre Definitivo

1. **Reconciliación de Nodos (Sweep):** Revisa `AI_CONTEXT/swarm_ledger.md`. Si identificas nodos que quedaron pendientes pero cuyo trabajo ya fue completado, fuerza su actualización a `✅ Hecho` vía CLI.
2. **Actualiza Contexto Activo:** Modifica `AI_CONTEXT/active_context.md` (este sí es editable) para reflejar el nuevo estado global de la arquitectura.
3. **Métricas:** Registra la sesión completa ejecutando:
   ```bash
   node scripts/log_sca.js --type metric --project_name "[TuProyecto]" --main_task "[Tarea principal]" --tokens_without_sca "[Tokens Totales Repo]" --tokens_with_sca "[Tokens Usados]" --tokens_saved "[Ahorro]" --hit_density "[Densidad]" --llm_model_used "[Modelo]" --real_time_employed_hrs "[Horas]"
   ```
