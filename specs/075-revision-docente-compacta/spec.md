# Especificación: Revisión docente compacta y progresiva

**Rama**: `codex/075-revision-docente-compacta` | **Creada**: 2026-09-28 | **Estado**: Especificación aprobada; plan pendiente de aprobación humana | **Issue**: [#158](https://github.com/Andres-back/Calificator/issues/158)

Esta evolución organiza la experiencia de 033-centro-calificacion. 008 sigue siendo responsable del ciclo de calificación y 016 del desglose y su fórmula. No crea otra fuente de notas ni cambia el razonamiento de los modelos.

## Escenarios de usuario y pruebas

### Historia 1 - Entender la nota sin recorrer tarjetas grandes (Prioridad: P1)

Como docente desde un celular quiero ver primero estudiante, evaluación, nota vigente, estado, alertas importantes y cómo se valoraron los criterios disponibles. El detalle extenso solo debe aparecer cuando lo solicite.

**Razón de prioridad**: La disposición actual dedica varias cajas a valores breves y coloca información necesaria detrás de demasiado desplazamiento.

**Prueba independiente**: Abrir un resultado sintético con respuestas de uno a tres dígitos, criterios guardados y una alerta. Reconocer nota y estado sin abrir detalles; abrirlos sin perder contexto.

**Aceptación**:
1. **Dada** una nota disponible, **cuando** se abre un alumno en móvil, **entonces** aparecen resumen de nota y estado, criterios disponibles y acciones permitidas antes de la explicación extensa por respuesta, historial, modelos o controles avanzados.
2. **Dado** un trabajo todavía procesándose o fallido, **cuando** se abre, **entonces** se muestra el estado real y nunca un cero ficticio.
3. **Dada** una alerta que bloquea o requiere revisión, **cuando** el detalle está cerrado, **entonces** su existencia y motivo breve siguen visibles; una acción permite abrir la pregunta o el problema correspondiente.
4. **Dados** criterios guardados, **cuando** se consulta el resumen, **entonces** se muestran nombre, puntaje y máximo o peso registrado, sin inventar una relación entre pregunta y criterio. La ausencia de valoración por criterio se declara explícitamente.

### Historia 2 - Abrir y ajustar una respuesta cuando sea necesario (Prioridad: P1)

Como docente quiero pulsar «Ver notas por respuesta», localizar una pregunta y comparar lo escrito, la referencia, su puntaje y el motivo. Si el alumno escribió «3», no necesito una tarjeta grande solo para ese dato.

**Razón de prioridad**: La transparencia y la corrección manual deben conservarse, pero no obligar a leer todos los detalles para tomar una decisión.

**Prueba independiente**: Abrir la explicación, consultar una respuesta numérica y otra extensa, editar 1/1 a 0.7/1 y guardar. Regresar al resumen y comprobar la nota persistida.

**Aceptación**:
1. **Dado** un resultado con desglose, **cuando** se pulsa «Ver notas por respuesta», **entonces** se abre dentro del mismo flujo su listado compacto de preguntas con puntaje, estado y señal de revisión, con acceso al motivo y la evidencia.
2. **Dada** una respuesta breve, **cuando** se abre su detalle, **entonces** respuesta del estudiante y referencia aparecen como filas compactas o una comparación conjunta, sin tarjetas independientes de altura mínima fija.
3. **Dada** una respuesta o explicación extensa, **cuando** se abre el detalle, **entonces** su texto completo sigue accesible, se adapta al ancho y no queda cortado ni limitado a una caja sin desplazamiento alcanzable.
4. **Dada** una respuesta seleccionada, **cuando** se pulsa «Ajustar puntaje y explicación», **entonces** se edita allí mismo, sin bajar al final de la página, conservando validación, suma, historial y conflictos actuales.
5. **Dado** un enlace directo a una pregunta o una alerta, **cuando** se abre, **entonces** se despliega automáticamente el detalle necesario y se enfoca la pregunta indicada. Cerrar o cambiar de alumno con edición pendiente no descarta el borrador silenciosamente.

### Historia 3 - Calificar desde cada evaluación (Prioridad: P1)

Como docente quiero entrar en Evaluaciones y pulsar «Calificar» en una evaluación publicada, continuar con sus alumnos y regresar a ella, sin buscar otra sección ni volver a elegir la materia.

**Razón de prioridad**: La pestaña general «Calificar» y el acceso de cada evaluación duplican el recorrido y dispersan el contexto.

**Prueba independiente**: Abrir una evaluación publicada desde su tarjeta, cargar evidencia o revisar notas y volver a Evaluaciones. Repetir desde un enlace anterior y con permisos solo de lectura.

**Aceptación**:
1. **Dada** una evaluación publicada, en calificación, pendiente de revisión o cerrada, **cuando** un docente autorizado pulsa su acción «Calificar», **entonces** accede al centro existente con materia y evaluación preseleccionadas, sin otro selector obligatorio.
2. **Dada** una evaluación en borrador, **cuando** se consulta su tarjeta, **entonces** no se ofrece iniciar su calificación; se indica que requiere publicación cuando corresponda.
3. **Dado** el recorrido docente habitual con acceso a Evaluaciones, **cuando** se navega por una materia, **entonces** no existe una pestaña «Calificar» redundante. Dentro de la revisión hay una acción clara para volver a las evaluaciones de esa materia.
4. **Dado** un acceso desde pendientes, PQRS o una dirección antigua, **cuando** se abre, **entonces** conserva alumno, evaluación, pregunta, hoja y filtro válidos. Una dirección anterior no produce un 404 por reorganizar el menú.
5. **Dado** un rol personalizado con permiso de calificaciones pero sin lectura de evaluaciones, **cuando** se reorganiza el menú, **entonces** conserva una entrada autorizada al centro existente sin recibir permisos nuevos.

### Historia 4 - Mantener las funciones avanzadas sin saturar el resumen (Prioridad: P2)

Como docente quiero acceder a evidencia multihoja, fórmula, historial, verificaciones, retroalimentación, reclamos y reintentos de manera progresiva, sin perder las operaciones actuales.

**Razón de prioridad**: Simplificar no significa borrar capacidades ni sustituir la revisión humana por confianza automática.

**Prueba independiente**: Recorrer las funciones existentes desde un resultado con evidencia y PQRS, otro histórico sin desglose y otro publicado. Verificar las acciones según permiso y estado.

**Aceptación**:
1. **Dado** un resumen, **cuando** se abre «Ver evidencia», la fórmula o una sección avanzada, **entonces** se conserva alumno, pregunta, hoja, filtro y edición; no se inicia una recalificación ni una publicación.
2. **Dada** una nota sugerida, confirmada, ajustada o publicada, **cuando** se abre el resultado, **entonces** confirmar, guardar ajuste y publicar mantienen nombres distintos y reglas existentes; no aparecen controles duplicados con igual jerarquía.
3. **Dada** una entrega antigua sin desglose, **cuando** se abre, **entonces** se presenta la nota y evidencia disponibles y el aviso de ausencia de explicación por respuesta, sin fabricar puntajes.
4. **Dado** un móvil con teclado abierto, **cuando** se edita una nota o retroalimentación, **entonces** se alcanzan guardar, cancelar y cerrar mediante desplazamiento normal, sin que barras fijas tapen contenido.

### Casos límite

- Cero real, nota pendiente y sin nota deben distinguirse; el texto «0» de una respuesta es un dato válido y no ausencia de respuesta.
- Clave incompleta, ilegibilidad, contradicción, fallo y PQRS abiertos no se ocultan completamente al plegar detalles. Una respuesta incorrecta no se etiqueta por sí sola como fallo de la IA.
- Pregunta o hoja ausente, versión histórica y asociación no disponible conservan los avisos y alternativas existentes.
- Evidencia física, online, mixta y multihoja siguen siendo consultables; texto largo, palabras sin espacios, decimales y nombres extensos no causan desbordamiento.
- Cambiar alumno, pregunta, pestaña, modo o sección con borrador conserva las protecciones actuales. Error de guardado o conflicto conserva el texto y evita avanzar como si se hubiera guardado.
- Una actualización de cola no cierra el detalle, mueve la selección ni borra un editor activo.
- Docente sin permiso de publicación, lector, estudiante y rol personalizado no reciben capacidades nuevas por compartir componentes.

## Requisitos

### Requisitos funcionales

- **FR-001**: La revisión móvil DEBE abrir con un resumen compacto de identidad, contexto, nota vigente, estado y alertas importantes; la explicación extensa y los controles avanzados estarán plegados inicialmente salvo enlace o alerta que requiera enfoque.
- **FR-002**: El resumen DEBE presentar las valoraciones de criterios realmente disponibles y su puntaje/máximo o peso registrado, sin inferir datos faltantes ni cambiar la fórmula vigente.
- **FR-003**: Un control «Ver notas por respuesta» DEBE abrir el desglose en el mismo flujo y permitir localizar cada pregunta con puntaje, estado y señales registradas.
- **FR-004**: Las respuestas breves DEBEN usar una comparación compacta con etiquetas claras de estudiante y referencia; no tendrán cajas independientes de altura mínima fija.
- **FR-005**: Las respuestas, referencias y explicaciones extensas DEBEN seguir disponibles completas y legibles; compactar no autoriza truncamiento irrecuperable ni eliminar el motivo de la nota.
- **FR-006**: Editar el puntaje y la explicación DEBE seguir siendo una acción junto a la respuesta, manteniendo guardado, recálculo, conflictos, historial y validaciones existentes.
- **FR-007**: Los enlaces directos y las acciones de alerta DEBEN abrir el detalle pertinente, con pregunta y hoja válidas enfocadas; plegar no puede hacer inaccesible un editor ni descartar cambios.
- **FR-008**: Evidencia, fórmula, retroalimentación, historial, verificaciones, PQRS, reemplazo, reanálisis y nota manual DEBEN mantener acceso progresivo según permisos y estado, sin operaciones implícitas al abrirlos.
- **FR-009**: Los estados de cola, procesamiento y error DEBEN seguir visibles y no representarse como nota cero; coincidencia o confianza de modelos no se presentará como corrección comprobada.
- **FR-010**: Cada evaluación no borrador DEBE ofrecer acceso contextual «Calificar» para usuarios autorizados, o «Revisar notas» si solo pueden consultar, sin volver a seleccionar materia ni evaluación.
- **FR-011**: La pestaña «Calificar» DEBE retirarse del menú habitual de materia cuando Evaluaciones sea accesible; roles autorizados sin ese acceso conservarán una entrada equivalente sin ampliación de permisos.
- **FR-012**: El centro DEBE ofrecer «Volver a evaluaciones» con la materia correcta y mantener los accesos de pendientes, PQRS, boletín y rutas anteriores sin errores de navegación nuevos.
- **FR-013**: La jerarquía de confirmar, ajustar, guardar y publicar DEBE ser inequívoca, sin duplicación innecesaria; avisos de bloqueo seguirán visibles antes de decidir.
- **FR-014**: La reorganización DEBE funcionar en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, claro/oscuro, con controles principales de al menos 44 px, foco visible y desplazamiento táctil, sin barras o paneles que bloqueen contenido.
- **FR-015**: El cambio NO DEBE modificar modelos, prompts, APIs públicas, permisos, cálculo de notas ni registros históricos; los componentes compartidos con estudiantes conservarán su experiencia autorizada.
- **FR-016**: Abrir/cerrar secciones NO DEBE disparar inferencias ni descargar evidencias de otros alumnos; búsqueda diferida, consulta según selección y seguimiento asíncrono existentes se conservarán.

### Entidades clave

- **Resumen de revisión**: proyección de la calificación vigente, su contexto, estado y señales; no es otra calificación persistida.
- **Detalle progresivo**: sección visible o plegada, pregunta y hoja activas; conserva el borrador existente y no cambia datos por abrirse.
- **Comparación de respuesta**: respuesta observada, referencia, puntaje, máximo, motivo y evidencia registrados.
- **Acceso contextual**: evaluación de origen y permisos reales que permiten calificar o consultar el centro.

## Criterios de éxito

- **SC-001**: Desde cada evaluación autorizada no borrador se accede a la calificación en una acción, con cero reselecciones de materia o evaluación; se vuelve a su listado mediante una acción visible.
- **SC-002**: En los casos controlados con nota disponible, el resumen muestra nota, estado, alertas y valoraciones de criterios antes de cualquier detalle extenso, sin requerir abrir la explicación por respuesta.
- **SC-003**: Para respuestas de uno a tres dígitos, estudiante y referencia usan una única comparación compacta; se reduce al menos 30 % su altura frente a la disposición actual, midiendo el mismo caso a 360 px sin reducir legibilidad ni objetivos táctiles.
- **SC-004**: Abrir la explicación y el editor de una pregunta requiere como máximo tres acciones desde el resumen; ajustar 1/1 a 0.7/1 conserva persistencia, suma e historial y no obliga a bajar al final del examen.
- **SC-005**: En las cinco resoluciones y ambos temas no hay desbordamiento horizontal, texto perdido ni controles ocultos por barras fijas; el teclado móvil no impide guardar o cancelar.
- **SC-006**: Todos los casos controlados de alerta crítica siguen identificables con el detalle plegado; los enlaces directos abren el componente correcto y no borran cambios pendientes.
- **SC-007**: La regresión mantiene el 100 % de las funciones enumeradas en FR-008 y sus permisos; abrir detalles produce cero llamadas de inferencia, cero modificaciones históricas y cero publicaciones implícitas.

## Supuestos

- Alcance: presentación y navegación docentes. El centro actual se reutiliza; no se construye una segunda pantalla de calificación ni un flujo de IA nuevo.
- «Progresivo» significa resumen primero y detalle bajo acción explícita; no exige modales nuevos. La solución precisa se decidirá en el plan aprobado.
- Se conservan la revisión humana y las alertas necesarias aunque el resultado ocupe menos espacio. No se promete que todas las notas puedan confirmarse sin examinar la evidencia.
- Si no hay valoración por criterio, se muestra esa ausencia y se ofrecen los puntajes disponibles por pregunta; no se fabrican criterios para llenar el resumen.
- El menú habitual pierde la pestaña redundante, no la capacidad ni la compatibilidad de enlaces; se contempla la excepción de roles personalizados sin lectura de evaluaciones.
- El usuario aprobó esta organización mediante «ADELANTE» el 2026-09-28. No hay autorización de publicación o despliegue de este cambio todavía; el plan requiere aprobación antes de implementar.

## Aclaraciones

### Sesión 2026-09-28

- Se revisaron alcance, datos, interacción, accesibilidad, permisos, compatibilidad, estados, recuperación y criterios de aceptación. No hay ambigüedades críticas que requieran preguntas nuevas; cero preguntas formales.
- La revisión de calidad se mantiene en 12/12, sin regresiones. La aprobación de especificación no implica aprobación de plan ni validación realizada.
