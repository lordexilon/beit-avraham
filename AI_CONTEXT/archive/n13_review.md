# N13 — auditoría de uso efectivo y expediente de pruebas

Fecha: 2026-10-10. Proyecto: Beit Avraham. Ciclo: 11111111-2222-3333-4444-555555555555.

## Resultado

Se utiliza SCA para gobernanza por nodos, registros Matrix y mediciones del agente. No se acredita funcionamiento integral ni ahorro. El piloto N12 evaluó exclusivamente workflow-only-v1. Sus 30 trabajadores usaron conversaciones nativas Codex; instructions.md contempla herramientas nativas dentro de un IDE, por lo que no ejecutar engine.py no demuestra por sí solo incumplimiento.

| Capacidad | Evidencia / prueba | Resultado y alcance |
|---|---|---|
| Proyecto/ciclo | GET /api/project | HTTP 200; respuesta preservada |
| Métricas | GET /api/cycle-dashboard | HTTP 200; captura puntual preservada |
| DAG | GET /api/dag | HTTP 200; N13 en progreso durante la captura; cierre comprobado por separado |
| Evaluación y tiempos | 14 pruebas Node | Todas aprobadas; validan lógica, no calidad humana ni operación externa completa |
| Evidencia del piloto | SHA-256 de cada evidence_file de los 30 resultados vigentes | Coinciden; integridad respecto del registro, no autenticidad independiente |
| Codebase Memory / tree-sitter | Inventario de herramientas de esta sesión | No hay herramienta callable; consulta requerida por el workflow sin acreditar |
| RAG vectorial | Lectura del perfil N12 y engine.py | Excluido expresamente del piloto; engine.py leído usa archivos explícitos y propuestas de dependencias, sin recuperación vectorial implementada en ese archivo |
| Tiempo humano / referencias / declaraciones | API del ciclo | 0 registros de cada tipo; no se reconstruye actividad humana desde el chat |
| Finanzas | Tarjetas y valoración desconocida del ciclo | No acreditan cargos, reparto de suscripción, equivalente API ni operación local |

## Expediente reproducible

Carpeta: [evidence/N13/2026-10-10T22-52-02-008Z](evidence/N13/2026-10-10T22-52-02-008Z/).

- audit.json: alcance, resultados, comprobaciones de hashes y estados pendientes.
- tests.tap: salida íntegra de 14 pruebas, 0 fallos.
- project.json, cycle-dashboard.json y dag.json: respuestas locales puntuales.
- source-* y sha256.json: copias de fuentes seleccionadas y sus hashes. No son un backup completo del repositorio.
- Evidencia previa: [informe N12](pilot/results_review.md), snapshots y browser-first-pass.json / browser-final-checks.json bajo pilot/evidence/. Se preserva la falla inicial de development-2/sca y su corrección.

Repetir desde la raíz: `node scripts/audit_sca_usage.cjs`. Requiere Studio en localhost:3000 y acceso de lectura a la API local; crea una carpeta nueva sin sobrescribir el expediente. Usa cuatro suites Node y verifica los hashes de los resultados del piloto. No ejecuta otra vez los 30 trabajadores ni prueba el navegador. Las pruebas actuales no deben confundirse con la validación histórica de las demos.

## Hallazgos que requieren corrección

1. instructions.md pide cuantificar ahorro por archivos no leídos, en conflicto con las mediciones comparables del workflow. El tamaño de archivos omitidos no prueba tokens efectivamente evitados.
2. instructions.md pide actualizar metricas_sca.md, pero el workflow prohíbe editar espejos manualmente. Debe especificar regeneración mediante logger.
3. memory_schema.md describe recuperación ChromaDB por swarm_engine; la implementación inspeccionada no acredita esa conexión. Falta prueba con consulta, fragmentos recuperados, procedencia y uso efectivo.
4. Studio presenta conectores activados; falta evidencia de llamadas exitosas por tarea para distinguir configuración y utilización.
5. Hay 30 resultados descriptivos, pero 0 pares aceptados/comparables para ahorro. Falta revisión humana de requisitos y calidad, tiempos humanos y referencias comparables; no convertir resultados automatizados en aceptación humana.
6. Las declaraciones manuales ausentes deberían aparecer como «Sin declaraciones: 0 registros», separadas de consumo no medido.
7. El metric_extractor legacy mantiene una heurística `max(0, (archivos_totales - archivos_leidos) * 2000)` y un fallback de 1 commit si Git falla. La heurística impide reflejar pérdidas y no es consumo observado; el fallback no prueba actividad Git. No se ejecutó ese cálculo ni se incorporó su salida a Matrix. Se preservaron ambas fuentes para corregirlas en el siguiente nodo.

## Diseño del siguiente estudio — aún no ejecutado

Una tarea real, requisitos congelados y dos copias del mismo estado inicial. Mismo modelo/configuración, orden alternado y límites iguales. Identificar capacidades SCA habilitadas; verificar acceso a grafo y memoria con trazas antes de atribuirles efectos. Registrar consumo por conversación y preparación/mantenimiento por separado. Una persona revisa ambos resultados con la misma rúbrica y registra inicio/pausas/fin de su trabajo. Comparar tiempo humano con tiempo humano y tokens con tokens; conservar diferencias negativas. Para costos, solicitar importe/período y criterio de reparto de suscripción; equivalentes API y costos locales son dimensiones separadas.

N13 termina la auditoría y documentación, no la reparación de estos hallazgos ni un nuevo experimento. No se hicieron despliegues, cambios de corpus ni llamadas pagadas al motor headless.
