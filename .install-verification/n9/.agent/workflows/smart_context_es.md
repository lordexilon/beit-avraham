# Workflow: Smart Context Sync (Español)

Este flujo de trabajo implementa el "Paso de Razonamiento" para superar la búsqueda automática tradicional, forzando una recolección de contexto explícita y estratégica antes de codificar.

## 0. 🧪 Validación de Entorno (OBLIGATORIO)
1. **Verificar Proyecto**: Antes de cualquier interacción con APIs externas, leer el archivo `.env` o configuraciones de entorno.
2. **Asegurar Alcance**: Confirmar que los IDs de proyecto y URLs corresponden al proyecto actual y no a otros.
3. **Validación de Cuentas**: Verificar que el token o cuenta activa en las herramientas de CLI coincida con el entorno del proyecto actual.

## 1. ⚓ Carga de Anclas (El "Cerebro")
1. **Instrucciones Maestras**: Leer `AI_CONTEXT/instructions.md` para alinear decisiones con reglas de negocio.
2. **Estado Actual**: Leer `AI_CONTEXT/active_context.md` para entender en qué punto de la tarea estamos (incluye Technical Debt).
3. **Mapa del Tesoro**: Leer `AI_CONTEXT/codebase_map.md` para localizar definiciones clave sin buscar a ciegas.
4. **Perfil del Proyecto**: Leer `AI_CONTEXT/project_profile.md` para adaptar la metodología de búsqueda al stack específico.

## 2. 🔍 Descubrimiento Semántico (La Búsqueda)
Basado en la solicitud del usuario (User Request), el agente debe ejecutar:

- **Estrategia "Francotirador" (Si hay Mapa)**:
  - Buscar en `codebase_map.md` la funcionalidad mencionada.
  - Abrir SOLAMENTE los archivos indicados en el mapa para esa feature.

- **Estrategia "Explorador" (Si es algo nuevo)**:
  - Ejecutar `grep_search` con palabras clave técnicas.
  - Ejecutar `find_by_name` para ubicar archivos relacionados por nombre.

## 3. 🌉 Context Bridge (OBLIGATORIO)
> **Regla de Oro:** Antes de generar CUALQUIER código, el agente DEBE emitir un breve resumen estructurado de lo que entendió.

**Formato del Context Bridge:**
```
📍 CONTEXT BRIDGE - [Nombre de la Tarea]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Objetivo entendido: [Resumen en 1-2 líneas]
📂 Archivos relevantes: [Lista de archivos identificados]
⚠️ Restricciones detectadas: [Reglas de instructions.md que aplican]
🔗 Dependencias: [Funciones RPC o componentes relacionados]
❓ Dudas para Technical Debt: [Si hay alguna inconsistencia]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Procedo a implementar / ❌ Necesito clarificación
```

**Beneficio:** Esto asegura que el agente no solo leyó los archivos, sino que los COMPRENDIÓ en relación con la tarea actual.

## 4. 🧠 Síntesis y Actualización
1. **Actualizar el Mapa**: Si se descubren archivos nuevos importantes, sugerir agregarlos a `codebase_map.md`.
2. **Actualizar Contexto Activo**: Si la información cambia el rumbo de la tarea, editar `AI_CONTEXT/active_context.md`.
3. **Registrar Dudas**: Si el agente encuentra inconsistencias o puntos ciegos, DEBE añadirlos a la sección `## Technical Debt / Pending Questions` de `active_context.md`.
4. **STOP**: No escribir código hasta que el contexto relevante esté cargado en la memoria de la conversación (vía `view_file`) Y se haya emitido el Context Bridge.
