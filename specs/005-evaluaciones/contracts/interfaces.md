# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /evaluaciones/* y /materias/{id}/evaluaciones | profesor, estudiante y administrador | Autorización según operación |
| Frontend | Crear paso a paso, digitalizar, editar, ver y resolver | profesor, estudiante y administrador | Acciones permitidas y estados visibles |
| Persistencia | evaluaciones, evaluacion_blueprints | Servicios | Acceso transaccional |

No se modifican contratos públicos; este mapa asigna propiedad al dominio.
