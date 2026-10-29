# N8: verificación integral e instalador

Fecha: 2026-10-10.

20 pruebas Node y 2 pruebas Python aprobadas. TypeScript de SCA Studio aprobado. Matrix, API y espejo concuerdan. Verificación visual en la pestaña existente http://localhost:3000: métricas con 1 fuente, 12 capturas y 5 tareas con tiempo; costos y ahorro pendientes por falta de evidencia. DAG N3-N7 hechos y N8 en verificación. La pestaña temporal con 127.0.0.1 no había mostrado contenido; no implica que Studio estuviera vacío para el usuario.

El instalador original omitía scripts, migraciones y dependencias raíz; ignoraba fallos de copia y anunciaba instalación completa. Corrección revisable: scripts/install_framework.py, con --source explícito, copia de runtime/migraciones/manifiestos, propagación de fallos, exclusión de secretos de Studio y validación de archivos. Un manifiesto de dependencias existente exige conciliación explícita. No modifica el instalador original de Downloads.

Pruebas del instalador en destinos temporales con fixtures: copia limpia, omisión de secreto y fallo por script requerido ausente. Esto verifica el contrato de copia, no una instalación operativa completa con npm, Matrix y T0 desde cero. No se ejecutaron migraciones ni se sobrescribió configuración de proyectos existentes.

Limitaciones vigentes: captura manual, tiempo humano sin registrar, cuotas sin importe/período/reparto, ahorro sin referencia comparable. Dependencias DAG aún sin almacenamiento estructurado. La corrección debe incorporarse al framework de origen antes de distribuir nuevas instalaciones.
