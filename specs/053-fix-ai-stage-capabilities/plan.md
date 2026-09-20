# Plan: Capacidades correctas por etapa de IA

**Rama**: `codex/053-fix-ai-stage-capabilities` | **Fecha**: 2026-09-20 | **Spec**: [spec.md](./spec.md) | **Issue**: [#105](https://github.com/Andres-back/Calificator/issues/105)

## Resumen

Agregar una migración reversible que alinee las capacidades persistidas de tres rutas granulares con el registro canónico ya corregido en código. El cambio modifica solamente `capability`, incrementa la versión de configuración cuando existe una diferencia y preserva todas las selecciones de proveedor y modelo.

## Contexto técnico

**Lenguajes/versiones**: Python 3.12, PostgreSQL y Alembic
**Persistencia**: `ai_feature_routing`; sin tablas ni columnas nuevas
**Pruebas**: pytest unitario enfocado, Ruff, validación Alembic e inventario técnico
**Plataforma objetivo**: backend Docker de XCalificator y panel administrativo existente

## Verificación de la constitución

- Separación de roles: cumple; no cambia permisos ni superficies públicas.
- Integridad: cumple; no altera calificaciones, evidencias ni modelos efectivos.
- Asincronía: no aplica; no cambia el ciclo de los trabajos.
- Evolución de datos: cumple mediante migración idempotente y reversible.
- Seguridad: cumple; no contiene ni manipula secretos.
- Gobernanza: hotfix #105 con especificación aprobada, tareas y prueba de regresión.

## Estructura del cambio

- `backend/alembic/versions/202609200002_fix_ai_stage_capabilities.py`: corrige datos persistidos.
- `backend/tests/unit/test_ai_stage_capability_migration.py`: valida alcance, idempotencia declarativa y rollback.
- `specs/053-fix-ai-stage-capabilities/`: trazabilidad del hotfix.
- `specs/README.md` y `tests/spec_governance/test_spec_baseline.py`: índice y línea base.

## Decisiones

- La corrección se aplica incluso si el modelo fue personalizado porque la capacidad pertenece a la etapa, no al proveedor elegido.
- Cada actualización incluye una condición de desigualdad para evitar incrementar versiones cuando el dato ya es correcto.
- El rollback restaura `text` únicamente en las tres rutas afectadas; no toca las demás propiedades.
- No se ejecutan escrituras manuales en producción: la misma migración versionada se despliega en todos los entornos.
