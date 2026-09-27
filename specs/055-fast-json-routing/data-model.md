# Modelo de datos: respuesta estructurada y rutas rápidas

## Cambios de persistencia

No se agregan ni modifican tablas, columnas, relaciones o estados.

## Datos existentes reutilizados

- `ai_jobs`: conserva cola, etapas, tiempos, intentos y resultado del trabajo.
- `ai_usage_events`: conserva proveedor, modelo, etapa, duración y resultado del transporte.
- Configuración institucional por función: selecciona proveedor/modelo primario y respaldo.
- Desglose de calificación: conserva puntos por componente, alertas y revisión docente.

La configuración operativa se actualiza mediante los mecanismos existentes y no requiere migración.
