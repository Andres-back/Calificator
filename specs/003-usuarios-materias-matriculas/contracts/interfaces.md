# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /auth/*, /users/*, /materias/*, /matriculas/* | profesor, estudiante y administrador | Autorización según operación |
| Importación | /materias/{id}/importaciones-estudiantes/*, /materias/{id}/estudiantes-existentes/* | docente titular y administrador | Extracción sin altas; confirmación atómica; reutilización explícita |
| Acceso inicial | POST /auth/initial-password | estudiante con clave temporal | Cambia la clave, incrementa auth_version y desbloquea la cuenta |
| Frontend | Login, Mis materias, detalle e inscripción | profesor, estudiante y administrador | Acciones permitidas y estados visibles |
| Persistencia | users, materias, matriculas, importacion_estudiantes_lotes, importacion_estudiantes_filas | Servicios | Sesiones, borradores y altas transaccionales |

No se modifican contratos públicos; este mapa asigna su propiedad al dominio.
