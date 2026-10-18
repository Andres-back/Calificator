# Alcance metodológico del cuestionario web

La [fundamentación de la elección del LR-CR-01](FUNDAMENTACION_INSTRUMENTO.md) desarrolla las razones, citas académicas, matriz de coherencia y evidencia pendiente. Las referencias sustentan pertinencia y criterios de diseño; no acreditan validación previa ni consulta anterior a la aplicación en papel.

## ¿Cubre lo necesario?

**Es pertinente para un diagnóstico de necesidades y prioridades del grupo docente consultado.** Mantiene las diez secciones del LR-CR-01 en papel y añade trazabilidad de autorización, método del dato temporal y contexto de medición. La versión 3.2-web amplía las preguntas sobre organización y consulta de evidencias y reportes por estudiante; véase [el planteamiento del problema](PLANTEAMIENTO_PROBLEMA.md). No constituye por sí solo una validación psicométrica del instrumento ni el cierre de la evaluación de impacto de la tesis.

| Aspecto | Cobertura | Límite |
|---|---|---|
| Contexto de evaluación | Institución, asignatura, grados, carga docente, modalidad, frecuencia, conectividad y tipos de pregunta | La carga docente no se suma como muestra medida; contextualizar si las respuestas se obtienen durante el piloto |
| Línea base | Seis actividades en minutos; método cronometrado/estimado por actividad; fecha, grupo, entregas, respuestas abiertas, condición y alcance | Una sesión grupal no equivale a cronometrajes individuales; no sumar actividades solapadas; no sustituye protocolo pareado de impacto |
| Dificultades | Ocho ítems de frecuencia o gravedad | Describir distribución y omisiones; no llamar “escala validada” sin evaluación correspondiente |
| Requisitos funcionales | Diecisiete prioridades y hasta cinco funciones de mayor impacto | Varias preferencias pueden diferir según contexto; no inventar consenso |
| Gestión de evidencia y seguimiento | Medios de conservación, dificultad de búsqueda, consulta de criterios y necesidad de informes | No presupone dificultad; la consulta y los reportes requieren verificación posterior en el programa |
| Flujo y retroalimentación | Revisión, confirmación, ilegibilidad, orden de revisión, tipo de comentario y criterio docente | Preferencia no equivale a calidad empírica de una retroalimentación producida |
| Calidad y confianza | Latencia esperada, progresividad, recuperación de fallos, justificación y seis afirmaciones | Latencia aceptable no es latencia medida; intención de uso no es satisfacción posterior |
| Necesidades no previstas | Cinco preguntas abiertas y observación adicional | Categorizar respuestas reales, preservando anonimato en citas y publicaciones |
| Participación posterior | Intención de uso, primera función a probar y permiso para contacto posterior | No equivale a participación efectiva ni autoriza automáticamente otros procedimientos |
| Consentimiento y evidencia | Información, dos aceptaciones expresas, firma dibujada opcional o nombre, versiones y copia | No acredita aprobación ética institucional, validación del cuestionario ni autenticación certificada del firmante |

Para evaluar la tesis siguen siendo necesarios: comparación manual/asistida con tareas y unidades comparables; recuento de evaluaciones completas y respuestas abiertas según la propuesta; parejas de notas con referencia docente independiente y concordancia; satisfacción/usabilidad después del uso; valoración de calidad de la retroalimentación. El cuestionario tampoco acredita automáticamente las entrevistas semiestructuradas previstas: describa la técnica que efectivamente se aplicó.

## Versiones y equivalencia

El papel permanece como **LR-CR-01 v3.0**. La primera adaptación fue **3.1-web**; la versión actual es **LR-CR-01 3.2-web**, con consentimiento **CI-NEC-01-v1-2026-10-18**. Se conserva 3.1-web en `versions/3.1-web/`. No se modifica la fecha ni la respuesta de ningún original. Las nuevas respuestas tendrán su fecha de recepción real. No presentar respuestas posteriores como un diagnóstico previo al desarrollo.

Se mantienen enunciados centrales, orden y anclajes de dificultades, prioridades y confianza. Cambios explícitos:

- Selección única en ítems que piden una opción, con alternativas de omisión; en 6.1 y 10.2 se aclara que se elige una opción principal. Los tipos de evidencia de 1.6 siguen siendo de selección múltiple.
- Se distinguen N/A, preferencia de no responder, omisión y cero. Las opiniones son voluntarias; la revisión final muestra omisiones.
- Cada tiempo informa si fue cronometrado o estimado. “No realizo” conserva un estado, sin imputar cero. Una actividad medida exige fecha, grupo, entregas, condición y alcance; no se obliga a fabricar el dato de respuestas abiertas si se desconoce.
- Si abiertas supera todas las entregas se pide explicación de alcance o sesión distinta; no se fuerza el dato a ser menor.
- Nombre e institución vinculan la autorización. Contactos son opcionales; no se pide cédula ni información de estudiantes.
- Se registra exposición previa a XCalificator (sin uso, demostración o evaluaciones reales) para distinguir opiniones previas y durante el piloto; no se presume que toda respuesta sea anterior al uso.
- El ítem 10.3 solicita contacto para una invitación posterior, en lugar de tomar esa intención como consentimiento completo para nuevas mediciones.
- El consentimiento se separa de las respuestas; su aceptación es previa al envío y puede rechazarse sin guardar respuestas. El dibujo estático tiene autorización específica y alternativa accesible con nombre y aceptación.

Las diferencias impiden afirmar equivalencia automática de modalidad o resultados. Analice papel y web con su versión y fecha; si el mismo docente responde de nuevo, no lo cuente como una nueva persona. Una nueva aplicación puede ser ampliación o seguimiento, según el diseño documentado. Antes de circulación general, compruebe comprensión con docentes y documente cualquier ajuste de contenido; no se afirma que esa revisión ya se realizó.

## Diccionario de datos y análisis

`public/schema.json` contiene enunciados y códigos de alternativas. El CSV usa formato largo: una fila por código de envío y campo, con enunciado, valor original, respuesta textual y estado. El código de envío identifica la aplicación, no demuestra identidad o unicidad de docente. La constancia completa queda bajo acceso privado.

| Campo | Correspondencia |
|---|---|
| `context.institution`, `area`, `grades`, `workload_*` | Contexto y carga declarados en cabecera |
| `context.exposure` | Uso previo de XCalificator, agregado en la adaptación web |
| `context.evidence.*` | Conservación, recuperación, criterios y necesidad de reportes; agregado en 3.2-web |
| `context.1.1` a `context.1.6` | Caracterización; 1.6 es lista de códigos |
| `time.1` a `time.6` | Filas de sección 2; `minutes`, `method`, `note` |
| `measurement.*` | Contexto adicional de la sesión |
| `context.3.1` a `.3.8` | D1-D8 de dificultades |
| `context.4.1` a `.4.17` | P1-P15 originales; P16 (historial) y P17 (reportes) agregados en 3.2-web; estos códigos son identificadores web |
| `context.4.top1` a `.top5` | Lista narrativa del ítem 4.1 original |
| `context.5.*`, `6.*`, `7.*` | Flujo, retroalimentación y operación |
| `context.8.1` a `.8.6` | A1-A6 de confianza |
| `context.9.*`, `10.*`, `observations` | Abiertas, disposición y observación |

Las escalas guardan `1` a `5`; `na` = no aplica; `skip` = declinada; `null` o vacío = sin respuesta. Las alternativas categóricas se numeran por orden de aparición, no por acuerdo o favorabilidad. No promediar sus códigos como una escala. Los tiempos son números reales en minutos; el método es `measured`, `estimated`, `not_performed` o `unknown`. El diccionario de opciones se conserva en el repositorio; cambiarlo requiere nueva versión del instrumento.

Reporte siempre denominadores efectivos por ítem, omisiones y N/A. Describa tiempos por condición y unidad; no mezcle estimaciones con cronometrajes como si tuvieran la misma procedencia. No calcular ahorro desde intenciones ni inferir número de entregas de la carga docente. La exportación elimina campos directos de identidad y firma, pero los textos y combinaciones de contexto deben revisarse antes de publicación.

## Consentimiento y constancia electrónica

La autorización informa finalidad, responsables, datos, derechos y conservación, y se conserva con el contenido aceptado para consulta posterior. Ese diseño toma como referencia los artículos 9 y 12 de la [Ley 1581 de 2012, texto oficial](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=49981). El plazo se expresa por los procesos de validación y eventual publicación indicados por el autor; los responsables deben ejecutar y documentar su cierre y supresión.

Se denomina constancia electrónica con firma dibujada opcional, sin prometer firma digital certificada ni identidad verificada. La regulación exige que el método sea apropiado y confiable para el fin; el dibujo aislado no permite afirmar que esos requisitos se cumplan automáticamente. Véase el [Decreto 2364 de 2012, texto y notas oficiales de compilación en el Decreto 1074 de 2015](https://normograma.dian.gov.co/dian/compilacion/docs/decreto_2364_2012.htm). La huella SHA-256 vincula contenido y facilita comparación, pero no es prueba independiente de autoría o de fecha. La aplicación no envía código de verificación al correo ni verifica un documento de identidad.
