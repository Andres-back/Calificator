# Modelo de datos: roles y permisos modulares

## users (ampliada)

- is_primary_admin: indica autoridad administrativa protegida.
- auth_version: existente; aumenta ante cambios de acceso.
- rol: existente; conserva el perfil operativo y relaciones académicas.

Reglas: al menos un Administrador principal activo; un usuario no modifica su propia condición privilegiada.

## authorization_roles

- id, name, normalized_name, description.
- active, is_system, version.
- created_by, updated_by, created_at, updated_at.

Unicidad: normalized_name. Los roles del sistema no se eliminan ni editan como personalizados.

## authorization_permissions

- key: identificador estable module.action.
- module, action, label, description.
- risk: normal, sensitive o critical.
- active, sort_order.

El catálogo se sincroniza desde el producto. No admite creación arbitraria desde la interfaz.

## authorization_role_permissions

- role_id, permission_key.
- granted_by, created_at.

Unicidad: role_id y permission_key. Una actualización reemplaza el conjunto completo dentro de una transacción y verifica que el actor pueda conceder cada permiso.

## authorization_user_roles

- id, user_id, role_id.
- active, assigned_by, assigned_at, ended_by, ended_at.

Existe como máximo una asignación activa por usuario. Finalizar una asignación conserva historial y reactiva la matriz predeterminada del perfil.

## audit_events (existente)

Registra creación, edición, asignación, retiro, archivo, eliminación, designación principal y decisiones de retiro seguro. No contiene contraseñas.

## Permiso efectivo

1. Administrador principal: matriz completa protegida.
2. Usuario con asignación personalizada activa: permisos del rol.
3. Usuario sin asignación personalizada: matriz predeterminada de su perfil operativo.
4. Después del permiso se evalúan propiedad, matrícula, materia y estado del recurso.

## Transiciones

- Rol: borrador → activo → archivado; archivado → activo solo si conserva permisos válidos.
- Asignación: creada/activa → finalizada; una nueva asignación finaliza la anterior en la misma transacción.
- Usuario: activo → inactivo → activo; eliminación definitiva únicamente desde activo o inactivo sin relaciones.
- Administrador principal: designado → activo; solo otro principal puede retirarlo y siempre debe quedar al menos uno.

## Migración

- Crear catálogo, roles, permisos y asignaciones sin modificar usuarios.
- Sembrar matrices predeterminadas equivalentes a los tres perfiles actuales.
- Marcar los administradores activos existentes como principales para no reducir acceso.
- Mantener usuarios sin asignación personalizada, por lo que conservan el comportamiento histórico.
- Verificar upgrade, downgrade y nuevo upgrade con datos existentes.
