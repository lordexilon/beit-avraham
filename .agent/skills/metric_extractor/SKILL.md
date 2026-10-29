---
name: metric-extractor
description: Automatización de métricas de rendimiento SCA y trazabilidad híbrida. Cruza logs de auditoría con historial de Git.
version: 1.0.0
---

# Skill: Metric Extractor (SCA Hybrid Traceability)

Esta habilidad permite al Agente SCA automatizar la recolección de métricas cuantitativas para validar el ROI del framework y asegurar la sincronización entre el código y los datos de ejecución.

> [!WARNING]  
> **PROHIBIDO:** No modifiques manualmente el archivo Markdown de métricas (`AI_CONTEXT/metricas_sca.md`). En la arquitectura v3.0, este archivo es un espejo de solo lectura generado por la Matriz SCA (PostgreSQL).

## 🎯 Capacidades Principales
1. **Extracción de Auditoría**: Lee logs de auditoría (JSON/SQL) para validar el cumplimiento de hitos funcionales.
2. **Análisis de Git**: Cuantifica "Commits Atómicos" y los cruza con funcionalidades validadas.
3. **Cálculo de Densidad de Acierto**: `(Funcionalidades Validadas / Commits Atómicos)`.
4. **Cuantificación de Token Savings**: Calcula el peso de los archivos no leídos/filtrados para estimar el ahorro económico.

## 🛠️ Protocolo de Uso (Arquitectura v3.0)

### Al Finalizar una Sesión:
1. **Calcula el Ahorro de Tokens**:
   - Lee el tamaño del repositorio desde `codebase_map.md` (Tokens Without SCA).
   - Calcula los tokens realmente procesados en la sesión (Tokens With SCA).
   - Realiza la resta (Tokens Saved).
2. **Validar Sincronización**: Comparar lo reportado en `active_context.md` con lo encontrado en el `audit_log`.
3. **Registra las Métricas Vía CLI**: En lugar de escribir en el markdown, ejecuta el siguiente comando para consolidar la sesión en la Matriz SCA:
   ```bash
   node scripts/log_sca.js --type metric --project_name "sca-WMSail" --main_task "[Tarea]" --tokens_without_sca "[Total]" --tokens_with_sca "[Usados]" --tokens_saved "[Ahorro]" --hit_density "[Densidad]" --llm_model_used "[Modelo]" --real_time_employed_hrs "[Horas]"
   ```

## 📊 Reglas de Cálculo
- **Token Delta**: `Suma(Tamaño de archivos en codebase_map) - Suma(Tamaño de archivos leídos en sesión)`.
- **Sincronización Código-Datos**: `(Cambios en Git vinculados a Logs / Total de Cambios) * 100`.

## 📂 Estructura de Datos Esperada
La skill busca por defecto:
- `logs/audit_log.json`: Para eventos de ejecución del sistema.
- `AI_CONTEXT/codebase_map.md`: Para el inventario total de archivos.
- Historial de Git local.
