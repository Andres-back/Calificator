# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /calificaciones/*, /incidencias/* y /estudiantes/{id}/boletin | profesor y estudiante | Autorización según operación |
| Frontend | Bandeja docente, workspace, detalle, PQRS y boletín | profesor y estudiante | Acciones permitidas y estados visibles |
| Persistencia | calificaciones, calificacion_incidencias, salon_sesiones | Servicios | Acceso transaccional |

No se modifican contratos públicos; este mapa asigna propiedad al dominio.

## Captura 102

[Contrato de captura 102](../../102-camara-visor-completo/contracts/interfaces.md): foto local revisada antes de añadir a una entrega, cámara sin audio, contexto opaco y limpieza de resultados tardíos. AddFiles/límites/calidad y enviar explícitamente conservan sus contratos. Sin API nueva ni modificación de notas/evidencias anteriores.
