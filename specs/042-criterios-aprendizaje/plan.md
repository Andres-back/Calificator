# Plan: Criterios de aprendizaje desde material docente

**Rama**: `codex/042-criterios-aprendizaje` | **Fecha**: 2026-09-13 | **Spec**: [spec.md](./spec.md) | **Issue**: [#19](https://github.com/Andres-back/Calificator/issues/19)

## Resumen

Convertir la experiencia principal de DBA en un flujo de **Criterios de aprendizaje** que parte del material realmente trabajado y de la intención del profesor. El sistema admitirá creación manual o una propuesta asistida desde fotografías, PDF, documentos, texto, materiales existentes y estándares oficiales opcionales. El profesor editará criterios, niveles y pesos, aprobará una versión y podrá aplicarla a evaluaciones o recursos sin alterar calificaciones históricas.

La implementación será aditiva y progresiva. Reutilizará el almacenamiento privado, RAG, trabajos Celery, criterios JSON de evaluaciones, blueprints y desglose explicable que ya funcionan. Los endpoints DBA actuales seguirán disponibles como compatibilidad y la ruta visual `/dba` redirigirá a la nueva experiencia hasta retirar consumidores verificados.

La experiencia se implementará con divulgación progresiva: una entrada de tres decisiones, tarjetas con campos pedagógicos esenciales y configuración avanzada plegable. Se reutilizarán `LearningCriteriaWizard`, `LearningCriteriaEditor`, `LearningCriteriaSelector`, el recorrido guiado común y el editor explicable de calificaciones; no se creará un segundo flujo paralelo.

## Contexto técnico

**Lenguajes/versiones**: Python 3.12, TypeScript 5.6, React 18.
**Dependencias**: FastAPI 0.139, SQLAlchemy 2.0, Alembic 1.14, Pydantic 2.10, Celery 5.4, Redis, PostgreSQL/JSONB, React Query 5, React Router 7 y Vite 8.
**Persistencia**: nuevas tablas versionadas para conjuntos, versiones, criterios y fuentes; referencias opcionales a `rag_sources`, `dba_catalog`, `dba_personalizados`, evaluaciones y recursos. Migración aditiva y reversible sin borrar columnas DBA.
**Pruebas**: pytest y Ruff en backend; Vitest, Testing Library, TypeScript y ESLint en frontend; Playwright para recorridos responsivos y autorización; pruebas de migración y gobernanza Spec Kit.
**Plataforma objetivo**: contenedores Linux en VPS y navegadores modernos en escritorio/celular desde 360 px, incluidos Safari móvil y Brave.
**Rendimiento y escala**: guardar/editar un borrador en menos de 500 ms p95 sin IA; aceptar la carga y devolver un trabajo en menos de 2 s; navegación no bloqueante durante extracción; una sola ejecución activa por versión e idempotency key; paginación desde 25 conjuntos y 50 fuentes.

## Verificación de la constitución

- **Separación de roles — cumple**: lectura y escritura quedan limitadas por profesor propietario/materia; estudiantes solo reciben el snapshot expresamente asignado. Se prueban acceso permitido, ajeno y sin permiso.
- **Integridad y trazabilidad — cumple**: una versión aprobada es inmutable; cada evaluación/recurso conserva su snapshot. Toda aprobación, nueva versión y ajuste manual registra actor y fecha.
- **Asincronía e idempotencia — cumple**: extracción y propuesta usan `ai_jobs`/Celery, con estados visibles, clave idempotente y reintentos sin duplicar fuentes, criterios o versiones.
- **Evolución de datos — cumple**: migración aditiva, doble lectura/escritura controlada y conservación total de DBA, evaluaciones, blueprints y notas existentes.
- **Datos y secretos — cumple**: archivos en almacenamiento privado, metadatos mínimos, autorización antes de descarga y eliminación explícita; no se registran contenido, credenciales ni imágenes en logs.
- **Accesibilidad — cumple**: flujo por pasos, controles táctiles de al menos 44 px, claro/oscuro, teclado, mensajes de estado y ausencia de desbordamiento horizontal desde 360 px.
- **Portabilidad de IA — cumple**: la generación usa una capacidad configurable, no un proveedor fijo, y el flujo manual funciona sin IA.
- **Gobernanza y pruebas — cumple**: issue, especificación aprobada, plan pendiente de aprobación, tareas, análisis, implementación, pruebas, PR y CI antes de integrar.

## Estructura del proyecto

```text
backend/
├── alembic/versions/                         # migración aditiva
├── app/modules/criterios_aprendizaje/         # modelos, esquemas, servicio y router canónicos
├── app/modules/dba/                           # compatibilidad con catálogo/criterios heredados
├── app/modules/evaluaciones/                  # vínculo y snapshot de versión aprobada
├── app/modules/herramientas/                  # aplicación opcional a recursos
├── app/modules/rag/                           # ingestión/búsqueda de fuentes autorizadas
├── app/modules/jobs/                          # estado e idempotencia reutilizados
├── app/workers/                               # extracción/propuesta asíncrona
└── tests/                                     # unitarias, integración, autorización y migración

frontend/
├── src/config/routes.ts                       # ruta canónica y alias legado
├── src/modules/materias/criterios/             # lista y editor por pasos
├── src/modules/materias/dbaApi.ts             # adaptador legado durante transición
├── src/modules/evaluaciones/                   # selector de versión aprobada
├── src/modules/herramientas/                   # selector al crear/asignar recurso
├── src/modules/calificaciones/                 # origen del criterio en el desglose
├── src/types/api.ts                            # contratos tipados
└── e2e/                                       # flujos críticos móvil/escritorio

specs/042-criterios-aprendizaje/                # diseño, contratos y validación
```

## Fases de implementación

1. **Dominio aditivo**: migración, modelos, permisos y CRUD manual de conjuntos/versiones/criterios, sin tocar todavía las rutas productivas de calificación. La migración incluye un backfill idempotente con hash que conserva los identificadores y no recalcula notas.
2. **Experiencia canónica**: ruta “Criterios de aprendizaje”, editor manual y “Estándares oficiales” opcionales; `/dba` conserva compatibilidad mediante redirección.
3. **Material y propuesta asistida**: fuentes privadas, extracción asíncrona, intención docente, propuesta editable y aprobación humana obligatoria.
4. **Aplicación segura**: asociar una versión aprobada a evaluación/recurso y copiarla al blueprint/snapshot usado por generación y calificación; mantener campos DBA heredados durante la transición.
5. **Transparencia y medición**: mostrar criterio y fuente pertinente en el desglose por respuesta; registrar tiempo activo docente separado de espera de IA.
6. **Convergencia**: migrar consumidores internos, validar datos históricos y crear un issue separado antes de retirar cualquier endpoint o campo heredado.

Cada fase se integra con pruebas verdes y banderas independientes: `CRITERIA_WRITE`, `CRITERIA_GENERATION`, `CRITERIA_UI`, `CRITERIA_GRADING_CONTEXT` y `CRITERIA_GRADING_AUTHORITY`. La autoridad nueva permanece desactivada hasta demostrar paridad histórica y matemática; el motor actual mantiene su entrada compatible y la nueva versión se transforma al contrato de criterios que ya consume.

## Decisiones y complejidad

- Se agregan tablas normalizadas porque un JSON mutable dentro de `evaluaciones` no puede ofrecer reutilización, versiones aprobadas ni auditoría transversal. El snapshot JSON existente se conserva para que cada calificación sea reproducible.
- No se renombra ni elimina `dba_catalog` o `dba_personalizados`: representan estándares y datos históricos válidos, pero dejan de dominar la experiencia visual.
- No se exige IA, DBA ni archivo. Un conjunto puede construirse completamente a mano; la IA propone solamente cuando el docente la solicita.
- No se recalifican entregas antiguas al editar criterios. Toda modificación posterior a la aprobación crea una versión nueva y requiere asignación explícita.
- Las referencias privadas no se exponen al estudiante por defecto. Solo el material marcado y asignado como visible se incorpora a su actividad.
- El tiempo de espera de IA no se mezcla con tiempo activo docente, para que las métricas de la tesis midan reducción real de trabajo humano.

## Riesgos y reversión

- **Deriva entre contratos nuevo y heredado**: un único adaptador serializa la versión aprobada al formato actual; pruebas de contrato comparan ambos caminos.
- **Blueprint actualmente mutable**: antes de aplicar versiones nuevas se congela el snapshot por aplicación y se prueba que editar una evaluación publicada no reescriba la procedencia usada por notas previas.
- **Criterios insuficientes o inventados**: se muestra cobertura por fuente y se bloquea la aprobación asistida cuando faltan referencias verificables; siempre queda edición manual.
- **Archivos sensibles o huérfanos**: guardado privado, limpieza transaccional al fallar y política de retención auditable.
- **Ámbito RAG heredado insuficiente**: los endpoints nuevos validan propietario y materia antes de cualquier consulta; no exponen directamente búsquedas o fuentes RAG genéricas al estudiante.
- **Regresión de calificación**: bandera por materia, doble lectura y batería de regresión sobre evaluación, blueprint y desglose antes de habilitar.

La reversión desactiva la bandera y devuelve navegación/lectura a los endpoints DBA actuales. Las tablas y columnas nuevas permanecen sin pérdida hasta una migración posterior aprobada; no se alteran notas ni blueprints históricos.

## Revisión constitucional posterior al diseño

### Corrección compartida de scroll aprobada (2026-09-16)

Reutilizar `useBodyScrollLock` como propietario único de los estilos del documento, mediante tokens de bloqueo y restauración al liberar el último consumidor. Adoptarlo en `Modal` y `AppShell`, escuchar cambios del media query y cerrar el menú al cambiar de ruta o pasar a escritorio. Eliminar el scroll anidado de `RevisionGuide`. Verificar superposición, desmontaje, StrictMode, resize y navegación con pruebas focales y reproducción aislada con Playwright de los componentes reales. No tocar backend ni cálculo de notas; mantener pendientes las compuertas de integridad y despliegue de 042.

El modelo y los contratos mantienen las ocho compuertas en cumplimiento. En particular, la separación fuente docente/evidencia estudiantil corrige el riesgo de privacidad detectado; la aplicación y el snapshot inmutables cubren la trazabilidad histórica; y las banderas separan escritura, generación, interfaz, contexto y autoridad para una activación reversible.
