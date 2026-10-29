---
description: Flujo de Desarrollo Estándar (Protocolo Gatekeeper) para v2.6
---

# Workflow: Flujo de Desarrollo SCA (Protocolo Gatekeeper) 🛡️

> **Objetivo:** Asegurar que todas las modificaciones de código sigan los estándares SCA v2.6, manteniendo una alta trazabilidad e integridad del contexto.

## Fase 1: ⚓ Carga de Contexto y Bridge
1. **Sincronizar Contexto**: Invocar `smart_context` para cargar todas las anclas relevantes.
2. **Emitir Context Bridge**: Antes de escribir cualquier código, emitir el bridge:
   ```markdown
   📝 CONTEXT BRIDGE
   ──────────────────────────────────────
   🎯 Objetivo: [¿Qué vamos a hacer?]
   📂 Archivos: [¿Qué se modificará?]
   ⚠️ Riesgos: [Efectos secundarios potenciales]
   💰 Presupuesto de Tokens: [Uso estimado]
   🧪 Verificación: [Cómo probarlo]
   ──────────────────────────────────────
   ```
3. **Esperar Aprobación**: Proceder solo tras la aprobación explícita del usuario o si la tarea es de bajo riesgo y está bien definida.

## Fase 2: 🛠️ Implementación
1. **Desarrollo Iterativo**: Aplicar cambios usando `replace_file_content` o `multi_replace_file_content`.
2. **Seguir Reglas**: Adherirse estrictamente a `AI_CONTEXT/instructions.md`.
3. **Pruebas Internas**: Ejecutar scripts o comandos relevantes para verificar los cambios.

## Fase 3: 📊 Cierre y Métricas
1. **Extraer Telemetría**: Ejecutar la skill `metric_extractor` para sincronizar el historial de Git con los logs de auditoría.
2. **Actualizar Contexto**: Reflejar el progreso en `AI_CONTEXT/active_context.md`.
3. **Actualizar Métricas**: Registrar estadísticas de la sesión en `AI_CONTEXT/metricas_sca.md`.
4. **Reporte Final**:
   ```markdown
   ✅ TAREA COMPLETADA
   ──────────────────────────────────────
   📂 Modificado: [Lista de archivos]
   📈 Densidad de Acierto: [Calculado %]
   💰 Tokens Ahorrados: [Delta estimado]
   ──────────────────────────────────────
   ```
