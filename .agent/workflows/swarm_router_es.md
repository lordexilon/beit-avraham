---
name: swarm_router_es
description: Enruta y estructura tareas complejas en un Grafo (DAG) para ejecución por sub-agentes en el paradigma SCA v3.0
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
2. **Actualización en Tiempo Real (OBLIGATORIO):** Abrir y cerrar mediante task_workflow.cjs siguiendo la Fase 3. Marcar Hecho solo después de verificar código, captura, tiempo y evaluación persistida (puede quedar pendiente de evidencia).
3. **Pausa y Retorna Control:** Muestra los diffs generados al usuario y espera aprobación para el siguiente nodo.

### Si el Modo es AUTONOMOUS (Piloto Automático):
1. Dispara los nodos. A medida que CADA nodo vaya finalizando, actualízalo a `✅ Hecho` vía CLI inmediatamente, sin esperar a que terminen los demás.

## Fase 3: Cierre Definitivo

1. **Reconciliación de Nodos (Sweep):** Revisa `AI_CONTEXT/swarm_ledger.md`. Si identificas nodos que quedaron pendientes pero cuyo trabajo ya fue completado, fuerza su actualización a `✅ Hecho` vía CLI.
2. **Actualiza Contexto Activo:** Modifica `AI_CONTEXT/active_context.md` (este sí es editable) para reflejar el nuevo estado global de la arquitectura.
3. **Medición y evaluación con evidencia:** No usar tokens totales del repositorio como referencia de ahorro ni introducir cifras estimadas sin fuente. Antes de ejecutar cada nodo aprobado, preparar un JSON con project_name, sprint_name, node_id, task_key único y task_desc. Abrir con:
   ```bash
   node scripts/task_workflow.cjs start AI_CONTEXT/tarea.json
   ```
   Registrar una referencia comparable antes del trabajo mediante task_evaluation.cjs cuando exista evidencia. Al terminar y verificar el trabajo, cerrar con:
   ```bash
   node scripts/task_workflow.cjs finish AI_CONTEXT/tarea.json
   ```
   El cierre registra captura, tiempo, evaluación y estado Hecho, en ese orden. Si falla un paso, corregir y repetir el cierre; no marcar Hecho manualmente antes de completar el registro. Las evaluaciones sin referencia o aceptación quedan pendientes, no en cero.

4. **Límites de medición:** Tiempo del agente no equivale a tiempo humano ni a inferencia continua. Una ventana de conversación no demuestra consumo exclusivo de un nodo. La caché no es ahorro SCA. Costos de suscripción, cargos confirmados y equivalentes API se mantienen separados. No arrancar watcher permanente sin autorización. Pausa/reanudación de tiempo humano o ventanas separadas: task_time.cjs; no sumar un segundo intervalo del agente sobre una ventana ya medida por task_workflow.

5. **Persistencia del plan:** Registrar todos los nodos propuestos como Pendiente antes de ejecutar el primero. En progreso significa ejecución iniciada; Pendiente no activa el indicador de trabajo. STRICT conserva aprobación nodo por nodo.