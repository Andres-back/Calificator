# Plan: Suma verificable como nota sugerida

**Rama**: `codex/051-nota-desglose` | **Fecha**: 2026-09-19 | **Spec**: [spec.md](./spec.md) | **Issue**: #101

## Resumen

Convertir la fórmula del desglose completo en la fuente canónica de una sugerencia automática. La creación del desglose reconciliará la nota global del modelo con la suma por componentes, conservará la discrepancia como procedencia y enviará a revisión los casos incompletos. Una migración de datos limitada alineará solo sugerencias históricas no confirmadas. El frontend mostrará hasta dos decimales significativos.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 y TypeScript 5.6.
**Dependencias**: FastAPI, SQLAlchemy, React y utilidades existentes; sin paquetes nuevos.
**Persistencia**: `calificaciones`, `calificacion_desgloses` y `resultado_json`; migración de datos sin cambio de esquema.
**Pruebas**: pytest, Vitest, gobernanza, TypeScript y lint aplicables.
**Plataforma objetivo**: Backend y frontend web mediante el despliegue actual.
**Rendimiento**: Reconciliación aritmética sin llamadas externas ni trabajos adicionales.

## Verificación de la constitución

- Integridad y trazabilidad: la fórmula verificable prevalece y conserva la cifra global como auditoría.
- Revisión humana: ninguna nota confirmada, ajustada o publicada se modifica.
- Asincronía e idempotencia: no añade llamadas y conserva la protección por `pipeline_run_id`.
- Evolución de datos: backfill limitado a sugerencias no confirmadas con desglose activo completo.
- Accesibilidad: solo cambia la precisión textual de la nota existente.
- Gobernanza: hotfix #101, `spec-approved`, regresión, rama y PR; no exige pausa adicional del plan.

## Estructura del proyecto

```text
backend/app/modules/calificaciones/breakdown_service.py
backend/alembic/versions/202609190001_authoritative_breakdown_score.py
backend/tests/unit/test_breakdown_persistence.py
backend/tests/integration/test_grade_sum_migration.py
frontend/src/modules/calificaciones/
├── gradePresentation.ts
├── gradePresentation.test.ts
└── CalificacionesWorkspace.tsx
specs/051-nota-desglose-autoridad/
```

## Decisiones y complejidad

- Solo un desglose `completa`, sin bloqueos ni `requiere_revision`, reemplaza la sugerencia global.
- Se conservan `nota_modelo_global`, `nota_calculada` y `diferencia` para explicar la contradicción.
- Las decisiones humanas se excluyen en servicio y backfill.
- La migración no reconstruye desgloses ni toca casos incompletos; su downgrade no restaura cifras incorrectas.
- La interfaz usa uno o dos decimales significativos; no cambia escala ni fórmula.

## Verificación posterior al diseño

No cambia contratos públicos ni permisos y no agrega dependencias. La suma solo se vuelve autoritativa con cobertura completa, sin introducir falsa precisión en casos pendientes.
