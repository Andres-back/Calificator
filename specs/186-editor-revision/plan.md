# Plan: Editor de respuestas y puntajes claro y fácil de usar

**Spec**: [spec.md](spec.md) | **Issue**: [#392](https://github.com/Andres-back/Calificator/issues/392)

## Decisión

Solo frontend; el guardado, el contrato y el historial no cambian.

- `GradeComponentEditor.tsx`:
  - **Pasos numerados.** Los estados son un `radiogroup` de cuatro botones (Correcta, Parcial, Incorrecta, Sin respuesta) con icono y color, en dos columnas y con flechas.
  - **Puntos.** «Parcial» propone la mitad redondeada a dos decimales y bloquea guardar con 0 o el máximo.
  - **Vista previa.** La nota sale antes → después, en verde o rojo, y los puntos van debajo en pequeño.
  - **Acciones.** «Redactar de nuevo con IA» en un solo renglón. La barra de acciones es `sticky` al pie con Cancelar, Guardar y la principal (`nextQuestionAction`, o «Guardar y siguiente alumno» en la última).
  - **Al abrir.** El editor hace `scrollIntoView` y pone el foco en el estado.
- `CalificacionesWorkspace.tsx`:
  - `nextComponentAction` da el texto de la acción principal («Guardar e ir a la pregunta N» o «…al siguiente criterio»).
  - La barra inferior se oculta mientras hay una pregunta en edición.
  - «Ver evidencia completa» pasa a ser un botón con icono.
- `gradeQuestionLayout.css`: con la hoja al lado, la columna de evidencia es `sticky`.

Descartado:

- **Plegar el motivo interno**: las pruebas y los docentes lo usan; queda visible y opcional.
- **Quitar «Guardar y siguiente alumno»**: pasa a ser la acción principal en la última pregunta.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/components/GradeComponentEditor.tsx` | editor por pasos |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | acción siguiente, barra y botón de evidencia |
| `frontend/src/modules/calificaciones/components/gradeQuestionLayout.css` | hoja fija |
| `frontend/src/modules/calificaciones/components/GradeComponentEditor.test.tsx`, `frontend/e2e/explainable-grading.spec.ts` | pruebas |

## Riesgos

- «Guardar y recalcular» pasa a llamarse «Guardar»; se actualizaron las pruebas que lo usaban.
