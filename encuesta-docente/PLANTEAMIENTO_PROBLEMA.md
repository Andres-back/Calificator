# Problema que busca documentar el diagnóstico

Actualización: 18 de octubre de 2026. Alcance: necesidades docentes de calificación y gestión de evidencias, aunque el docente no participe en el piloto ni haya utilizado XCalificator.

Versión actual **4.0-web-breve**: 19 preguntas, tiempos manuales por rangos declarados y una invitación opcional a demo/piloto. El tiempo exacto y su comparación con la herramienta se registran en otro instrumento. El consentimiento es v3; la versión ampliada y sus documentos se conservan en `versions/3.3-web/`.

## Formulación del problema y respuesta propuesta

El problema investigativo integra dos procesos relacionados: calificar evaluaciones y gestionar su evidencia a lo largo del tiempo. No basta con tener una nota registrada: el docente puede necesitar recuperar la evaluación que la respalda, consultar los criterios utilizados y reunir resultados de varias aplicaciones para hacer seguimiento a un estudiante. Se busca establecer si, en el grupo consultado, esas actividades generan dificultades y qué apoyo consideran pertinente.

La solución propuesta por XCalificator articula conservación y consulta de evidencia, apoyo a la calificación mediante criterios o rúbricas configurados por el docente, revisión de las sugerencias y reportes de seguimiento. Esta es la respuesta tecnológica que se pretende contrastar. La existencia de una función en el programa no demuestra automáticamente reducción de tiempo, organización efectiva, mejor seguimiento ni adecuación de las notas sugeridas.

## Cadena de evidencia

| Aspecto del problema | Información del cuestionario | Respuesta tecnológica que se contrasta | Comprobación posterior necesaria |
|---|---|---|---|
| Tiempo dedicado a calificar y retroalimentar | Preguntas 7–10: rango manual y procedencia declarada; frecuencias de carga y retroalimentación | Apoyo a la revisión y sugerencia de notas y comentarios | Comparación de sesiones manuales y asistidas con tareas y unidades comparables |
| Organización de evaluaciones físicas | Preguntas 12–13: `evidence.storage` y `evidence.organization` | Archivo vinculado a evaluación y estudiante | Comprobar asociación correcta, acceso autorizado y uso real; una fotografía cargada no basta |
| Recuperación de una evaluación anterior | `evidence.retrieval` | Consulta del historial y apertura de evidencia (necesidad de apoyo en pregunta 17) | Tarea de búsqueda con éxito/fracaso y, si se quiere afirmar ahorro de búsqueda, medición específica de su tiempo |
| Relación entre nota y criterios | Preguntas 11 y 15: uso y consulta de criterios | Criterios configurados por el docente y explicación de sugerencias | Trazabilidad y concordancia con referencia docente independiente; la utilidad percibida no demuestra exactitud |
| Seguimiento por estudiante | Preguntas 16–17: `evidence.reporting` y apoyo en reportes | Reportes con resultados y referencias a evidencia | Verificar correspondencia y completitud del reporte con los registros del estudiante |
| Necesidad de apoyo tecnológico e invitación | Pregunta 17 de necesidades y pregunta 19 de invitación opcional | Herramienta que mantiene posibilidad de revisión y modificación docente | Aceptación y satisfacción después del uso en otro instrumento; el interés en una invitación no es satisfacción |

## Texto para abrir el planteamiento, antes de completar el diagnóstico

> La evaluación escolar comprende tanto la revisión y calificación de las respuestas como la conservación de las evidencias que sustentan las notas. Cuando estos procesos se realizan mediante documentos físicos y registros separados, resulta pertinente examinar el tiempo dedicado a la calificación, las dificultades para recuperar evaluaciones anteriores y la disponibilidad de información para el seguimiento por estudiante. Este proyecto indaga dichas necesidades entre los docentes consultados y propone XCalificator como una herramienta de apoyo a la gestión de evidencias y a la calificación. La plataforma contempla sugerencias de notas basadas en la evaluación y en los criterios o rúbricas configurados por el docente, con posibilidad de revisión y modificación, así como consulta de evidencias y reportes por estudiante. La investigación busca establecer el alcance de ese apoyo mediante el diagnóstico y la evaluación del piloto.

Esta formulación presenta el problema que se estudia sin afirmar de antemano que todos los profesores lo experimentan o que ya se resolvió. No debe convertirse en «después de detectar se desarrolló» si las respuestas son posteriores al desarrollo. En ese caso, el diagnóstico documenta y contrasta necesidades durante la etapa en que efectivamente se realizó.

## Cómo redactar después de analizar respuestas

Utilizar número de docentes y denominador de cada pregunta; distinguir omisiones, N/A, colegio y área; no se recoge exposición previa en esta versión. Ejemplos de estructura, sin cifras inventadas:

- «Entre quienes necesitaron buscar una evaluación física, … docentes de … reportaron dificultad moderada, mucha dificultad o no haber logrado localizarla».
- «… docentes de … declararon dedicar entre … y … minutos a la última evaluación manual de un grupo; … basaron su respuesta en una estimación de memoria». No presentar ese intervalo como tiempo exacto verificado.
- «… docentes indicaron necesitar apoyo para organizar evidencias y … para preparar informes; el denominador efectivo fue …».

No completar esas expresiones hasta contar con los datos. La proporción que manifiesta una necesidad no es el porcentaje de mejora atribuible al programa. Tampoco una encuesta durante el piloto demuestra que el diagnóstico precedió al desarrollo.

## Cambios del cuestionario

La versión breve sustituye la lista técnica ampliada por cuatro bloques de diagnóstico. El [alcance metodológico](METODOLOGIA.md) detalla la correspondencia de las 19 preguntas y las limitaciones de comparación entre versiones. Los registros antiguos conservan sus enunciados, consentimientos y fechas originales.

## Fundamento y límites

La articulación entre necesidades declaradas y requisitos se fundamenta en las fuentes de ingeniería y diseño de cuestionarios recogidas en [la fundamentación metodológica](FUNDAMENTACION_INSTRUMENTO.md). Esa literatura respalda preguntar y analizar necesidades; no prueba que los docentes de esta investigación tengan el problema. La magnitud del problema debe sustentarse con sus respuestas y registros. El desempeño de XCalificator se sustenta separadamente con su verificación técnica y resultados del piloto.
