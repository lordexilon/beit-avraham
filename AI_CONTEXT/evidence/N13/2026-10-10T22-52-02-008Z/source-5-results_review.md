# Piloto comparativo SCA — resultados de ejecución

Perfil: workflow-only-v1. Planificación, recuperación selectiva y verificación; no activa RAG vectorial ni mide el framework completo. Cada ejecución tiene una conversación independiente con gpt-6.1-sol y un workspace propio. Las instrucciones generales del agente y el host son compartidos.

Datos descriptivos de ejecución, no ahorro demostrado. Tiempo humano, preparación/mantenimiento, calidad revisada por una persona y costos monetarios siguen pendientes. Los tokens incluyen toda la conversación del subagente y sus instrucciones generales; caché es consumo, no ahorro. No convertirlos en factura de suscripción.

Observación descriptiva: SCA consumió más tokens en 15/15 pares y registró mayor duración en 13/15. No demuestra menor costo ni calidad superior.

| Par | Control: segundos / tokens | SCA: segundos / tokens | Pruebas control / SCA | Estado |
|---|---:|---:|---|---|
| development-1 | 75.73 / 233384 | 69.48 / 235961 | 0 / 0 | Revisión humana pendiente |
| development-2 | 52.04 / 188202 | 141.03 / 500182 | 0 / 0 | Revisión humana pendiente |
| development-3 | 92.31 / 310741 | 109.80 / 363238 | 0 / 0 | Revisión humana pendiente |
| bugfix-1 | 30.69 / 181634 | 47.79 / 263043 | 0 / 0 | Revisión humana pendiente |
| bugfix-2 | 39.89 / 217813 | 37.66 / 225074 | 0 / 0 | Revisión humana pendiente |
| bugfix-3 | 34.16 / 180692 | 42.50 / 228199 | 0 / 0 | Revisión humana pendiente |
| refactor-1 | 27.05 / 145681 | 50.68 / 265540 | 0 / 0 | Revisión humana pendiente |
| refactor-2 | 32.43 / 145800 | 53.20 / 303762 | 0 / 0 | Revisión humana pendiente |
| refactor-3 | 36.14 / 182767 | 68.26 / 343272 | 0 / 0 | Revisión humana pendiente |
| context-1 | 30.69 / 180790 | 44.04 / 226018 | 0 / 0 | Revisión humana pendiente |
| context-2 | 36.67 / 181680 | 39.89 / 225692 | 0 / 0 | Revisión humana pendiente |
| context-3 | 36.90 / 181463 | 52.51 / 225608 | 0 / 0 | Revisión humana pendiente |
| installation-1 | 38.82 / 186337 | 78.34 / 277206 | 0 / 0 | Revisión humana pendiente |
| installation-2 | 42.65 / 147418 | 63.77 / 229824 | 0 / 0 | Revisión humana pendiente |
| installation-3 | 38.60 / 147364 | 69.05 / 275647 | 0 / 0 | Revisión humana pendiente |

Pruebas: exit 0 significa aceptación automatizada aprobada; no equivale a revisión humana ni prueba de calidad superior.

Las continuaciones tras límite de uso conservan las revisiones anteriores. Sus duraciones se obtienen de duration_ms por turno, excluyendo espera entre turnos. Las primeras ejecuciones registraron la ventana de sesión completa; ambas son duraciones de reloj y no inferencia continua.

La instalación aquí es un ejercicio de bootstrap, no certificación del instalador original. La interfaz de desarrollo requiere revisión real a 320px/desktop y teclado. Las variantes similares pueden introducir aprendizaje y no representan proyectos independientes.

Cobertura: control 15/15, SCA 15/15. Pares aceptados y comparables: 0/15.

Los resultados no se seleccionan por signo favorable. Revisar código, requisitos y evidencia de cada par antes de aceptar. Los campos monetarios y porcentajes de ahorro siguen null cuando falta evidencia.

Verificación en navegador: las seis demos de desarrollo se comprobaron a 320px y escritorio, con selección, teclado y persistencia de notas. development-2/sca falló inicialmente por un cierre de script dentro de una cadena; se corrigió y se preservaron la falla, las pruebas y el consumo adicional. Evidencia: browser-first-pass.json y browser-final-checks.json en evidence/. La revisión humana de calidad sigue pendiente.

Registro Matrix: 30 tareas vigentes verificadas, 42 registros históricos conservados. Las rectificaciones excluyen esperas entre turnos sin modificar registros originales; repetir la importación registra cero tareas nuevas.
