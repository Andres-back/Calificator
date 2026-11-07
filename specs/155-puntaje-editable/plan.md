# Plan: El docente puede escribir el puntaje de una pregunta al revisar

**Spec**: [spec.md](spec.md) | **Issue**: [#327](https://github.com/Andres-back/Calificator/issues/327)

## Diagnóstico

- `GenerationWizard.tsx` marca el puntaje `readOnly` siempre que existe `onRepartition`, es decir, en toda evaluación guardada. Viene de la Spec 137. Un campo de solo lectura no abre el teclado.
- `createBlankQuestion` crea la pregunta con 1 punto, así que la suma puede superar la nota máxima.
- "Repartir puntos" rechaza abrirse con cambios sin guardar.
- `update_evaluation` valida la suma al guardar una evaluación que no es borrador. Con la suma incorrecta no se puede guardar ni repartir: el bloqueo es total.
- En un borrador sí se puede guardar y luego repartir, pero nada lo indica.
- Producción, en solo lectura (2026-11-06): entre las 30 digitalizaciones más recientes, 2 borradores no suman la nota máxima (6.00 y 4.5 sobre 5).

## Decisión

- **Saber si hay entregas**: `tiene_entregas` en `GET /evaluaciones/{id}/reparto`, calculado con `EXISTS` sobre `entregas`. Es la lectura que ya exige permisos de edición: no pesa en los listados ni llega a estudiantes.
- **Campo**: un `ScoreInput` de texto con `inputMode="decimal"`, que conserva lo escrito y acepta coma. `type="number"` no sirve porque descarta la coma en varios navegadores móviles.
- **Editable** si la evaluación es nueva, o si el reparto responde `tiene_entregas: false`. Ante error o carga, solo lectura.
- **Suma**: se muestra junto al puntaje. El ajuste es una función pura, `adjustOtherScores`, en unidades de 0.01, con reparto proporcional y el residuo distribuido para que la suma sea exacta.
- **Reparto por secciones**: el campo sigue de solo lectura y sin ajuste, porque ese editor tiene su propia confirmación.

Descartado:

- Quitar el bloqueo para todos: permitiría cambiar pesos de evaluaciones con notas sin la vista previa de la Spec 137.
- `tiene_entregas` en `EvaluacionRead`: añade una consulta por evaluación en los listados y la expondría a más lecturas.
- Guardar automáticamente antes de repartir: el docente perdería el control de sus cambios.
- Relajar la validación de suma al guardar evaluaciones publicadas: una evaluación visible quedaría con una suma incorrecta.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/evaluaciones/score_service.py` y su esquema | `tiene_entregas` en la lectura del reparto |
| `frontend/src/modules/evaluaciones/scoreApi.ts` | el nuevo campo |
| `frontend/src/modules/evaluaciones/components/generationWizardModel.ts` | `adjustOtherScores`, suma y diferencia |
| `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` | `ScoreInput`, consulta, suma y mensajes |
| Pruebas | backend, Vitest y E2E a 360 px con teclado numérico |

Sin migraciones, sin llamadas a IA y sin cambios en datos de producción.

## Riesgos

- El bloqueo en el navegador no es una regla del servidor: es la misma situación de hoy. El servidor mantiene sus protecciones.
- Una consulta adicional al abrir el editor de una evaluación guardada. Si falla, se conserva el comportamiento actual.
- El teclado físico solo se confirma en un celular real. La prueba E2E comprueba el atributo y que el campo se puede editar.
