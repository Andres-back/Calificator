# Validación sintética
Usar base PostgreSQL aislada y proveedor/cola simulados. No consultar evidencias reales ni llamar IA.

1. Crear evaluación física y entrega con nota confirmada cero; recalificar sin motivo, confirmar reapertura y comprobar snapshot/cola sin publicación automática.
2. Repetir UUID y luego versión obsoleta/nueva solicitud concurrente: un solo trabajo y cero sobrescrituras.
3. Cambiar dos veces fotos/PDF; acceder a ambos archivos previos con docente autorizado; alumno/otro docente reciben denegación.
4. Cancelar modal, enviar archivo inválido o simular rollback; no perder evidencia/nota. Cola no disponible conserva paquete persistido recuperable.
5. Evaluación mixta conserva parte online y contenido fijado. Devoluciones compartidas se suspenden al cambiar la nota, sin reactivación automática.
6. Unit/integración, upgrade/downgrade/upgrade en base vacía y bloqueo de downgrade con historial material. Vitest y E2E en 360 px/escritorio, ambos temas, teclado y errores.
7. Inventario, gobernanza y CI aplicables antes de merge. El usuario autorizó posteriormente fusionar el PR #241; hacerlo solo con todos los controles verdes y HEAD exacto, sin bypass ni operaciones manuales del VPS.
