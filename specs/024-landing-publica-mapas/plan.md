# Plan de implementación: landing pública, solicitudes docentes y mapas conceptuales

**Rama**: `codex/024-landing-publica-mapas` | **Fecha**: 2026-08-26 | **Spec**: [spec.md](spec.md)

## Resumen

Se añadirá una entrada pública separada de la aplicación autenticada, se recuperará y adaptará el flujo de solicitudes docentes que quedó en una rama no fusionada y se reemplazará la representación tabular de mapas conceptuales por un diagrama jerárquico normalizado.

## Contexto técnico

**Lenguajes**: Python 3.11 y TypeScript 5.

**Dependencias**: FastAPI, SQLAlchemy async, Alembic, PostgreSQL, React 18, React Router, TanStack Query, Tailwind CSS, lucide-react y render HTML/PDF existente.

**Persistencia**: columnas de solicitud docente en `users`; contenido de mapas continúa en `materiales.contenido_json` sin migración de recursos existentes.

**Pruebas**: pytest y Vitest focalizados; TypeScript, lint y build una vez al cierre. E2E completo queda para CI del PR.

**Plataforma**: aplicación web responsiva y contenedores Linux existentes.

**Restricciones**: no cambiar calificación, no conceder roles privilegiados desde registro, no incorporar librerías de diagramas pesadas y preservar mapas existentes.

## Verificación de la Constitución

- Roles: registro solo crea estudiantes y endpoints administrativos conservan guard de rol.
- Calificaciones: fuera de alcance.
- Asincronía: generación conserva el flujo actual.
- Datos: migración reversible y columnas anulables.
- Accesibilidad: 360 px, modo oscuro, foco, texto equivalente y movimiento reducido.
- IA: router configurable existente, sin proveedor fijo nuevo.
- Gobernanza: issue #35, artefactos 024, PR y CI.

No hay excepciones constitucionales.

## Decisiones de diseño

1. `/` será una página pública ligera sin llamadas autenticadas.
2. `RegisterRequest` aceptará `solicitar_docente`, nunca un rol; el servicio persistirá estudiante y solicitud pendiente en una transacción.
3. La solicitud vivirá en `users` por ser una única promoción por identidad; la auditoría existente registra decisiones.
4. Las decisiones usarán bloqueo de fila; aprobar cambia a profesor y rechazar conserva estudiante. Se protegerá el último administrador y la autoedición sensible.
5. Una función normalizadora producirá IDs únicos, niveles 1–3, relaciones válidas y un mínimo pedagógico compatible con JSON antiguo.
6. La web usará SVG liviano para conectores y tarjetas HTML por nivel; móvil conservará una descripción textual accesible.
7. El PDF usará cajas y conectores compatibles con el render HTML existente.

## Estructura afectada

```text
backend/alembic/versions/202608260002_teacher_role_requests.py
backend/app/modules/auth/{schemas.py,service.py}
backend/app/modules/users/{models.py,schemas.py,service.py,router.py}
backend/app/modules/herramientas/generators/mapa_conceptual.py
backend/app/modules/herramientas/pdf_render.py
backend/app/shared/enums.py
frontend/src/config/{routes.ts,nav.ts}
frontend/src/modules/auth/{LandingPage.tsx,LoginPage.tsx,RegisterPage.tsx}
frontend/src/modules/admin/{AdminUsersPage.tsx,usersApi.ts}
frontend/src/modules/dashboard/{DashboardAdmin.tsx,DashboardEstudiante.tsx}
frontend/src/modules/herramientas/views/ContenidoView.tsx
frontend/src/{router.tsx,stores/auth.ts,types/api.ts}
```

## Validación eficiente

1. Pruebas backend focalizadas de registro, solicitudes y normalización de mapas.
2. Pruebas frontend focalizadas de landing, registro, administración y mapa.
3. TypeScript, lint, build e inventario una sola vez al cierre.
4. E2E completo y builds de contenedor solo en CI.

## Complejidad

No se añaden servicios, colas ni dependencias. Solo cinco columnas anulables, un índice y JSON compatible.