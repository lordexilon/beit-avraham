# N11 — fixtures y recolector preparados

Implementado pilot_fixtures.cjs: 15 pares, 30 workspaces independientes, hashes por archivo/snapshot, requisitos/pruebas y orden alternado congelados en pilot/manifest.json. No sobrescribe el padrón existente.

Implementado pilot_results.cjs: verificación del starter, ejecución de pruebas con logs/hashes, registro local sin sobrescritura, validación de scope/tiempos/tokens/rúbrica/evidencias, informe con padrón completo, fallos y valores negativos. Costos separados; desconocidos null. Comparación bloqueada por datos sintéticos, sesiones compartidas, solapamiento, diferencias de entorno/modelo/políticas o peor calidad SCA. Tokens no exclusivos quedan pendientes. No escribe resultados comparativos en Matrix.

Verificación: 8 pruebas Node aprobadas (7 piloto y 1 workflow). Starter bugfix-1 control/SCA coincide con manifest. Prueba inicial representativa en cada categoría: desarrollo, bugfix, contexto e instalación fallan como se espera por implementación incompleta/defecto; refactor pasa antes del cambio para proteger el contrato existente. Logs en pilot/evidence son comprobaciones del fixture, no ejecuciones comparativas reales. report.json confirma 0/15 ejecuciones registradas en cada brazo y ningún porcentaje calculado.

Límites: revisión humana y navegador necesarios; datos declarados requieren auditoría; hashes no prueban causalidad ni verdad de una medición. Variantes similares no son muestras independientes de proyectos. Instalación es ejercicio reducido de bootstrap: la Matrix/API/UI del instalador real requieren ensayo adicional. No se conecta proveedor ni se cobra API en este nodo. Control debe ejecutarse en conversación limpia sin SCA, nunca desde la conversación actual. SCA debe activarse explícitamente en el workspace del brazo correspondiente y su sobrecarga medirse. No hay resultados de desempeño todavía.

N12 permanece pendiente: ejecución en entornos separados, revisión, referencias reales, registro de evaluaciones válidas en Matrix e informe. No cargar fixtures ni comprobaciones iniciales como referencias reales de ahorro.
