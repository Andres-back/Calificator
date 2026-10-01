# Especificación: Flujo docente contextual y resultados ordenados

**Rama**: `codex/078-asistencia-libro-notas` | **Creada**: 2026-09-30 | **Estado**: Alcance y plan ampliados aprobados; implementación | **Issue**: [#163](https://github.com/Andres-back/Calificator/issues/163)

004 mantiene la responsabilidad sobre asistencia; 005, sobre evaluaciones; 008, sobre calificaciones; 075, sobre revisión contextual. Esta evolución mejora organización y consultas docentes, no crea otra fuente de notas ni modifica registros educativos existentes. Recorrido principal: **Materia → Evaluaciones → Notas del grupo → Resultado del estudiante**.

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar un estudiante al llamar asistencia (Prioridad: P1)

Como docente quiero buscar por nombre o correo para marcar asistencia sin recorrer toda la lista desde el celular.

**Razón de prioridad**: Evitar desplazamientos sin cambiar cómo se registra asistencia.

**Prueba independiente**: Marcar un alumno, buscar otro, marcarlo y limpiar la búsqueda; comprobar que ambas marcas y observaciones se conservan y guardar incluye al grupo completo.

**Aceptación**:
1. **Dada** una lista cargada, **cuando** se escribe parte del nombre o correo, **entonces** aparecen coincidencias sin distinguir mayúsculas ni tildes, con cantidad visible y opción de limpiar.
2. **Dado** un borrador con marcas u observaciones, **cuando** cambia la búsqueda, **entonces** no se pierden cambios ni se guarda automáticamente.
3. **Dada** una búsqueda sin resultados, **cuando** se consulta, **entonces** hay un mensaje y una acción para mostrar todo el grupo; resumen y guardado siguen incluyendo a todos.
4. **Dado** el control para marcar pendientes presentes, **cuando** hay una búsqueda activa, **entonces** su texto aclara que incluye todo el grupo, también los estudiantes ocultos.

### Historia 2 - Consultar notas de una evaluación (Prioridad: P1)

Como docente quiero seleccionar una evaluación y ver exclusivamente sus notas, estados y acciones, manteniendo también la vista general.

**Razón de prioridad**: Mezclar todas las evaluaciones dificulta revisar una actividad concreta.

**Prueba independiente**: Con dos evaluaciones y notas distintas, seleccionar cada una, combinar búsqueda y filtros de estudiantes y regresar a «Todas las evaluaciones».

**Aceptación**:
1. **Dado** el libro, **cuando** se abre, **entonces** aparece «Todas las evaluaciones» y las evaluaciones no borrador de la materia, incluidas las cerradas.
2. **Dada** una evaluación seleccionada, **cuando** se consulta una tarjeta, **entonces** solo muestra su nota o estado y la acción de revisión apunta a esa evaluación.
3. **Dado** un filtro por evaluación, **cuando** se consultan cantidades, prioridades y porcentajes, **entonces** describen solo la selección y se identifican como resultado de esa evaluación, no promedio general de la materia.
4. **Dada** la selección «Todas las evaluaciones», **cuando** se consulta, **entonces** recupera las tarjetas y cálculos de seguimiento existentes sin modificar notas.
5. **Dada** una selección, **cuando** se busca un estudiante o se elige «Prioridad» o «Por decidir», **entonces** los filtros se combinan sobre la evaluación seleccionada.
6. **Dada** una evaluación elegida con «Todos» y sin búsqueda, **cuando** se abre su listado, **entonces** están todos los estudiantes matriculados en filas compactas con nombre, nota o ausencia de nota, estado y acceso al detalle; no se necesitan tarjetas grandes por alumno ni abrirlos uno a uno para conocer sus notas.
7. **Dado** el listado compacto, **cuando** se necesita el seguimiento ampliado o explicación de criterios, **entonces** se abre bajo una acción explícita; esos textos y contadores no ocupan por defecto el espacio de las notas.

### Historia 3 - Calificar desde la evaluación de la materia (Prioridad: P2)

Como docente quiero un recorrido por Materias y Evaluaciones sin una entrada lateral redundante a calificar.

**Razón de prioridad**: Evitar opciones duplicadas y conservar el contexto.

**Prueba independiente**: Comprobar menú en escritorio y celular, abrir una evaluación publicada y su botón de calificación; probar enlaces anteriores y un rol personalizado sin lectura de evaluaciones.

**Aceptación**:
1. **Dado** un profesor con acceso a materias y evaluaciones, **cuando** abre el lateral, **entonces** no aparece «Calificar y revisar» y puede calificar desde cada evaluación autorizada.
2. **Dado** un enlace anterior o de pendientes, reclamos o libro, **cuando** se abre, **entonces** funciona con contexto válido y permisos actuales.
3. **Dado** un rol personalizado autorizado a consultar notas pero sin el recorrido de materias y evaluaciones, **cuando** abre el lateral, **entonces** conserva acceso autorizado sin permisos nuevos.
4. **Dado** un estudiante o administrador, **cuando** consulta su menú, **entonces** conserva sus secciones; no se elimina «Mis resultados».

### Historia 4 - Entender primero la nota y consultar el detalle cuando se necesita (Prioridad: P1)

Como docente quiero pulsar la nota de un estudiante y ver primero cuánto obtuvo y por qué, sin una pantalla llena de evidencias, respuestas y textos abiertos.

**Razón de prioridad**: La revisión debe ayudar a decidir, no obligar a localizar la nota entre paneles dispersos.

**Prueba independiente**: Abrir una nota desde su evaluación, consultar cada sección y volver al grupo. Repetir con una nota ajustada, una nota antigua sin desglose y una entrega en procesamiento.

**Aceptación**:
1. **Dada** una evaluación publicada y autorizada, **cuando** el profesor abre su acción «Notas y entregas», **entonces** ve el grupo y las notas o estados exclusivamente de esa evaluación, sin volver a elegir materia o evaluación.
2. **Dada** una fila con nota, **cuando** pulsa esa nota o «Ver detalle», **entonces** se abre el resultado con estudiante y evaluación identificados y cuatro secciones en este orden: «1. Nota y explicación», «2. Evidencia», «3. Respuestas y puntajes», «4. Retroalimentación».
3. **Dado** un resultado con respaldo registrado, **cuando** se abre normalmente, **entonces** la primera sección muestra nota, estado, puntos obtenidos/posibles y explicación registrada o cálculo aplicable; las otras tres secciones están plegadas, también en escritorio. El detalle largo de criterios se consulta por una acción explícita.
4. **Dada** una comparación abierta, **cuando** se revisa una pregunta, **entonces** se distinguen «Respuesta del estudiante», «Respuesta de referencia», puntaje/máximo y justificación registrada. Respuestas cortas no tienen bloques con altura mínima desproporcionada.
5. **Dado** un resultado sin respaldo histórico, **cuando** se abre, **entonces** informa «Sin explicación registrada» o la ausencia concreta; no inventa una razón ni trata un ajuste global como si fuera la suma de puntajes por pregunta.
6. **Dada** una alerta que requiere intervención, **cuando** el detalle está plegado, **entonces** sigue visible con acceso a la pregunta, evidencia o acción afectada. Un enlace directo a una pregunta u hoja abre su sección correspondiente.
7. **Dado** un cambio docente sin guardar, **cuando** se navega entre secciones o estudiantes, **entonces** se conserva el borrador o aparece la advertencia existente; confirmar, publicar, ajustar puntajes, reemplazar evidencia y consultar historial conservan sus reglas y permisos.
8. **Dado** el detalle abierto desde el grupo, **cuando** vuelve a la lista, **entonces** conserva materia, evaluación, búsqueda y filtros previos. Un estudiante sin nota dispone de su acción autorizada de añadir entrega o establecer nota, no de una nota ficticia.

### Historia 5 - Crear una evaluación sin repetir los datos de la materia (Prioridad: P1)

Como docente quiero crear una evaluación dentro de mi materia sin volver a seleccionar materia, grado o área; quiero concentrarme en qué evaluar y cómo.

**Razón de prioridad**: Las preguntas redundantes hacen parecer más complejo el flujo y pueden mezclar contextos.

**Prueba independiente**: Crear desde dos materias distintas con borradores previos; comprobar contexto, opciones editables y revisión antes de guardar o publicar, sin modificar evaluaciones anteriores.

**Aceptación**:
1. **Dada** una materia abierta, **cuando** inicia «Crear evaluación», **entonces** el creador hereda la materia y sus datos disponibles, incluido grado/área cuando existan. Los muestra como contexto fijo, sin controles de selección ni una confirmación exclusiva de datos ya conocidos.
2. **Dado** el creador contextual, **cuando** configura la evaluación, **entonces** se destacan nombre/tema, modalidad, contenido o material de referencia y criterios de evaluación; descripción, fecha y configuración avanzada quedan bajo controles progresivos identificados. No se omiten las decisiones necesarias de contenido, escala, pesos ni revisión humana de rúbrica y respuestas.
3. **Dada** una opción avanzada cerrada, **cuando** contiene un valor o una validación pendiente, **entonces** el resumen informa su configuración y abre la sección para corregirla; no quedan errores ocultos que impidan continuar sin explicación.
4. **Dado** un borrador de otra materia, **cuando** abre el creador desde la materia actual, **entonces** no se restaura ni reasigna silenciosamente a ella y se conserva recuperable en su contexto original.
5. **Dada** una entrada general sin materia, **cuando** crea, **entonces** puede elegir una materia autorizada; editar una evaluación existente conserva su materia y la protección de entregas y notas ya guardadas.
6. **Dada** una materia sin grado o área registrados, **cuando** crea, **entonces** no inventa esos datos ni añade campos obligatorios nuevos; cualquier carencia que impida el flujo se explica con acceso a la configuración existente.

### Casos límite

- Búsqueda vacía, espacios, tildes, nombres largos y correos internos no cambian identidad ni orden original.
- Pendientes ocultos siguen impidiendo guardar asistencia incompleta. Cambiar fecha o salir conserva advertencias de cambios sin guardar.
- Cero real, ausencia de nota, procesamiento y falta de decisión mantienen su diferencia al filtrar.
- Si desaparece la evaluación seleccionada al actualizar, volver a «Todas las evaluaciones» con aviso, sin selección inexistente.
- Carga, fallo y reintento siguen visibles; filtrar no guarda, recalifica ni publica.
- Sin estudiantes o evaluaciones publicadas se conservan estados vacíos y se evitan controles inútiles.
- Notas antiguas, decisiones globales, entregas online/mixtas y evidencia multihoja conservan su significado; nunca se fabrica una justificación para completar la nueva presentación.
- Un enlace a pregunta u hoja abre el detalle pertinente; una alerta no desaparece al plegar secciones. El progreso de calificación se representa como estado, no como cero.
- Plegar respuestas o cambiar sección no pierde ajustes sin guardar ni elimina comentarios, historial o PQRS.
- Un borrador de otra materia no puede orientar ni guardar una evaluación en el contexto actual sin una elección explícita. Los borradores compatibles siguen siendo recuperables.

## Requisitos

### Requisitos funcionales

- **FR-001**: Asistencia DEBE incluir búsqueda por nombre o correo sin distinguir mayúsculas ni tildes, cantidad de coincidencias y acción de limpiar.
- **FR-002**: Buscar DEBE modificar solo la visibilidad; marcas, observaciones, resumen global y guardado completo permanecerán intactos.
- **FR-003**: Sin resultados DEBE poder recuperarse todo el grupo; las acciones globales DEBEN indicar que incluyen estudiantes ocultos.
- **FR-004**: El libro docente DEBE ofrecer «Todas las evaluaciones» y selección individual entre las evaluaciones no borrador de la materia.
- **FR-005**: Seleccionar una evaluación DEBE limitar tarjetas, acciones, prioridades, cantidades y porcentajes a ella, diferenciándolos del promedio general.
- **FR-006**: Selección de evaluación, búsqueda de estudiante y filtros de prioridad o decisión DEBEN combinarse; «Todas» recuperará el comportamiento general.
- **FR-007**: Una selección desaparecida DEBE restablecerse con aviso; cero, procesamiento y notas pendientes mantendrán sus estados reales.
- **FR-008**: El lateral habitual docente NO DEBE mostrar «Calificar y revisar» cuando Materias y Evaluaciones ofrecen ese recorrido; roles personalizados sin él conservarán acceso autorizado.
- **FR-009**: Botones de evaluación, rutas anteriores y accesos de pendientes, reclamos y libro DEBEN seguir funcionando; «Mis resultados» seguirá disponible para estudiantes.
- **FR-010**: Los ajustes DEBEN funcionar desde 360 px, claro/oscuro, con etiquetas, foco, teclado y controles principales de al menos 44 px, sin bloquear desplazamiento.
- **FR-011**: El cambio NO DEBE alterar registros, permisos, cálculo de notas, decisiones docentes, IA ni guardado; buscar o filtrar no iniciará calificaciones.
- **FR-012**: Una evaluación elegida DEBE mostrar todos los estudiantes del grupo por defecto en filas compactas con nombre, nota, estado y acceso al detalle. El seguimiento ampliado y las explicaciones se mostrarán de forma progresiva; «Todos» y búsqueda vacía no excluirán estudiantes sin nota ni en procesamiento.
- **FR-013**: Cada evaluación publicada DEBE ofrecer el acceso contextual «Notas y entregas» al listado de su grupo; la nota y «Ver detalle» abrirán el resultado de ese estudiante. El retorno conservará contexto y filtros; los alumnos sin nota conservarán acciones autorizadas de calificación.
- **FR-014**: El resultado DEBE organizarse en las cuatro secciones numeradas de la historia 4, con solo nota y explicación abiertas inicialmente tanto en celular como escritorio, salvo enlaces directos, alertas seleccionadas o edición pendiente que requieran abrir su sección. La comparación usará «Respuesta de referencia», no una afirmación de infalibilidad de la IA.
- **FR-015**: La explicación DEBE apoyarse únicamente en puntajes, criterios, justificaciones y ajustes registrados. DEBE distinguir suma/calculo por respuestas, decisión global docente y ausencia de respaldo histórico, sin recalificar ni inventar motivos. Los textos completos permanecerán accesibles bajo expansión.
- **FR-016**: Alertas, revisión humana, edición por pregunta, confirmación/publicación, evidencia multihoja, reemplazos, historial y PQRS DEBEN seguir disponibles con sus permisos y protección de cambios sin guardar; plegar secciones no ocultará bloqueos ni perderá borradores.
- **FR-017**: Crear desde una materia DEBE heredar su contexto y los datos disponibles de grado/área sin pedirlos de nuevo. Sin contexto se conservará selección autorizada; editar no reasignará la materia ni alterará entregas o notas previas.
- **FR-018**: El creador DEBE priorizar decisiones necesarias y plegar opciones complementarias identificadas, con resumen de valores y errores que permitan abrirlas. Escala, pesos, rúbrica editable y revisión de preguntas/respuestas seguirán siendo accesibles antes de guardar o publicar.
- **FR-019**: La recuperación de borradores DEBE respetar la materia de origen; abrir otra materia no los restaurará ni sobrescribirá silenciosamente. No se inventarán datos ausentes ni se agregarán campos obligatorios nuevos.

### Entidades clave

- **Búsqueda de asistencia**: texto temporal que determina miembros visibles, sin modificar registros.
- **Selección de evaluación**: una evaluación de la materia o la vista general, exclusivamente para consulta.
- **Acceso contextual**: recorrido desde la evaluación existente, sujeto a los permisos actuales.
- **Resultado ordenado**: presentación de una calificación existente, respaldo registrado y cuatro secciones de consulta/edición autorizada; no es un nuevo cálculo ni registro.
- **Contexto de creación**: materia de origen y sus datos disponibles, asociados también al borrador recuperable.

## Criterios de éxito

- **SC-001**: Con 100 estudiantes controlados, buscar muestra coincidencias en menos de un segundo y limpiar conserva todas las marcas y observaciones.
- **SC-002**: En todas las búsquedas, incluidas cero coincidencias, resumen y guardado conservan el 100 % del grupo y no permiten guardar con pendientes.
- **SC-003**: Con dos evaluaciones, seleccionar una muestra cero notas o acciones de la otra; indicadores corresponden a la seleccionada y «Todas» restaura la vista general.
- **SC-004**: Calificar sigue disponible desde cada evaluación autorizada en una acción; cero enlaces anteriores se rompen y los roles mantienen capacidades previas.
- **SC-005**: A 360×800, 390×844 y 1366×768, en ambos temas, no hay desbordamiento horizontal ni controles nuevos que tapen contenido o impidan desplazarlo.
- **SC-006**: Consultar produce cero modificaciones de notas o asistencias y cero llamadas de calificación; siguen pasando pruebas existentes de persistencia y permisos.
- **SC-007**: Con una evaluación y 30 estudiantes, «Todos» muestra exactamente 30 filas, incluidas notas definitivas, sugerencias, procesamiento y alumnos sin nota. A 390 px caben al menos cinco filas de nombres cortos en 500 px de alto, sin tarjetas de explicación entre ellas; el detalle está a una acción de la fila.
- **SC-008**: A 360, 390 y 1366 px, abrir una nota muestra las cuatro secciones en el orden acordado y cero paneles abiertos de evidencia, comparación o retroalimentación por defecto. Cada sección se abre con una acción; respuestas de hasta tres cifras no tienen bloques vacíos de altura fija. Enlaces a pregunta/hoja y alertas abren la sección pertinente.
- **SC-009**: En ejemplos controlados con desglose, nota global ajustada y nota antigua sin explicación, el 100 % de los valores y motivos mostrados coinciden con los registros o indican expresamente su ausencia. Volver al grupo conserva todos los filtros y editar conserva las salvaguardas actuales.
- **SC-010**: Crear desde una materia requiere cero selecciones de materia, grado o área; abrir desde otra materia restaura cero borradores ajenos y conserva su recuperación. En creación general y edición siguen pasando los escenarios actuales de selección, rúbrica editable, revisión y no alteración de notas previas.

## Supuestos

- Solo interfaz docente: sin cambios de backend, modelos, migraciones ni dependencias.
- «Libro de notas» corresponde al seguimiento dentro de cada materia; boletín estudiantil intacto.
- Filtrar limita indicadores de consulta, no recalcula ni sustituye calificaciones oficiales.
- Se conserva la excepción de roles personalizados documentada en 075.
- El usuario aprobó el alcance mediante «aprove» y el plan mediante «si», enfatizando lista de notas de todos los estudiantes y menor saturación informativa el 2026-09-30. Fusión y despliegue requieren autorización separada.
- La petición posterior añade organización del resultado y creación contextual. Ante la pregunta consolidada de aprobar alcance/plan y autorizar revisión de calidad, el usuario respondió «SIGUE» el 2026-09-30; se registra aprobación de la ampliación y autorización de revisión. No equivale a autorización de fusión o despliegue.
- La primera sección presenta respaldo de la decisión, no razonamiento interno oculto del modelo. Los criterios completos, cuando sean extensos, se consultan de forma progresiva.
- Se reutiliza el recorrido de notas ya existente; no se añade una quinta vista de calificación. Materias, evaluación, libro y detalle siguen compartiendo las mismas calificaciones.

## Aclaraciones

### Evolución aprobada 079 (2026-10-01)

La presentación de asistencia y captura continúa en [079-captura-docente-directa](../079-captura-docente-directa/spec.md): resumen sin superposición a cualquier ancho, desglose/ayuda plegados, entrada contextual y un envío explícito único. Se mantienen búsqueda/globales de asistencia, consulta progresiva, notas existentes y todas las decisiones docentes de esta especificación.

### Sesión 2026-09-30

- Revisión de alcance, roles, datos, interacción, estados, compatibilidad, recuperación, accesibilidad y aceptación: sin ambigüedades críticas. Cero preguntas formales.
- La búsqueda no limita las acciones globales ni oculta pendientes del resumen. Los indicadores de una evaluación son una consulta, no una nueva nota oficial.
- Aclaración del usuario al aprobar el plan: debe poder ver juntas las notas de todos los estudiantes en una evaluación. Se concreta en FR-012 y SC-007; notas y estados primero, detalles progresivos.
- Nueva petición: nota y explicación primero, después evidencia, comparación de respuestas y retroalimentación; crear desde la materia debe reutilizar contexto. Se concreta en historias 4–5, FR-013–019 y SC-008–010, aprobados mediante «SIGUE» ante la pregunta consolidada; revisión de calidad autorizada antes de código.
