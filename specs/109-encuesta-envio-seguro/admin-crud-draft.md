# Ampliación administrativa solicitada, pendiente tras la prioridad del nombre

Ambos paneles (diagnóstico y piloto), no usuarios/roles académicos. Solicitud del usuario y confirmación en chat, seguida de la instrucción de arreglar primero el nombre repetido. No implementado ni publicado por este hotfix 5.0.1.

Propuesta: alta abre el formulario vigente que completa y firma el docente; consulta original; correcciones anexas con motivo/historial; eliminación de la lista e informes reversible y confirmada por código, con papelera/restauración. No fabricar firmas ni reescribir constancias.

Diseño pendiente de ejecución: release de software 5.1.0, instrumento 5.0 sin modificar preguntas. Migración aditiva transaccional `response_admin_events`, FK response_id, revision, request_id único, action correct/remove/restore, actor administrativo, fecha, motivo y datos. Pruebas de idempotencia, concurrencia optimista, sesión/CSRF, tipos por esquema original e integridad de huellas. CSV corregido separado del original; sin contactos, firma o motivos privados. Recuentos distinguen recibidas y activas. La supresión material seguirá un procedimiento explícito, no borrado casual.

Regresión preliminar sin implementar guardada localmente en tmp/qa109/admin-crud-test-draft.py. Antes de continuar: actualizar spec/plan/tasks con requisitos y revisión completos; no marcar tareas como realizadas. No ejecutar pruebas sobre datos productivos.
