# Plan: Calificación confiable e impacto docente medible

**Rama**: `codex/032-calificacion-impacto-docente` | **Fecha**: 2026-09-09 | **Spec**: [spec.md](./spec.md) | **Issue**: #65
**Estado**: Plan y especificación aprobados por el usuario el 2026-09-09. Mensaje de aprobación del plan: «aprove»; etiqueta plan-approved en issue #65. La revisión de checklist precede a implementación.

## Resumen

Cerrar defectos de recuperación y fidelidad, instrumentar trabajo docente real y reorganizar la revisión existente. Después validar abiertas/contexto y habilitar instrumentos de estudio explícitamente autorizados. No cambiar proveedores ni retirar evaluadores. No ejecutar un piloto ni modificar producción durante planificación.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 en contenedor/CI; TypeScript 5.6, React 18, React Router 7; Node 22 en CI.
**Dependencias**: FastAPI, SQLAlchemy, Alembic, PostgreSQL/pgvector, Celery/Redis; React Query, Vitest, Playwright. Reutilizar dependencias actuales.
**Persistencia**: entregas/calificaciones/desgloses y jobs existentes; ampliaciones JSON versionadas para checkpoints; tablas nuevas mínimas para sesiones y estudio según [data-model.md](./data-model.md).
**Pruebas**: pytest unitarias/integración; Vitest; Playwright Chromium/WebKit; accesibilidad y vistas existentes.
**Plataforma objetivo**: navegador móvil/escritorio, claro/oscuro; despliegue Docker existente.
**Rendimiento y escala**: conservar objetivos de 031 (mediana visual <45 s, p95 <90 s para una hoja bajo condiciones documentadas), lote de 30 y tres docentes concurrentes. Son objetivos pendientes de medición, no resultados. Medir tiempo activo humano y espera automática separadamente.

## Verificación de la constitución

- Separación de roles: permiso modular más propiedad del objeto; estudio con autorización explícita, sin nuevo rol ni acceso implícito a datos de toda la institución.
- Integridad: una nota vigente, bloqueo/versionado optimista y prioridad de edición humana; nuevos análisis no cambian publicados.
- Asincronía/idempotencia: conservar leases y cola de 031; checkpoints cercados por claim_token; reintentos no repiten éxitos.
- Datos/secretos: migración aditiva; evidencia solo en almacenamiento académico autorizado, nunca logs/telemetría/exportación por defecto; no copiar propuesta Word ni identidades a Git.
- Accesibilidad: matriz de cinco tamaños, objetivos táctiles, teclado y lectura física sin penalización por ausencia de clics.
- Gobernanza/pruebas: spec-approved y plan-approved registrados. Checklist/Tasks/Analyze antes de Implement. Sin push ni merge directo.
- Resultado previo y posterior al diseño: compatible con principios; autorización real del piloto permanece bloqueada hasta protocolo institucional. No hay excepción constitucional solicitada.

## Estructura del proyecto

- backend/app/modules/calificaciones/{agents,orchestrator,photo_service,breakdown_service,router}.py: evidencia completa, decisiones, guardado y fuentes.
- backend/app/services/{vision_extractor,ai_provider_capacity}.py; backend/app/workers/tasks_grading.py; backend/app/modules/jobs/: extracción/checkpoints, reintentos, lista recuperable.
- backend/app/modules/rag/: autorización y fuentes versionadas, recuperación por pregunta después de extraer.
- backend/app/modules/analytics/ y impacto_tesis/: sesiones, agregación, incorporación y exportación; reutilizar módulos, no crear un subsistema paralelo.
- backend/app/modules/authorization/: mapa de rutas/permisos y denegación por objeto.
- backend/alembic/versions/: migraciones aditivas; inventario técnico actualizado por herramienta vigente.
- frontend/src/modules/calificaciones/: workspace, editor, salón y monitor; visor por página compartido si es necesario.
- frontend/src/modules/analytics/ y lib/analytics.ts: cronómetro opt-in, indicadores y estudio; permisos/rutas existentes.
- backend/tests/unit, integration; frontend/src y frontend/e2e/: extender pruebas existentes, nuevos archivos solo si separan una responsabilidad real.

## Incrementos y dependencias

1. **Confiabilidad** (FR-001–006, 024–026): reproducir retrying con nota existente; alinear máquina de estados; checkpoints por página; eliminar recorte; conservar decisiones y validar lote.
2. **Medición** (FR-014–019, 021, 023): corregir contrato de eventos; sustituir ahorro supuesto en vistas por observado/no disponible; sesiones opt-in, deduplicación y resumen reproducible.
3. **Revisión** (FR-007–009, 013, 018): evidencia/pregunta juntas; guardar y siguiente; no fusionar guardar con publicar; identidad y estados del lote recuperados del servidor.
4. **Calidad y contexto** (FR-002–003, 010–013): transcripción sin clave, normalización semántica y fuentes pertinentes; preservar verificador y árbitro existentes; referencia docente para casos de Lenguaje/Sociales.
5. **Instrumentos** (FR-019–023): conjunto autorizado, incorporación externa validada, encuesta persistida y exportación minimizada. No recopilar datos reales por defecto.

Cada incremento actualiza spec/contratos/tareas de su propietario; no duplica tablas de calificaciones ni cálculo de fórmula. Todos los FR se cubren; FR-026 aplica transversalmente.

## Decisiones y complejidad

Ver [research.md](./research.md), [data-model.md](./data-model.md), [contratos](./contracts/interfaces.md) y [validación](./quickstart.md).
Tres tablas nuevas propuestas para no mezclar telemetría operativa con investigación: sesiones de trabajo, conjuntos y observaciones versionadas. El JSON de checkpoint no viaja en JobRead. No basta con añadir un cronómetro basado en opened/confirmed.

## Despliegue y reversión

- Primero resolver integración de #64 (base local 35f5139); rebasar/revisar 032 contra main antes del PR. No publicar cambios de 031 incidentalmente.
- Migraciones additive-first; flags independientes para nueva lectura, mesa de revisión, medición y estudio, apagados inicialmente. Estudio siempre exige activación y autorización explícitas.
- Reversión desactiva funciones nuevas y conserva tablas/observaciones/historial; no downgrade destructivo ni restaurar el falso ahorro. Mantener el arreglo de idempotencia; si una regresión impide procesamiento seguro, pausar nuevas inferencias, conservar evidencia y ofrecer revisión manual.
- Fijar versión de modelo/prompts/criterios durante cada conjunto de mediciones; cambios posteriores se identifican como otra versión.
- CI aplicable verde y PR aprobado antes de despliegue. Producción no se cambia en este turno.
