# Plan: Asistencia con guardado automático

**Rama**: `codex/085-asistencia-autoguardado` | **Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Issue**: [#176](https://github.com/Andres-back/Calificator/issues/176)

**Estado**: Plan aprobado por el usuario con «aprove» el 2026-10-06. Checklist 8/8 revisado con autorización humana; implementación en validación. Sin despliegue.

## Resumen

Guardar cada selección desde la lista, incluso si otros alumnos siguen pendientes. Añadir `PATCH /api/materias/{materia_id}/asistencia` para enviar únicamente los registros modificados y conservar el `PUT` de jornada completa. Reutilizar la tabla actual y su restricción única mediante escritura atómica. En el frontend, mantener una cola de cambios por alumno, una sola solicitud en curso por vista y confirmaciones vinculadas al contenido enviado, sin reemplazar cambios nuevos con respuestas viejas.

Retirar el botón normal Guardar asistencia y la obligación visual de completar la lista para guardar. Mostrar estado compacto por alumno y resumen de pendientes de guardado separado de pendientes de asistencia. Mantener Reintentar solo para errores. No tocar calificaciones, evaluaciones, usuarios ni proveedores de IA.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11; TypeScript 5.6; React 18.3; Node 22 según Docker y CI actuales.

**Dependencias**: FastAPI, Pydantic 2, SQLAlchemy 2 async y PostgreSQL; React Query 5, React Router 7 y componentes UI existentes. Sin nuevas dependencias.

**Persistencia**: `asistencia_registros`; clave única `(materia_id, estudiante_id, fecha)`. Sin migración ni nuevas tablas. Borrador y cola solo en memoria de la vista.

**Pruebas**: pytest unitario/autorización y PostgreSQL aislado; Vitest/modelo y hook; Playwright sobre mocks con estados persistentes y matriz móvil. Actualizar pruebas que esperan Guardar manual sin suprimir las comprobaciones de scroll, reflujo ni permisos.

**Plataforma objetivo**: navegador móvil como prioridad; escritorio y VPS actual. Chromium y WebKit automatizados; no afirmar validación en iPhone físico o Brave sin ejecutarla.

**Rendimiento y escala**: clic de estado actualiza selección inmediatamente e inicia guardado; una solicitud en vuelo por vista; acumular cambios nuevos mientras llega respuesta; observaciones con espera de 500 ms desde la última tecla o salida del campo. Validar 30 selecciones/correcciones y búsqueda sobre 100 alumnos sin bloquear escritura.

## Verificación de la constitución

- **Separación de roles**: PATCH exige `attendance.manage` y `ensure_can_manage_materia`, como PUT; verifica matrícula activa en servidor. Lecturas siguen con `attendance.read`.
- **Integridad y trazabilidad**: escritura solo en asistencia; conserva identidad, creación y registros no enviados; actualiza responsable/fecha de modificación. Notas, evidencias y credenciales fuera del alcance.
- **Asincronía e idempotencia**: no usar LLM ni Celery para esta operación breve. Cola no bloqueante y upsert atómico por clave única; fallo explícito sin reintentos infinitos.
- **Datos y secretos**: ningún dato real ni secreto en pruebas o artefactos; base aislada para concurrencia. No migraciones ni limpieza de registros.
- **Accesibilidad**: estado visible no basado solo en color; mensajes accesibles; botones táctiles; sin resumen fijo ni aviso emergente por cada selección.
- **Gobernanza y pruebas**: issue #176 y `spec-approved` registrados. Implementación bloqueada hasta `plan-approved`, Checklist, Tasks y Analyze. PR y CI verde obligatorios; no push directo a main.

Revisión antes y después del diseño: sin excepciones a la constitución. Aprobar este plan no autoriza modificar datos de producción para probarlo.

## Estructura del proyecto

```text
backend/app/modules/asistencia/
  schemas.py         # Contrato parcial separado y validación sin duplicados
  router.py          # PATCH protegido; mantener GET/reporte/PUT
  service.py         # Validación parcial y persistencia atómica reutilizable
  models.py          # Solo referencia; esquema no cambia
backend/tests/unit/
  test_asistencia_service.py
  test_authorization_contracts.py
backend/tests/integration/
  test_attendance_autosave.py  # PostgreSQL real aislado
frontend/src/modules/materias/
  MateriaAsistencia.tsx
  asistenciaApi.ts
  attendanceModel.ts
  attendanceModel.test.ts
  useAttendanceAutosave.ts    # Cola acotada a materia y día
  useAttendanceAutosave.test.tsx
frontend/e2e/
  p2-responsive.spec.ts
  mock/grading-review.mock.spec.ts
specs/085-asistencia-autoguardado/
  spec.md, plan.md, research.md, data-model.md, quickstart.md
  contracts/interfaces.md
```

Un hook específico evita añadir la cola directamente a una vista ya extensa; no crear infraestructura genérica de sincronización. Reutilizar pruebas existentes cuando corresponda. Actualizar dominio canónico 004, índice e inventario generado para PATCH sin duplicar responsabilidad del módulo.

## Decisiones y complejidad

1. **Contrato aditivo**: PATCH acepta subconjunto no vacío de matriculados. PUT conserva lista completa y respuesta. Mantener `saveAsistenciaDia`, `buildAttendancePayload` y sus pruebas; añadir funciones parciales independientes.
2. **Escritura atómica**: usar `INSERT ... ON CONFLICT DO UPDATE` sobre la restricción existente, sin seleccionar primero si existe. Validar todo el lote antes de escribir; ordenar filas por ID. Compartir la persistencia con PUT manteniendo su validación completa; probar concurrencia mixta. Actualizar explícitamente `updated_at` porque el upsert Core no activa automáticamente `onupdate` ORM.
3. **Precondición del esquema**: comprobar restricción única en la base aislada migrada. Si una instalación histórica no la tiene, detener y documentar necesidad de migración aprobada; no alterar producción manualmente ni ocultar el fallo.
4. **Cola y revisiones locales**: cada edición aumenta revisión por alumno. Enviar instantánea de filas elegibles modificadas. Al confirmar, actualizar base de filas enviadas, conservar borrador/revisión más nuevos y procesar su siguiente envío. No inferir guardado solamente por igualdad con la base anterior durante una solicitud en curso.
5. **Consultas y caché**: conciliar lecturas entrantes con pendientes; no inicializar todo el borrador ante cada refetch. Actualizar caché bajo la materia/fecha enviada e invalidar reportes tras confirmación sin bucles de guardado por invalidación.
6. **Errores**: las filas del lote fallido conservan selección y error; otros alumnos pueden continuar. Reintentar explícitamente con contenido local más reciente; nueva edición de fila fallida inicia nuevo intento. Sin almacenamiento offline ni recuperación después de descartar/cerrar.
7. **Observaciones**: espera de 500 ms o blur; si no hay estado, mostrar Selecciona un estado para guardar y proteger salida. Seleccionar estado envía también observación. No perder foco por respuestas de red.
8. **Contexto**: advertir antes de descartar pendientes y conservar `beforeunload`; identificar contexto original de solicitudes y desactivar cola anterior al salir. Una escritura enviada puede completarse para el día original; no prometer cancelación ni dejar que afecte la nueva vista.
9. **Interfaz**: Guardando / Guardado / No guardado con Reintentar, sin toast de éxito por alumno. Mantener búsqueda/marcado masivo, actualizar ayuda y distinguir lista incompleta de cambios sin guardar.

## Validación y entrega

Protección de conciliación: cancelar GET antiguos antes de publicar una respuesta PATCH en caché, pasar AbortSignal en consulta de asistencia y tratar cancelación intencional como tal en el cliente HTTP (sin reportarla como fallo ni renovar sesión). Regresión en `frontend/src/lib/api.test.ts`. El builder parcial se usa sobre instantáneas explícitas para conservar correcciones que vuelven al estado previo durante un envío.

- Probar PATCH parcial preservando omitidos, duplicados, fecha futura, matrícula ajena, permisos y respuesta con pendientes; regresión PUT completo/incompleto.
- En PostgreSQL real: dos primeras escrituras simultáneas, lotes disjuntos y PATCH/PUT sin duplicados ni errores de unicidad. Variable `SPEC085_TEST_DATABASE_URL` exclusiva de pruebas, sin fallback a producción; configurar ejecución no omitida en CI.
- Con respuestas demoradas: correcciones del mismo alumno, retorno a estado previo durante una solicitud y 30 cambios; comparar datos persistidos, no solo mensajes.
- Probar error/reintento, sesión vencida, observaciones, refetch, búsqueda, marcado masivo y salida/cambio de fecha con pendientes.
- Playwright: reabrir día/reporte con mocks persistentes por PATCH; comprobar ausencia de PUT por selección y mensajes manuales obsoletos; claro/oscuro, 360×800, 390×844, 768×1024, escritorio y reflujo 200 %.
- Pruebas locales enfocadas durante desarrollo; CI completo antes de merge. Ninguna prueba de escritura en producción.
- Rollback: frontend anterior sigue usando PUT completo. PATCH aditivo y tabla actual evitan migración o pérdida de asistencia.
