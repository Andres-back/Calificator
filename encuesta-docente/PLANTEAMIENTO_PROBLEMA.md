# Problema que busca documentar el diagnóstico

Actualización: 18 de octubre de 2026. Alcance: necesidades docentes de calificación y gestión de evidencias, aunque el docente no participe en el piloto ni haya utilizado XCalificator.

## Formulación del problema y respuesta propuesta

El problema investigativo integra dos procesos relacionados: calificar evaluaciones y gestionar su evidencia a lo largo del tiempo. No basta con tener una nota registrada: el docente puede necesitar recuperar la evaluación que la respalda, consultar los criterios utilizados y reunir resultados de varias aplicaciones para hacer seguimiento a un estudiante. Se busca establecer si, en el grupo consultado, esas actividades generan dificultades y qué apoyo consideran pertinente.

La solución propuesta por XCalificator articula conservación y consulta de evidencia, apoyo a la calificación mediante criterios o rúbricas configurados por el docente, revisión de las sugerencias y reportes de seguimiento. Esta es la respuesta tecnológica que se pretende contrastar. La existencia de una función en el programa no demuestra automáticamente reducción de tiempo, organización efectiva, mejor seguimiento ni adecuación de las notas sugeridas.

## Cadena de evidencia

| Aspecto del problema | Información del cuestionario | Respuesta tecnológica que se contrasta | Comprobación posterior necesaria |
|---|---|---|---|
| Tiempo dedicado a calificar y retroalimentar | Sección 2 y dificultades de sección 3; distinguir tiempos cronometrados de estimados | Apoyo a la revisión y sugerencia de notas y comentarios | Comparación de sesiones manuales y asistidas con tareas y unidades comparables |
| Organización de evaluaciones físicas | D7 y `evidence.storage` | Archivo vinculado a evaluación y estudiante | Comprobar asociación correcta, acceso autorizado y uso real; una fotografía cargada no basta |
| Recuperación de una evaluación anterior | `evidence.retrieval` | Consulta del historial y apertura de evidencia (`4.16`) | Tarea de búsqueda con éxito/fracaso y, si se quiere afirmar ahorro de búsqueda, medición específica de su tiempo |
| Relación entre nota y criterios | `evidence.traceability`, prioridades sobre rúbrica, evidencia y revisión | Criterios configurados por el docente y explicación de sugerencias | Trazabilidad y concordancia con referencia docente independiente; la utilidad percibida no demuestra exactitud |
| Seguimiento por estudiante | `evidence.reporting` y prioridad de reporte (`4.17`) | Reportes con resultados y referencias a evidencia | Verificar correspondencia y completitud del reporte con los registros del estudiante |
| Disposición a utilizar apoyo tecnológico | Prioridades, flujo esperado e intención de uso | Herramienta que mantiene posibilidad de revisión y modificación docente | Aceptación y satisfacción después del uso; las preferencias de no usuarios no son satisfacción |

## Texto para abrir el planteamiento, antes de completar el diagnóstico

> La evaluación escolar comprende tanto la revisión y calificación de las respuestas como la conservación de las evidencias que sustentan las notas. Cuando estos procesos se realizan mediante documentos físicos y registros separados, resulta pertinente examinar el tiempo dedicado a la calificación, las dificultades para recuperar evaluaciones anteriores y la disponibilidad de información para el seguimiento por estudiante. Este proyecto indaga dichas necesidades entre los docentes consultados y propone XCalificator como una herramienta de apoyo a la gestión de evidencias y a la calificación. La plataforma contempla sugerencias de notas basadas en la evaluación y en los criterios o rúbricas configurados por el docente, con posibilidad de revisión y modificación, así como consulta de evidencias y reportes por estudiante. La investigación busca establecer el alcance de ese apoyo mediante el diagnóstico y la evaluación del piloto.

Esta formulación presenta el problema que se estudia sin afirmar de antemano que todos los profesores lo experimentan o que ya se resolvió. No debe convertirse en «después de detectar se desarrolló» si las respuestas son posteriores al desarrollo. En ese caso, el diagnóstico documenta y contrasta necesidades durante la etapa en que efectivamente se realizó.

## Cómo redactar después de analizar respuestas

Utilizar número de docentes y denominador de cada pregunta; distinguir omisiones, N/A, colegio, área y experiencia previa con XCalificator. Ejemplos de estructura, sin cifras inventadas:

- «Entre quienes necesitaron buscar una evaluación física, … docentes de … reportaron dificultad moderada, mucha dificultad o no haber logrado localizarla».
- «En las sesiones manuales cronometradas disponibles, el tiempo de revisión fue …; se excluyeron de ese cálculo las estimaciones y los registros con alcance no aclarado».
- «La consulta del historial recibió … y los reportes por estudiante …, con … respuestas no aplicables u omitidas».

No completar esas expresiones hasta contar con los datos. La proporción que manifiesta una necesidad no es el porcentaje de mejora atribuible al programa. Tampoco una encuesta durante el piloto demuestra que el diagnóstico precedió al desarrollo.

## Cambios del cuestionario

La versión **3.2-web** agrega cinco campos de práctica documental (`evidence.storage`, `.other`, `.retrieval`, `.traceability`, `.reporting`) y dos prioridades (`4.16` y `4.17`). El período de referencia de las nuevas preguntas es las últimas cuatro semanas de actividad docente. No se alteran las respuestas en papel ni las ya guardadas con versiones anteriores. Se conserva la configuración de 3.1-web en `versions/3.1-web/`; cada respuesta guardada conserva su propio esquema y consentimiento.

Los cinco campos documentales y las dos prioridades son elaboraciones específicas del proyecto, no ítems tomados de una escala validada. Deben pasar la comprobación de comprensión y revisión de contenido descritas en [FUNDAMENTACION_INSTRUMENTO.md](FUNDAMENTACION_INSTRUMENTO.md). Se mantiene la finalidad de diagnóstico del consentimiento: no se agregan datos de estudiantes ni un nuevo procedimiento de investigación en el participante.

## Fundamento y límites

La articulación entre necesidades declaradas y requisitos se fundamenta en las fuentes de ingeniería y diseño de cuestionarios recogidas en [la fundamentación metodológica](FUNDAMENTACION_INSTRUMENTO.md). Esa literatura respalda preguntar y analizar necesidades; no prueba que los docentes de esta investigación tengan el problema. La magnitud del problema debe sustentarse con sus respuestas y registros. El desempeño de XCalificator se sustenta separadamente con su verificación técnica y resultados del piloto.
