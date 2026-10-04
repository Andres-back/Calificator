# Datos

No hay migración. Las selecciones mantienen `dba_ids` y `dba_personalizado_ids` como UUID.
Solo cambia el nombre visible. La trazabilidad existente del blueprint incorpora
`rag_estado` (`recuperado`, `sin_resultados`, `no_disponible`) y `advertencias` (lista).
El frontend lee esos campos de forma opcional para conservar evaluaciones antiguas.
Referencias vacías ante fallo; nunca generar identificadores ficticios de fuentes.
