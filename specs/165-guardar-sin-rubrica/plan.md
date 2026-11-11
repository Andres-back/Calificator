# Plan: Guardar al reabrir una evaluación generada sin rúbrica

**Spec**: [spec.md](spec.md) | **Issue**: [#349](https://github.com/Andres-back/Calificator/issues/349) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

Reproducido en local sobre `4c83bb6` el 2026-11-10, con una evaluación generada sin rúbrica:

- El backend crea los criterios sin `peso_porcentaje` cuando `usar_rubrica` es falso (`generation_service._criteria_payload`).
- Al recibir el borrador, el asistente pasa los criterios por `normalizeRubricCriteria`, que añade `peso_porcentaje: 0` (`generationWizardModel.ts`).
- Al guardar con la rúbrica apagada, `GenerationWizard.evaluationPayload` envía esos criterios tal cual, con el peso en cero.
- Al reabrir, `evaluationToWizardState` enciende la rúbrica si algún criterio tiene `peso_porcentaje != null`. El cero cuenta.
- Con la rúbrica encendida, `validateStep(5)` llama a `validateRubricCriteria`, que exige pesos mayores que cero. El botón «Guardar cambios» se deshabilita con cualquier error de validación.

## Decisión

Solo frontend, en el modelo del asistente.

- `evaluationToWizardState`: la rúbrica se enciende si algún criterio tiene un peso numérico mayor que cero o niveles con contenido.
- `evaluationPayload`: con la rúbrica apagada, los criterios se envían sin `peso_porcentaje` ni `puntaje_maximo`. Una función pequeña del modelo, `criteriaWithoutRubric`, hace esa limpieza para poder probarla.

Descartado:

- **Dejar de añadir el cero en `normalizeRubricCriteria`**: el editor de rúbrica necesita un número en cada criterio para sumar y repartir pesos.
- **Limpiar los pesos en cero de las evaluaciones guardadas**: toca datos de producción y no hace falta, porque la lectura ya los ignora.
- **Cambiar el backend para rechazar pesos en cero**: rompería el guardado de las evaluaciones que ya los tienen.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/evaluaciones/components/generationWizardModel.ts` | detección de la rúbrica y limpieza de criterios sin rúbrica |
| `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` | usar la limpieza al guardar con la rúbrica apagada |
| `frontend/src/modules/evaluaciones/components/generationWizardModel.test.ts` | pruebas de regresión |
| `frontend/src/modules/evaluaciones/components/GenerationWizard.test.tsx` | prueba de reabrir y guardar |

Sin backend, sin migraciones y sin cambios de datos.

## Riesgos

- Una evaluación con rúbrica cuyos pesos sean todos cero y sin niveles se abrirá con la rúbrica apagada. Ese estado no se puede guardar hoy desde la aplicación, porque la validación lo impide.
- Con la rúbrica apagada se dejan de enviar pesos que antes se enviaban en cero. El backend no los usa cuando no hay rúbrica.
