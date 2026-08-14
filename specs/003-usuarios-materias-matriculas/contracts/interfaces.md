# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /auth/*, /users/*, /materias/*, /matriculas/* | profesor, estudiante y administrador | Autorización según operación |
| Frontend | Login, Mis materias, detalle e inscripción | profesor, estudiante y administrador | Acciones permitidas y estados visibles |
| Persistencia | users, materias, matriculas | Servicios | Sesiones y servicios transaccionales |

No se modifican contratos públicos; este mapa asigna su propiedad al dominio.
