# 🧠 Esquema de Memoria (Swarm RAG) - SCA v3.0

> **Propósito:** Definir la arquitectura de memoria híbrida del proyecto. El enjambre de agentes utiliza este documento para saber dónde buscar contexto histórico y cómo persistir nuevos aprendizajes.

## 1. Arquitectura Híbrida

El framework SCA v3.0 utiliza un enfoque de memoria de dos niveles para evitar la contaminación de la ventana de contexto y maximizar la precisión:

### A. Memoria de Trabajo (Working Memory) - Markdown
- **Dónde:** `AI_CONTEXT/active_context.md` y `AI_CONTEXT/swarm_ledger.md`.
- **Qué almacena:** El estado actual del desarrollo, decisiones arquitectónicas críticas, tareas pendientes y los reportes efímeros de los workers.
- **Acceso:** Cargado directamente en la ventana de contexto del Orquestador al inicio de cada sesión.

### B. Memoria Semántica Profunda (RAG) - ChromaDB
- **Dónde:** `.agent/.chroma/` (Base de datos vectorial local basada en SQLite).
- **Qué almacena:** Fragmentos de código indexados, documentación de APIs históricas, reglas de negocio detalladas y logs de errores resueltos en el pasado.
- **Acceso:** Consultado dinámicamente por los workers a través del `swarm_engine` usando búsqueda de similitud (Embeddings). **No** se carga por defecto en la memoria del Orquestador.

## 2. Reglas de Ingesta (Vectorización)

Cuando un Worker finaliza un bloque de código complejo (ej. un nuevo módulo de autenticación) o resuelve un bug crítico, el Orquestador debe evaluar si el hallazgo merece ser vectorizado para el futuro.

- **Frecuencia:** La sincronización con ChromaDB debe ocurrir al finalizar un Sprint o cuando un Context Bridge lo indique explícitamente.
- **Comando:** El enjambre utilizará un skill interno (`sync_memory`) para convertir archivos clave (marcados en el `codebase_map.md`) en embeddings.

## 3. Protocolo de Recuperación (Retrieval)

Si un agente (Worker) es asignado a una tarea pero detecta que le falta contexto específico (ej. "No conozco la estructura del JWT usado en este proyecto"), debe:

1. **Pausar la generación de código.**
2. **Consultar la Memoria Semántica:** Emitir una petición al `swarm_engine` para buscar "Estructura JWT backend" en la base vectorial.
3. **Inyectar el Contexto:** Usar los fragmentos devueltos para completar la tarea sin alucinar código estándar genérico.

---
*Nota: Este archivo es la brújula cognitiva del enjambre. Mantenlo actualizado si decides cambiar el motor vectorial o la estrategia de embeddings.*
