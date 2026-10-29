# Propuesta: qué tomar de EduSpark para Beit Avraham

> **Estado:** propuesta para revisión humana. No se modificó código de `beit-avraham-web` ni datos de Matrix.
> **Fecha:** 2026-10-28
> **Origen analizado:** `github.com/lordexilon/EduSpark`, rama `main`, commit `1fad5b9` (2026-04-15), 1.879 archivos.
> **Método:** lectura de código del pipeline RAG, capa de agentes y gobernanza de costos; más una prueba empírica de recuperación contra la Matrix local (ver §2). Las cifras de recuperación de §2 son mediciones propias; las de §5 citadas de EduSpark se marcan como tales y no se verificaron contra tarifas o métricas de producción.

---

## 1. Veredicto en una línea

De EduSpark conviene traer **seis patrones de ingeniería** (embeddings semánticos reales, contrato de fragmento con metadatos, fusión vector+texto, recuperación en dos fases, contrato de citación con rechazo explícito, y gobernanza de uso/costo) y **no** conviene copiar el "sistema multi-agente", la memoria conversacional ni el esquema de ingesta: en EduSpark esas tres piezas existen pero están a medio conectar, y su valor real para Beit Avraham es más bajo que su costo de mantenimiento.

La diferencia práctica más importante no es de features: es que **la Javrutá actual no recupera por significado**. Se midió (§2) y una consulta sobre pizza obtiene más similitud que una consulta sobre melajot. Eso no se arregla con más UI ni con un prompt mejor; se arregla reemplazando el motor de embeddings y la recuperación.

---

## 2. Diagnóstico: en qué estado está la recuperación hoy

### 2.1 Embeddings no semánticos

`beit-avraham-web/src/lib/halajicRetrieval.ts:7-26` genera el vector de consulta con SHA-256 por palabra:

```ts
const hash = crypto.createHash("sha256").update(words[i]).digest();
for (let j = 0; j < 32; j++) {
  const idx = (hash[j] * 31 + j * 7) % dim;
  vec[idx] += (hash[j] - 128) / 128;
}
```

`scripts/seed_beit_avraham_sources.js:14-34` usa exactamente el mismo algoritmo para indexar. Consecuencia: la "similitud coseno" mide coincidencia de *tokens*, no de significado. Dos textos que dicen lo mismo con otras palabras quedan lejos; dos textos sin relación pueden quedar cerca si comparten palabras funcionales.

### 2.2 Medición contra Matrix (8 fragmentos sembrados)

Consultas ejecutadas contra `fsca.match_knowledge` (`SCA_SUPABASE_URL`, proyecto `Beit Avraham`), con el mismo embedding que usa la aplicación:

| Consulta | Umbral | Resultado real |
|---|---|---|
| "¿cuáles son las 39 melajot del shabat?" | 0,05 | 1. Zóhar Bereshit 15a **0,1899** · 2. Mishná Shabat 7:2 **0,1840** · 3. Séfer Yetzirá 0,0650 |
| "¿qué son las diez sefirot y el árbol de la vida?" | 0,05 | 1. Séfer Yetzirá **0,5866** · 2. Rambam Shabat 30:1 0,3994 · 3. Pirké Avot 1:14 0,3590 |
| "receta de pizza con mozzarella y tomate" *(sin relación)* | 0,05 | 1. Rambam Shabat 30:1 **0,3976** · 2. Séfer Yetzirá 0,3350 · 3. Pirké Avot 0,2596 |
| "¿cuáles son las 39 melajot del shabat?" | 0,45 | **(sin resultados)** |
| "שבת" | 0,05 | 1. Hagadá 0,0564 · 2. Pirké Avot 0,0563 · 3. Mishná Shabat 7:2 0,0534 |

Lectura de los datos:

1. **La consulta pertinente queda peor rankeada que la impertinente.** "Melajot" obtiene 0,1899 en su mejor resultado; "pizza" obtiene 0,3976. Cualquier umbral que deje pasar pizza deja pasar todo.
2. **El único caso que funciona es coincidencia literal**: la consulta de sefirot contiene las palabras "sefirot" y "árbol de la vida", que están en el texto del Séfer Yetzirá.
3. **No hay zona de umbral útil**: con 0,05 pasa todo; con 0,45 no pasa nada, ni siquiera la fuente correcta.
4. **El hebreo no cruza**: `שבת` devuelve ~0,056 repartido al azar, porque el tokenizador parte por espacios y nunca relaciona "שבת" con "Shabat".
5. Sobre ocho fragmentos, el top-3 es casi el corpus entero: hoy el ranking no discrimina, aunque se arreglara el umbral.

### 2.3 La IA no está activa en local

`beit-avraham-web/.env.local` define `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SCA_SUPABASE_URL` y `SCA_SUPABASE_ANON_KEY`. **No define `GEMINI_API_KEY`**, y no está en el entorno del sistema. Por lo tanto, en este checkout `src/app/api/javruta/route.ts:32-86` nunca ejecuta el bloque de Gemini y toda respuesta proviene de `generateRAGEnhancedAnswer` (`:105-146`): dos plantillas fijas (una "cabálística", una "general") con tres o cuatro frases del fragmento intercaladas. Es decir: lo que el alumno ve hoy como "Javrutá" no es IA, es texto plantilla.

Esto no es un defecto a corregir a ciegas: hay que decidir clave, modelo y quién paga antes de encender la función.

### 2.4 El corpus es de resúmenes, no de fuentes

`src/data/sources.ts` contiene ocho fragmentos escritos a mano (`summary` + `content`). `HALAJIC_SOURCES` en el seed repite esos mismos textos. No hay texto original, ni referencia de edición, ni página, ni marca de que sean paráfrasis. Cuando la API cita `[Fuente: Mishná Shabat 7:2]` y reproduce un resumen propio, la interfaz sugiere cita textual sin serlo. Es el riesgo más delicado del proyecto y es **editorial, no técnico** (§7.2).

---

## 3. Auditoría de EduSpark: qué funciona y qué no

Antes de proponer adopciones conviene decir qué se encontró realmente, porque el README y la capa de agentes prometen más de lo que el código conecta:

| Pieza de EduSpark | Estado real en el código |
|---|---|
| Sistema "multi-agente" (Coordinator/Context/RAG/Voice) | Secuencial, sin routing ni planner: un solo pipeline lineal (`modules/tutor/agents/AgentCoordinator.ts:260-318`). |
| Prompt pedagógico rico (niveles, socrático, tono) | **Código muerto**: `RAGAgent.ts:115-220` lo construye y `:33-43` lo guarda en una variable que nunca se envía. El prompt que corre es un bloque único en `ragService.ts:408-447`. |
| Memoria conversacional | Ventana de 10 mensajes en `memoryService.ts:155-159`, pero `recentMessages` no se inyecta en el prompt: cada turno es single-turn. |
| Streaming | **Ausente** en todo el repo (0 coincidencias de `generateContentStream`). |
| Salida estructurada / JSON schema | Ausente; el JSON se recupera por regex + `JSON.parse`. |
| Embeddings | Reales (`gemini-embedding-2-preview`, 512 dims, `RETRIEVAL_DOCUMENT`/`RETRIEVAL_QUERY`), pero el ingestor viejo usa `text-embedding-004` a 768 dims: **desajuste de dimensiones** entre indexado y consulta. |
| Umbral de similitud | Desactivado: `match_threshold: -1.0`, `match_count: 30` (`ragService.ts:770-775`). |
| Búsqueda híbrida | La función `search_course_content_chunks_hybrid_clean` existe pero **no la llama la app**; además es léxica (ts_rank + keywords), no fusión vector+texto. |
| Reranking | Ausente. |
| Idempotencia de ingesta | Ausente en el worker: inserta sin borrar, reprocesar duplica fragmentos. |
| Gobernanza de costos | **La pieza más madura**: tres capas (medidor local, tablas `ai_usage_*`, y topes SQL con *fail-closed*), con constantes explícitas (global USD 2,00/día; usuario nuevo 30 mensajes/día y USD 0,50). |
| Auto-rating de respuestas por IA | Implementado y **desactivado en la UI** con el comentario `COMENTADO PARA AHORRAR COSTOS`. |

Conclusión de la auditoría: EduSpark vale como **catálogo de patrones** (varios escritos con criterio y documentados en su propio `AI_CONTEXT`) y como **lista de errores a no repetir**, no como base de código a portar. Portar su capa de agentes a Beit Avraham agregaría tres capas de indirección para terminar llamando a un único modelo, igual que hoy. No se verificó que EduSpark corra en producción: esta lectura es del código y de su documentación interna.

---

## 4. Qué traer: seis patrones, en orden de impacto

### 4.1 Embeddings semánticos reales + reindexación idempotente

**Qué es.** Reemplazar el hash por un modelo de embeddings real, con `taskType` distinto para documento y consulta, y una reindexación que borre e inserte por proyecto.

**En EduSpark.** `src/services/geminiService.ts:652-666` (documento, `RETRIEVAL_DOCUMENT`, 512 dims) y `modules/tutor/services/ragService.ts:355-380` (consulta, `RETRIEVAL_QUERY`, 512 dims). El patrón de dos `taskType` es correcto y es lo que hay que copiar; el desajuste 768/512 es lo que hay que **no** copiar.

**Adaptación a Beit Avraham.**
- Elegir modelo y dimensión con un *spike* de una llamada, antes de tocar la tabla: el corpus actual es `vector(768)` (ver `sca-studio/supabase/snippets/Untitled query 888.sql:86-100`).
- Agregar a `fsca.knowledge_base` las columnas `embedding_model text` y `lang text`, para que un cambio de modelo futuro sea detectable y no silencioso (el bug de EduSpark es exactamente eso: nadie notó el desajuste).
- Reemplazar el índice `ivfflat ... lists = 100` por `hnsw (embedding vector_cosine_ops)` mientras el corpus sea chico: con menos filas que `lists`, IVF no tiene de qué elegir.
- Un script `scripts/reindex_knowledge.cjs` que borre por `project_name` y reinserte, idempotente, en lugar de `seed_beit_avraham_sources.js` (que ya borra, pero con embeddings falsos).

**Verificación.** El banco de evaluación de §4.2 debe correr *antes* y *después*: sin línea base no hay forma de afirmar que mejoró, y este proyecto prohíbe afirmar mejoras sin medición.

### 4.2 Banco de evaluación de recuperación (requisito previo)

**Qué es.** Un archivo de 12 a 20 consultas con la fuente esperada, y un script que calcule `hit@1`, `hit@3` y `MRR`. Corre contra Matrix, no gasta IA.

**En EduSpark.** No existe: es la pieza que le faltó para detectar su propio desajuste de dimensiones y su umbral desactivado.

**Adaptación.** `scripts/eval_retrieval.cjs` + `tests/retrieval_fixtures.json`. Casos mínimos: cinco consultas en español sobre el corpus actual, tres en hebreo, dos sin respuesta posible (deben devolver vacío, no ruido), dos ambiguas. Se registra la línea base en `AI_CONTEXT/evidence/` antes de tocar nada.

**Por qué primero.** Es barato, no depende de la clave de Gemini, y convierte el resto del plan de "creo que mejora" a "mejoró de X a Y".

### 4.3 Contrato de fragmento con metadatos

**Qué es.** Cada fragmento guarda origen, referencia, idioma, tipo de texto y ubicación, y se serializa al prompt con ese encabezado.

**En EduSpark.** `src/workers/file-processing-worker/worker.ts:238-249` escribe `sourceFileName, pageStart, pageEnd, chunkIndex, pdfType, ocrUsed, material_id`; el prompt los renderiza como `[Material: <título> | pág. N]` (`ragService.ts:410-446`). El *splitter* (`chunkProcessor.ts:8-40`) corta por párrafo → oración → corte duro, **sin solape**, y como corre página por página ningún fragmento cruza el límite de página.

**Adaptación a Beit Avraham.**
- Campos: `source_file`, `hebrew_ref`, `era`, `category`, `lang`, `source_kind` (`original` | `transcripcion` | `resumen`), `shiur_id`, `t_start`, `t_end`.
- **Añadir solape** (unas 100-150 palabras o el equivalente a un párrafo): el fallo clásico de EduSpark es que la respuesta exacta cae justo entre dos fragmentos. Para textos cortos como los del corpus actual el solape no aplica; aplica en cuanto entren transcripciones o seforim completos.
- `source_kind` es la pieza que resuelve el riesgo editorial de §7.2 y no existe en EduSpark.

### 4.4 Fusión de recuperación vectorial y léxica

**Qué es.** Dos rankings (vector + texto completo) combinados, en lugar de confiar en uno.

**En EduSpark.** Hay dos funciones separadas y la "híbrida" real no se usa: `search_course_content_chunks_hybrid_clean` (`sql_scripts/archive/improve_search_with_noise_filtering.sql:130-230`) pondera `ts_rank*0.6 + coincidencias*0.25 + longitud*0.1 - ruido*0.05`, pero nadie la llama. La app hace unión de resultados textuales y vectoriales y deduplica por `id` (`ragService.ts:267-272`).

**Adaptación.** Una función `fsca.match_knowledge_hybrid(query_embedding, query_text, match_count, p_project_name, p_lang)` que combine por **RRF** (Reciprocal Rank Fusion: `1/(k + posición)` con `k = 60`) en vez de sumar puntajes de escalas incomparables. Filtros de calidad de EduSpark que sí valen: descartar fragmentos de menos de ~30 caracteres y los que son ruido de OCR (más de 50% de caracteres no alfanuméricos).

**Detalle que EduSpark no resuelve y acá es central:** el español y el hebreo no comparten config de `tsvector`. Usar `to_tsvector('spanish', ...)` para lo castellano y `'simple'` para lo hebreo (sin stemming y sin stopwords, que es lo correcto cuando no hay diccionario), y normalizar nikud antes de indexar. Con eso, `שבת` debería encontrar "Shabat" **solo si** el corpus incluye el término castellano; el cruce de idiomas lo resuelve el embedding, no el texto completo. Es una razón más para hacer §4.1 antes que §4.4.

### 4.5 Recuperación en dos fases por rango temporal

**Qué es.** Si la consulta menciona una ubicación explícita ("páginas 241-262", en EduSpark), se hace una segunda búsqueda acotada a ese rango y se fusionan los resultados.

**En EduSpark.** `modules/tutor/services/ragService.ts:333-350`: `detectPageRange()` por regex sobre "páginas N-M" y `searchChunksInPageRange()` con `get_chunks_in_page_range` (hasta 10 fragmentos extra). La documentación del propio repo reporta el caso de uso: el agente decía "no tengo las páginas 241-262" aunque estaban indexadas, porque solo miraba el top-5 global.

**Adaptación — es la mejor idea del lote para este producto.** El análogo natural en Beit Avraham no es la página, es el **minuto del shiur**:

- Detectar en la pregunta `minuto 12:30`, `entre 00:50 y 01:40`, `al principio`, `cuando habla del Tzitzit`.
- Recuperar los fragmentos de transcripción del tramo (más los vecinos ±1) y las fuentes asociadas a ese tramo, y fusionarlos con el top-k global.
- El estado del reproductor ya está en el cliente (`StudyWorkspace.tsx:27`, `currentTime`): el tramo puede venir del reproductor en vez de la pregunta, que es más confiable que un regex.

Esto convierte la Javrutá de "buscador del curso" en "compañero de la clase que estás escuchando", que es la promesa del producto.

### 4.6 Contrato de citación con rechazo explícito

**Qué es.** Reglas en el prompt: citar en línea cada fragmento usado, cerrar con un bloque de fuentes, y una frase textual de rechazo cuando no está en el material.

**En EduSpark.** `ragService.ts:408-447`, regla 3: si no está en el material, responder exactamente `"No encuentro esa información específica en los materiales disponibles en este momento."`; regla 5 cita en línea; regla 6 cierra con `**Fuentes**` de 2 a 5 líneas.

**Adaptación.** La versión de Beit Avraham (`route.ts:46-50`) ya tiene reglas parecidas, pero le faltan tres cosas: (a) el rechazo es una instrucción blanda, no una frase fija verificable; (b) no se exige cita por afirmación; (c) el fallback determinista **inventa** contenido pedagógico cuando no hay clave. Lo correcto es que, sin clave o sin fuentes, la API diga que no puede responder — nunca que rellene con plantilla.

Además: la respuesta debería devolver `citations: [{source, ref, similarity}]` en el JSON y no solo un string, para que la UI muestre insignias verificables (hoy `javrutaSources` muestra `source` y `similarity` sin referencia).

---

## 5. Qué no traer (y por qué)

| Pieza | Por qué no |
|---|---|
| Capa multi-agente (Coordinator + 3 agentes) | Tres capas para una llamada, con un prompt sofisticado que nunca se envía. En Beit Avraham hoy hay un endpoint y un modelo: agregar orquestación multiplica superficie sin cambiar la respuesta. |
| Memoria conversacional tal como está | El servicio existe pero el historial no llega al prompt: copiarlo sería copiar el bug. La idea (ventana + resumen) sí sirve, pero hay que conectarla de verdad (§6, N40). |
| Ingesta PDF/qpdf/OCR del worker | Diseñada para libros de 1.300 páginas y 137 MB, con `qpdf` en una VM. El corpus de Beit Avraham son ocho fragmentos; y su worker no es idempotente ni reclama trabajos con `FOR UPDATE SKIP LOCKED`. Se puede retomar el día que haya seforim enteros, no antes. |
| Umbral desactivado y `match_threshold: -1.0` | Convierte el RAG en "pegar 30 fragmentos al prompt". Es precisamente el error que hoy tiene Beit Avraham en pequeño. |
| `ivfflat lists=100` y prioridades hardcodeadas (`PRIORITY_MATERIALS[12]`) | El índice no aplica a corpus chicos; la lista de prioridades es de un corpus clínico ajeno. |
| TTS/STT | Costo por turno, sin medición en EduSpark. Tiene sentido cuando haya transcripción real y alumnos; hoy no hay ni una cosa ni la otra. |
| Analytics docente / auto-rating | Reglas SQL sobre tablas que se pueblan fuera de esos archivos; el auto-rating está apagado por costo. No hay curso formal todavía que analizar. |
| Política RLS `FOR ALL USING (true)` con `anon` | Deja el corpus escribible por cualquiera que tenga la clave anónima. En local es aceptable; **no** puede salir así a producción. |

---

## 6. DAG propuesto — Sprint 5: "Javrutá de nivel producción"

Once nodos en tres fases. Ninguno se ejecuta sin aprobación (modo STRICT).

**Fase 1 — que recupere y que responda bien.** Es la base; sin esto el podcast y la voz amplifican un motor que no distingue "melajot" de "pizza".

| Nodo | Tarea | Depende de | Criterio de aceptación |
|---|---|---|---|
| **N35** | Banco de evaluación de recuperación: fixtures ES/HE + `scripts/eval_retrieval.cjs` que reporte `hit@1`, `hit@3`, `MRR` contra Matrix, con línea base en `AI_CONTEXT/evidence/` | — | Corre sin IA, imprime tabla por consulta y guarda la línea base. Sin afirmaciones de mejora todavía. |
| **N36** | **Bake-off de embeddings en Bedrock** con el banco de N35 (Titan V2 vs. Cohere Multilingual; ver Anexo A), dimensión fijada y persistida en `embedding_model`/`embed_dim`, migración de `vector(768)` a la elegida, índice HNSW, `scripts/reindex_knowledge.cjs` idempotente | N35 | Se elige el modelo por `hit@3` medido, no por intuición. El valor queda registrado; si ninguno mejora, se documenta el resultado negativo. |
| **N37** | `fsca.match_knowledge_hybrid` con RRF (vector + `tsvector` español/`simple` hebreo), filtros de ruido y umbral calibrado; top-k con presupuesto de contexto | N36 | Las consultas en hebreo del banco recuperan la fuente correcta; las consultas sin respuesta devuelven vacío en vez de ruido. |
| **N39** | Javrutá v2 sobre `ConverseStream` de Bedrock detrás de una interfaz de proveedor (Anexo A): streaming SSE, `citations[]` estructuradas, rechazo verificable, Guardrails con *grounding* en español cuando aplique | N37 | Primer token en pantalla antes de completar la respuesta; cada afirmación con su cita; sin proveedor configurado responde "no disponible" y **no inventa**. |

**Fase 2 — que se pueda escuchar.** Diseño UX y capa de audio en el Anexo B.

| Nodo | Tarea | Depende de | Criterio de aceptación |
|---|---|---|---|
| **N42** | Reproductor persistente ("modo escucha"): transporte global que no roba el área de lectura, velocidad 0,75–2,0×, ±15 s, MediaSession, progreso por shiur | N39 | Se puede navegar entre secciones mientras suena; el estado sobrevive a la navegación; en móvil no tapa el texto. |
| **N38** | Contexto por tramo temporal: detección de minuto/rango (o `currentTime` del reproductor) y recuperación de fragmentos vecinos + fuentes del tramo | N37, N42 | Una pregunta sobre un minuto concreto devuelve ese fragmento y sus vecinos, no un top-5 global. |
| **N43** | Podcast: feed RSS 2.0 + iTunes por serie, páginas públicas de episodio, `enclosure` de audio y capítulos desde los fragmentos | N42 | El feed valida en un lector de podcasts real y cada shiur aparece como episodio reproducible. |
| **N40** | Memoria de sesión por shiur con presupuesto de tokens, **inyectada de verdad** en el prompt, persistida fuera de `localStorage` | N39 | La segunda pregunta usa el turno anterior; el prompt no supera el presupuesto declarado. |

**Fase 3 — que escale.** Solo con las anteriores estables.

| Nodo | Tarea | Depende de | Criterio de aceptación |
|---|---|---|---|
| **N44** | Episodio generado por IA (guion de dos voces + TTS, cacheado y **etiquetado como resumen**, no como la clase) | N43 | Un episodio dura 6–10 min, cita las fuentes del shiur y se genera una sola vez por shiur, no en cada reproducción. |
| **N41** | Telemetría de uso IA: `fsca.ai_usage` (modelo, tokens in/out, latencia, costo con tarifa **declarada** y fechada, acción del guardrail) | N39 | Cada llamada deja una fila; el costo sale de una tarifa explícita, no de un número inventado. |
| **N45** | Voz en vivo con Nova 2.5 Sonic (experimento con *feature flag*, no requisito) | N39, N42 | Solo si N39 es estable: conversación por voz con turnos, y límite de sesiones concurrentes respetado. |

Fuera de alcance: ingesta masiva de PDF/DOCX con OCR, panel docente, STT de clases completas.

**Ruta corta si querés valor visible rápido:** N35 → N36 → N39 → N42. Las cuatro juntas dan "recupera por significado, responde con citas a medida que escribe, y se puede escuchar".

---

## 7. Riesgos y decisiones que te corresponden

### 7.1 La clave de IA y el modelo

Sin `GEMINI_API_KEY` la Javrutá no es IA (§2.3). Hay que decidir: qué clave, quién la paga, si se usa *free tier* o de pago, y qué modelo (EduSpark usa `gemini-2.5-flash` para chat y `gemini-2.5-pro` para estructurar documentos). N39 asume que esa decisión existe.

### 7.2 Riesgo editorial: citar resúmenes como si fueran fuente

Los ocho fragmentos del corpus son paráfrasis redactadas a mano. Cuando la UI muestra "Fuente: Mishná Shabat 7:2" y a continuación un texto que no es la Mishná, un alumno puede leerlo como traducción literal. Para un proyecto de estudio de Torá esto es más grave que un error de ranking.

Propuesta: campo `source_kind` y una etiqueta visible en la UI ("resumen del equipo" vs. "texto original, edición X"). Un compañero de estudio puede resumir; no puede hacer pasar un resumen por cita. Es una decisión tuya y del rabinato, no técnica.

### 7.3 Seguridad

La política actual de `fsca.knowledge_base` es `FOR ALL USING (true)` con `anon` (§5). En local no importa; si el sitio se publica, cualquiera con la clave anónima puede reescribir el corpus que la Javrutá cita. Antes de desplegar: escritura solo con *service role*, lectura pública. El mismo criterio aplica al endpoint `/api/javruta`, que hoy no tiene rate limit ni autenticación.

### 7.4 Licencia

Ninguno de los dos repos tiene archivo `LICENSE`. Como EduSpark es tuyo, reutilizar patrones no presenta problema; si Beit Avraham se distribuye, conviene decidir licencia antes de incorporar código copiado literalmente de otro proyecto tuyo.

### 7.5 Lo que no se midió

No se ejecutó la app, ni el worker de EduSpark, ni sus migraciones. No se verificaron precios de Google, ni volúmenes de uso, ni latencias. Las afirmaciones de §3 provienen de leer el código, no de correrlo; las de §2 son mediciones propias contra Matrix y son las únicas con evidencia reproducible.

---

## 8. Context Bridge (protocolo STRICT)

```markdown
📝 CONTEXT BRIDGE
──────────────────────────────────────
🎯 Objetivo: convertir la Javrutá de demo determinista en un RAG real sobre
   Bedrock, empezando por medir (N35) y eligiendo embeddings por evidencia (N36).
📂 Archivos: nuevos scripts/eval_retrieval.cjs, scripts/reindex_knowledge.cjs,
   src/lib/ai/{provider,bedrock,gemini}.ts, supabase (match_knowledge_hybrid),
   beit-avraham-web/src/lib/halajicRetrieval.ts,
   beit-avraham-web/src/app/api/javruta/route.ts; más adelante el reproductor
   persistente y el feed de podcast.
⚠️ Riesgos: reindexar borra el corpus del proyecto en Matrix (mitigado: script
   idempotente con borrado por project_name y respaldo previo); cambio de
   dimensión de vector(768) a la elegida; credenciales de AWS en servidor;
   el grounding de Guardrails no cubre hebreo (Anexo A §A.3); podcast implica
   derechos sobre el audio y la voz del docente (Anexo B §B.6).
💰 Presupuesto de Tokens Estimado: no se estima; este análisis no consumió
   escrituras en Matrix ni llamadas a IA. La captura de consumo sigue sin
   configurar para esta sesión.
🧪 Verificación: hit@1/hit@3/MRR antes y después; typecheck y build; las cinco
   consultas de §2.2 como regresión; y para audio, prueba en lector de podcasts
   real antes de declarar N43.
──────────────────────────────────────
✅ Aprobado / ⏳ Necesito más info
```

**Preguntas abiertas para vos:**

1. ¿Arrancamos por la ruta corta N35 → N36 → N39 → N42, o por el podcast primero? Mi recomendación es la corta: el podcast sobre un motor que no distingue tema no se sostiene.
2. ¿Quién tiene la cuenta de AWS y qué permisos otorga? Ver Anexo A §A.1.
3. ¿"Podcast" significa feed público para Spotify/Apple (N43), solo audio dentro de la app (N42), o también episodios resumidos por IA (N44)? Las tres son compatibles, pero son tres trabajos distintos (Anexo B §B.2).
4. ¿`source_kind` (resumen vs. texto original) entra como requisito de N39?

---

## Anexo A — Capa de modelos: Amazon Bedrock

Verificado contra la documentación oficial de Bedrock el 2026-10-28; los enlaces están en §A.7. Lo que no se verificó se marca como tal.

### A.1 Autenticación y región

Bedrock admite una **API key de largo plazo** (`AWS_BEARER_TOKEN_BEDROCK`), que evita manejar IAM access keys en desarrollo local y es lo que AWS documenta para el primer request. Para producción conviene rol IAM, pero con la API key se puede arrancar hoy.

`us-east-1` es la región con mejor cobertura de las piezas que necesitamos: Titan Embeddings V2, Cohere Embed Multilingual, Claude Haiku 4.5 y Nova 2.5 Sonic. Si preferís residencia de datos, `eu-west-1` cubre embeddings y chat; Sonic no está ahí.

Credenciales **solo del lado servidor**. La app es Next.js con `route.ts` en servidor, así que la clave no debe llevar prefijo `NEXT_PUBLIC_`.

```
AWS_REGION=us-east-1
AWS_BEARER_TOKEN_BEDROCK=<clave>
BEDROCK_CHAT_MODEL=us.anthropic.claude-haiku-4-5-20251001-v1:0
BEDROCK_EMBED_MODEL=cohere.embed-multilingual-v3
BEDROCK_GUARDRAIL_ID=<id>
BEDROCK_GUARDRAIL_VERSION=1
```

### A.2 Qué modelo para qué, según la documentación

| Pieza | Modelo | ID | Lo que hay que saber |
|---|---|---|---|
| **Embeddings** | Cohere Embed Multilingual | `cohere.embed-multilingual-v3` | 100+ idiomas (clave para hebreo). **Límite de 512 tokens por texto**: obliga a fragmentos de ~350–400 palabras, que además es buen tamaño de recuperación. |
| **Embeddings (alternativa)** | Titan Text Embeddings V2 | `amazon.titan-embed-text-v2:0` | Dimensiones de salida configurables y 8K de contexto. Candidato en el bake-off si su hebreo rinde mejor; decide el banco de N35, no la intuición. |
| **Chat** | Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | `Converse` + response streaming + Guardrails + *structured outputs* + prompt caching. 200K de contexto. **En `bedrock-runtime` exige un ID de perfil de inferencia** (`us.` o `global.`); el ID pelado no sirve para on-demand. |
| **Voz interactiva** (opcional) | Nova 2.5 Sonic | `amazon.nova-2-5-sonic` | *Speech-to-speech* por `InvokeModelWithBidirectionalStream` (WebSocket). **No soporta `Converse` ni Guardrails**; 20 sesiones concurrentes por cuenta; solo `us-east-1`, `us-west-2`, `eu-north-1`, `ap-northeast-1`. Voces políglotas y cambio de idioma en mitad de la conversación. |
| **Voz para podcast** | *(no verificado)* | — | Bedrock no ofrece TTS por lotes: Sonic es conversacional y bidireccional. Para episodios hace falta TTS clásico (Amazon Polly), cuya cobertura de voces en **hebreo** hay que verificar antes de prometer nada (Anexo B §B.6). |

### A.3 Guardrails: el hallazgo que más importa para este producto

Bedrock tiene un chequeo de *grounding* que mide si la respuesta está sostenida por las fuentes y si es relevante a la pregunta, y devuelve dos puntajes con umbrales configurables. Para un producto que no puede inventar dictámenes halájicos, esta es la pieza más valiosa de todo Bedrock — más que el modelo.

Tres límites que hay que diseñar alrededor:

1. **Idiomas**: el *tier* Classic soporta inglés, francés y español. **Hebreo no está en la lista.** Como las fuentes son hebreas y la respuesta es en español, hay que probar empíricamente si el puntaje sirve; no se puede asumir. Si no sirve, queda como red de seguridad del tramo en español y se documenta la limitación.
2. **Tamaño**: máximo 100.000 caracteres de fuente de grounding, 1.000 de consulta y 5.000 de respuesta.
3. **Streaming**: la documentación advierte que con streaming el chequeo se resuelve **al final**, así que una respuesta no sostenida puede mostrarse y recién entonces marcarse. Choca de frente con la UX de "escribir en vivo" de N39.

**Decisión de diseño que propongo** (te toca aprobar): **streaming con verificación diferida**. Se transmite en vivo para que se sienta conversación, y si el grounding falla al cerrar, la respuesta se reemplaza por el rechazo con un aviso visible ("retiré la respuesta anterior porque no estaba sostenida por las fuentes"). Es más honesto que bloquear todo hasta el final y más seguro que mostrar sin verificar. La alternativa conservadora —buffer completo, verificar, después mostrar— sacrifica la sensación de tiempo real.

### A.4 Interfaz de proveedor (por qué no casarse con Bedrock)

La app ya tiene código de Gemini. En vez de reemplazarlo, conviene una interfaz mínima y dos implementaciones:

```
src/lib/ai/provider.ts   → interface AiProvider { embed(texts): number[][]; streamAnswer(ctx): AsyncIterable<Delta> }
src/lib/ai/bedrock.ts    → ConverseStream + InvokeModel (embeddings)
src/lib/ai/gemini.ts     → el código actual, adaptado a la interfaz
```

No es sobre-ingeniería: es lo que permite que N36 sea un bake-off real (Titan vs. Cohere vs. Gemini sobre el mismo banco) y que, si Bedrock cambia de precio o falla, se cambie una línea de entorno en lugar de reescribir la API. Costo: dos archivos chicos.

Presupuesto de contexto: el techo práctico lo pone el costo, no el modelo. Propongo **6 fragmentos × 1.500 caracteres** por respuesta como punto de partida, medido y ajustado en N37, no elegido a ojo.

---

## Anexo B — Capa de audio y podcast: diseño de experiencia

### B.1 El principio que ordena todo

Beit Avraham es un **folio de estudio**: el texto es el producto, el audio es un modo de consumirlo. Por eso el audio no puede tener su propia pantalla que compita con la lectura; tiene que ser una capa que persiste. Regla dura: **el reproductor nunca tapa el texto ni desplaza el folio**, y el estado de reproducción sobrevive a la navegación entre secciones.

### B.2 Tres capas de audio, tres trabajos distintos

Conviene no mezclarlas: se confunden en la conversación y tienen costos muy diferentes.

| Capa | Qué es | Para quién | Costo por shiur | Nodo |
|---|---|---|---|---|
| **Modo escucha** | La clase original, con transcripción sincronizada y navegación por fragmentos | Alumno dentro de la app | Cero (el audio ya existe) | N42 |
| **Podcast** | Los mismos audios como serie con feed RSS, suscribible en Spotify/Apple, offline | Alumno fuera de la app, y difusión pública | Cero (es distribución) | N43 |
| **Episodio generado** | 6–10 min, dos voces, resumen dialogado de la clase **con sus fuentes citadas** | Quien quiere repasar o engancharse antes de los 45 min | Guion + TTS, **una sola vez**, cacheado | N44 |

El tercero es el único que cuesta plata por minuto. Por eso va en Fase 3 y por eso **se genera una vez y se guarda**, no en cada reproducción: es el error de costo que EduSpark cometió con el TTS.

### B.3 Especificación de interfaz

**Escritorio.** Barra de transporte de 64 px fija al pie del área de contenido, dentro del layout del folio (no `position: fixed` sobre todo el viewport). Contiene play/pausa, ±15 s, velocidad (`1,0×` con menú 0,75/1,0/1,25/1,5/1,75/2,0), tiempo transcurrido/total, título del fragmento actual y un botón "transcripción" que enfoca la columna central en ese pasaje. El progreso se marca sobre la lista de fragmentos de la columna izquierda, no sobre un slider global: **el índice de la clase es el mapa**.

**Móvil (el caso que más importa acá).** Barra colapsada de 56 px pegada al borde inferior, con play, título en una línea y progreso como línea de 2 px. Al tocarla, sube como hoja a media pantalla con la transcripción desplazable. Al hacer scroll en el folio la barra se atenúa pero no desaparece; nunca se superpone a las notas.

**Estados que la UI tiene que poder mostrar** (hoy el código solo tiene `playerActive`):

- *Sin audio* — shiur `text-only`: la barra no aparece, no se muestra deshabilitada.
- *Fuente externa* — video embebido: se controla con la API del iframe (ya implementado en N25) y se avisa "el audio se reproduce desde el reproductor original".
- *Cargando* / *error de red* con reintento.
- *Velocidad distinta de 1,0×* visible en la barra (la gente olvida que dejó 1,75×).
- *Posición guardada*: al volver al shiur, "Continuar en 12:34" en lugar de empezar de cero.

**Accesibilidad y sistema**: `MediaSession` para controles en pantalla de bloqueo y auriculares; `prefers-reduced-motion` para no animar la hoja; foco de teclado en el transporte. El tamaño del texto de la transcripción lo controla el toggle del folio: el reproductor no debe tener su propio control, sería redundante.

**Vocabulario**: "Escuchar", "Clase", "Fragmento", "Continuar donde quedaste". Un término para la capa pública (RSS) y otro para la experiencia interna.

### B.4 Modelo de datos mínimo

```
shiur_audio  (shiur_id, asset_url, duration_s, chapters jsonb, source: 'original'|'generated', generated_at)
episodios    (serie_id, shiur_id, titulo, descripcion, pub_date, enclosure_url, bytes, duracion)
serie        (id, nombre, descripcion, cover_url, autor)
```

Los `chapters` salen de `shiur.passages` —que ya tienen `seconds` y `title`—, convertidos a WebVTT para el reproductor y a `<podcast:chapter>` en el feed. No hace falta inventar estructura: el catálogo actual ya tiene los tiempos.

### B.5 Pipeline del episodio generado (N44)

1. Guion: Claude Haiku 4.5 vía `Converse` con salida estructurada (turnos `{speaker: "A"|"B", text, source_ref}`). `source_ref` es obligatorio y debe apuntar a un fragmento del shiur: si el guion no puede citar, no hay episodio.
2. Verificación: cada `source_ref` se contrasta con los fragmentos reales; los turnos sin referencia se descartan o se marcan como "comentario del equipo".
3. TTS por turno (dos voces), concatenado, con pausas.
4. Guardado en storage + fila en `shiur_audio` con `source='generated'`.
5. Etiqueta visible en la UI y en el feed: **"Resumen generado por IA a partir de la clase"**, con el disclaimer de §7.2. Un episodio generado nunca se publica con el nombre del rabino como si fuera su voz.

### B.6 Lo que hay que verificar antes de prometer podcast

1. **Voces en hebreo.** No verifiqué la cobertura de Amazon Polly en he-IL. Si solo hay voces estándar, la calidad del resumen en hebreo será inferior a la del español y hay que decidir si el episodio generado se produce solo en español. Nova Sonic tiene voces políglotas pero no sirve para generar por lotes (solo bidireccional).
2. **Validación real del feed** en un lector (Apple Podcasts, Spotify, Overcast): requiere audio públicamente accesible y `Content-Length` correcto; no se puede dar por bueno sin probarlo.
3. **Derechos del audio original.** Publicar las clases como podcast implica derechos sobre los audios y sobre la voz del docente. Es una decisión tuya y del rabinato, del mismo orden que §7.2.
4. **Costo por episodio generado.** No verifiqué tarifas de Bedrock ni de Polly. Antes de aprobar N44 hay que registrar la tarifa declarada y calcular el costo de un episodio de 8 minutos.

### A.7 Fuentes consultadas

- Modelos soportados: [Models at a glance](https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html)
- Embeddings Cohere: [Embed Multilingual](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-cohere-embed-multilingual.html)
- Embeddings Amazon: [Titan Text Embeddings V2](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-titan-text-embeddings-v2.html)
- Chat: [Claude Haiku 4.5](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html)
- Voz: [Nova 2.5 Sonic](https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-amazon-nova-2-5-sonic.html)
- Guardrails: [Contextual grounding check](https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-contextual-grounding-check.html)
