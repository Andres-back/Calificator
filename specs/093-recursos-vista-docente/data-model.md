# Modelo de datos 093

Sin migraciones. No alterar usuarios, matrículas, evidencias, calificaciones ni asistencias guardadas.

## Propuesta de criterio en contenido JSON

Campos compatibles: `id`, `nombre`, `descripcion`, `puntaje_maximo`, `niveles`. Metadatos aditivos propuestos: `preguntas_numeros` (referencias existentes), `evidencia`, `regla_puntuacion` y procedencia en `_xcalificator`. Descripción integra logro, evidencia y regla para consumidores que solo leen los campos actuales. No incluye la solución.

- Criterio simple: logro observable y evidencia solicitada; niveles opcionales.
- Rúbrica: criterios más niveles distinguibles y regla coherente con la escala; conservar niveles/pesos explícitos válidos.
- Preguntas: número, enunciado, tipo, opciones, modalidad y puntaje permanecen independientes.
- Clave: respuestas correctas permanecen en su estructura reservada al docente/evaluador.
- Componentes canónicos: `pregunta:<numero>` y puntajes por pregunta. Los pesos de criterios describen la valoración; no se suman otra vez al resultado.

## Fuentes y precedencia

1. Criterios estructurados editados explícitamente, si son válidos y compatibles con la intención docente.
2. Criterios docentes persistidos en entrada y metadatos; completar la propuesta sin cambiar su significado. La herramienta rúbrica tiene además su entrada `criterios`.
3. Criterios de logro generados específicos del recurso cuando son válidos.
4. Respaldo determinista según familia de actividad, nunca copia del enunciado.

Una discrepancia entre fuentes no autoriza sustituirlas silenciosamente. Pedir corrección. Criterios globales pueden abarcar varias preguntas, sin inventar correspondencias individuales ni una segunda escala.

## Reglas de validación

- Nombres/descripciones no vacíos, logro/evidencia/regla identificables, ausencia de duplicados y de copia literal como único criterio.
- Referencias solo a preguntas existentes; ningún cambio de orden, clave, grilla o puntaje.
- Valores numéricos finitos y positivos. Pesos porcentuales explícitos de rúbrica suman 100; su conversión proporcional conserva la escala actual y redondeo controlado. Puntajes explícitos deben ser coherentes con la nota máxima; no reparar negativos o faltantes silenciosamente.
- Niveles completos y distinguibles si se declara rúbrica; no exigir niveles a un criterio simple.
- No agregar penalizaciones por conducta, rapidez o presentación no solicitadas. No copiar soluciones en criterios públicos.

## Estados

Propuesta nueva → revisión docente → corregir si inválida → conversión válida → evaluación en flujo de revisión/publicación existente. El recurso de apoyo puede usarse sin rúbrica. Errores de propuesta se muestran en el borrador; no disparan regeneración de preguntas.

Material ya vinculado → devolver evaluación existente, sin aplicar las reglas nuevas retrospectivamente. Convertir no duplica vínculo ni cambia notas.

## Modelos de presentación no persistidos

**Bandeja**: carga, error, vacía verificada, reclamos disponibles o inconsistencia contador/lista. `hay_reclamos` se deriva de elementos o contador positivo; no equivale a éxito de consulta. Notas pendientes independientes.

**Fila de asistencia**: alumno, estado, revisión de guardado, observación y apertura visual. La apertura no modifica el estado académico. Borradores, debounce, versiones, reintentos y escritura permanecen propiedad de la cola actual; identidad por alumno y contexto de fecha/materia.
