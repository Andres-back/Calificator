# Especificación: conservar la organización de la evaluación al digitalizar

**Rama**: `codex/130-digitalizacion-secciones` | **Creada**: 2026-10-26 | **Estado**: Diseño ampliado aprobado mediante «aprobe»; implementación autorizada tras revisión de requisitos | **Issue**: [#274](https://github.com/Andres-back/Calificator/issues/274)

## Escenarios de usuario y pruebas

### Historia 1 - Digitalizar el documento completo y organizado (Prioridad: P1)

Como docente, necesito que una evaluación dividida en secciones conserve sus títulos, instrucciones, lecturas, actividades y preguntas en el orden del original. Un debate, una recomendación o una lectura sin pregunta no deben desaparecer ni convertirse en puntos adicionales.

**Razón de prioridad**: se comprobó un caso antiguo cuya transcripción conservó seis secciones y una lectura, pero la evaluación quedó como dieciséis preguntas seguidas. El texto reconocido no debe perderse al organizarlo.

**Prueba independiente**: digitalizar una muestra sintética de tres páginas con seis secciones, dos subsecciones, lectura, actividad grupal y numeración reiniciada; guardar, volver a abrir y comparar todos sus contenidos.

**Aceptación**:
1. **Dado** un original legible con secciones y subsecciones, **cuando** se digitaliza, **entonces** el borrador mantiene los títulos, jerarquía, orden y contenidos completos, no solo las preguntas.
2. **Dadas** dos preguntas llamadas «1» en secciones diferentes, **cuando** se organiza la evaluación, **entonces** ambas conservan su ubicación y etiqueta original sin mezclar preguntas, respuestas ni puntajes.
3. **Dada** una lectura o actividad sin respuesta individual, **cuando** se digitaliza, **entonces** aparece donde corresponde sin aumentar la cantidad de preguntas calificables o la nota máxima.
4. **Dada** información incompleta o una asociación dudosa, **cuando** termina el trabajo, **entonces** se identifica lo que debe revisar el docente y se conserva el avance; no se presenta una evaluación incompleta como lista para publicar.

### Historia 2 - Editar, resolver e imprimir la misma evaluación (Prioridad: P1)

Como docente, necesito corregir la organización sin reconstruir todo a mano; como estudiante, necesito consultar el contexto de cada pregunta sin encontrar soluciones privadas.

**Prueba independiente**: editar títulos e instrucciones, cambiar una pregunta de sección, guardar y comprobar reapertura, vista estudiante, impresión y contexto de calificación con datos sintéticos.

**Aceptación**:
1. El editor permite corregir títulos, textos y jerarquía, y mover preguntas conservando sus respuestas y puntajes. Si está activo el reparto por secciones y un movimiento requiere cambiar valores, muestra la propuesta y exige confirmación antes de aplicarla; no elimina contenido ni redistribuye puntos silenciosamente.
2. Desde 360 px y en escritorio, la navegación identifica la sección y pregunta actuales y permite consultar el texto correspondiente sin desbordamiento horizontal.
3. La previsualización, PDF y Word conservan el mismo orden, títulos, subsecciones, lecturas y actividades; un título no queda aislado del contenido siguiente cuando ambos caben en la misma hoja.
4. El estudiante y las ayudas públicas reciben solamente el contenido educativo autorizado. Evaluador y verificadores reciben el mismo contexto educativo de la versión evaluada, además de sus datos privados autorizados.

### Historia 3 - Conservar el historial y recuperar una copia revisable (Prioridad: P1)

Como docente, necesito que esta mejora no cambie evaluaciones ya utilizadas y que una transcripción antigua disponible pueda servir para preparar una copia corregida independiente.

**Prueba independiente**: conservar una evaluación antigua con entregas, generar una copia con organización recuperada y comprobar que el original, sus notas, evidencias y decisiones permanecen idénticos.

**Aceptación**:
1. Las evaluaciones antiguas sin secciones continúan abriéndose y exportándose; no se reescriben mediante la actualización o una consulta.
2. Una evaluación ya utilizada no admite cambios retroactivos incompatibles con su historial. La recuperación prepara un borrador separado, vinculado a su procedencia, sin copiar estudiantes, entregas, notas, enlaces públicos o conversaciones.
3. La recuperación exige confirmar la propuesta antes de guardarla y publicarla; si falta la transcripción, muestra qué archivo necesita el docente en vez de inventar el contenido.
4. Un reintento o fallo parcial conserva el original y no duplica el borrador recuperado. Otro docente o un estudiante no pueden consultar ni recuperar contenido ajeno.

### Historia 4 - Asignar opcionalmente el valor de cada sección (Prioridad: P1)

Como docente, puedo elegir entre conservar los puntajes por pregunta o asignar a las secciones diferentes partes de la nota máxima. Por ejemplo, en una evaluación sobre cinco puntos, la primera sección vale dos, la segunda dos y la tercera uno.

**Razón de prioridad**: la organización del documento también puede representar la importancia que el docente asigna a diferentes habilidades o capítulos; conservar títulos no basta cuando tienen valores distintos.

**Prueba independiente**: activar el reparto 2+2+1 sobre5, revisar los valores de sus preguntas, guardar y comprobar la misma distribución al reabrir, imprimir y calificar. Repetir con la opción desactivada y verificar que no cambian los puntajes originales.

**Aceptación**:
1. La opción «Asignar puntaje por sección» está desactivada por defecto. Sin activarla, las secciones solo organizan el contenido y se conservan los valores por pregunta.
2. Al activarla, el docente asigna puntos a cada grupo calificable; ve total asignado y pendiente. El reparto 2+2+1 es válido sobre5, mientras un reparto incompleto o que excede5 se explica y no se aplica.
3. Antes de aplicar un reparto, el docente ve cuánto vale cada pregunta. La propuesta mantiene la proporción de sus valores anteriores; preguntas de igual valor se reparten por igual salvo el ajuste mínimo necesario de redondeo. Puede ajustar el reparto interno manteniendo el total de la sección.
4. La nota global suma los puntos obtenidos en las preguntas con ese reparto, sin sumar otra vez los subtotales de las secciones. Lecturas, títulos y actividades sin nota no reciben puntos automáticamente. Los cambios se versionan y no afectan notas o entregas anteriores.

### Casos límite

- Sección sin preguntas, lectura entre grupos, instrucciones compartidas, títulos sin número, subsecciones A/B y secciones continuadas en otra página: conservarlos sin exigir una nota.
- Numeración repetida, alfabética o con subapartados: distinguir identidad de pregunta y etiqueta impresa; no usar únicamente el número visible como clave de calificación.
- Sección detectada pero omitida, pregunta sin asociación, texto truncado, figura pendiente o jerarquía inválida: avisar de forma localizada, mantener datos recuperables y exigir corrección antes de declarar la revisión completa.
- Original plano sin secciones: conservar el flujo simple, sin inventar capítulos.
- Contenido demasiado extenso o ilegible: mantener los límites vigentes, explicar el problema y no resumir, recortar o reconstruir por imaginación.
- Cambios concurrentes, sesión vencida o permiso revocado: no sobrescribir contenido ni mostrar resultados privados de otro contexto.
- Documento respondido: no incorporar datos, marcas o respuestas de estudiantes al contenido público o al solucionario.
- Una disposición compacta no puede eliminar títulos, mezclar secciones, quitar preguntas o reducir arbitrariamente el espacio de respuesta.
- Reparto opcional: todas las preguntas calificables deben pertenecer a un único grupo de puntaje; una sección sin preguntas no puede recibir puntos positivos solo por contener una lectura o un debate.
- Padre/subsecciones: el presupuesto de un padre no se suma además al de sus hijos. Se elige el padre como grupo o se desglosa en grupos hijos completos y no solapados; en este último caso el padre es únicamente un subtotal.
- Mover, añadir o eliminar preguntas, cambiar la nota máxima o desactivar el reparto exige mostrar los nuevos valores y confirmarlos. No completar sobrantes, convertirlos en puntos extra ni reescalar todo silenciosamente.
- Un valor demasiado pequeño para repartirse entre sus preguntas con la precisión admitida requiere corrección explícita; no producir preguntas de cero puntos, valores negativos o largas colas de decimales.

## Requisitos

### Requisitos funcionales

- **FR-001**: Conservar secciones y subsecciones del original, con títulos, orden y relación entre ellas.
- **FR-002**: Conservar instrucciones, lecturas, recuadros educativos y actividades sin nota en su posición respecto de las preguntas, sin convertirlos automáticamente en preguntas calificables.
- **FR-003**: Mantener identidad inequívoca, ubicación y etiqueta original de cada pregunta, incluso cuando varios grupos reinicien su numeración; conservar la asociación con su respuesta esperada y puntaje.
- **FR-004**: Comprobar que los elementos educativos detectados estén conservados o señalados para revisión; ninguna omisión conocida puede comunicarse como revisión completa.
- **FR-005**: Permitir editar títulos y contenido, reorganizar secciones y cambiar preguntas de grupo sin perder contenido, respuestas, puntajes ni asociaciones visuales; cualquier redistribución de puntos bajo el modo opcional requiere vista previa y confirmación explícita.
- **FR-006**: Conservar la organización al guardar, reabrir, consultar, copiar entre materias propias y preparar una impresión.
- **FR-007**: Mostrar el mismo contenido educativo organizado en vista docente, vista estudiante, PDF y Word, con permisos vigentes y sin soluciones privadas en las copias públicas.
- **FR-008**: Incluir lecturas e instrucciones aplicables en el contexto de calificación y ayuda sobre la evaluación, respetando la versión de la entrega; no modificar modelos, fórmula de nota ni decisión final docente.
- **FR-009**: No modificar automáticamente evaluaciones existentes, entregas, evidencias, notas, publicaciones o decisiones previas. Una recuperación de evaluación ya utilizada debe producir una copia independiente para revisión.
- **FR-010**: Recuperar contenido únicamente desde una transcripción u original disponibles y con procedencia comprobada; exigir revisión antes de guardar la copia y no afirmar que se conserva un archivo original inexistente.
- **FR-011**: Procesar digitalización y recuperación potencialmente lentas con progreso, estados claros, reintentos de la misma solicitud y conservación del original, sin duplicar evaluaciones.
- **FR-012**: Aplicar permisos en servidor e interfaz a lectura, edición, copia, recuperación y contenido privado; rechazar referencias a preguntas, recursos o transcripciones ajenos.
- **FR-013**: Mantener la edición y consulta utilizables desde 360 px, en escritorio, claro/oscuro y texto ampliado, con mensajes comprensibles, foco visible y controles táctiles accesibles.
- **FR-014**: Mantener compatibilidad con evaluaciones planas y los límites vigentes de archivos, páginas, contexto y gasto; no añadir proveedores ni llamadas automáticas extra para corregir una organización incierta.
- **FR-015**: Impedir que una lectura o instrucción figure como clave privada o que una respuesta manuscrita, una solución docente o datos personales se publiquen como contenido educativo.
- **FR-016**: Conservar trazabilidad de la propuesta, revisión, versión y copia, con errores y resultados parciales explícitos, sin registrar contenido sensible en diagnósticos generales.
- **FR-017**: Ofrecer un reparto opcional de puntajes por sección, desactivado por defecto, donde los grupos calificables asignados sumen exactamente la nota máxima; sin activarlo no cambiar los puntajes por pregunta ni exigir asignaciones a las secciones.
- **FR-018**: Proponer y mostrar el reparto interno de cada sección conservando la proporción de los valores previos —igual reparto para pesos iguales, salvo redondeo— y permitir ajustes del docente. Aplicarlo solo tras confirmación, con valores legibles y suma exacta por sección y evaluación.
- **FR-019**: Exigir que cada pregunta contribuya a un solo presupuesto, sin sumar dos veces padres/hijos o subtotales, y mantener una sola suma global de puntos obtenidos. Títulos, lecturas y actividades no calificables no reciben puntos por tener presupuesto o encabezado.
- **FR-020**: Conservar el reparto confirmado en versiones, copia, reapertura, impresión y contexto de todos los evaluadores. Cambios de pertenencia, preguntas, nota máxima o modo requieren revisión del reparto antes de aplicar; nunca alterar notas ni contextos históricos.

### Entidades clave

- **Documento organizado**: secuencia de secciones, subsecciones, textos educativos y referencias a preguntas o material conservado.
- **Sección**: título, posición, subsecciones y contenidos; puede no tener preguntas ni puntaje.
- **Reparto opcional por secciones**: presupuesto de puntos por grupo calificable y distribución confirmada entre sus preguntas, sin doble conteo de subsecciones.
- **Pregunta**: identidad única, etiqueta original y pertenencia; su respuesta y puntaje permanecen separados del texto educativo público.
- **Cobertura documental**: inventario de elementos detectados, conservados y pendientes con una explicación localizada.
- **Propuesta recuperada**: organización revisable procedente de un trabajo u original concreto, todavía sin efecto sobre la evaluación histórica.
- **Copia editorial**: borrador independiente con su procedencia, contenido y versiones; nunca hereda datos académicos de estudiantes.

## Criterios de éxito

- **SC-001**: Las muestras de aceptación conservan el 100 % de sus secciones, títulos, instrucciones, lecturas, actividades y preguntas al guardar, reabrir y exportar; el ejemplo principal mantiene seis secciones, dos subsecciones y dieciséis preguntas calificables.
- **SC-002**: En muestras con numeración reiniciada, el 100 % de las preguntas mantiene su respuesta y puntaje correctos, con cero asociaciones ambiguas o puntos añadidos por títulos o actividades sin nota.
- **SC-003**: Todas las omisiones y asociaciones inválidas introducidas en las pruebas producen una revisión localizada; ninguna permite declarar la evaluación completa o publicar sin resolverla.
- **SC-004**: Las pruebas de recuperación, edición y copia producen cero cambios en evaluaciones históricas, notas, decisiones, evidencias y enlaces existentes, y cero accesos cruzados.
- **SC-005**: Los recorridos de revisión, edición y consulta pueden completarse a 360/390/768/1440 px, en ambos temas y con texto ampliado, sin controles fuera de alcance ni pérdida de contenido.
- **SC-006**: Los reintentos de una misma digitalización o recuperación crean como máximo un borrador y mantienen intactos los archivos disponibles; ningún caso de prueba requiere más llamadas de IA que el flujo vigente.
- **SC-007**: En las pruebas de reparto 2+2+1 sobre5, los valores de las preguntas suman exactamente cada presupuesto y la nota máxima; respuestas con subtotal1,5+1+0,5 producen3 sobre5, sin doble ponderación ni dependencia del número de preguntas de cada sección.
- **SC-008**: Los casos de opción desactivada conservan el100 % de sus puntajes previos; todo reparto incompleto, excedido, solapado, sin cobertura o no representable se explica antes de guardar/aplicar, con cero cambios silenciosos o retroactivos.

## Supuestos

- El 2026-10-26 el usuario autorizó implementar la conservación de la organización y preparar una copia corregida del caso revisado. Este alcance no autoriza recalificación, reescritura histórica, nuevas llamadas pagadas, fusión o despliegue manual.
- Posteriormente pidió esperar antes de aprobar y ampliar el diseño con puntajes opcionales por sección. Después de recibir el diseño ampliado, lo aprobó mediante «aprobe»; se registra esa aprobación nueva, no la autorización anterior a la ampliación. Incluye revisión de requisitos y continuación si están completos, conforme al plan.
- La fidelidad exigida es de contenido y estructura, no una reproducción exacta de tipografía o posición fotográfica. Las figuras mantienen el mecanismo visual existente y sus confirmaciones.
- Un texto legible en la transcripción puede recuperarse aunque el archivo temporal antiguo ya no exista; eso no equivale a conservar las imágenes ni el documento original.
- La transcripción real y sus identificadores no se incluyen en repositorio ni CI. Las pruebas representan el patrón de seis secciones con contenido sintético independiente.
- Las especificaciones responsables siguen siendo 005 (evaluaciones), 007/008 (consumo y calificación), 101/113 (original y lectura), 125 (editor/impresión) y 128 (copias). Esta evolución coordina sus contratos, sin crear otro digitalizador paralelo.
