# Diagnóstico de instalación SCA

2026-10-09. Revisión de archivos, sin escrituras en Supabase.

Origen revisado: C:/Users/Legion 5/Downloads/SCA-Compliant-Agent-Framework-master.

## Causa verificada en el instalador

install.py copia templates/{idioma}/AI_CONTEXT, .agent, .opencode, sca-studio y .github. No copia scripts/, supabase/migrations ni el package.json de la raíz. No crea project_binding.json ni ejecuta setup_sca.js. Imprime Installation Complete sin comprobar los booleanos devueltos por copy_folder. Por eso puede terminar correctamente según su lógica mientras deja instalado un dashboard que exige componentes no suministrados por ese mismo instalador.

El flujo init_project actual genera Markdown e indexación opcional, pero tampoco ejecuta el alta en Matrix. Esto es una incompatibilidad entre el instalador/flujo de inicialización y los requisitos del monitor, no evidencia de que el usuario interrumpiera la instalación.

## Cómo se registra un proyecto

scripts/setup_sca.js del origen escribe AI_CONTEXT/project_binding.json con project_name, configura conexión, valida esquema y usa scripts/log_sca.js para insertar un nodo semilla en fsca.swarm_ledger. La identificación del proyecto en este flujo es project_name dentro de los registros; no crea una instancia nueva de Supabase. Si ya encuentra nodos para el nombre, sincroniza los espejos. El logger valida que el nombre coincida con el vínculo y consulta el ciclo activo antes de escribir. Las escrituras requieren las migraciones de ciclos compatibles con el logger actual.

setup_sca.js captura errores de conexión/semilla como advertencias y continúa al reporte final; la finalización tampoco acredita que Supabase recibió los registros. Además, su ruta ROOT_DIR es la del propio script: ejecutarlo desde el framework de Downloads configuraría esa raíz, no Beit Avraham.

## Estado de esta copia

- Faltan scripts/log_sca.js, scripts/setup_sca.js y AI_CONTEXT/project_binding.json.
- El lector project-binding reproduce la ausencia del vínculo. /api/project la publica como 500; projectFor la publica como 409.
- No se verificó existencia de registros remotos para Beit Avraham.
- No se modificaron bases de datos ni se inventó una semilla.
- El plan visual N1 fue aprobado para trabajo local dejando la persistencia Matrix pendiente.

## Reparación a preparar por separado

Proveer scripts y dependencias compatibles, definir el nombre canónico de este proyecto, verificar conexión y esquema en lectura, consultar registros existentes, y registrar/sincronizar mediante logger en la raíz correcta. No ejecutar el setup completo a ciegas: también contempla DDL y métricas semilla que no son medición real de esta sesión.
