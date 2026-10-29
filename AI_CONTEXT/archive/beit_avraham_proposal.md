# Context Bridge: Beit Avraham

Fecha: 2026-10-09. Estado: propuesta pendiente de aprobación.

## Evidencia local

La aplicación existente en sca-studio es un monitor SCA, no la plataforma educativa. El ledger local no contiene nodos numerados. La numeración N1-N5 es provisional hasta reconciliar una Matrix externa si existe. No se encontró scripts/log_sca.js y Codebase Memory MCP no está disponible en esta sesión. Este documento no sustituye el ledger ni acredita persistencia en Matrix.

## Alcance propuesto

Crear una aplicación Next.js independiente en beit-avraham-web, manteniendo sca-studio como monitor. Usar el logo proporcionado y el HTML adjunto como referencia visual, sin tratar sus métricas, transcripciones y respuestas ilustrativas como evidencia real.

| Nodo | Dependencias | Resultado revisable |
| --- | --- | --- |
| N1 | Ninguna | Base de la aplicación, identidad visual, logo local, navegación responsive y folio de estudio inspirado en el HTML |
| N2 | N1 | Reproductor conectado a un archivo configurable, transcripción con timestamps, auto-scroll, selección que pausa el video y panel Javrutá con contexto de cinco minutos |
| N3 | N1 | Migración Supabase para pgvector, clases y fragmentos con fuentes, categorías, timestamps y políticas de acceso; ingesta configurable e idempotente |
| N4 | N2, N3 | Recuperación por intención y streaming mediante Vercel AI SDK; citas vinculadas a fuentes recuperadas y abstención cuando falta evidencia |
| N5 | N4 | Verificación de sincronización, recuperación, citas, ausencia de fuentes, errores de proveedor y adaptación a móvil; instrucciones de configuración |

N2 y N3 pueden prepararse en paralelo después de aprobar N1; en STRICT se aplica y revisa un solo nodo a la vez.

## Criterios

- Estado demostración explícito hasta disponer de video, transcripción y corpus reales.
- Ninguna cifra inventada de vectores activos, conexión o progreso.
- Los ejemplos halájicos del HTML no se incorporan como respuestas verificadas.
- La selección del usuario y el minuto se conservan en cada consulta.
- Una respuesta con evidencia insuficiente no emite un dictamen práctico.
- Preparar migraciones localmente; no modificar bases remotas ni desplegar con esta propuesta.
- Definir modelo y dimensión de embeddings juntos, y validar su compatibilidad con el índice antes de ingerir.

## Pendientes de integración

Logger CQRS/Matrix, configuración Supabase, proveedor de generación y embeddings, corpus autorizado, video y transcripción con timestamps. No copiar secretos al frontend.

## Gate

La skill swarm_router_es exige aprobación del Context Bridge antes de implementar. Primer resultado a ejecutar tras aprobación: N1. La persistencia temprana obligatoria en Matrix queda pendiente por ausencia del logger; debe restablecerse o autorizarse explícitamente trabajo local con esa limitación.
