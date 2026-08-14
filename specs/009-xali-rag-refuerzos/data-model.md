# Modelo del dominio

- **RagSource**: identidad, estado y relaciones definidos por el dominio.
- **RagChunk**: identidad, estado y relaciones definidos por el dominio.
- **XaliRefuerzo**: identidad, estado y relaciones definidos por el dominio.
- **XaliStudentResource**: identidad, estado y relaciones definidos por el dominio.
- **HistorialChat**: identidad, estado y relaciones definidos por el dominio.

## Reglas
- Estados cambian mediante transiciones autorizadas.
- Relaciones no conceden acceso por sí mismas.
- Reintentos no crean duplicados lógicos.
