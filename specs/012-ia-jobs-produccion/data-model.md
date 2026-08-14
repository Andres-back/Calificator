# Modelo del dominio

- **Job**: identidad, estado y relaciones definidos por el dominio.
- **JobEstado**: identidad, estado y relaciones definidos por el dominio.
- **JobTipo**: identidad, estado y relaciones definidos por el dominio.
- **LLMProvider**: identidad, estado y relaciones definidos por el dominio.
- **ImageProvider**: identidad, estado y relaciones definidos por el dominio.
- **AIConfig**: identidad, estado y relaciones definidos por el dominio.
- **AuditEvent**: identidad, estado y relaciones definidos por el dominio.

## Reglas
- Estados cambian mediante transiciones autorizadas.
- Relaciones no conceden acceso por sí mismas.
- Reintentos no crean duplicados lógicos.
