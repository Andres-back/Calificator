# Data Model: Aislar y organizar el flujo del estudiante

No se crean tablas, campos ni migraciones.

## Perfil de acceso efectivo

Representación derivada en memoria a partir del usuario autenticado:

- `rol`: rol base del usuario.
- `custom_role_id`: identifica si administración asignó un rol personalizado.
- `permissions`: permisos efectivos resueltos por el backend.
- `isStandardStudentProfile`: verdadero cuando `rol` es estudiante y no existe `custom_role_id`.
- `canUseStaffSurfaces`: verdadero para profesor, administrador o usuario con rol personalizado.

## Reglas

1. Un permiso de lectura compartido no transforma a un estudiante estándar en perfil docente.
2. Un rol personalizado no concede acceso por sí solo; la ruta también exige el permiso efectivo.
3. Las decisiones son derivadas y no se persisten.

