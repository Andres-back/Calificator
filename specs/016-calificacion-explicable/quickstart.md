# Guía de validación: Calificación explicable y auditable

## Prerrequisitos

- Rama `codex/016-calificacion-explicable`.
- Python 3.11 y dependencias de `backend/requirements*.txt`.
- Node.js 22 y `npm ci` en `frontend/`.
- PostgreSQL 16 y Redis 7; no usar datos reales de estudiantes en fixtures.

## Preparar servicios y migración

```powershell
docker compose up -d postgres redis
docker compose run --rm migrate
docker compose exec postgres pg_isready -U xcalificator -d xcalificator_db
```

Validar además en una base temporal:

```powershell
Set-Location backend
alembic upgrade head
alembic downgrade -1
alembic upgrade head
```

Resultado esperado: las tres operaciones terminan sin pérdida ni modificación de filas existentes en `calificaciones`.

## Escenarios backend dirigidos

```powershell
Set-Location backend
python -m pytest tests/unit/test_calificacion_breakdown.py -v
python -m pytest tests/unit/test_grading_component_consensus.py -v
python -m pytest tests/unit/test_breakdown_visibility.py -v
python -m pytest tests/integration/test_explainable_grading_flow.py -v
```

Los nombres se concretarán en `tasks.md`. La cobertura debe demostrar:

1. Una evaluación de tres preguntas produce tres componentes únicos y una fórmula exacta.
2. Una respuesta objetiva correcta recibe el máximo aunque un evaluador proponga menos.
3. Dos totales iguales con distribución diferente crean discrepancia por componente.
4. Ilegible, hoja faltante y clave incompleta bloquean publicación sin asignar cero.
5. Una edición docente crea versión nueva, ajuste antes/después y recalcula.
6. Una escritura con versión obsoleta devuelve 409 y no modifica datos.
7. Un reintento de Celery no duplica desglose ni calificación.
8. Profesor ajeno y estudiante ajeno reciben 403; el estudiante propio no ve un desglose sin publicar.
9. Con entregas abiertas, el payload estudiantil no contiene la clave.
10. Un reclamo por componente queda asociado a la versión publicada.
11. Una nota histórica responde detalle no disponible sin inventar componentes.
12. Ningún payload persistido contiene `_reasoning`, prompt o campos desconocidos.
13. Una evaluación con DBA sin rúbrica no recibe puntos por el DBA; una rúbrica ponderada sí reproduce exactamente su peso configurado.
14. Con la nueva autoridad desactivada, los endpoints y notas vigentes se comportan igual; el modo controlado genera comparación sin alterar la nota publicada.

## Escenarios frontend dirigidos

```powershell
Set-Location frontend
npm run test:run -- GradeBreakdown
npm run test:run -- CalificacionesWorkspace
npm run test:run -- ResolverEvaluacionPage
npm run typecheck
npm run lint:strict
```

Validar manual o automáticamente:

- El profesor identifica puntos y explicación de cualquier pregunta en menos de 30 segundos.
- Editar una pregunta actualiza la fórmula antes de guardar y exige las dos explicaciones.
- Un conflicto de versión conserva los cambios locales y ofrece recargar/comparar.
- La publicación se deshabilita con pendientes y enumera qué resolver.
- El estudiante llega al desglose desde “Ver entrega” en máximo dos acciones.
- La solicitud de revisión permite elegir una pregunta, pero no cambia la nota.
- En 360×800 y 390×844 no hay corte, tabla rígida ni desplazamiento horizontal.
- Claro/oscuro conserva contraste y los estados tienen texto/icono, no solo color.

## Rendimiento e idempotencia

Ejecutar el mismo fixture de calificación al menos diez veces antes y después. Registrar mediana del pipeline completo sin incluir carga de archivos. El nuevo tiempo mediano no debe superar 1,20× la línea base. Reentregar la misma tarea Celery con igual `pipeline_run_id` debe mantener una sola versión automática.

## Suite completa antes del PR

```powershell
Set-Location backend
python -m compileall -q app tests
python -m pytest tests/unit -v
python -m pytest tests/integration -v

Set-Location ../frontend
npm run typecheck
npm run lint:strict
npm run test:run
npm run build
npm run test:e2e

Set-Location ..
docker compose --profile production config --quiet
docker build -t xcalificator-backend ./backend
docker build -f frontend/Dockerfile -t xcalificator-web .
```

## Criterio de salida

La función está lista para PR cuando todos los escenarios anteriores pasan, la nota siempre se reproduce desde la fórmula, los DTO por rol no filtran claves, las tareas están completas y Spec Kit Converge no agrega trabajo pendiente.
