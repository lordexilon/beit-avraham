# Evaluación comparativa del framework

Estado: protocolo preparado; ninguna comparación ejecutada. No demuestra todavía ahorro ni superioridad del código. Dependencias: N10 protocolo → N11 fixtures y recolector → N12 ejecuciones e informe. Las relaciones aquí son documentales; el ledger no almacena aristas estructuradas.

## Diseño

Cada caso tendrá dos ejecuciones independientes desde el mismo snapshot, requisitos, fixtures y pruebas: control sin SCA y tratamiento con SCA. Mantener modelo exacto, versión/proveedor, herramientas permitidas y presupuesto iguales. Registrar diferencias inevitables. No reutilizar la solución de una ejecución en la otra. Rotar el orden entre casos y separar conversaciones y directorios. Comparar primero dentro de un mismo entorno; Codex, Antigravity y OpenCode requieren series separadas para evitar atribuir al framework diferencias del modelo o IDE.

Preparar tres pares por categoría como piloto exploratorio. No representa todos los proyectos ni permite prometer porcentajes generales. Congelar criterios de aceptación y pruebas antes de ejecutar. Conservar fallos, abandonos, tiempos límite y resultados negativos. Registrar por separado preparación, uso y mantenimiento de SCA; presentar tanto ejecución como costo total incluyendo esa preparación.

## Casos y aceptación previa

| Caso | Trabajo equivalente | Evidencia de calidad |
|---|---|---|
| Desarrollo nuevo | Componente de estudio con selección y estado | Requisitos funcionales, accesibilidad de teclado, responsive y pruebas de comportamiento |
| Corrección | Defecto reproducible de sincronización/estado | Reproducción inicial, prueba de regresión y ausencia de nuevos fallos |
| Refactorización | Separar responsabilidades conservando comportamiento | Misma suite antes/después, tipos válidos, revisión de duplicación y complejidad |
| Recuperación de contexto | Cambio que depende de una regla existente en varios archivos | Regla respetada, referencias correctas y ningún cambio ajeno al alcance |
| Instalación | Preparar un workspace limpio y conectarlo a una Matrix de prueba | Archivos requeridos, dependencias, binding, captura idempotente y concordancia API/UI |

La revisión humana usará una rúbrica común, idealmente ocultando el brazo: corrección, legibilidad, separación de responsabilidades y mantenibilidad (0–2 por dimensión, con observación justificativa). Compilación o menos líneas por sí solas no prueban mejor código. Calidad superior requiere ventaja en la rúbrica sin perder aceptación ni introducir regresiones. Calidad equivalente es condición para afirmar eficiencia comparable.

## Datos por ejecución

Guardar caso/par/brazo, snapshot o hash del fixture, entorno, modelo exacto, versión de SCA, inicio/fin/pausas, tiempo humano activo y ventana del agente separados, capturas originales y deltas de entrada sin caché/caché/salida, primera aceptación, intentos, fallos y regresiones, resultado de pruebas, diff, revisión y enlaces a evidencia. Incluir incertidumbre y campos desconocidos como null. No atribuir contadores compartidos exclusivamente a una tarea.

Cerrar medición en la aceptación final o al límite previamente definido: incluir correcciones y reintentos. El framework y su recolector deben registrar también su propia sobrecarga. Para evaluar Success 1st y cobertura, N11 debe definir un padrón previo de tareas elegibles; no usar únicamente las tareas exitosas como denominador.

## Cálculos e interpretación

Por par comparable: ahorro absoluto = control − SCA; porcentaje = 100 × (control − SCA) / control, solo con control mayor que cero y datos completos. Aplicar separadamente a tiempo humano, ventana del agente, tokens totales y costo de la misma modalidad. Mantener valores negativos. Reportar cada par, mediana, rango, cantidad válida/excluida y motivos; nunca ocultar resultados fallidos al agregar.

Codex/Antigravity con suscripción: menos tokens no demuestra menor factura. Medir productividad y, si hay importe/período/criterio respaldados, cuota asignada. API: cargos atribuibles o tarifas verificadas del modelo con entrada/caché/salida separados; equivalente API es simulación identificada. Ollama: cargo API y operación local son dimensiones distintas; electricidad/hardware requieren fuente y criterio. No sumar equivalentes a facturas reales. No calcular ROI sin costos e impacto respaldados.

## Publicación en Studio

N11 prepara fixtures reproducibles, esquema de resultados y validación antes de iniciar N12. N12 registra referencias de control reales y evaluaciones con aceptación y atribución verificadas mediante task_evaluation.cjs; costos mediante cycle_cost.cjs. Si la referencia se registra después de la tarea evaluada, identificarla como retrospectiva. No cargar datos de fixtures como desempeño real. Los indicadores sin evidencia siguen pendientes.

Informe final: para cada categoría, mostrar calidad, aceptación inicial, reintentos, regresiones, tiempo, tokens y modalidad de costo lado a lado. Una afirmación admisible sería: «En estos pares y este entorno, a calidad equivalente, la mediana del tiempo humano cambió X%; tokens Y%; costo [modalidad] Z». Todos los valores quedan pendientes hasta ejecutar y revisar.
