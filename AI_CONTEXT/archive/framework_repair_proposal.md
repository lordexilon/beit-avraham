# Context Bridge: reparar sincronización SCA

2026-10-09. N6 aprobado e implementado. N2 permanece pendiente. Resultado: n6_review.md.

## Evidencia

scripts/log_sca.js solo ejecuta upsert/insert en Supabase y termina. No consulta los registros para generar Markdown, no ofrece sync_only y no escribe los espejos. La verificación anterior confirmó N1 hecho en Matrix, mientras swarm_ledger.md lo sigue mostrando pendiente. La validación del monitor compara exclusivamente la identidad de proyecto/ciclo, no la vigencia de los estados.

metricas_sca.md conserva cifras de plantilla como aprobación 98% y 8s/nodo. No son mediciones verificadas de Beit Avraham; la regeneración debe mostrar solamente registros del ciclo real.

El logger usa proyecto/ciclo constantes como fallback y un nombre de modelo predeterminado sin evidencia. Debe rechazar identidades ausentes o incompatibles y representar métricas faltantes como null.

En esta revisión, el navegador del frontend se recargó y mostró cero elementos bis_skin_checked y ninguna advertencia/error en la consola capturada. No se reprodujo el aviso previo. La búsqueda en ambos src no encuentra ese atributo. Esto no confirma qué extensión lo añadió anteriormente ni acredita otros perfiles.

## N6: alcance concreto

1. Corregir scripts/log_sca.js conservando la resolución de dependencias desde sca-studio y el entorno actual.
2. Validar project_name contra project_binding.json y consultar el ciclo activo en Matrix. Rechazar un ciclo distinto del solicitado/binding antes de escribir.
3. Incorporar --sync_only true, sin upsert ni insert; consultar registros paginados por proyecto/ciclo y regenerar los espejos mediante CLI con escritura temporal y reemplazo atómico por archivo.
4. Regenerar el espejo correspondiente tras cada registro y permitir recuperar un fallo de sincronización sin duplicar métricas.
5. Conservar registros legacy en la base, excluirlos del espejo del ciclo activo y no alterar otros proyectos.
6. Añadir pruebas con cliente simulado para alcance, paginación, falla de lectura, ciclo cambiado y ausencia de inserción durante sync_only. Verificar al final con Matrix local y /api/dag que N1 está hecho.

## Archivos previstos

scripts/log_sca.js, scripts/sca_records.js si se reutiliza el renderizador canónico verificado, tests/test_log_sca.cjs, AI_CONTEXT/active_context.md. swarm_ledger.md y metricas_sca.md se regenerarán exclusivamente mediante logger; no se editarán manualmente.

## Riesgos y límites

La sincronización necesita Matrix disponible. Si una escritura remota tuvo éxito pero el espejo falla, devolver error claro y recuperar con sync_only, nunca insertar una segunda métrica por ese motivo. No ejecutar DDL ni trasladar registros de ciclo. No modificar protecciones o extensiones del navegador. No añadir suppressHydrationWarning para ocultar un atributo externo.

## Gate

swarm_router_es requiere aprobar el Context Bridge antes de implementar. Resultado a aprobar: N6, reparar el logger y sincronizar espejos. La advertencia de navegador no requiere un parche de aplicación mientras no se reproduzca.
