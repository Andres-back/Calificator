# Especificación: biblioteca de treinta motivos por área

**Rama**: `codex/123-motivos-por-area` | **Creada**: 2026-10-24 | **Estado**: Alcance, plan y revisión de requisitos aprobados; implementación local, sin desplegar | **Issue**: #259

**Solicitud**: «puedes hacer más para todas las materias de a 30 por área» y «sí que sirvan para retroalimentaciones, evaluaciones etc». Una biblioteca común reutilizable, no tres catálogos de trescientas imágenes ni una modificación automática del contenido académico.

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar diseños relacionados con la materia (Prioridad: P1)

Como docente quiero treinta motivos relacionados con el área de mi materia para personalizar las fichas sin recorrer un catálogo enorme ni escribir el nombre del área exactamente como el sistema.

**Razón de prioridad**: Los veinte diseños generales no ofrecen suficiente variedad temática para todas las materias; mostrar cientos a la vez agravaría la saturación en celular.

**Prueba independiente**: Recorrer las diez áreas, comprobar treinta motivos distintos en cada una y seleccionar uno; una materia de área desconocida permite elegir colección o usar los generales sin alterar su nombre.

**Aceptación**:
1. **Dadas** las diez áreas definidas, **cuando** el docente elige cualquiera, **entonces** encuentra treinta motivos temáticos identificables, sin sustituir los veinte generales.
2. **Dada** una materia con área reconocible en el contexto disponible, **cuando** abre la decoración, **entonces** se sugiere esa colección y puede cambiarla; si falta el área, no se inventa ni se obliga a completar datos.
3. **Dado** un nombre personalizado, abreviado o con diferencias de acentos, **cuando** no pueda asociarse con certeza, **entonces** se mantiene la elección manual y la colección general, sin renombrar materias ni modificar registros.
4. **Dado** un celular, **cuando** abre o cambia colección, **entonces** ve un máximo de doce motivos por página de galería y puede llegar a todos con controles comprensibles, sin cargar ni mostrar las trescientas ilustraciones simultáneamente.

### Historia 2 - Imprimir fichas temáticas sin alterar su contenido (Prioridad: P1)

Como docente quiero elegir un motivo temático o variarlo entre estudiantes, conservando mensajes, notas e identidad, y poder imprimir sin decoración cuando prefiera ahorrar tinta.

**Razón de prioridad**: La decoración no debe desplazar, reinterpretar ni esconder información de la evaluación y debe mantener los controles ya entregados en Spec122.

**Prueba independiente**: Preparar treinta fichas sintéticas con textos cortos, extensos y continuaciones; elegir diferentes colecciones, mezcla y ausencia de decoración, verificando contenido y legibilidad.

**Aceptación**:
1. **Dada** una colección, **cuando** se elige un motivo o modo variado, **entonces** solo cambia la decoración; nombre, evaluación, nota, mensaje, destinatario y restricciones del enlace permanecen iguales.
2. **Dada** una ficha con continuaciones, **cuando** se imprime en A4/Carta, **entonces** mantiene identidad y el mismo motivo en todas sus partes, sin tapar texto ni perder caracteres.
3. **Dada** la opción sin decoración o una ilustración ausente, **cuando** se imprime, **entonces** nombre, nota y mensaje siguen completos y legibles, sin bloquear la entrega.
4. **Dados** diseños generales ya existentes, **cuando** se amplía el catálogo, **entonces** siguen disponibles con su identidad y selección anteriores; publicar, copiar enlaces e imprimir conservan sus reglas.

### Casos límite

- Área desconocida, materia personalizada o área ausente: generales y selección manual disponibles; no adivinar por el nombre del estudiante ni consultar sus respuestas.
- Nombres largos y teclado móvil: objetivos táctiles de al menos 44 × 44 px y ningún desplazamiento horizontal desde 360 px.
- Cambiar de área o página no altera las fichas seleccionadas ni dispara publicaciones, enlaces o recalificación.
- Una mezcla es estable por destinatario dentro de la colección elegida y no depende de la nota, género, apellido, capacidad o conducta.
- Los motivos son decorativos, no claves, diagramas evaluables, premios o castigos. No inventar textos ni afirmaciones científicas o históricas.
- Representación respetuosa e inclusiva; en Religiosa, sin proselitismo, jerarquización de creencias o caricaturas de personas sagradas; en Ética, sin estereotipos o clasificaciones morales de alumnos.
- Un archivo ausente o una impresora sin color no impide entregar el texto. No repetir dibujos cambiando únicamente su color para completar la cantidad.
- Decoración e imagen académica son usos distintos: una ilustración insertada en una pregunta no puede quedar oculta al alumno ni fuera de la versión que posteriormente se califica; una decoración no puede aportar respuestas a la IA.
- No reemplazar automáticamente ilustraciones, gráficos, tablas o lecturas que ya pertenecen a una evaluación o recurso. Cancelar una selección conserva el contenido y la versión anteriores.

### Historia 3 - Reutilizar la colección en evaluaciones y recursos (Prioridad: P1)

Como docente quiero elegir los mismos motivos desde los editores de evaluaciones y recursos imprimibles para no descargarlos y volverlos a subir manualmente.

**Razón de prioridad**: El usuario confirmó que no deben limitarse a las retroalimentaciones. Se necesita un punto de elección coherente sin mezclar decoración y material que forma parte de una pregunta.

**Prueba independiente**: Elegir un motivo en una ficha, en una pregunta de evaluación y en un recurso imprimible; cancelar y guardar explícitamente, reabrir y exportar los documentos sin cambios académicos colaterales.

**Aceptación**:
1. **Dada** la biblioteca, **cuando** se abre desde retroalimentación, evaluación o recurso, **entonces** conserva áreas, nombres y diseños, sin generar otra imagen o exigir descarga/subida manual.
2. **Dada** una pregunta editable, **cuando** se añade un motivo, **entonces** el docente revisa la vista previa y confirma antes de guardarlo como parte de su versión; se conserva el historial de evaluaciones y calificaciones anteriores.
3. **Dado** un recurso imprimible, **cuando** se elige decoración de cabecera, **entonces** se conserva la elección al guardar y reabrir, sin reescribir preguntas, respuestas, rúbrica, lectura, ilustración principal o actividad previamente vinculada.
4. **Dada** una selección guardada en un documento compatible, **cuando** se visualiza y exporta a los formatos que ya ofrece, **entonces** el motivo aparece completo, con proporciones correctas y sin tapar el texto. No se añaden formatos de exportación nuevos a tipos que no los ofrecen.

## Requisitos

### Requisitos funcionales

- **FR-001**: El catálogo DEBE añadir treinta motivos para cada una de las diez áreas enumeradas, trescientos nuevos en total, manteniendo separados y disponibles los veinte generales de Spec122.
- **FR-002**: Las colecciones DEBEN cubrir Ciencias Naturales y Educación Ambiental, Ciencias Sociales, Matemáticas, Lengua Castellana, Inglés, Tecnología e Informática, Educación Artística, Educación Física, Ética y Valores y Educación Religiosa.
- **FR-003**: Cada colección DEBE contener treinta composiciones visualmente distintas y pertinentes; no contar duplicados, recoloreados o copias del mismo dibujo como motivos nuevos. No se DEBEN sustituir los generales ni reciclar sus archivos como nuevos.
- **FR-004**: El docente DEBE poder elegir área y motivo o variar motivos entre estudiantes. Si el contexto ya ofrece un área reconocible, se PUEDE sugerir; ante incertidumbre DEBE mantenerse elección manual y generales, sin modificar materias.
- **FR-005**: La galería DEBE mostrar un máximo de doce motivos por página, indicar colección y cantidad y permitir acceder a los treinta; cambiar colección NO DEBE obligar a cargar todas las demás.
- **FR-006**: Los motivos DEBEN tener fondo transparente real, sin recuadros blancos, texto inventado, logos, marcas de agua o indicaciones de desempeño; deben ser reconocibles en el tamaño de cabecera de las fichas.
- **FR-007**: Los motivos DEBEN conservar una representación inclusiva y respetuosa, sin estereotipos, proselitismo ni recompensas visuales ligadas a la nota. La colección temática no debe presentarse como contenido académico validado.
- **FR-008**: La elección y mezcla DEBEN conservar todo el contenido de las fichas y un motivo estable en las continuaciones, con texto de al menos 12 pt, líneas de corte y legibilidad en color y grises, tanto en A4 como en Carta.
- **FR-009**: «Sin decoración» y el fallo de una ilustración DEBEN permitir imprimir la ficha completa, incluidas identidad y nota; los veinte motivos generales DEBEN seguir funcionando sin cambiar su identidad.
- **FR-010**: El flujo DEBE ser usable en 360/390/768/1440 px, ambos temas, teclado y táctil, con objetivos de al menos 44 × 44 px, sin texto tapado ni desbordamiento horizontal.
- **FR-011**: Los motivos DEBEN crearse una sola vez para el catálogo y reutilizarse; imprimir, compartir o cambiar de diseño NO DEBE solicitar generación de imágenes ni enviar datos de estudiantes a un generador.
- **FR-012**: El cambio NO DEBE modificar notas, evidencias, mensajes académicos, modelos, claves, matrículas, permisos, cuotas, enlaces, caducidad o estados de publicación. No se DEBE alterar el código publicado del PR #258 para introducir esta ampliación sin su propio proceso de aprobación.
- **FR-013**: La biblioteca DEBE poder abrirse desde retroalimentaciones, el editor visual de preguntas de evaluación y la edición de recursos imprimibles, sin generar catálogos duplicados ni requerir descarga/subida manual del motivo.
- **FR-014**: Insertar un motivo en una pregunta DEBE reutilizar la revisión, autorización, guardado y versionado de su contenido visual. Cancelar no modifica la evaluación; guardar no reescribe ni recalifica entregas anteriores. Las imágenes que forman parte del enunciado DEBEN acompañar su versión autorizada en pantalla, impresión y contexto de calificación.
- **FR-015**: La decoración de un recurso DEBE guardarse separadamente de preguntas, respuestas, criterios, rúbricas, lectura e ilustración principal. Guardar únicamente decoración NO DEBE reconstruir esos datos ni sincronizar silenciosamente una evaluación vinculada. Documentos antiguos sin selección deben abrirse como antes.
- **FR-016**: Las imágenes de la biblioteca DEBEN proceder exclusivamente del catálogo curado. No se DEBEN aceptar referencias arbitrarias a archivos del servidor o direcciones externas como motivos. Previsualización y formatos de exportación ya disponibles deben conservar selección, transparencia, proporciones y acceso autorizado.

### Entidades clave

- **Colección de área**: identificador y nombre de un área, treinta motivos y asociaciones de nombres reconocibles; no modifica el área almacenada de una materia.
- **Motivo temático**: composición decorativa única, nombre, colección y procedencia; independiente de datos o desempeño del alumno.
- **Preferencia de presentación**: colección, selección individual o mezcla estable y opción sin decoración, separada de los datos académicos.
- **Ficha de retroalimentación**: conserva su identidad, contenido y reglas de entrega de Spec122; únicamente cambia su elemento decorativo.
- **Uso de biblioteca en documento**: elección de un motivo como decoración separada o como imagen revisada de una pregunta. Cada uno conserva sus reglas de guardado y no concede acceso a materiales privados ajenos.

## Criterios de éxito

- **SC-001**: Las diez colecciones contienen exactamente treinta motivos nuevos y distintos cada una, y los veinte generales siguen disponibles: trescientos veinte motivos en total.
- **SC-002**: Un docente puede elegir colección y motivo en dos acciones principales tras abrir las opciones, sin recorrer las otras nueve áreas; cada página de galería presenta como máximo doce diseños.
- **SC-003**: Treinta fichas sintéticas conservan el 100 % de sus nombres, notas y mensajes en A4/Carta con motivo, mezcla, sin decoración y con una ilustración ausente, incluidas sus continuaciones.
- **SC-004**: Las diez colecciones y los veinte generales son accesibles en los cuatro anchos y ambos temas, mediante teclado y táctil, sin desbordamiento horizontal ni objetivos menores de 44 × 44 px.
- **SC-005**: Consultar, cambiar decoración e imprimir produce cero cambios académicos, cero nuevos enlaces y cero solicitudes de generación; los permisos y límites existentes conservan sus resultados de prueba.
- **SC-006**: La misma biblioteca está disponible en los tres contextos y sus selecciones guardadas se conservan al reabrir y exportar documentos compatibles; cancelar o editar solo decoración produce cero cambios en preguntas, respuestas, criterios o calificaciones existentes.

## Supuestos

- «Todas las materias» se organiza por las diez áreas sugeridas actualmente al crear materia. Biología, Física y Química pueden usar Naturales; Historia y Geografía, Sociales. No se promete cubrir automáticamente todo nombre libre ni crear treinta diseños para cada materia individual.
- El usuario aprobó las diez áreas y trescientos motivos nuevos, no redistribuir los veinte existentes para contabilizarlos de nuevo. Amplió expresamente su reutilización a evaluaciones y recursos. Aprobó el plan técnico mediante «sí» tras su presentación el 2026-10-24; se mantienen la revisión de requisitos y las pruebas previas a entrega.
- Una materia con área diferente puede elegir cualquiera de las colecciones o los generales. Ampliar la lista a otra área requerirá concretar ese alcance.
- La generación será mediante la herramienta incorporada, sin emplear la clave de producción ni datos de estudiantes. No se presume un coste gratuito ni se autorizan llamadas a proveedores de producción.
- Esta ampliación depende de Spec122/PR #258 y se prepara por separado desde su código publicado; su integración final deberá respetar el commit aprobado de esa entrega. No se fusiona ni despliega ahora.
- Fuera de alcance: generación en tiempo de impresión, fondos completos, nuevos modelos, evaluación del aprendizaje, cambios de retroalimentación o datos, edición de áreas guardadas y rediseño del resto de la plataforma.
- «Etc.» se acota a recursos imprimibles ya existentes —lecturas, cuentos, guías, talleres y juegos— mediante decoración de cabecera, sin prometer imágenes académicas exactas para cualquier tema ni reemplazar ilustraciones generadas para una historia. No se incluyen presentaciones, carga libre al catálogo o un editor gráfico universal.
