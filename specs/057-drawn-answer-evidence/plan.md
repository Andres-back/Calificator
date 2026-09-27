# Plan: conservar respuestas dibujadas al calificar

**Rama**: `codex/057-drawn-answer-evidence` | **Fecha**: 2026-09-21 | **Spec**: [spec.md](spec.md) | **Issue**: [#113](https://github.com/Andres-back/Calificator/issues/113)

## Resumen

El extractor visual identificará por separado la descripción del trazado hecho por el estudiante. El texto normalizado enviado a la valoración incluirá esa evidencia con número de pregunta y página. Ante una pregunta gráfica sin descripción fiable, la extracción señalará incertidumbre y el docente mantendrá la decisión final.

## Contexto técnico

**Lenguaje/versiones**: Python 3.12; sin cambio frontend.
**Dependencias**: Pydantic y proveedores visuales existentes; ninguna nueva.
**Persistencia**: JSON de evidencia existente; sin migración ni nueva tabla.
**Pruebas**: pytest de extractor y orquestador, Ruff, suite backend y ensayo real autorizado.
**Plataforma**: worker Linux en VPS.
**Rendimiento**: una sola llamada visual en el camino normal, sin aumentar el número de modelos.

## Verificación de la constitución

- Roles y permisos: no cambian rutas ni autorizaciones.
- Integridad y trazabilidad: el dibujo se vincula a pregunta y página; la IA solo propone y la revisión humana persiste.
- Asincronía e idempotencia: no se altera la cola ni la cantidad de entregas/calificaciones.
- Datos y secretos: sin migración ni credenciales en artefactos.
- Accesibilidad: conserva las vistas existentes de revisión.
- Gobernanza: issue #113 aprobado, spec, prueba de regresión, PR y CI.

**Gate previo y posterior**: conforme, sin excepciones.

## Estructura y decisiones

- `backend/app/services/vision_extractor.py`: esquema opcional, instrucción visual, normalización y contexto legible.
- `backend/app/modules/calificaciones/orchestrator.py` y `agents.py`: aviso y resguardo al consumir evidencia gráfica incierta.
- `backend/app/modules/calificaciones/breakdown_policy.py` y `breakdown_service.py`: componente no evaluable en lugar de cero no verificado.
- `backend/tests/unit/test_vision_extractor.py`, `test_photo_grading_failures.py` y `test_grading_component_consensus.py`: regresiones.
- `specs/057-drawn-answer-evidence/`: documentación y validación.

Se preserva el contrato público; los campos nuevos quedan dentro de la evidencia JSON existente. El extractor no decide si el dibujo es correcto. Un dibujo de ejemplo impreso no cuenta como respuesta. Ver [research.md](research.md), [data-model.md](data-model.md) y [quickstart.md](quickstart.md).
