# Plan: Validar nombres literales en preguntas de quién

**Rama**: `codex/072-clave-literal-pregunta-quien` | **Fecha**: 2026-09-25 | **Especificación**: [spec.md](spec.md)

## Resumen

Se especializará la validación objetiva de respuestas abiertas para preguntas explícitas de «quién». La implementación extraerá nombres propios literales de la referencia explicativa y solo aceptará una respuesta que comience con uno de ellos. El resto de preguntas conserva la regla estricta de igualdad o prefijo de la clave completa.

## Contexto técnico

**Lenguaje**: Python 3.12

**Dependencias**: normalización y expresiones regulares existentes

**Almacenamiento**: sin cambios

**Pruebas**: pytest unitario, Ruff y gobernanza Spec Kit

**Restricciones**: sin similitud difusa, sin escritura retroactiva y sin publicación automática

## Verificación constitucional

- Integridad: pasa; usa la referencia oficial y exige coincidencia literal al inicio.
- Trazabilidad: pasa; el resultado queda en `objective_validation`.
- Datos: pasa; no hay migraciones ni cambios de contrato.
- Pruebas y PR: pasa; incluye regresión del caso productivo e issue de hotfix.

## Archivos

```text
backend/app/modules/calificaciones/orchestrator.py
backend/tests/unit/test_photo_grading_failures.py
specs/072-clave-literal-pregunta-quien/
```

## Decisión

No se generaliza por similitud semántica. La excepción se limita a preguntas de «quién» y nombres propios visibles en la clave, reduciendo falsos positivos en preguntas de comprensión.

