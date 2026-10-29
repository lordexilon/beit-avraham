# Auditoría de registro 2148 y captura disponible

2026-10-09. Solo lectura de PostgreSQL y archivos; no se modificaron filas ni se inicializó captura.

## Registro 2148

Creado 2026-10-09T18:14:31.150655+00:00, tarea Inicializacion y registro SCA. Contiene 40000 tokens_without_sca, 8000 tokens_with_sca, 32000 tokens_saved, 0.25 real_time_employed_hrs, hit_density 1.0 y modelo Gemini 3.8 Flash. cycle_id, modified_files, ai_context_files_read y execution_loops son null. Su estrategia y modelo coinciden con los defaults del logger anterior preservado en evidence/log_sca.before-n6.js; esta coincidencia no demuestra qué agente lo creó.

No tiene referencia a fuente, counters_before/counters_after, T0, pausas o ejecución identificada. No se encontró evidencia que justifique sus cifras como medición real ni que atribuya 32000 tokens al efecto SCA. Clasificación propuesta: histórico declarado sin verificar. Conservarlo tal cual en PostgreSQL, sin trasladarlo al total medido del ciclo activo.

## Captura disponible

PostgreSQL tiene las tablas capture_watermarks y capture_usage_events y las funciones initialize_capture_source, record_capture_delta, record_capture_time y record_capture_assessment. Beit Avraham tiene 0 watermarks y 0 eventos de captura. El ciclo activo sigue siendo 11111111-2222-3333-4444-555555555555.

El framework de origen dispone de scripts/codex_telemetry.js y scripts/cycle_capture.js. No están instalados en scripts/ de Beit Avraham. cycle_capture.js además depende de model_cost_cli.js, dotenv y dependencias de la raíz: copiar solo el archivo no basta. Su CLI calcula root respecto de su propio archivo; ejecutarlo desde Downloads apuntaría al framework de origen, no a este proyecto.

Existe un rollout de este workspace: C:/Users/Legion 5/.codex/sessions/2026/10/09/rollout-2026-10-09T14-23-30-01a121b1-0062-7e20-bfc5-e0eae777c1bc.jsonl. Identidad 01a121b1-0062-7e20-bfc5-e0eae777c1bc. Se encontraron más de cien muestras acumulativas. El parser canónico validó identidad, workspace, monotonicidad y consistencia del total/desglose. Son contadores acumulados de conversación; no son trabajo exclusivo de un nodo, ahorro SCA ni cargo facturado.

## Próximo paso propuesto

N7: adaptar el recolector a las dependencias de este proyecto, verificar su identidad de fuente y registrar una línea base T0 fresca en el ciclo activo mediante initialize_capture_source. Capturar después solo deltas nuevos mediante record_capture_delta y verificar el dashboard. Mostrar el registro 2148 como histórico declarado separado, sin incorporarlo a consumo medido. No importar el acumulado previo como consumo nuevo ni atribuir el contexto de modelo a facturación.

Iniciar con capturas manuales de una pasada; un recolector permanente requiere definir cómo arrancarlo/detenerlo y aprobación de ese modo. El tiempo humano y los costos necesitan fuentes/evidencia propias; no se derivan automáticamente de los contadores de tokens.

N7 requiere aprobación de su Context Bridge y de las escrituras de línea base/captura. Esta auditoría no realizó esas escrituras.
