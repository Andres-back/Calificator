# Plan: arbitraje solo cuando aporta valor

**Rama**: `codex/056-avoid-redundant-arbitration` | **Fecha**: 2026-09-21 | **Spec**: [spec.md](spec.md) | **Issue**: [#111](https://github.com/Andres-back/Calificator/issues/111)

## Resumen

La regla de arbitraje solo devolverá motivo cuando haya diferencia significativa o baja confianza. La consolidación local preservará la solicitud de revisión de ambos evaluadores, sus alertas y la trazabilidad. La etapa final del orquestador seguirá aplicando suma por componentes y estados existentes.

## Contexto técnico

**Lenguajes/versiones**: Python 3.12, sin cambios frontend.
**Dependencias**: ninguna nueva; FastAPI, Celery y clientes actuales.
**Persistencia**: tablas existentes; sin migración.
**Pruebas**: regresión de orquestador y comparador, Ruff, suite backend, CI y ensayo autorizado en producción.
**Plataforma objetivo**: workers Linux en VPS.
**Rendimiento y escala**: eliminar la llamada observada de 15,5 s en el caso coincidente, sin cancelar inferencias aceptadas.

## Verificación de la constitución

- Separación de roles: no se cambian permisos ni rutas.
- Integridad y trazabilidad: se preservan componentes, alertas, revisión humana y registro de estrategia.
- Asincronía e idempotencia: no se altera la cola ni el número de entregas o notas.
- Datos y secretos: sin migraciones, secretos ni contenido sensible en el repositorio.
- Accesibilidad: estados de revisión existentes siguen visibles.
- Gobernanza y pruebas: issue aprobado, spec, regresión, PR y CI obligatorios.

**Gate**: conforme, sin excepciones.

## Estructura del proyecto

- `backend/app/modules/calificaciones/orchestrator.py`: decisión de arbitraje y revisión final.
- `backend/app/modules/calificaciones/agents.py`: consolidación local segura.
- `backend/tests/unit/test_photo_grading_failures.py`: escenarios por regla.
- `backend/tests/unit/test_comparator_feedback.py`: preservación de alertas y revisión.
- `specs/056-avoid-redundant-arbitration/`: intención, plan, tareas y evidencia.
- `specs/README.md`, `tests/spec_governance/test_spec_baseline.py`, `specs/system-inventory/current.json`: trazabilidad.

## Decisiones y complejidad

- Diferencia significativa o confianza baja ameritan una revisión adicional; una mera marca de revisión se deriva al docente.
- El comparador local no puede devolver `requiere_revision_docente=False` si alguno pidió revisión.
- No se cambian fórmulas ni se confirma/publica ninguna nota en pruebas.
- No se usan timeouts menores ni cancelaciones como sustituto de una decisión de flujo.

## Diseño y verificación posterior

La decisión es determinista y usa los umbrales ya configurados. No se agregan API, tablas ni estados. [research.md](research.md), [data-model.md](data-model.md) y [quickstart.md](quickstart.md) detallan las razones y el ensayo reproducible. Todos los principios constitucionales permanecen satisfechos.
