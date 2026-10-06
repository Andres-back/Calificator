# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /dba/* y /materias/{id}/asistencia/* | profesor y administrador | Autorización según operación |
| Frontend | pestañas DBA y Asistencia | profesor y administrador | Acciones permitidas y estados visibles |
| Persistencia | dba_catalog, dba_personalizados, asistencia_registros | Servicios | Sesiones y servicios transaccionales |

No se modifican contratos públicos; este mapa asigna su propiedad al dominio.

## Evolución 085: asistencia con autoguardado

- `GET /materias/{id}/asistencia?fecha=YYYY-MM-DD`: consulta roster activo, marcas confirmadas y pendientes.
- `PATCH /materias/{id}/asistencia`: fecha y subconjunto no vacío de `registros` (`estudiante_id`, `estado`, `observacion` opcional hasta 300 caracteres), sin duplicados; requiere `attendance.manage` y acceso a la materia. Fecha futura o matrícula no activa rechaza todo el lote antes de escribir. Devuelve jornada completa con pendientes reales.
- `PUT` en la misma ruta conserva el contrato de roster completo; ambos usan upsert por la clave única existente, preservan ID/creación y no alteran filas omitidas por PATCH.
- `GET /materias/{id}/asistencia/reporte`: incluye las marcas parciales confirmadas.
- La lista docente guarda selección automáticamente, observación a los 500 ms/blur y ofrece reintento explícito, sin inventar asistencia ni anunciar éxito antes de confirmación. No modifica notas o evidencias.

La responsabilidad de estas rutas y de `asistencia_registros` sigue siendo 004. [Especificación de evolución](../../085-asistencia-autoguardado/spec.md).
