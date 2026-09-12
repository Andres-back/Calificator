# Modelo de datos: Higiene incremental del backend

Esta intervención no crea, cambia ni elimina entidades persistentes.

## Invariantes

- Las tablas y relaciones conservan sus definiciones actuales.
- No cambia el estado de entregas, evaluaciones, trabajos ni calificaciones.
- No se añade ni ejecuta ninguna migración.
- Las importaciones usadas únicamente para anotaciones de tipo conservan su resolución segura sin crear ciclos en ejecución.
