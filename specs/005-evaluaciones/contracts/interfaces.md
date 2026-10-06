# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /evaluaciones/* y /materias/{id}/evaluaciones | profesor, estudiante y administrador | Autorización según operación |
| Frontend | Crear paso a paso, digitalizar, editar, ver y resolver | profesor, estudiante y administrador | Acciones permitidas y estados visibles |
| Persistencia | evaluaciones, evaluacion_blueprints | Servicios | Acceso transaccional |

## Evolución 084 — preview y criterios

- El visor móvil usa PDF.js/worker lazy del mismo origen, leyendo bytes del PDF privado existente. Descargas/solucionario explícito conservan permisos; una página/canvas acotado, cancelación y limpieza al cambiar documento.
- `PATCH /evaluaciones/{id}` acepta `expected_updated_at` opcional compatible. El recorrido nuevo envía solo los cambios de criterios/referencias, compara versión bajo bloqueo y conserva borrador en 409. Recargar requiere consentimiento de descarte.
- Un PATCH limitado conserva literalmente preguntas, claves y demás metadatos del blueprint, entregas y calificaciones guardadas; solo actualiza contexto de criterios. Las referencias inactivas ya vinculadas y autorizadas se conservan, no se habilita selección nueva de referencias ajenas.

Diseño, aceptación y evidencia: [084-docente-mobile-first](../084-docente-mobile-first/quickstart.md). Las evaluaciones y su blueprint mantienen este dominio como responsable único.
