# Lista de calidad: seguridad y autorización modular

**Propósito**: validar que los requisitos de autorización, escalamiento, retiro y auditoría sean completos, claros y medibles antes de implementar
**Creada**: 2026-08-30
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. [x] significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [x] CHK001 ¿Están definidos el permiso efectivo, el perfil operativo y la precedencia cuando existe o no un rol personalizado? [Completitud, Spec FR-007, FR-008, FR-012, FR-019]
- [x] CHK002 ¿Incluye la matriz todos los módulos y acciones actualmente expuestos por profesor, estudiante y administración? [Completitud, Spec FR-009, FR-010]
- [x] CHK003 ¿Están documentadas las condiciones de eliminación física, desactivación y conservación de historial para cada tipo de relación de negocio? [Completitud, Spec FR-004]
- [x] CHK004 ¿Están definidos todos los cambios que invalidan sesiones o autorizaciones anteriores? [Completitud, Spec FR-015]
- [x] CHK005 ¿La auditoría especifica actor, objetivo, fecha, acción y exclusión de contraseñas o secretos? [Completitud, Spec FR-016]

## Claridad y consistencia

- [x] CHK006 ¿Es inequívoca la diferencia entre rol personalizado, perfil operativo, permiso sensible y permiso crítico? [Claridad, Spec Entidades clave]
- [x] CHK007 ¿Son consistentes las reglas de Administrador principal entre requisitos, casos límite y modelo de datos? [Consistencia, Spec FR-005, FR-021, FR-022, FR-023]
- [x] CHK008 ¿Se especifica sin ambigüedad qué permisos puede conceder un administrador delegado y cómo se impide una elevación indirecta? [Claridad, Spec FR-021, FR-023]
- [x] CHK009 ¿Es consistente que un rol personalizado sustituya la matriz predeterminada sin modificar la propiedad académica? [Consistencia, Spec FR-012, FR-014, FR-019]
- [x] CHK010 ¿Están definidas las dependencias entre acciones para que seleccionar un permiso no produzca una configuración imposible? [Claridad, Spec FR-011, FR-020]

## Cobertura de escenarios

- [x] CHK011 ¿Están cubiertas creación, edición concurrente, duplicación, archivo, reactivación y retiro de roles? [Cobertura, Spec US1 y Casos límite]
- [x] CHK012 ¿Están cubiertos usuarios nuevos, cuentas con historial, cuentas vacías, usuario actual y último Administrador principal? [Cobertura, Spec US2 y Casos límite]
- [x] CHK013 ¿Está definido el comportamiento cuando se retira un permiso mientras una pantalla o sesión antigua permanece abierta? [Recuperación, Spec US3 aceptación 3]
- [x] CHK014 ¿Están cubiertos los intentos directos a rutas y acciones ocultas antes de consultar datos protegidos? [Excepción, Spec FR-013, FR-014]
- [x] CHK015 ¿Está definido cómo resolver conflictos de versión sin mezclar silenciosamente ediciones concurrentes? [Recuperación, Spec Casos límite]

## Medición y requisitos no funcionales

- [x] CHK016 ¿Los objetivos de resolución menor a 50 ms p95 y listado de 10.000 usuarios tienen condiciones de medición documentadas? [Medición, Plan Contexto técnico]
- [x] CHK017 ¿Los criterios de autorización incluyen casos permitidos y denegados para el 100 por ciento de la matriz? [Medición, Spec SC-002]
- [x] CHK018 ¿Los requisitos de 360 px, teclado, tacto y claro/oscuro abarcan editor de roles, usuarios y confirmaciones? [Cobertura, Spec FR-018, SC-006]
- [x] CHK019 ¿La migración define compatibilidad, protección del administrador existente y reversión sin reducir acceso? [Dependencia, Spec FR-019 y Modelo de datos Migración]
- [x] CHK020 ¿La trazabilidad permite mapear cada requisito a aceptación, contrato y tarea de implementación? [Trazabilidad, Spec FR-001 a FR-023]

## Notas

- Esta lista valida la calidad de los requisitos; no sustituye las pruebas de implementación.
- La revisión debe resolverse antes de iniciar la fase de implementación.
