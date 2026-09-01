# Validación: usuarios, roles y permisos modulares

## Preparación

1. Aplicar migraciones sobre una copia con administradores, profesores y estudiantes existentes.
2. Confirmar que todos conservan su navegación y operaciones históricas.
3. Iniciar sesión con un Administrador principal y otro administrador delegado.

## Escenario A: rol personalizado

1. Crear “Auxiliar académico”.
2. Seleccionar materias en consulta, recursos en creación y presentaciones.
3. Revisar la vista previa y guardar.
4. Asignarlo a un usuario de prueba.
5. Confirmar que ve esas funciones, no ve calificación y recibe 403 al llamar una ruta de calificación.

## Escenario B: permisos combinados

1. Crear un rol con una función estudiantil, una docente y una administrativa no crítica.
2. Asignarlo y verificar las tres funciones.
3. Confirmar que la propiedad académica sigue aplicándose y no permite datos ajenos sin permiso administrativo específico.

## Escenario C: protección administrativa

1. Intentar que un delegado conceda un permiso que no posee.
2. Intentar modificar su propia asignación.
3. Intentar desactivar o retirar al último Administrador principal.
4. Esperar rechazo comprensible y ausencia de cambios parciales.

## Escenario D: usuarios

1. Crear y editar una cuenta desde la interfaz.
2. Cambiar contraseña, estado y rol; confirmar invalidación de la sesión previa.
3. Consultar impacto de eliminación para una cuenta vacía y otra con calificaciones.
4. Eliminar la vacía y retirar de forma segura la cuenta con historial.

## Comprobaciones

- Matriz backend permitida/denegada para cada permiso.
- TypeScript, lint, unitarias frontend y backend, integración y E2E.
- Viewports 360×800, 390×844, 768×1024 y escritorio, en claro y oscuro.
- Upgrade, downgrade y upgrade de la migración sin pérdida de datos.

## Evidencia local 2026-08-30

- Entorno: PostgreSQL 16 del compose local con usuarios existentes.
- `upgrade 202608270002 -> 202608300001 -> 202608300002`: correcto.
- `downgrade 202608300002 -> 202608300001 -> 202608270002`: correcto.
- Segundo `upgrade ... -> 202608300002`: correcto.
- Las operaciones usaron DDL transaccional y finalizaron con código 0.

## Evidencia focalizada de interfaz 2026-08-30

- `npm --prefix frontend run typecheck`: correcto después de separar acciones por permiso.
- `MateriaEvaluaciones.test.tsx` y `MateriaRecursos.test.tsx`: 5 pruebas correctas.
- Se corrigió la detección de contexto docente: `grading.read` y `attendance.read` ya no convierten a un estudiante en gestor de la materia.

## Cierre de validación 2026-08-31

- Contratos API y matriz completa de permisos: `8 passed`.
- Regresión RBAC y propiedad académica: `69 passed`; restaurada la lectura histórica de DBA para estudiantes matriculados.
- El listado de recursos vuelve a aplicar la guarda de propiedad o matrícula antes de consultar materiales.
- Frontend: TypeScript, ESLint, `20` pruebas focalizadas y build de producción correctos.
- E2E administrativo: `2 passed`, con 360×800, 390×844, 768×1024 y 1366×768, además de acceso directo denegado.
- Rendimiento: resolución de permisos verificada por debajo de 50 ms p95 y paginación hasta el registro 10.000.
- Inventario regenerado con `485` superficies.
