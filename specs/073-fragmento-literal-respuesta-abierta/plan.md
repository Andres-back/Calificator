# Plan: Reconocer fragmentos literales pertinentes en respuestas abiertas

**Rama**: `codex/073-fragmento-literal-respuesta-abierta` | **Fecha**: 2026-09-25 | **Especificación**: [spec.md](spec.md)

## Resumen

Se ampliará la validación objetiva con una coincidencia literal acotada: retirar un conector inicial, exigir cuatro palabras y comprobar que el fragmento aparezca completo en la referencia. Las preguntas comparativas quedan excluidas para evitar aceptar modificadores que no responden el núcleo.

## Contexto técnico

**Lenguaje**: Python 3.12

**Dependencias**: normalización y expresiones regulares existentes

**Almacenamiento**: sin cambios

**Pruebas**: pytest, Ruff, gobernanza Spec Kit e inventario

**Restricciones**: sin similitud difusa, sin escritura retroactiva y sin publicación automática

## Verificación constitucional

- Integridad: pasa; usa contenido literal de la referencia y una exclusión explícita de comparaciones.
- Trazabilidad: pasa; la coincidencia queda en `objective_validation`.
- Datos: pasa; no hay migraciones ni contratos nuevos.
- Pruebas y PR: pasa; incluye caso positivo y contraejemplo productivo.

## Archivos

```text
backend/app/modules/calificaciones/orchestrator.py
backend/tests/unit/test_photo_grading_failures.py
specs/073-fragmento-literal-respuesta-abierta/
```

