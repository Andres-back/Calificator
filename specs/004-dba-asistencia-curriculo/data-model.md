# Modelo del dominio

- **DBACatalog**: identidad, estado y relaciones definidos por el dominio.
- **DBAPersonalizado**: identidad, estado y relaciones definidos por el dominio.
- **AsistenciaRegistro**: identidad, estado y relaciones definidos por el dominio.
- **AsistenciaEstado**: identidad, estado y relaciones definidos por el dominio.

## Reglas
- Estados cambian solo mediante transiciones autorizadas.
- Relaciones no conceden acceso por sí mismas.
- Reintentos no crean duplicados lógicos.
