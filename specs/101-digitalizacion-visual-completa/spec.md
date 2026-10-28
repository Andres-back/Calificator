# Especificación: Digitalización visual completa de evaluaciones

**Rama**: `codex/101-digitalizacion-visual-completa` | **Creada**: 2026-10-15 | **Estado**: Alcance ampliado aprobado («adelante») y plan aprobado («aprove») el 2026-10-15 | **Issue**: #211

## Escenarios de usuario y pruebas

### Historia 1 - Importar sin perder el material necesario (Prioridad: P1)

Como profesor, quiero subir PDF, Word o imágenes y conservar preguntas, opciones, textos, tablas, figuras, dibujos y fórmulas, para no reconstruir manualmente la evaluación ni obtener respuestas basadas en información incompleta.

**Razón de prioridad**: Una pregunta sin su tabla o figura puede cambiar de significado e impedir una calificación válida.

**Prueba independiente**: Importar muestras con texto y elementos visuales de los tres formatos; comparar el original con el contenido conservado y sus asociaciones.

**Aceptación**:
1. **Dado** un Word con cuatro tablas insertadas como imágenes y un gráfico circular, **cuando** se digitaliza, **entonces** los cinco elementos quedan conservados y accesibles, aunque no sean tablas editables.
2. **Dado** un PDF con texto seleccionable y figuras, **cuando** se digitaliza, **entonces** se conservan ambos; encontrar texto no permite omitir los elementos visuales.
3. **Dado** un PDF escaneado o una fotografía con preguntas y dibujos, **cuando** se procesa, **entonces** conserva su contenido visual y extrae el texto legible, indicando los fragmentos que necesitan revisión.
4. **Dado** un estímulo que sirve a las preguntas 1 a 3, **cuando** se organiza el resultado, **entonces** las tres preguntas mantienen acceso al mismo estímulo, sin crear preguntas adicionales por ese material.
5. **Dado** un elemento que no puede interpretarse o asociarse con certeza, **cuando** termina el trabajo, **entonces** se conserva su representación original y se identifica qué debe comprobar el docente; no desaparece ni se presenta como resuelto.

### Historia 2 - Revisar e imprimir una evaluación completa (Prioridad: P1)

Como profesor, quiero revisar la evaluación desde celular o computador, corregir las asociaciones del material y obtener un documento que incluya sus figuras, para verificar lo que recibirán los estudiantes.

**Razón de prioridad**: Extraer una figura no aporta valor si desaparece de la vista final o de la impresión.

**Prueba independiente**: Abrir el resultado en celular y escritorio, ampliar una figura, consultar una tabla y descargar PDF y Word comparándolos con la revisión guardada.

**Aceptación**:
1. **Dado** un resultado con contenido visual, **cuando** se abre la revisión, **entonces** cada pregunta muestra su contexto pertinente y permite ampliar figuras sin desbordar la página completa; tablas anchas tienen desplazamiento propio identificable.
2. **Dado** un material compartido o sin asociación confirmada, **cuando** el docente revisa, **entonces** puede asignarlo a una o varias preguntas y comprobar el original sin perder sus cambios.
3. **Dado** un borrador revisado, **cuando** se previsualiza, imprime o descarga en PDF o Word, **entonces** contiene las preguntas y todos sus elementos visuales requeridos, con texto y etiquetas legibles; una figura puede mantenerse como imagen no editable.
4. **Dado** un fallo que impide generar un documento completo, **cuando** se solicita la descarga, **entonces** se informa qué impide completarlo y se permite consultar el original al docente; no se entrega como correcta una versión silenciosamente incompleta.
5. **Dado** un original contestado, **cuando** se prepara la versión para estudiantes, **entonces** no se incluyen respuestas, claves ni anotaciones que revelen soluciones. Si no pueden separarse con seguridad de una figura, el docente debe sustituir o confirmar una versión limpia antes de usarla en esa versión.

### Historia 3 - Calificar con el contexto visual correcto (Prioridad: P1)

Como profesor, quiero que la calificación y su verificación consideren tanto la evidencia del alumno como las figuras de la evaluación, para no penalizar respuestas por contexto perdido.

**Razón de prioridad**: La integridad de la nota depende de conocer la pregunta completa y distinguirla de la respuesta del estudiante.

**Prueba independiente**: Calificar una respuesta sintética que requiera leer un dato de una tabla y otra que requiera un gráfico; comprobar los insumos usados por cada etapa y la conducta ante un elemento ilegible.

**Aceptación**:
1. **Dado** una pregunta vinculada a una tabla o dibujo, **cuando** actúan el calificador y el verificador habilitado, **entonces** ambos disponen del material pertinente y de la evidencia del alumno, diferenciando sus orígenes.
2. **Dado** un examen resuelto con respuestas incorrectas manuscritas, **cuando** se digitaliza, **entonces** las anotaciones no se convierten automáticamente en respuestas correctas; la clave se obtiene de la consigna y su contexto, o queda pendiente cuando no es determinable.
3. **Dado** un contexto visual indispensable ausente o ilegible, **cuando** se evalúa, **entonces** se solicita revisión de esa pregunta y se impide publicación automática por cobertura insuficiente; no se interpreta la falta de contexto como respuesta en blanco ni como cero.
4. **Dado** una evaluación o nota anterior a este cambio, **cuando** se despliega o consulta la mejora, **entonces** no se cambia ni recalifica automáticamente su contenido guardado.

### Historia 4 - Recuperar errores sin repetir trabajo (Prioridad: P2)

Como profesor, quiero saber si mi archivo sigue procesándose y poder reintentar cuando falla, para continuar trabajando desde un celular sin duplicar evaluaciones.

**Razón de prioridad**: Procesar gráficos no debe bloquear la navegación ni generar copias en reintentos.

**Prueba independiente**: Interrumpir una importación, volver a la materia, reabrir su estado y reintentar el mismo trabajo autorizado.

**Aceptación**:
1. **Dado** un archivo admitido, **cuando** se envía, **entonces** se muestra un estado comprensible de espera o progreso y el docente puede navegar sin cancelar el procesamiento.
2. **Dado** un fallo recuperable o una sesión interrumpida, **cuando** el propietario retoma o reintenta, **entonces** encuentra el estado real y no se duplican evaluaciones ni recursos conservados del mismo trabajo.
3. **Dado** un archivo fuera de los límites o protegido que no puede abrirse, **cuando** se carga, **entonces** se explica cómo corregirlo sin presentar una digitalización truncada como completa.

### Historia 5 - Añadir material visual al editar una pregunta (Prioridad: P1)

Como profesor, quiero insertar imágenes, tablas, gráficas o dibujos en una pregunta después de generar, digitalizar o crear manualmente la evaluación, eligiendo entre subir mi material o solicitarlo a la IA, para completar la pregunta sin crear otra evaluación.

**Razón de prioridad**: Conservar lo importado no basta cuando el docente necesita añadir un contexto nuevo o reemplazar un elemento que falta.

**Prueba independiente**: Abrir una evaluación guardada con permisos de edición, añadir un recurso subido y otro generado por IA, revisarlos, guardarlos y comprobar su persistencia, vista final, documentos y uso al calificar.

**Aceptación**:
1. **Dado** una pregunta de una evaluación generada, digitalizada o manual, **cuando** el profesor autorizado abre su edición, **entonces** puede añadir una imagen, tabla, gráfica o dibujo mediante «Subir archivo» o «Crear con IA», sin regenerar las demás preguntas.
2. **Dado** un recurso subido en un formato admitido, **cuando** se incorpora, **entonces** el profesor puede previsualizarlo, añadir una descripción, asociarlo a su pregunta y reemplazarlo o quitarlo antes de guardar. Para tablas o gráficas subidas como imagen se conserva esa representación, sin prometer edición de celdas o datos no recuperados.
3. **Dado** una solicitud a la IA con descripción y, cuando corresponda, datos, **cuando** se genera una propuesta, **entonces** se presenta primero para revisión, con opciones de aceptar, ajustar la petición, regenerar o descartar. Descartar o cancelar no sustituye el recurso anterior ni modifica la pregunta guardada.
4. **Dado** una tabla creada dentro del editor o generada por IA, **cuando** se revisa, **entonces** pueden modificarse encabezados y celdas. Para una gráfica creada o generada, pueden revisarse y editarse sus datos, tipo de representación, etiquetas y unidades; la representación debe concordar con esos datos.
5. **Dado** que el recurso nuevo cambia lo necesario para responder, **cuando** se guarda, **entonces** se identifica la respuesta esperada de las preguntas afectadas como pendiente de comprobación docente; no se cambian automáticamente claves, puntajes ni notas existentes.
6. **Dado** una evaluación publicada o con entregas, **cuando** se solicita cambiar su material, **entonces** se aplican las restricciones y el versionado vigentes y se informa su efecto antes de confirmar. Los registros anteriores conservan el contexto con el que fueron evaluados; no se reemplaza silenciosamente la evidencia histórica ni se recalifica.
7. **Dado** un fallo al subir o generar, o una función de IA no disponible para ese recurso, **cuando** se intenta añadirlo, **entonces** se explica la limitación y se mantiene la opción de carga manual sin perder la edición; nunca se presenta una descripción textual como si la figura ya estuviera creada.
8. **Dado** un recurso aceptado y guardado, **cuando** se reabre la evaluación o se utiliza en vista final, impresión, PDF, Word o calificación, **entonces** se usa la misma versión revisada, con las mismas reglas de legibilidad, permisos y separación de soluciones que el material importado.

### Casos límite

- Tablas nativas de Word, tablas insertadas como imágenes, imágenes flotantes, figuras en grupos y fórmulas: conservar la representación legible, sus rótulos y su posición lógica aunque no puedan convertirse en elementos editables.
- PDF mixto, repetición de encabezados, figuras que cruzan páginas y estímulos separados de su pregunta: no duplicar preguntas; mantener la procedencia y señalar asociaciones dudosas.
- Gráficos con ejes, unidades, leyendas o valores pequeños: conservar esos datos visualmente; si no se leen, avisar en las preguntas afectadas sin adivinarlos.
- Imagen borrosa, oscura, girada o con parte de la hoja fuera de la foto: conservar el original y señalar limitaciones; mejorar legibilidad no equivale a inventar zonas que nunca fueron capturadas.
- Anotaciones de alumno superpuestas sobre gráficos: el original contestado sigue siendo privado; no trasladarlo sin revisión a una versión pública o imprimible para estudiantes.
- Recursos repetidos o formatos alternativos de la misma imagen: no confundir copias técnicas con figuras distintas ni omitir usos legítimos del mismo recurso.
- Archivos inválidos, comprimidos de tamaño desproporcionado, protegidos o con contenido activo: rechazo seguro y mensaje claro; el contenido se trata como material educativo, no como instrucciones para cambiar reglas o permisos.
- Fallo de lectura visual, generación, persistencia o descarga: conservar un estado recuperable, no marcar éxito completo y no dejar recursos accesibles sin autorización.
- Evaluaciones anteriores sin original conservado: siguen funcionando con su contenido existente; esta mejora no reconstruye automáticamente lo que ya se perdió.
- Una propuesta generada con valores, ejes o etiquetas incorrectos: el docente puede corregirla o descartarla; no se considera una fuente de verdad por haberla creado la IA.
- Regeneraciones, respuestas de IA tardías y cambios simultáneos de edición: una propuesta anterior no reemplaza una versión aceptada más reciente ni se aplica a otra pregunta; reintentar no inserta duplicados.
- Quitar un recurso compartido de una pregunta no lo elimina de las otras ni de versiones históricas que todavía lo necesiten; se advierte si la pregunta se queda sin contexto indispensable.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE aceptar los PDF, documentos Word DOCX e imágenes ya admitidos, procesando texto y contenido visual en los tres recorridos, incluidos PDF mixtos. Los límites de tamaño, páginas y formatos DEBEN estar informados antes de aceptar el trabajo; superarlos no permite recortar contenido silenciosamente. Ver historias 1 y 4.
- **FR-002**: DEBE conservar el original privado sin alterarlo y una representación legible de cada elemento educativo visual detectado, con procedencia y orden lógico recuperables para la revisión. Ver historias 1 y 2.
- **FR-003**: DEBE conservar tablas con encabezados, filas, columnas y unidades, así como figuras, dibujos, fórmulas, ejes y leyendas. Si no puede extraerlos estructuradamente, DEBE mantener su representación visual y señalar cualquier dato ilegible. Ver historia 1 y casos límite.
- **FR-004**: DEBE relacionar texto y elementos visuales con una o varias preguntas, permitiendo al docente corregir o confirmar asociaciones; no debe convertir automáticamente un estímulo o instrucción en una pregunta puntuable. Ver historias 1 y 2.
- **FR-005**: DEBE contrastar páginas y elementos detectados en el original con los conservados en el resultado. Todo elemento no conservado, no interpretado o sin asociación confirmada DEBE dejar una advertencia localizada; «completa» requiere que no queden omisiones ni revisiones de contenido pendientes. Este control no constituye una garantía de comprensión perfecta de la IA. Ver historia 1.
- **FR-006**: DEBE distinguir contenido impreso, consignas y evidencia manuscrita; NO DEBE copiar respuestas de un alumno como solucionario. Cuando la respuesta correcta no sea determinable con el contexto disponible, DEBE solicitar confirmación docente. Ver historia 3.
- **FR-007**: DEBE permitir comparar original y resultado, ampliar figuras y consultar material compartido desde preguntas en pantallas de 360 px a escritorio, en modos claro y oscuro, sin desbordamiento global ni controles inaccesibles. Ver historia 2.
- **FR-008**: DEBE conservar los elementos visuales necesarios en la vista final, impresión, PDF y Word. Una salida incompleta DEBE fallar de forma explícita y recuperable, no omitir elementos sin aviso. Ver historia 2.
- **FR-009**: DEBE impedir que las versiones para estudiantes revelen solucionarios o anotaciones resueltas del original privado. Un recurso no separable requiere sustitución o revisión de una versión limpia antes de incluirse en esas salidas. Ver historia 2.
- **FR-010**: DEBE poner a disposición del calificador y del verificador habilitado el contexto visual pertinente de la evaluación y la evidencia del alumno, con sus orígenes diferenciados. No cambia los modos de calificación ni los proveedores configurados. Ver historia 3.
- **FR-011**: La falta de un contexto visual indispensable DEBE producir revisión explícita en la pregunta afectada, no un cero por ausencia de respuesta ni publicación automática de una nota insuficientemente sustentada. Ver historia 3.
- **FR-012**: El trabajo DEBE ser observable, recuperable e idempotente, permitiendo navegar y retomar el estado sin crear evaluaciones ni recursos duplicados al reintentar el mismo trabajo. Ver historia 4.
- **FR-013**: La mejora NO DEBE modificar ni recalificar automáticamente evaluaciones, notas, criterios, evidencias o decisiones docentes existentes. Una nueva importación sigue siendo una acción explícita; no sustituye registros previos sin autorización específica. Ver historia 3.
- **FR-014**: Originales y recursos DEBEN respetar los permisos de la evaluación en consulta, descarga, exportación y calificación. Un estudiante no accede al original privado contestado ni al solucionario; otro docente sin permiso no obtiene recursos mediante enlaces conocidos. Ver historias 2 y 3.
- **FR-015**: Los mensajes DEBEN indicar en lenguaje docente qué falta y qué acción puede realizar; las mediciones del proceso NO DEBEN registrar documentos, respuestas ni datos personales en registros públicos o de pruebas. Ver historia 4 y casos límite.
- **FR-016**: El ciclo de conservación y retiro DEBE seguir el de la evaluación y sus evidencias; una limpieza de archivos temporales o un reintento NO DEBE borrar el original o las figuras de una importación guardada. La eliminación autorizada DEBE respetar los mecanismos de recuperación y conservación existentes. Ver historias 1 y 4.
- **FR-017**: El editor de preguntas DEBE permitir añadir imágenes, tablas, gráficas y dibujos, tanto por carga manual como por creación asistida por IA, en evaluaciones generadas, digitalizadas o manuales, respetando los permisos y restricciones de edición vigentes. Ver historia 5.
- **FR-018**: Todo recurso añadido DEBE poder previsualizarse, describirse, asociarse, reemplazarse o quitarse antes de guardar. Una propuesta de IA DEBE requerir aceptación docente explícita; cancelar, descartar, fallar o recibir una propuesta tardía NO DEBE sobrescribir contenido guardado ni otra propuesta ya aceptada. Ver historia 5 y casos límite.
- **FR-019**: Las tablas creadas o generadas DEBEN permitir editar encabezados y celdas; las gráficas creadas o generadas DEBEN permitir editar datos, representación, etiquetas y unidades conservando concordancia entre datos y dibujo. Una tabla o gráfica subida únicamente como imagen conserva ese formato salvo extracción revisada. Ver historia 5.
- **FR-020**: Al cambiar material que sustenta una pregunta, el sistema DEBE solicitar revisión de su respuesta esperada y advertir las consecuencias de retirarlo. NO DEBE cambiar silenciosamente la clave ni recalificar registros existentes; las versiones históricas DEBEN conservar el material aplicado en su momento. Ver historia 5 y casos límite.
- **FR-021**: Los recursos añadidos manualmente o aceptados desde IA DEBEN seguir las mismas reglas de conservación, permisos, visualización, exportación y contexto de calificación que los importados. La propuesta para el estudiante NO DEBE incluir el solucionario por defecto. Ver historia 5.
- **FR-022**: Crear con IA DEBE mostrar espera, resultado revisable y error recuperable sin bloquear la edición. Si la capacidad necesaria no está configurada o disponible, DEBE informarse y ofrecer carga manual, conservando el borrador sin afirmar que se ha generado un recurso inexistente. Ver historia 5.

### Entidades clave

- **Documento original**: Archivo privado aportado por el docente, inalterado, asociado al trabajo y a la evaluación resultante.
- **Elemento de contenido**: Texto, tabla, fórmula, figura o dibujo con representación legible, procedencia, orden y estado de revisión.
- **Estímulo compartido**: Contenido necesario para interpretar una o más preguntas, sin puntaje propio salvo decisión explícita del docente.
- **Revisión de cobertura**: Comparación de lo detectado y lo conservado, con omisiones, asociaciones dudosas y comprobaciones docentes pendientes.
- **Evaluación digitalizada**: Preguntas, opciones, criterios y respuestas esperadas independientes de las anotaciones del alumno, vinculadas al material necesario.
- **Trabajo de digitalización**: Estado de carga, procesamiento, revisión, finalización o error, recuperable sin duplicación.
- **Recurso añadido a la pregunta**: Material visual con origen importado, subido o generado por IA, descripción, asociaciones y versión revisada; una propuesta no aceptada no forma parte de la evaluación guardada.

## Criterios de éxito

- **SC-001**: En un conjunto de al menos seis muestras sintéticas que cubra Word con tablas nativas, Word con tablas como imágenes, PDF mixto, PDF escaneado, fotografía y contenido visual compartido, el 100 % de los elementos educativos anotados por revisión humana queda conservado y accesible; todo dato ilegible o asociación incierta queda señalado en su pregunta. No basta con contabilizar archivos de imagen.
- **SC-002**: En la muestra equivalente al documento de referencia se conservan las cuatro tablas y el gráfico circular, la primera tabla sirve a las tres preguntas correspondientes y ningún valor numérico se sustituye por uno inventado. La comprobación compara encabezados, unidades, rótulos y valores con el original.
- **SC-003**: En todas las muestras revisadas, vista final, PDF y Word incluyen los elementos visuales requeridos sin cortes ni omisiones; las salidas para estudiantes no revelan anotaciones resueltas o claves privadas. Los fallos forzados no producen una descarga presentada como completa.
- **SC-004**: En pruebas de calificación con contexto visual, ambas etapas habilitadas reciben el material pertinente. Todos los casos con contexto indispensable ausente quedan por revisar, sin ceros por esa ausencia ni publicación automática.
- **SC-005**: Los recorridos de carga, comparación, ampliación y descarga pueden completarse a 360 y 390 px y en escritorio, en claro y oscuro, sin desbordamiento global; la prueba incluye navegadores representativos de iPhone y Android. Se distingue esta comprobación de una prueba física cuando no se haya realizado.
- **SC-006**: Reintentar o retomar cada fallo simulado no duplica evaluaciones ni recursos persistentes; la comparación anterior/posterior confirma que las evaluaciones, evidencias y notas previas permanecen sin cambios.
- **SC-007**: Todas las pruebas de acceso ajeno a originales, figuras y solucionarios se rechazan sin revelar su contenido; las consultas permitidas siguen funcionando tras cerrar y reabrir la sesión autorizada.
- **SC-008**: En las tres procedencias de evaluación —generada, digitalizada y manual— se completan los recorridos de subir y de crear con IA para imagen, tabla, gráfica y dibujo. Todos los recursos aceptados persisten al reabrir y aparecen en vista final, PDF y Word; los descartados no modifican la versión guardada. Se comprueban los controles móviles descritos en SC-005.
- **SC-009**: Las pruebas de tablas y gráficas creadas confirman que cada cambio de datos, encabezados, etiquetas y unidades se refleja en la representación guardada. Las pruebas de cancelación, fallo y resultado tardío no sobrescriben contenido ni duplican recursos, y las de cambios con entregas conservan intactas las notas y su contexto histórico.

## Supuestos

- «Digitalizar todo» significa conservar todo el contenido educativo de un archivo admitido, no prometer reconocimiento perfecto de una foto ilegible ni reproducción idéntica de cada detalle decorativo. Si no puede interpretarse, se conserva visualmente y se solicita revisión; no se elimina en silencio.
- En la importación se conserva la figura original cuando ya expresa correctamente la información; no se sustituye automáticamente por un dibujo de IA. En el editor, el docente sí puede solicitar expresamente un recurso nuevo a la IA y aceptarlo. No se exige que cada gráfico sea editable dentro del archivo Word exportado.
- El alcance incluye nueva importación y edición explícita de recursos por pregunta, con su recorrido hasta vista final, descarga y calificación. No incluye reparar masivamente digitalizaciones anteriores, nuevos tipos de pregunta, nuevos proveedores, ni rediseñar otros módulos.
- La edición visual es opcional y se ofrece desde cada pregunta sin añadir pasos obligatorios a la creación de una evaluación. La generación reutiliza las capacidades de IA administrables de la aplicación; su viabilidad por tipo de recurso se documentará en el plan, sin selección fija de un modelo en esta especificación.
- Se mantienen inicialmente los formatos y límites vigentes de carga; cualquier ampliación debe justificarse en el plan. La longitud del texto extraído no puede justificar omisiones ocultas dentro de un archivo aceptado.
- La revisión visual verifica calidad del contenido; la publicación y la decisión sobre notas siguen siendo acciones docentes separadas con sus protecciones existentes.
- El documento aportado se utiliza como referencia local de diagnóstico. Las muestras versionadas serán sintéticas y no incluirán documentos de docentes, nombres de alumnos ni evidencias reales.
- Esta evolución desarrolla el dominio [005-evaluaciones](../005-evaluaciones/spec.md) y sus contratos de digitalización, documentos y calificación; el plan actualizará las referencias responsables sin crear contratos contradictorios.
- El usuario aprobó este alcance ampliado el 2026-10-15 mediante «adelante» y el plan mediante «aprove». La revisión de requisitos, implementación y autorización de fusión o despliegue siguen sus fases separadas conforme a la constitución.

## Coordinación documental 130

[Spec130](../130-digitalizacion-secciones/spec.md), issue #274, amplía este contrato bajo aprobación registrada. La secuencia documental es independiente del manifiesto visual. Las figuras siguen requiriendo recursos autorizados de la misma versión; no se inventan imágenes ausentes. El recorrido conserva materiales compartidos una vez. El estado de pruebas y las limitaciones están en su guía de validación; no supone activación en producción.

## Evolución 128: copia privada de contenido visual existente

[128-materias-notas-reutilizacion](../128-materias-notas-reutilizacion/spec.md), issue #270, reutiliza contenido guardado sin redigitalizar. Copia bytes verificados en almacenamiento privado de destino y remapea preguntas, bloques, recursos, cobertura y revisión; no comparte permisos por referencia al origen ni publica originales. Conserva avisos/claves pendientes y material revisado. Snapshot fijado al admitir, staging determinista y compensación de archivos propios sin referencia persistida evitan copias incompletas o borrado tras un commit incierto. No añade IA ni inventa documentos ausentes.

## Coordinación 131: evidencia docente revisable

Distingue original de evaluación y original de respuesta estudiantil. Este incremento conserva fuentes nuevas de evidencia docente, sin modificar digitalización de figuras, contenido editorial, generación de imágenes o documentos históricos. Contratos y validación se registran en [Spec131](../131-escaneo-evidencias/spec.md), [plan](../131-escaneo-evidencias/plan.md) y [tareas](../131-escaneo-evidencias/tasks.md), issue #276. Esta coordinación no certifica cierre, CI, teléfonos físicos ni activación productiva.
