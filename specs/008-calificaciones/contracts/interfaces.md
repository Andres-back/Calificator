# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /calificaciones/*, /incidencias/* y /estudiantes/{id}/boletin | profesor y estudiante | Autorización según operación |
| Frontend | Bandeja docente, workspace, detalle, PQRS y boletín | profesor y estudiante | Acciones permitidas y estados visibles |
| Persistencia | calificaciones, calificacion_incidencias, salon_sesiones | Servicios | Acceso transaccional |

No se modifican contratos públicos; este mapa asigna propiedad al dominio.
