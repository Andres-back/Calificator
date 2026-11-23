# Plan: Marcar varias preguntas como correctas o incorrectas a la vez

**Spec**: [spec.md](spec.md) | **Issue**: [#452](https://github.com/Andres-back/Calificator/issues/452)

## Decisión

Casi todo es frontend: el servidor ya acepta la lista de cambios. Sin migraciones ni IA.

- `components/bulkQuestionMark.ts`: lógica sin pantalla. `bulkMarkChanges` arma los cambios (puntaje, estado, motivo y explicación), `bulkMarkPreview` anticipa la nota con la misma fórmula del editor de una pregunta y `canBulkMark` deja fuera lo que no es pregunta.
- `components/BulkMarkPanel.tsx`: panel con dos pasos, elegir y confirmar.
- `components/GradeBreakdown.tsx`: el modo vive aquí porque cambia lo que hacen los números. En el modo, la lista pasa de `<nav>` a un grupo de casillas; al llegar una versión nueva del desglose, el modo se cierra.
- `CalificacionesWorkspace.tsx`: una mutación propia que envía todos los cambios con la versión vigente, refresca las mismas consultas que el ajuste de una pregunta y, ante un 409, trae la versión vigente.
- `backend/.../breakdown_service.py`: al guardar un cambio docente con estado `correcta`, se quita `orientacion_mejora` de la evidencia de esa pregunta en la versión nueva. La versión anterior no se toca.

### Por qué una frase fija y no la IA

El editor de una pregunta pide a la IA la explicación. En un lote serían tantas llamadas como preguntas, con espera y costo, y esa ruta depende de un proveedor externo. Una frase corta y veraz no inventa un motivo; el docente puede abrir después cualquier pregunta y ampliarla.

### Por qué confirmar

Un toque equivocado en un celular cambiaría varias notas. El paso de confirmación muestra las preguntas y la nota resultante. El cambio queda en el historial y se puede corregir.

## Qué no se hace

- No se cambia la API ni su contrato.
- No se añaden estados parciales al lote: necesitan un puntaje por pregunta.
- No se toca la orientación de las preguntas que quedan incorrectas.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/components/bulkQuestionMark.ts` | cambios, nota anticipada y lista de preguntas |
| `frontend/src/modules/calificaciones/components/BulkMarkPanel.tsx` | panel de elegir y confirmar |
| `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx` | modo de selección sobre los números |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | guardado en lote |
| `backend/app/modules/calificaciones/breakdown_service.py` | sin «Para mejorar» en una pregunta que queda correcta |
| pruebas | Vitest, Playwright (flujo y axe) y pytest |

## Riesgo

Bajo. El guardado usa la ruta y las validaciones que ya existen. El único cambio de servidor quita un dato que contradecía el resultado.
