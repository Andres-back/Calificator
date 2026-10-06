# Interfaces: asistencia automática

## PATCH /api/materias/{materia_id}/asistencia

Nuevo contrato aditivo. Requiere sesión, `attendance.manage` y autorización sobre la materia. Mismo control de propietario/administrador o roles personalizados autorizados que PUT.

Solicitud:

```json
{"fecha":"2026-10-06","registros":[{"estudiante_id":"00000000-0000-4000-8000-000000000001","estado":"tarde","observacion":"Con autorización"}]}
```

`registros`: únicamente filas modificadas, mínimo una, sin IDs repetidos, matriculados activos. Omisiones no borran ni modifican asistencia. Cada fila envía estado y observación completos.

Respuesta 200: `AsistenciaDiaRead` actual, todos los alumnos activos y resumen incluyendo pendientes. El cliente confirma instantánea enviada, no ediciones posteriores.

Errores: 401 sin sesión; 403 o 404 según autorización actual de materia; 422 fecha futura, estado inválido, IDs duplicados/ajenos, observación demasiado larga o lote vacío. Validación fallida sin efecto parcial. Error de transporte no determina si el servidor recibió la operación: reintento seguro por clave única.

## Contratos conservados

- GET día y GET reporte: formas/permisos actuales, lectura de filas persistidas.
- PUT día: lista completa exigida, mismas validaciones/respuesta; comparte escritura atómica para evitar carreras con PATCH. No sustituir ni eliminar el endpoint.

## Interfaz docente

- Seleccionar estado: guardar sin confirmación adicional ni completar grupo.
- Por alumno: selección distinta de persistencia; Guardando, Guardado o No guardado/Reintentar.
- Resumen en flujo normal: marcados/pendientes y cambios guardándose/fallidos; nunca confundir ausencia de solicitudes con todo guardado.
- Observaciones: 500 ms sin escribir o blur cuando existe estado; si no, pedir seleccionarlo.
- Reintento con datos más recientes; sin toasts repetitivos de éxito ni resumen fijo.
- Salida, recarga y cambio de fecha: advertir si quedan cambios no confirmados; aislar datos/respuestas de contextos distintos.
