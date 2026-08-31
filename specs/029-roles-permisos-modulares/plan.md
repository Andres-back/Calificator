# Plan: Usuarios, roles y permisos modulares

**Rama**: codex/029-roles-permisos-modulares | **Fecha**: 2026-08-30 | **Spec**: [spec.md](./spec.md) | **Issue**: #59

## Resumen

Ampliar la autorización rígida actual con un catálogo de permisos por módulo y acción, roles personalizados combinables y asignación individual. El campo operativo actual del usuario se conserva para no romper propiedad de materias, matrículas, entregas o calificaciones. Sin rol personalizado se mantienen exactamente los permisos actuales; con uno, la matriz asignada sustituye la matriz predeterminada. Un Administrador principal protegido controla permisos críticos y evita escalamiento.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, TypeScript 5.6, React 18
**Dependencias**: FastAPI 0.139, Pydantic 2.10, SQLAlchemy 2.0, Alembic 1.14, React Query 5, Zustand 5
**Persistencia**: PostgreSQL con migración Alembic compatible; auditoría existente
**Pruebas**: pytest unitario/integración, Vitest, Playwright E2E y matrices de autorización
**Plataforma objetivo**: API y workers Docker en VPS Linux; navegador desde 360 px hasta escritorio
**Rendimiento y escala**: resolución de permisos menor a 50 ms p95; listado paginado de al menos 10.000 usuarios; cambio de acceso efectivo en la siguiente interacción; cero consultas a datos protegidos antes de denegar

## Verificación de la constitución

- Separación de roles: cumple; cada endpoint exige permiso y conserva controles de propiedad. El frontend consume los permisos efectivos solo para navegación, nunca como única defensa.
- Integridad y trazabilidad: cumple; no se eliminan cuentas con relaciones académicas y todo cambio de rol, permiso o usuario se audita.
- Asincronía e idempotencia: no aplica a la mayoría de operaciones; las ediciones usan versión esperada y transacciones para evitar mezclas concurrentes.
- Datos y secretos: cumple; la migración conserva usuarios y sesiones, las contraseñas permanecen cifradas y la API nunca las devuelve.
- Accesibilidad: cumple; gestión responsive, navegación por teclado, confirmaciones y estados visibles.
- Gobernanza y pruebas: cumple; issue #59, spec aprobada, contratos y matrices permitida/denegada antes del PR.

**Reevaluación posterior al diseño**: sin excepciones. Los permisos administrativos combinables quedan subordinados al Administrador principal y a la regla de no otorgar capacidades que el actor no posee.

## Estructura del proyecto

- backend/alembic/versions: tablas RBAC, asignaciones y Administrador principal.
- backend/app/core/permissions.py: resolución y dependencias por permiso.
- backend/app/modules/authorization: catálogo, roles, asignaciones y reglas críticas.
- backend/app/modules/users: CRUD completo, impacto de eliminación y compatibilidad.
- backend/app/modules/*/router.py: adopción de permisos manteniendo propiedad.
- backend/tests/unit e integration: matriz RBAC, migración y regresión.
- frontend/src/modules/admin: usuarios, editor de roles y matriz de permisos.
- frontend/src/components/auth: guardas por permiso.
- frontend/src/config y stores: navegación, permisos y versión.
- frontend/src y frontend/e2e: CRUD, accesibilidad y rutas permitidas/denegadas.

## Decisiones y complejidad

- Se conserva users.rol como perfil operativo. Sigue definiendo relaciones académicas, pero un rol personalizado puede incluir permisos de cualquier módulo.
- Sin rol personalizado se aplica la matriz completa del perfil existente. Al asignar uno, sus permisos sustituyen la matriz predeterminada para que un rol pueda restringir además de ampliar.
- El catálogo de permisos es controlado y se sincroniza desde código. El administrador crea roles y selecciona permisos, pero no inventa claves técnicas.
- Los permisos sensibles y críticos tienen nivel de riesgo. Solo un Administrador principal puede conceder los críticos, designar otro principal o gestionar credenciales institucionales.
- Un administrador delegado no puede conceder permisos que no posee, modificar su propia asignación privilegiada ni eludir la regla mediante duplicación de roles.
- Las comprobaciones se resuelven desde la base de datos en cada solicitud autenticada. Un cambio de rol incrementa la versión de autenticación de usuarios asignados e invalida sesiones anteriores.
- El permiso de módulo no reemplaza controles de propiedad. Se separan acciones propias y administrativas cuando una operación permite actuar sobre datos de otros docentes.
- Eliminar usuario tiene dos modos: retiro seguro para cuentas con relaciones y eliminación definitiva solo tras un análisis de impacto sin referencias.
