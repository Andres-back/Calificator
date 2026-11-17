# Plan: Xali docente conoce los datos de la materia seleccionada

**Spec**: [spec.md](spec.md) | **Issue**: [#419](https://github.com/Andres-back/Calificator/issues/419)

## Decisión

- **Nuevo módulo** `backend/app/modules/xali/teacher_insights.py`:
  - `build_subject_panorama(db, materia, teacher)`: siete consultas de solo lectura acotadas a la materia (estudiantes activos, evaluaciones, calificaciones, componentes del desglose activo, asistencia, días de asistencia y recursos) y armado del texto.
  - `SubjectPanorama`: texto para el modelo, tabla código → nombre y tres operaciones: `restore_names`, `hide_names` y `mentions`.
  - `PANORAMA_RULES`: reglas de uso de los datos.
  - `teacher_subject_names`: materias del docente para la conversación general.
- **`service.chat`**: recibe al docente, arma el panorama dentro de un punto de guardado (si falla, sigue sin datos), oculta nombres en el historial, añade el panorama y las reglas a la instrucción, pega la nota de mención a la consulta y restaura los nombres en la respuesta.
- **`teacher_context.sources_note`**: variante cuando la respuesta usó datos de la materia.
- **Frontend** `XaliPage.tsx`: sugerencias de preguntas sobre los datos y texto de bienvenida según haya o no materia.

## Privacidad

A la IA le llegan: nombre de pila del docente, nombre de la materia, títulos de evaluaciones y recursos, enunciados de preguntas, notas y asistencia por código. No le llegan nombres, correos ni identificadores de estudiantes. Si el docente escribe un nombre en su mensaje, ese texto viaja tal como lo escribió.

## Por qué no herramientas de consulta para el modelo

Un panorama fijo es predecible, barato (unos 5.000 caracteres) y no depende de que el modelo económico sepa encadenar consultas. Si más adelante se necesitan preguntas más finas, se puede ampliar.

## Costo

Cada mensaje añade entre 1.000 y 1.500 tokens de entrada al modelo económico de Xali.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/xali/teacher_insights.py` | nuevo |
| `backend/app/modules/xali/service.py`, `router.py`, `teacher_context.py` | uso del panorama |
| `backend/tests/unit/test_xali_teacher_insights.py` | pruebas (nuevo) |
| `frontend/src/modules/xali/XaliPage.tsx` | sugerencias y bienvenida |
| `frontend/src/modules/xali/XaliPage.subject.test.tsx` | pruebas (nuevo) |
