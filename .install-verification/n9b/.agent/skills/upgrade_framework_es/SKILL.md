---
description: Migra un proyecto SCA existente a la versión 3.0 (Swarm Edition)
---

# Flujo de Trabajo: Upgrade de Framework SCA (v3.0) 🚀

> **Propósito:** Actualizar la infraestructura cognitiva a v3.0, activando el Protocolo Swarm Router y telemetría avanzada.

---

## Fase 1: 🛡️ Preparación y Respaldo

### 1.1 Ejecutar Script de Migración
```text
// turbo
Ejecutar el script de actualización desde la raíz:
python upgrade.py
```

## Fase 2: 🔍 Verificación de Estructura

### 2.1 Validar Nuevos Campos en Métricas
Comprobar que `AI_CONTEXT/metricas_sca.md` ahora incluye:
- Tabla de **Latencia de Desarrollo**.
- Campos de **Token Delta** y **Densidad de Acierto**.

### 2.2 Validar Instrucciones Maestras
Revisar que `AI_CONTEXT/instructions.md` incluya la regla de **Auditoría de Log de Sistema**.

## Fase 3: 🛠️ Inicialización de Telemetría

### 3.1 Activar Skill de Extracción
```text
// turbo
Probar la nueva skill de telemetría:
python .agent/skills/metric_extractor/scripts/extractor.py
```

### 3.2 Sincronización Inicial
Actualizar `active_context.md` con el estado "Migrado a v3.0 - Swarm Edition".

## Fase 4: ✅ Reporte de Upgrade

### 4.1 Emitir Context Bridge de Migración
```markdown
📝 UPGRADE DE FRAMEWORK SCA COMPLETO
──────────────────────────────────────
📦 Versión Anterior: v2.0
🚀 Nueva Versión: v3.0 (Swarm Edition)
📁 Backup Creado: [Ruta del backup]
🛡️ Protocolo: Swarm Router Activado (/swarm_router)
──────────────────────────────────────
Estado: ✅ v3.0 Activo
```

