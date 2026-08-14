# Modelo del dominio

- **UserRole**: identidad, estado y relaciones definidos por el dominio.
- **UserEstado**: identidad, estado y relaciones definidos por el dominio.
- **Sesión**: identidad, estado y relaciones definidos por el dominio.
- **Ruta protegida**: identidad, estado y relaciones definidos por el dominio.
- **Permiso**: identidad, estado y relaciones definidos por el dominio.

## Reglas
- Estados cambian solo mediante transiciones autorizadas.
- Relaciones no conceden acceso por sí mismas.
- Reintentos no crean duplicados lógicos.
