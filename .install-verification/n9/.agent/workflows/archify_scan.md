---
name: archify
description: "Actualiza el índice de codebase-memory y extrae la arquitectura del proyecto para auditar la estructura y hotspots."
---

# 🏗️ Protocolo Archify (Codebase Memory Scan)

Este flujo de trabajo se activa **SIEMPRE** que el usuario ejecute el comando `/archify`.

## Instrucciones de Ejecución

Cuando se activa este protocolo, debes seguir estrictamente los siguientes pasos:

1. **Actualizar Índice de Memoria:**
   - Usa la herramienta `call_mcp_tool` para invocar `index_repository` del servidor `codebase-memory`.
   - Pasa la ruta raíz del proyecto actual.

2. **Extraer el Grafo de Arquitectura:**
   - Una vez indexado, invoca `get_architecture` del mismo servidor MCP para obtener la estructura actualizada del proyecto.

3. **Generar y Presentar Reporte:**
   Presenta al usuario un resumen arquitectónico claro que incluya:
   - **Estadísticas Base:** Cantidad de archivos indexados y relaciones.
   - **Estructura de Capas/Paquetes:** Principales agrupaciones de código detectadas.
   - **Hotspots (Puntos Calientes):** Los 3-5 módulos o funciones más llamados/conectados, indicando si requieren refactorización.

4. **Cierre de Ciclo SCA:**
   - Anota la revisión en `AI_CONTEXT/swarm_ledger.md`.
   - Actualiza `AI_CONTEXT/metricas_sca.md` sumando el token delta de la operación.
