# Plan: nota sugerida consistente con el desglose bajo revisión

**Rama**: `codex/058-grade-sum-review` | **Fecha**: 2026-09-21 | **Spec**: [spec.md](spec.md) | **Issue**: [#115](https://github.com/Andres-back/Calificator/issues/115)

## Solución

En `create_automatic_breakdown`, separar la autoridad para publicación sin alertas de la sincronización de la sugerencia numérica. Cuando `coverage_state` confirme que todos los componentes tienen puntaje y no exista decisión humana, copiar `nota_final` del desglose a `nota_sugerida`. Mantener `requiere_revision` ante alertas. Cuando un componente no sea evaluable, conservar el bloqueo y la nota global previa sin convertir la suma parcial en total.

## Verificación

Ampliar las pruebas focalizadas de persistencia del desglose, ejecutar el conjunto de calificaciones pertinente, Ruff y gobernanza. Después del PR y CI, repetir la misma fotografía en producción y comprobar desglose, sugerencia, estado y tiempo sin confirmar ni publicar.

## Constitución

Se conservan separación de roles, trazabilidad del valor original del modelo, revisión humana, idempotencia de la cola y ausencia de migración o cambios de API. El hotfix sigue issue #115, rama y PR con regresión.
