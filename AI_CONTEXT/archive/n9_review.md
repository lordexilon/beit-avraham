# N9: instalador original y ensayo operativo aislado

2026-10-10. Aprobado por el usuario.

Aplicada corrección a C:/Users/Legion 5/Downloads/SCA-Compliant-Agent-Framework-master/install.py. Respaldo: evidence/install-original-before-n9.py. Incluye scripts, migraciones y manifiestos raíz. Propaga fallos de copia y comprueba archivos requeridos. Excluye node_modules, secretos de Studio, su registro de workspaces y archivos de compilación. Conserva la ejecución normal desde el directorio destino; --source permite especificar origen. No anuncia captura operativa solo por haber copiado archivos.

Instalación nueva: .install-verification/n9b, desde el framework original corregido. Primer intento n9 interrumpido al descubrir node_modules en .opencode; esa exclusión fue corregida y la prueba se repitió en un destino nuevo. Dependencias: npm ci raíz 10 paquetes y Studio 437 paquetes. TypeScript aprobado. Aviso del instalador de dependencias: Node 22.12 es menor que el requerido por eslint-visitor-keys; no se afirma lint aprobado.

Se configuraron conexión local y project_binding explícitamente para SCA INSTALL TEST N9 20261010, ciclo 42a6c733-fc3f-43f3-9845-603fc76bee08. Se utiliza Matrix local existente con schema ya instalado; no se probó provisionar una base PostgreSQL vacía ni se reaplicaron migraciones.

T0 y delta sintético etiquetados como prueba: evento 3ab383a0-2d46-4d2c-80c3-5fdeef844351, 20 tokens fixture. Repetición sin muestra nueva no inserta duplicados. Este dato no es consumo real, ahorro ni costo y no se registró dentro de Beit Avraham.

Studio instalado arrancó por Webpack en puerto 3002. API project, cycle-dashboard y dag HTTP 200 con proyecto de prueba, 1 fuente, 1 captura y TEST1. Pantalla verificada: misma identidad y cantidades; screenshot evidence/n9-clean-install.png. Servidor de prueba detenido al terminar.

Dos pruebas Python del contrato de instalador aprobadas. No se realizó push/publicación. Este ensayo demuestra instalación de archivos/dependencias y operación contra Matrix existente con fixture controlada; no onboarding totalmente automático ni captura real de una nueva conversación de Codex.
