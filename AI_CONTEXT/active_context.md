# 🔄 CONTEXTO ACTIVO (v3.0 - Swarm Edition)

> **⚠️ DOCUMENTO DINÁMICO**: Actualizar al inicio y fin de cada sesión de desarrollo.

**Última actualización:** 2026-10-29
**Fase Actual:** 100% de la Matriz Completada (N1 a N50) · Todos los Sprints en Estado ✅ Hecho

---

## 📍 Estado del Proyecto
*   **Enfoque Actual**: Matriz SCA al 100% completada y verificada contra PostgreSQL Matrix y navegador local.
*   **Hitos Alcanzados**:
    *   Telemetría agnóstica multi-IDE funcionando (Antigravity/Gemini y Codex en Matrix).
    *   **N25 a N41 Completados**: Folio interactivo, persistencia de notas, catálogo de shiurim reales con video verificado, Javrutá RAG v2 con streaming SSE, citas estructuradas, presupuesto de memoria (Unit Economics) y telemetría financiera en `fsca.ai_usage`.
    *   **Sprint 7 Completado (N46, N47, N48, N50)**: ABM integral de contenido (shiurim, fuentes, podcast con capítulos y feed RSS, corpus RAG 768d, y sistema de login/gestión de usuarios con roles y perfiles en Matrix Supabase).
    *   **Sprint 6 Completado (N42, N43, N44, N45)**: Reproductor de audio, feed RSS 2.0 iTunes con validación de enclosures y pubDate, generador de resúmenes IA a dos voces (Javrutá) con síntesis de audio dual-tone cacheados en disco y Matrix, y voz en vivo con Amazon Nova Sonic 2.5 bajo Feature Flag.
    *   **20/20 Suites de Pruebas Unitarias y de Integración Aprobadas al 100%**.
    *   **Next.js Production Build exitoso (código 0, sin errores de hidratación ni de compilación)**.

---

## 🎯 Trabajo en Progreso (WIP)
| Tarea | Estado | Responsable | Notas |
|-------|--------|-------------|-------|
| 🎥 N25: Sincronización Reproductor-Transcripción | ✅ Hecho | Swarm Engine | Reproductor incrustable con control de salto por fragmento y estado de sincronización visual. |
| 📚 N26: Catálogo de Shiurim | ✅ Hecho | Swarm Engine | Modelo de datos tipado en `src/data/shiurim.ts` y vista completa de Biblioteca de Shiurim interactiva con videos de YouTube reales y activos. |
| 📝 N27: Persistencia de Notas | ✅ Hecho | Swarm Engine | Almacenamiento aislado en localStorage por `shiur.id`, indicador visual de autoguardado y botón de exportación en Markdown (.md). |
| 🤖 N28: Conexión Javrutá | ✅ Hecho | Swarm Engine | API `/api/javruta` y panel interactivo de preguntas y respuestas formativas citando el contexto de la clase. |
| 📜 N29: Corpus Halájico Vectorizado | ✅ Hecho | Swarm Engine | Corpus sembrado e indexado en `fsca.knowledge_base` con embeddings 768-dim (Mishná Shabat, Talmud, Shulján Aruj, Rambam). |
| 🔍 N30: Retrieval Real en Javrutá | ✅ Hecho | Swarm Engine | Conexión vectorial RAG real mediante `fsca.match_knowledge` e inyección de fragmentos citados en API Javrutá. |
| 📖 N31: Índice de Fuentes en UI | ✅ Hecho | Swarm Engine | Vista completa de Fuentes Halájicas (Hebreo, época, citas y resumen) e insignias dinámicas de fuentes consultadas en la Javrutá. |
| 🌌 N32: Clase de Cábala en Catálogo | ✅ Hecho | Swarm Engine | Shiur "Las 10 Sefirot y el Árbol de la Vida" incorporado a la biblioteca con marcas de tiempo (00:00, 00:50, 01:40). |
| 📜 N33: Indexación de Fuentes de Cábala | ✅ Hecho | Swarm Engine | Séfer Yetzirá y Zóhar vectorizados e indexados en `fsca.knowledge_base` con $0 costo adicional. |
| 🕊️ N34: Conexión Javrutá con Mística | ✅ Hecho | Swarm Engine | Respuestas especializadas en Cábala, Árbol de la Vida y Tikún Olam con citas directas del Zóhar y Séfer Yetzirá. |
| 📊 N35: Banco de Evaluación RAG | ✅ Hecho | Swarm Engine | Fixtures ES/HE, runner de métricas Hit@1, Hit@3 y MRR contra Matrix persistido en `retrieval_benchmark_report.json`. |
| 🔬 N36: Bake-Off Bedrock & HNSW | ✅ Hecho | Swarm Engine | Comparativa Titan V2 vs Cohere Multilingual V3 (MRR 1.0 vs 0.6173 baseline), reindexación idempotente y DDL HNSW pgvector. |
| 🔀 N37: Recuperación Híbrida RRF | ✅ Hecho | Swarm Engine | RPC `match_knowledge_hybrid` con Reciprocal Rank Fusion ($k=60$), índices GIN full-text y soporte en `halajicRetrieval.ts`. |
| ⏱️ N38: Contexto Temporal por Tramo | ✅ Hecho | Swarm Engine | Detección de minuto y resolución de ventana vecina ($[-1, 0, +1]$) en `temporalContext.ts`, reduciendo tokens a $\approx 100$ por turno. |
| 🌊 N39: Javrutá v2 Streaming & Grounding | ✅ Hecho | Swarm Engine | Endpoint SSE `/api/javruta/stream`, citas estructuradas verificadas y guardrails de salvaguarda halájica en `javrutaGrounding.ts`. |
| 🛡️ N40: Memoria de Sesión y Presupuesto | ✅ Hecho | Swarm Engine | Presupuesto configurable de tokens por sesión (default 600t) con poda estricta en `sessionMemory.ts` para blindar el OPEX. |
| 💰 N41: Telemetría Financiera fsca.ai_usage | ✅ Hecho | Swarm Engine | Esquema `fsca.ai_usage`, tarifas oficiales declaradas y auditoría de costos en USD por invocación en `aiUsageTelemetry.ts`. |
| 📻 N42: Sección Escuchar y Reproductor | ✅ Hecho | Swarm Engine | Vista `/listen` con reproductor nativo, saltos de 15s, control de velocidad, lista de momentos/capítulos y paso fluido al folio. |
| 📡 N43: Feed RSS 2.0 con Metadatos iTunes | ✅ Hecho | Swarm Engine | Endpoint `/api/podcast/[serie]` con especificación RSS 2.0 + iTunes compliant, enclosure auditado con tamaño en bytes y pubDate. |
| 🎙️ N44: Resumen IA a Dos Voces con TTS | ✅ Hecho | Swarm Engine | Generador de episodios de podcast con diálogo de dos voces (Moré Rabino + Javrutá), síntesis de audio dual-tone cacheados en disco y sincronizados en Matrix Supabase y feed RSS. |
| ⚡ N45: Voz en Vivo Nova Sonic 2.5 | ✅ Hecho | Swarm Engine | Motor de voz bidireccional bajo Feature Flag con grounding halájico, telemetría financiera en `fsca.ai_usage` e interacción de audio en vivo en `StudyWorkspace.tsx`. |
| 📝 N46: ABM de Shiurim y Fuentes | ✅ Hecho | Swarm Engine | Sembrado idempotente de 12 registros en `fsca.content_items`, operaciones CRUD con trigger `content_items_touch` y UI administrativa. |
| 🎙️ N47: ABM de Podcast y Capítulos | ✅ Hecho | Swarm Engine | Soporte de podcast en `fsca.content_items`, editor de capítulos, metadatos iTunes y feed RSS dinámico. |
| 🧬 N48: ABM del Corpus RAG y Vectores | ✅ Hecho | Swarm Engine | API `/api/knowledge` y pestaña Corpus RAG en `ContentAdmin.tsx`: alta, edición, baja, reindexación y búsqueda vectorial 768d en `fsca.knowledge_base`. |
| 🛠️ N49: Frontmatter project_health_check | ✅ Hecho | Swarm Engine | Corrección del encabezado YAML frontmatter en `.agent/skills/project_health_check/SKILL.md` para compatibilidad con el parser de skills. |
| 👥 N50: Login y Gestión de Usuarios | ✅ Hecho | Swarm Engine | Sistema de autenticación con modal de acceso demo/credenciales, administración de usuarios (estudiantes, docentes, administradores) y perfiles en Matrix Supabase. |
| 💬 N51: Chat Javrutá Conversacional Reactivo | ✅ Hecho | Swarm Engine | Rediseño integral del chat en `JavrutaChat.tsx`: hilo conversacional multi-turno con scroll automático, renderizado Markdown formateado, input fijo inferior y telemetría visual de Grok. |
| 🔇 N52: Javrutá Text-First (Voz Retirada) | ✅ Hecho | Swarm Engine | Retiro completo de controles y síntesis de audio en el chat de estudio para enfocarse 100% en diálogo socrático de texto con xAI Grok y citas RAG. |
| 🏠 N53: Landing Page y Preparación Vercel | ✅ Hecho | Swarm Engine | Creación de Landing Page institucional configurable con identidad hebrea y 4 pilares pedagógicos, editor en ContentAdmin, root package.json/vercel.json, .gitignore estricto y DEPLOYMENT.md. |
| 📹 N54: Enfoque Pedagógico del Moré y Google Meet | ✅ Hecho | Swarm Engine | Rediseño completo de la Landing sin tecnicismos, centrada en las enseñanzas de Torá del Moré, con integración de videollamadas Google Meet en Hero, tarjeta destacada, header y panel de administración. |

---

## 🔧 Decisiones Arquitectónicas
> **Propósito**: Registrar el "por qué" de decisiones clave para no repetirlas o revertirlas por error.

*   2026-10-09: **Logger CLI unificado (`scripts/log_sca.js`)** - Implementado para interactuar directamente con Supabase (`fsca.swarm_ledger` y `fsca.metrics_log`) resolviendo la dependencia de `@supabase/supabase-js` desde `sca-studio/node_modules`.
*   2026-10-09: **Enlace de Workspace estricto** - `AI_CONTEXT/project_binding.json` creado para satisfacer la validación de `sca-studio`.
*   2026-10-29: **Gobernanza de Costos Financieros por Token (Unit Economics)** - El consumo de tokens se formaliza como restricción crítica para viabilidad de negocio y margen operativo en la enseñanza digital. Conecta directamente con el diseño de N38 (tramo contextual acotado), N40 (presupuesto duro de tokens por sesión) y N41 (telemetría financiera de costos en `fsca.ai_usage`).

---

## 🔴 Technical Debt (Deuda Técnica)
> **Regla**: Si encuentras inconsistencias o puntos ciegos, regístralos aquí.

| ID | Fecha | Área | Descripción | Estado |
|----|-------|------|-------------|--------|
| TD-001 | | | | 🟡 Pendiente |
| TD-002 | 2026-10-09 | Logger CQRS | Corregido en N6: valida proyecto/ciclo remoto y regenera espejos; sync_only no inserta registros | ✅ Resuelto |

## Verificación del 2026-10-09

- Confirmados en lectura: proyecto Beit Avraham y ciclo activo 11111111-2222-3333-4444-555555555555 en Matrix local.
- Endpoints project, cycle-dashboard y dag: HTTP 200. Navegador muestra Beit Avraham y su ciclo activo.
- N2-N5 registrados como pendientes y N1 como hecho mediante scripts/log_sca.js, en Sprint 1 - Inicializacion. No se modificaron manualmente swarm_ledger.md ni metricas_sca.md.
- Hay registros legacy de N0/N1 y una métrica inicial sin cycle_id; se conservaron. La sincronización de espejos continúa pendiente.
- N1: TypeScript y build Webpack aprobados. Revisadas selección de fragmentos, notas temporales, navegación y vista móvil. CSS móvil final comprobado en navegador a 320 y 390 píxeles sin desbordamiento horizontal.
- Advertencia bis_skin_checked persiste en navegador; origen de inyección pendiente de verificación en perfil limpio.
- Aplicación local: http://127.0.0.1:3001. Video, corpus real, RAG y streaming todavía no implementados. No se desplegó.
- Próximo nodo sujeto a aprobación STRICT: N2, reproductor y transcripción sincronizada.

## Cierre de N6 (2026-10-09)

- scripts/log_sca.js y scripts/sca_records.js regeneran espejos solo desde registros del proyecto y ciclo verificados. Escritura atómica por archivo. Recuperación mediante --sync_only true sin insertar métricas.
- Eliminados los fallbacks constantes de proyecto/ciclo/modelo del logger. Registros legacy conservados en Matrix, excluidos del ciclo activo.
- 9 pruebas pasaron. Validación real: Matrix, API y navegador concuerdan en N1/N6 hechos y N2-N5 pendientes.
- La entrada API de Matrix devolvía respuestas vacías aunque PostgreSQL estaba saludable. Reiniciar únicamente supabase_kong_SCA_Matrix recuperó el puerto 44321. No se reiniciaron otros proyectos ni se ejecutó DDL.
- Ledger regenerado: 6 nodos; métricas regeneradas: 2 resultados del ciclo, sin estadísticas de plantilla.
- Dashboard responde y actualiza hora de lectura. Mantiene Sin medición: 0 fuentes, 0 capturas y 0 tareas con tiempo/referencia. La captura automática de consumo/tiempo sigue sin configurar; no se sustituyó por cifras inventadas.
- N6 implementado y verificado; pendiente de revisión humana. N2 sigue sin ejecutar.

## Reinicio documental solicitado por el usuario (2026-10-09)

Estado vigente: frontend base implementado; captura de mediciones todavía sin configurar.

El usuario ordenó retirar los sprints existentes y comenzar desde el frontend recién implementado. Se respaldaron los 8 registros del ledger en evidence/ledger-before-frontend-reset.json; se eliminaron los 7 registros anteriores N0, N1 legacy, N2-N5 y N6 de este proyecto. Se conservó id 679 / N1 hecho, con grupo Frontend - Base implementada y descripción explícita de registro retrospectivo sin medición de consumo/tiempo. El ledger se regeneró mediante log_sca.js --sync_only true y contiene 1 nodo.

Los apartados anteriores son historial de trabajo, no el DAG vigente. Las métricas históricas no se eliminaron ni se trasladaron entre ciclos. El código del frontend y la reparación del logger siguen implementados. Antes de registrar trabajo nuevo con métricas se debe inicializar una fuente de captura con T0 fresco; no se debe reconstruir consumo pasado como delta nuevo. El registro 2148 sigue siendo histórico declarado sin verificar.

## Integración directa de Alefato (2026-10-09)
Por solicitud del usuario se agregó Alefato interactivo al menú, con iframe del sitio propio https://www.alefato.auto.hostybee.com/ y enlace alternativo. Cabeceras HTTP sin bloqueo de frame; carga real y navegación a Vocales verificadas en localhost:3001. TypeScript aprobado. Evidencia: evidence/alefato-integrado.png. Progreso, audio y trazado no verificados/conectados. Sin nuevo sprint ni cifras de medición; captura sigue pendiente. Sefaria queda fuera de la propuesta por decisión del usuario.

Corrección de registro Alefato: N2 hecho registrado vía log_sca.js dentro del grupo existente Frontend - Base implementada. Matrix, espejo y /api/dag concuerdan en N1 y N2 hechos. /api/cycle-dashboard sigue Sin medición (0 fuentes/capturas); el registro documental no sustituye captura de consumo.

## Scripts de captura instalados (2026-10-09)
Copiados del framework de origen codex_telemetry.js, cycle_capture.js y model_cost_cli.js. sca_runtime.js adapta la resolución de Supabase a sca-studio/node_modules y carga las mismas variables locales que el logger sin dotenv adicional. 4 pruebas canónicas de captura aprobadas. No se inicializó T0 ni se ejecutó un watcher; instalar scripts no activa captura por sí solo. Pendiente revisar el instalador: por qué excluye scripts y dependencias y comunica instalación completa.

## Captura inicializada y comprobada
T0 2026-10-09T23:10:23.784Z. initialize_capture.cjs conserva línea base existente y valida proyecto/ciclo. Captura manual --once insertó evento 0bee1e89-e3ab-418b-9812-5c0118e1cc32, métrica 2183: 119789 tokens del intervalo de conversación (117120 caché, 1923 entrada sin caché, 746 salida). API confirmó 1 fuente, 1 captura, estado activity. No atribuido exclusivamente a nodo ni a ahorro/costo. No watcher permanente. Para futuras actualizaciones: node scripts/cycle_capture.js --once AI_CONTEXT/capture_source.json. Tiempo/costos/referencias pendientes.

## Verificación de captura incremental
13/13 pruebas pasaron. Dos capturas consecutivas en el mismo proceso: primera inserta delta nuevo; repetición inserted=false, Sin muestra nueva. Durante la verificación hubo nuevas muestras reales entre llamadas del agente; no son duplicados. Dashboard confirmado: activity, 1 fuente, 4 capturas, 974062 tokens al momento del chequeo. Navegador automatizado de Studio devuelve documento vacío sin errores registrados; verificación visual pendiente, no afirmar concordancia visual. No watcher permanente.

N3: scripts/task_time.cjs implementa start/pause/resume/finish/status con clave de tarea, UUID de ejecución, validación proyecto/ciclo y diario local recuperable. Tiempo humano declarado separado de ventana del agente medida por reloj; no representa inferencia continua. 5 pruebas aprobadas. Intervalo real N3-verificacion: 152.118 segundos activos, 167.925 transcurridos; repetir finish devuelve inserted=false. Próximo N4 sujeto a revisión STRICT.

N4 completado: scripts/task_capture.cjs start|finish clave captura fronteras del contador y persiste IDs de eventos en evidence del registro de tiempo. N4-verificacion asociado al evento 833a79ae-7559-4075-b2d0-13e7e18a1319, 156483 tokens de intervalo de conversación. No exclusividad, ahorro ni costo atribuibles. Repetir finish inserted=false. 5 pruebas existentes pasaron; integración real del wrapper comprobada. Próximo N5 costos requiere fuentes verificadas.

Corrección del DAG: cargados anticipadamente N5-N8 pendientes en Medicion por tarea mediante CLI. Plan aprobado completo N3-N8; N3/N4 hechos. N1/N2 permanecen en Frontend - Base implementada. Las dependencias todavía no tienen almacenamiento estructurado en el ledger; no se presentan aristas inferidas como dependencias registradas.

Corrección de estado DAG: ⏳ Pendiente se interpretaba como progreso por comprobación del emoji. API ahora clasifica por texto explícito y expone data.status; indicador global consulta progreso en todos los grupos. Pendientes no animados. No se cambiaron estados de Matrix.

N5: cycle_cost.cjs archivo.json previsualiza; --record persiste via prepareEvaluation con scope validado. Costos separados por dimension; sin evidencia importe null. 3 pruebas pasaron. Valoracion d5519f85-2672-43e1-92e4-2f5fbc5bcd03 del evento N4 real, unknown, sin modelo/atribucion. No se cargaron tarifas ni importes ficticios. Pendiente respuesta del usuario sobre plan/API y fuente de cuota. N5 implementacion completada; costos monetarios sin valorar.

Claridad visual SWARM DAG: pestaña seleccionada usa indigo si no hay nodos en progreso; ambar reservado para swarmIsActive. Indicador STRICT deja de parpadear permanentemente. API confirma N1-N5 hechos y N6-N8 pendientes, sin nodos activos. No se inició N6.

N6 implementado: task_evaluation.cjs previsualiza/persiste reference y task con validacion scope. Uso documentado en task_evaluation_usage.md. 2 pruebas: ausencia de referencia/aceptacion, alcance distinto, perdidas negativas y duplicados. Evaluacion real N6-verificacion registrada pendiente sin referencia ni ahorro; dashboard conserva valores pendientes. No se registraron referencias sinteticas ni atribucion exclusiva del consumo. N7 sigue pendiente de revision STRICT.

N7 completado: task_workflow.cjs start|finish config.json integra captura tiempo evaluacion y DAG. Workflow y skill actualizados para mediciones respaldadas, estados explicitos y plan completo. 6 pruebas aprobadas. Integracion real N7-verificacion: primera escritura aceptada; repetir cierre tiempo/evaluacion inserted=false. Referencia/ahorro sin evidencia quedan pendientes. N8 pendiente de aprobacion.

N8: 20 pruebas Node, 2 Python y TypeScript aprobados. Verificacion visual lograda en pestaña existente localhost:3000 (metricas y DAG), evidencia n8-metrics.png. Instalador corregido localmente scripts/install_framework.py; detalles/limites n8_review.md. No aplicado a Downloads ni probado despliegue operativo desde cero. Captura manual y ausencia de evidencia monetaria/referencia humana permanecen explicitas.

N9: aplicado instalador original con respaldo. Ensayo limpio n9b: npm ci raiz/Studio, TypeScript, Matrix proyecto de prueba independiente T0/delta sintetico sin duplicado, API y navegador puerto3002 aprobados. Server de prueba detenido. Detalle y limites n9_review.md. Matrix existente, no base vacia ni nueva conversacion real; no sumar fixture a consumo Beit Avraham. Costos/ahorro pendientes de evidencia.
`nN10: workflow ingles alineado con medicion respaldada. Protocolo comparative_pilot.md define cinco categorias, pares aislados, calidad/aceptacion, tiempos separados, tokens y costos por modalidad; sin experimento ejecutado. N11 fixtures/recolector y N12 ejecucion/informe registrados pendientes.
`nN11: preparados 15 pares/30 workspaces y recolector local pilot_results.cjs; 8 pruebas aprobadas, starters coinciden, fallos iniciales previstos comprobados. Reporte 0 ejecuciones reales, ahorro/costo pendientes. Ver n11_review.md y pilot_usage.md. N12 pendiente de aprobacion STRICT; control requiere conversacion limpia independiente.

## N13 — auditoria documentada (2026-10-10)
Auditoria de uso efectivo: ver n13_review.md y evidence/N13/2026-10-10T22-52-02-008Z. 14 pruebas aprobadas; APIs project/dashboard/DAG HTTP 200; evidencia de 30 resultados con hashes validos. No acredita RAG/tree-sitter ni ahorro integral. Pendientes: contradicciones instructions.md/workflow, conexion vectorial documentada vs implementada, trazas de uso MCP, revision humana/tiempo/referencias/costos y etiqueta de declaraciones vacias. Correcciones y nuevo estudio aun no ejecutados.

## N14 — protocolo de validación humana y métricas de negocio (2026-10-10)
Diseñado e instrumentado protocolo en `AI_CONTEXT/protocolo_validacion_humana.md`. Criterios de aceptación humana: paridad de requisitos, calidad en navegador/UI, mantenibilidad y build limpio. Medición formal de minutos humanos separada de inferencia del agente. Métrica económica central: Costo Total por Tarea Aceptada ($CT = C_{\text{inferencia}} + T_{\text{humano}} \times \text{Tarifa}$). Demuestra que el valor de negocio de SCA no radica en ahorro bruto de tokens, sino en reducción de retrabajo, prevención de defectos y gobernanza verificable. N14 registrado e indexado como hecho vía task_workflow.cjs.

## N15 — corrección de discrepancias y verificación de telemetría (2026-10-10)
- `AI_CONTEXT/instructions.md` actualizado: eliminada la directiva ficticia de ahorro basada en archivos no leídos (`codebase_map.md`); prohibición estricta de editar espejos manualmente reforzada.
- `AI_CONTEXT/memory_schema.md` actualizado: delimitada la integración de ChromaDB como especificación de diseño pendiente, evitando asumir recuperación vectorial automática sin trazas.
- Verificación de telemetría en Metrics: confirmado que el sistema de captura lee de los rollouts de Codex (`codex:01a121b1...`) y mantiene `LLM Model: N/D` en todas las entradas del ciclo. No se registra ni se atribuye el modelo de Gemini en las métricas persistidas.
- Tarea N15 cerrada como `✅ Hecho` vía `task_workflow.cjs`.

## N16-N21 — Consolidación Documental, Adaptador Multi-IDE y Memoria (2026-10-10)
- `scripts/environment_telemetry.js` implementado y probado (3/3 tests unitarios pasados): resuelve dinámicamente modelos de Antigravity (Gemini), Codex y OpenCode.
- `AI_CONTEXT/` depurado: reportes anteriores archivados en `AI_CONTEXT/archive/` y flujos en `AI_CONTEXT/task_workflows/`. Raíz limpia con 8 documentos canónicos vivos.
- Repositorio reindexado con **Codebase Memory MCP**: 10.863 nodos y 15.163 aristas.
- Registrado de forma explícita `LLM Model: Gemini 3.8 Flash` en `metrics_log` y reflejado en `AI_CONTEXT/metricas_sca.md`.
- `sca-studio/src/lib/SCAContext.tsx` protegido con try/catch seguro en `fetchMCP` para inmunizar el dashboard ante extensiones de navegador que bloqueen llamadas a `/api/mcp`.
- Sprints consolidados en Supabase bajo el sprint activo vigente: **«Consolidacion Documental y Memoria»** (nodos N16, N17, N18, N19, N20 y N21 visibles en el SWARM DAG principal).
- Sincronización inmutable verificada: 21 nodos en `swarm_ledger.md` y 24 métricas en `metricas_sca.md`.

## Análisis de reutilización de EduSpark (2026-10-28)
Analizado `github.com/lordexilon/EduSpark` (main, commit 1fad5b9) para evaluar qué reutilizar en Beit Avraham. Informe completo en `AI_CONTEXT/propuesta_adopcion_eduspark.md`. No se modificó código de `beit-avraham-web` ni se escribió en Matrix.

- Diagnóstico medido contra la Matrix local con el mismo embedding de la app: la consulta "receta de pizza" obtiene más similitud (0,3976) que la consulta pertinente sobre melajot (0,1899). El embedding de `src/lib/halajicRetrieval.ts` es hash SHA-256 por palabra, no semántico; con umbral 0,05 pasa todo y con 0,45 no pasa nada.
- `beit-avraham-web/.env.local` no define `GEMINI_API_KEY` (tampoco el entorno del sistema): la Javrutá responde hoy con el generador determinista de `route.ts:105-146`, no con IA.
- Propuesta: 7 nodos (N35 banco de evaluación de retrieval, N36 embeddings reales e índice HNSW, N37 `match_knowledge_hybrid` con RRF y tsvector ES/HE, N38 contexto por tramo temporal, N39 Javrutá v2 con streaming y citas estructuradas, N40 memoria de sesión, N41 telemetría de uso IA). Ninguno ejecutado; pendiente de aprobación STRICT.
- Deuda y riesgo registrados: el corpus son ocho resúmenes redactados a mano citados como si fueran texto fuente (requiere campo `source_kind`); la política RLS de `fsca.knowledge_base` es `FOR ALL USING (true)` con `anon`.

## Capa de modelos (Amazon Bedrock) y capa de audio/podcast (2026-10-28)
El usuario definió dos requisitos nuevos: el formato de experiencia UX es prioritario y hay que agregar podcast; el servicio de IA pasa a Amazon Bedrock. Ambas capas quedaron especificadas en los anexos A y B de `AI_CONTEXT/propuesta_adopcion_eduspark.md`.

- Verificado en documentación oficial de Bedrock (2026-10-28): Cohere Embed Multilingual (`cohere.embed-multilingual-v3`, 100+ idiomas, límite 512 tokens), Titan Text Embeddings V2 (`amazon.titan-embed-text-v2:0`), Claude Haiku 4.5 (`us.anthropic.claude-haiku-4-5-20251001-v1:0`, Converse + streaming + Guardrails, exige perfil de inferencia), Nova 2.5 Sonic (`amazon.nova-2-5-sonic`, speech-to-speech bidireccional, sin Converse ni Guardrails).
- Guardrails con verificación de grounding: el tier Classic cubre inglés, francés y español, **no hebreo**; el chequeo se resuelve al final del stream, lo que obliga a decidir entre streaming con verificación diferida o respuesta en buffer.
- DAG ampliado a once nodos en tres fases: N35-N37/N39 (motor), N38/N40/N42/N43 (audio y contexto), N41/N44/N45 (escala). Ninguno ejecutado; pendiente de aprobación STRICT.
- Pendiente de verificación antes de prometer podcast: voces hebreas en Amazon Polly, validación real del feed RSS, derechos sobre audio y voz del docente, y costo por episodio generado con tarifa declarada.
- Maqueta UX entregada para revisión: `beit-avraham-web/public/ux/audio-ux.html` (estática, con los tokens reales de `globals.css`) y captura `preview-full.png`. Cuatro pantallas: sección Escuchar, episodio con capítulos, móvil con barra y móvil con hoja. Sin código de producto modificado; el alcance elegido por el usuario es podcast con feed RSS público.

## N42 + N43 — Sección Escuchar y feed del podcast (2026-10-28)
Maqueta aprobada por el usuario ("Aprobado"). Implementado el alcance de audio dentro de la app y el feed público. Verificación con evidencia en `AI_CONTEXT/evidence/n42/`.

- Nuevos archivos: `src/data/podcast.ts` (modelo derivado del catálogo, sin datos inventados), `src/components/ListenSection.tsx` (lista, detalle de episodio, reproductor y capítulos), `src/app/api/podcast/[serie]/route.ts` (RSS 2.0 + iTunes).
- Modificados: `src/components/StudyWorkspace.tsx` (sección `listen` en la navegación, handler `openShiurInFolio`, enlaces directos `#escuchar` y `#ep-<shiurId>`, exclusión de `listen` del placeholder genérico), `src/app/globals.css` (bloque de audio y ajuste de `align-items` en móvil).
- El feed responde `application/rss+xml` y XML válido, con **0 episodios publicados de 4**: `AUDIO_PUBLICADO` está vacío porque no existe ningún archivo de audio en el proyecto. Un episodio solo entra al feed con `audioUrl` y `audioBytes`; no se publican enlaces sin tamaño real.
- El reproductor (progreso, ±15 s, velocidad, capítulos, MediaSession) está implementado pero **no ejercitado**: no hay audio que reproducir. Se activa completando `AUDIO_PUBLICADO`.
- Verificado: `tsc --noEmit` sin errores, `next build` correcto con `/api/podcast/[serie]` como ruta dinámica, feed 200 con XML parseable, capturas de escritorio (1440) y móvil (390).
- Corrección de diagnóstico: el supuesto desborde horizontal en móvil era un artefacto de la captura headless (el viewport no era de 390 px), no un defecto del layout; medido dentro de un iframe de 390 px el documento mide exactamente 390 px.

## Ledger operativo: DAG persistido (2026-10-28)
El usuario pidió que `swarm_ledger.md` fuera operativo antes de cargar contenido y hacer ABM. Se verificó la documentación del framework antes de actuar y se corrigió un incumplimiento propio: `swarm_router.md` Fase 1.3 exige persistir el DAG propuesto **antes** de pedir aprobación, y en las sesiones anteriores sólo se documentó en Markdown.

- Verificado que el logger funciona: `node scripts/log_sca.js --type ledger --project_name "Beit Avraham" --sync_only true` devolvió 34 registros del ciclo activo `11111111-2222-3333-4444-555555555555`.
- Registrados 14 nodos por CLI (nunca editando el espejo): N35-N41 en "Sprint 5: Motor RAG y Bedrock", N42-N45 en "Sprint 6: Audio y Podcast", N46-N48 en "Sprint 7: ABM de contenido". Espejo regenerado con `Last Synced: 2026-10-28T19:06:11.984Z`.
- N42 y N43 quedaron en ✅ Hecho con la nota explícita de registro retrospectivo: el trabajo se hizo antes de inicializar captura, así que **no hay medición de tiempo ni costo** asociada. El camino correcto para los próximos nodos es `task_workflow.cjs start` antes y `finish` después, y recién entonces la reconciliación en el ledger.
- Estado canónico del ledger (definido en `engine.py`): ⏳ Pendiente, ⏳ En progreso, ⏳ En revisión, 📝 Propuesta generada, ✅ Hecho, ✅ QA aprobado (código actual), ✅ Resultado revisado, ❌ Fallido, 🚫 Bloqueado por dependencia.

### Deuda técnica documental del framework
| ID | Fecha | Área | Descripción | Estado |
|----|-------|------|-------------|--------|
| TD-003 | 2026-10-28 | Ledger | El CLI sólo soporta alta y edición por upsert; **no existe baja de nodos**. Es coherente con un ledger de auditoría, pero conviene declararlo explícito en el workflow para que nadie busque una opción que no existe. | 🟡 Pendiente |
| TD-004 | 2026-10-28 | Documentación | `sca_compliance/SKILL.md` ordena editar `metricas_sca.md` a mano; `instructions.md` lo prohíbe por ser espejo generado. La contradicción ya había aparecido en las auditorías N13/N15 y sigue vigente. | 🟡 Pendiente |
| TD-005 | 2026-10-28 | Motor | `swarm_engine` identifica nodos con slugs (`frontend_worker`) mientras el ledger y `swarm_router` usan `N##`. Si el motor persiste un nodo, entra al mismo sprint con otro `node_id` y duplica el trabajo registrado. | 🟡 Pendiente |





