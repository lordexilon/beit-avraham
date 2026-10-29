# N6: sincronización SCA reparada

2026-10-09. Aprobación del usuario recibida. Implementación y verificación terminadas.

## Cambios

scripts/log_sca.js usa el parser y renderizador canónico de scripts/sca_records.js, conserva la resolución de dependencias y credenciales locales y valida identidad de proyecto y ciclo activo antes de registrar. No inventa modelo ni métricas faltantes. Regenera el espejo correspondiente después de registrar con paginación, filtro por proyecto/ciclo y reemplazo atómico por archivo. --sync_only true permite reconstruirlo sin upsert/insert. Un fallo posterior a una escritura remota informa cómo recuperar sin duplicar métricas.

La fuente anterior está preservada en evidence/log_sca.before-n6.js. Se conservaron todos los registros legacy en PostgreSQL. Los espejos se regeneraron exclusivamente por CLI desde Matrix; las cifras de plantilla no se trasladaron.

## Disponibilidad

PostgreSQL confirmó el ciclo activo, pero el puerto 44321 devolvía respuestas vacías. Reiniciar únicamente supabase_kong_SCA_Matrix restableció la API. No se modificaron tablas ni se reiniciaron otros proyectos.

## Evidencia

- node --test tests/test_log_sca.cjs: 9/9, exit 0.
- Casos: alcance, ciclo cambiado, error de lectura, paginación, fila de otro proyecto, recuperación después de escritura aceptada, ausencia de inserciones durante sync_only, modelo desconocido y reapertura de nodo.
- CLI: ledger sincronizado con 6 nodos y métricas con 2 resultados del ciclo.
- /api/project, /api/cycle-dashboard y /api/dag: 200.
- Navegador: SCA Studio muestra Beit Avraham y ciclo activo. Sprint 1 muestra N1 hecho y N2-N5 pendientes; Sprint 2 muestra N6 hecho.
- Captura: evidence/n6-dag.jpg.

## Límite de los datos

La conexión y sincronización funcionan. El dashboard contiene 0 fuentes de captura configuradas, 0 capturas y 0 tareas con tiempo/referencia; tokens, tiempo y costos continúan Sin medición. Los resultados documentales del logger no son capturas de consumo. Conectar el recolector y establecer una línea base es trabajo adicional; N6 no lo configura ni reconstruye consumo pasado.

N2 sigue pendiente de revisión/aprobación del frontend N1 y continuación según STRICT.
