# Modelo del dominio

- **AnalyticsEvento**: identidad, estado y relaciones definidos por el dominio.
- **ResumenProfesor**: identidad, estado y relaciones definidos por el dominio.
- **ReporteMateria**: identidad, estado y relaciones definidos por el dominio.
- **MetricaImpacto**: identidad, estado y relaciones definidos por el dominio.
- **Exportacion**: identidad, estado y relaciones definidos por el dominio.

## Reglas
- Estados cambian mediante transiciones autorizadas.
- Relaciones no conceden acceso por sí mismas.
- Reintentos no crean duplicados lógicos.
