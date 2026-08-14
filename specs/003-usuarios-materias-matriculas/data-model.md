# Modelo del dominio

- **User**: identidad, estado y relaciones definidos por el dominio.
- **Materia**: identidad, estado y relaciones definidos por el dominio.
- **Matricula**: identidad, estado y relaciones definidos por el dominio.
- **MateriaEstado**: identidad, estado y relaciones definidos por el dominio.
- **MatriculaEstado**: identidad, estado y relaciones definidos por el dominio.

## Reglas
- Estados cambian solo mediante transiciones autorizadas.
- Relaciones no conceden acceso por sí mismas.
- Reintentos no crean duplicados lógicos.
