---
description: Evalúa el proyecto e inicia AI_CONTEXT (Context Bootstrapping)
---

# Flujo de Trabajo: Inicializar Cerebro del Proyecto 🧠

> **Propósito:** Evaluar el proyecto explícitamente y autoconfigurar el "cerebro" basado en el stack, arquitectura y patrones detectados.

---

## Fase 1: 🔍 Escaneo de Stack Tecnológico

### 1.1 Identificar Lenguaje y Framework
```text
// turbo
1. Listar archivos de configuración raíz:
   - package.json (Node/JS/TS)
   - requirements.txt / pyproject.toml (Python)
   - go.mod (Go)
   - Cargo.toml (Rust)
   - pom.xml (Java)
```

### 1.2 Identificar Base de Datos
```text
Buscar:
- supabase/
- prisma/schema.prisma
- docker-compose.yml (servicios db)
- .env (cadenas de conexión)
```

## Fase 2: 🏗️ Mapeo de Arquitectura

### 2.1 Detectar Tipo de Proyecto
```text
Evaluar estructura de directorios:
- Monolito (src/components + src/api)
- Monorepo (packages/)
- Microservicios (Múltiples Dockerfiles)
- Solo Backend/Frontend
```

## Fase 3: 📝 Generar AI_CONTEXT

### 3.1 Crear/Actualizar `project_profile.md`
Generar un archivo con:
- Stack Detectado
- Tipo de Arquitectura
- Estrategia de Búsqueda Recomendada

### 3.2 Actualizar `codebase_map.md`
Poblar con puntos de entrada y archivos de configuración críticos.

### 3.3 Inicializar `active_context.md`
Crear con estado inicial "Listo para tareas".

### 3.4 Ingesta en Codebase Memory (MCP)
Si el servidor MCP `codebase-memory` está habilitado, el agente debe ejecutar obligatoriamente la herramienta `index_repository` (o similar) para indexar la estructura del proyecto y poblar la memoria semántica/grafo del codebase.

## Fase 4: ✅ Validación y Reporte

### 4.1 Emitir Reporte de Bootstrap
```markdown
📝 BOOTSTRAP DE PROYECTO COMPLETO
──────────────────────────────────────
🏷️ Proyecto: [nombre]
🔧 Stack: [stack detectado]
🏗️ Arquitectura: [tipo]
📂 Archivos Críticos Mapeados: [cantidad]
🛡️ Protocolo: v2.6 (Gatekeeper Edition) Activo
──────────────────────────────────────
Estado: ✅ Listo. RECUERDA: Usar /sca_dev_flow para cambios de código.
```
