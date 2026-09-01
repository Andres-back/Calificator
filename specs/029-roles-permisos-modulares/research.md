# Investigación: usuarios, roles y permisos modulares

## Decisión 1: autorización híbrida y compatible

**Decisión**: conservar el perfil operativo actual y añadir un rol personalizado opcional.

**Justificación**: las relaciones de propiedad existentes dependen de profesor y estudiante. Reemplazar ese dato rompería materias, matrículas y autorización ya validada.

**Alternativas consideradas**: sustituir completamente el campo actual; agregar varios roles simultáneos. La primera exige una migración riesgosa y la segunda hace difícil explicar el permiso efectivo.

## Decisión 2: rol personalizado como matriz efectiva

**Decisión**: sin rol personalizado se usa la matriz histórica; con uno, la matriz personalizada la sustituye.

**Justificación**: una unión automática con el perfil impediría crear roles restringidos como “solo presentaciones”.

**Alternativas consideradas**: sumar permisos del perfil y del rol; permitir denegaciones explícitas. Las denegaciones producen conflictos difíciles de entender.

## Decisión 3: catálogo controlado

**Decisión**: módulos y acciones se versionan en un catálogo mantenido por el producto.

**Justificación**: evita permisos sin consumidor, errores tipográficos y privilegios que el backend no sabe aplicar.

**Alternativas consideradas**: permitir al administrador escribir claves arbitrarias. Se rechaza por seguridad y falta de efecto verificable.

## Decisión 4: Administrador principal

**Decisión**: mantener al menos un Administrador principal activo y proteger permisos críticos.

**Justificación**: los roles combinables incluyen administración; hace falta una raíz de confianza que impida autoescalamiento y pérdida total de acceso.

**Alternativas consideradas**: todos los administradores equivalentes; doble aprobación. La primera es insegura y la segunda agrega complejidad no solicitada.

## Decisión 5: aplicación inmediata

**Decisión**: incrementar la versión de autenticación de los usuarios afectados cuando cambie su rol o sus permisos.

**Justificación**: evita que una sesión conserve privilegios retirados y reutiliza una protección existente.

**Alternativas consideradas**: caché con vencimiento o esperar al siguiente inicio de sesión. Ambas mantienen una ventana de autorización obsoleta.

## Decisión 6: retiro seguro de usuarios

**Decisión**: analizar relaciones antes de eliminar; desactivar cuando exista historial y borrar solo cuentas sin referencias.

**Justificación**: protege evidencia, notas y auditoría y evita fallos por claves foráneas.

**Alternativas consideradas**: borrado en cascada o eliminación lógica universal. El primero destruye historial y el segundo no satisface la eliminación de cuentas vacías.
