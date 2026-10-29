# 🛡️ MCP Guidelines (SCA v3.0 Zero-Bloat)

> **PROPÓSITO:** Prevenir la saturación de contexto (*Context Bloat*) y la degradación del razonamiento (*Lost in the Middle*) causados por la excesiva verbosidad de los servidores Model Context Protocol (MCP).

## REGLAS CRÍTICAS DE OPERACIÓN MCP

Si el entorno de ejecución (Cursor, Antigravity, OpenCode, etc.) proporciona acceso a herramientas o servidores MCP, el Orquestador **DEBE** obedecer estrictamente las siguientes directivas:

1. **Operación Estrictamente On-Demand:**
   Queda estrictamente prohibida la sincronización pasiva, auto-polling continuo o el dejar "listeners" abiertos en servidores MCP. Todas las llamadas a herramientas deben ser puntuales, de una sola ejecución y con un propósito específico dictado por el Grafo de Tareas (DAG).

2. **Presupuesto de Tokens (Regla del 15%):**
   El consumo de tokens derivado de las respuestas de cualquier herramienta externa o servidor MCP no debe exceder el 15% del total disponible en la ventana de contexto de la sesión actual. 

3. **Restricción de Lectura Generalizada:**
   Prohibido usar comandos que soliciten volcados masivos de datos sin filtros (ej. `list_network_requests` masivos, `index_status` completo, lecturas de tablas enteras de DB). 
   - **Siempre** se deben forzar parámetros restrictivos (límites, fechas, palabras clave, o IDs específicos).

4. **Bloqueo de Exfiltración y Telemetría:**
   Se bloqueará terminantemente la salida o transmisión de datos sensibles (JWTs, tokens, secretos de DB) y la telemetría de logs originada en MCP hacia entornos fuera de la infraestructura local del proyecto.
