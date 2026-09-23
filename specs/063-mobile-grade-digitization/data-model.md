# Modelo de datos

No hay cambios de esquema.

## Datos existentes utilizados

- `Materia.estudiantes`: fuente del selector buscable del cargador.
- `Evaluacion.preguntas`: enunciados normalizados que se usan para verificar claves deterministas.
- `Evaluacion.respuestas_esperadas`: clave propuesta y corregida antes de crear el borrador.
- `Evaluacion.reglas_feedback.advertencias`: trazabilidad visible de correcciones o ambigüedades.

## Invariantes

1. Una respuesta manuscrita del estudiante no forma parte del enunciado persistido.
2. Una operación aritmética determinista tiene una clave coherente con su enunciado persistido.
3. Toda corrección automática de clave queda advertida para revisión humana.
4. Ningún registro histórico cambia por la instalación del hotfix.
