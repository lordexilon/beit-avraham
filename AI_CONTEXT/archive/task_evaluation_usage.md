# Referencias y evaluación por tarea

`node scripts/task_evaluation.cjs archivo.json` previsualiza; agregar `--record` guarda en Matrix. Proyecto y ciclo se validan contra el workspace.

Para una referencia: `operation: "reference"`, `input` con `project_name`, `task_key`, `reference_key` y `reference`: `task_scope`, `source_reference`, `human_hours` y/o `tokens_without_sca` (número o rango low/high). La fuente debe respaldar esos valores. Registrar antes del trabajo; una referencia posterior queda retrospectiva.

Para evaluar: `operation: "task"`, `input` con `project_name`, `task_key`, `evaluation_key`, `reference_id`, `task_scope`, `comparable`, `accepted` y `comparison_reference`. Consumo atribuible requiere `capture_event_ids` y `capture_attribution_reference`. Una ventana de conversación compartida no demuestra consumo exclusivo.

Tiempo del agente no sustituye tiempo humano. Sin referencia, resultado aceptado o evidencia de comparación, el ahorro queda pendiente. Las pérdidas permanecen negativas. Los datos sintéticos de tests nunca se registran como referencias reales.
