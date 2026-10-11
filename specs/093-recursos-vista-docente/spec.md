# Especificación: criterios de recursos y vista docente compacta

**Feature Branch**: `codex/093-recursos-vista-docente`

**Created**: 2026-10-10

**Status**: Alcance y plan aprobados; checklist revisado e implementación validada localmente. CI remoto y autorización de merge/despliegue pendientes.

**Issue**: [#196](https://github.com/Andres-back/Calificator/issues/196)

**Input**: El docente encontró un crucigrama cuyos criterios/rúbrica repetían las preguntas. Solicita comprobar los criterios de todos los recursos, ocultar reclamos cuando no existan y aprovechar mejor el espacio de asistencia, especialmente en computador y también en celular.

**Aprobación**: El usuario respondió «APROVE» al alcance de los tres ajustes el 2026-10-10. Autoriza preparar el plan; no equivale a aprobación de un plan todavía no presentado ni a fusión/despliegue.

**Aprobación del plan**: El usuario respondió nuevamente «APROVE» tras recibir el plan el 2026-10-10. Autoriza su implementación siguiendo los controles de calidad; no autoriza fusión ni despliegue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Criterios que expliquen qué se evalúa (Priority: P1)

Como docente, necesito que cada recurso evaluativo distinga las preguntas, las respuestas de referencia y los criterios, para saber qué aprendizaje valoro y cómo se otorgan los puntos.

**Why this priority**: Una pista o pregunta copiada como criterio no explica cómo calificar y puede producir una evaluación poco transparente.

**Independent Test**: Crear un crucigrama y revisar su futura asignación evaluativa; contrastar pistas, clave y criterios. Repetir con los demás tipos de recurso evaluables sin cambiar registros previos.

**Acceptance Scenarios**:

1. **Given** un crucigrama generado, **When** se prepara su evaluación, **Then** las pistas siguen siendo preguntas y los criterios describen logros observables, por ejemplo identificar el concepto de la pista y escribir la palabra correcta, con sus reglas de puntuación.
2. **Given** criterios válidos elegidos o redactados por el docente, **When** se genera y asigna el recurso, **Then** se conservan y se indica qué evidencia los demuestra; no se reemplazan silenciosamente por las preguntas.
3. **Given** una propuesta que solo repite preguntas, tiene pesos incoherentes o no explica qué valorar, **When** se valida, **Then** no se presenta como una rúbrica correcta ni se da por aprobada; el docente recibe un motivo comprensible y puede corregirla antes de continuar.
4. **Given** un material de apoyo sin evaluación, **When** se genera, **Then** no se le obliga a tener puntuación ni se crea una evaluación adicional.
5. **Given** un recurso o evaluación ya guardados, **When** se despliega el cambio, **Then** sus preguntas, respuestas, criterios y notas permanecen intactos; futuras conversiones no duplican la evaluación vinculada.

### User Story 2 - Reclamos solo cuando haya algo que atender (Priority: P2)

Como docente, necesito ver reclamos únicamente cuando existan, manteniendo las notas pendientes, para que mi inicio no esté ocupado por secciones vacías.

**Why this priority**: Reduce ruido sin esconder trabajo real ni problemas de carga.

**Independent Test**: Abrir la bandeja con cero reclamos y notas pendientes; después añadir un reclamo, resolverlo y simular un error de carga.

**Acceptance Scenarios**:

1. **Given** una consulta correcta sin reclamos y con notas por revisar, **When** se abre la bandeja, **Then** no aparecen tarjeta, columna vacía ni contador de cero reclamos; las notas pendientes usan el espacio disponible.
2. **Given** un reclamo abierto, **When** se actualiza la bandeja, **Then** reaparece su sección y conserva el acceso a revisión; al resolver el último se oculta de nuevo.
3. **Given** una carga pendiente o fallida, **When** se consulta la bandeja, **Then** se distingue de una bandeja realmente vacía y se mantiene el reintento.
4. **Given** un contador positivo aunque la lista recibida esté vacía, **When** se muestra la bandeja, **Then** no se afirma que no hay reclamos ni se oculta el trabajo por esa inconsistencia.

### User Story 3 - Asistencia compacta y legible (Priority: P2)

Como docente, necesito ver y marcar varios estudiantes aprovechando el ancho de pantalla, sin una tarjeta grande por alumno ni campos secundarios ocupando siempre espacio.

**Why this priority**: Facilita llamar a lista y reduce desplazamiento conservando controles claros y seguros.

**Independent Test**: Grupo ficticio de 30 estudiantes, nombres largos y homónimos, en computador y celular; marcar estados, buscar, abrir una observación y comprobar guardado y recuperación.

**Acceptance Scenarios**:

1. **Given** un computador con espacio suficiente, **When** se abre asistencia, **Then** los alumnos se muestran en filas compactas con nombre, estados y guardado alineados, sin desperdiciar el ancho ni necesitar desplazamiento horizontal.
2. **Given** un celular, **When** se marca asistencia, **Then** nombre, estado elegido y guardado siguen siendo legibles; las cuatro opciones son accesibles, sin paneles fijos que tapen alumnos ni controles diminutos.
3. **Given** una observación nueva o ya guardada, **When** se abre su control, **Then** se puede leer y editar, sin perder su texto al cerrar, buscar o esperar el guardado; una observación existente no queda escondida sin indicador.
4. **Given** marcas pendientes o un error al guardar, **When** se cambia distribución o se busca otro alumno, **Then** las selecciones se conservan y siguen disponibles el guardado automático, reintento y protección de salida.

### Edge Cases

- Un criterio puede referirse a una pregunta concreta; se rechaza la copia literal sin regla de logro, no esa relación legítima.
- Rúbrica con niveles incompletos, pesos negativos/no numéricos, duplicados o suma distinta de la escala declarada: informar antes de continuar; no fabricar validez.
- Recurso objetivo frente a evidencia abierta: no inventar dimensiones como conducta, estética o rapidez si el docente no las solicitó.
- Recurso antiguo sin criterios o con formato histórico: conservarlo; no reescribirlo al consultarlo ni recalificar entregas.
- No hay reclamos, solo reclamos, ambos grupos, contador/lista inconsistentes, sesión cambiada o error durante actualización: sin pérdida de trabajo ni datos ajenos.
- Nombre largo, homónimo, correo largo, teclado móvil abierto, búsqueda sin coincidencias y grupo de 100 estudiantes: controles accesibles y búsqueda utilizable.
- Observación sin estado elegido: conservar aviso y no guardar una marca inventada.
- Fallo parcial de asistencia, cambio de fecha y salida con cambios pendientes: conservar recuperación y advertencias existentes.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Toda propuesta evaluativa de un recurso DEBE diferenciar preguntas/pistas, respuestas de referencia y criterios observables; un criterio NO DEBE consistir únicamente en copiar el enunciado.
- **FR-002**: Los criterios DEBEN ser apropiados al tipo de actividad y describir el logro, la evidencia y la regla para otorgar puntos. Una rúbrica DEBE además incluir niveles distinguibles y pesos coherentes con su escala; no llamar rúbrica a una simple lista de preguntas.
- **FR-003**: El sistema DEBE comprobar la coherencia de criterios al generar una propuesta evaluativa y al convertir un recurso a evaluación, conservar los criterios docentes válidos y señalar propuestas inválidas con un mensaje accionable antes de darlas por listas.
- **FR-004**: Preguntas, opciones, clave, grilla, orden y nota máxima del recurso DEBEN conservarse; validar criterios NO DEBE cambiar las respuestas correctas ni añadir penalizaciones o aprendizajes no solicitados.
- **FR-005**: El docente DEBE mantener revisión y edición antes de usar los criterios; los recursos de apoyo NO DEBEN exigir una rúbrica ni crear notas. Los criterios propuestos por IA NO sustituyen la aprobación docente.
- **FR-006**: La interfaz docente DEBE ocultar el bloque de reclamos y sus contadores vacíos solo tras confirmar que no existen, tanto en presentación compacta como completa; las notas pendientes DEBEN permanecer accesibles y ocupar el espacio liberado.
- **FR-007**: Carga, error y contadores positivos de reclamos NO DEBEN interpretarse como ausencia. La actualización DEBE mostrar/ocultar la sección al cambiar los casos, conservando enlaces y reintento.
- **FR-008**: Asistencia DEBE usar filas compactas en escritorio y una adaptación legible en celular, mantener cuatro estados explícitos, nombre completo accesible e indicador de guardado; objetivos táctiles de al menos 44 × 44 píxeles.
- **FR-009**: Observaciones DEBEN poder abrirse y editarse bajo demanda, con indicador cuando hay texto existente y sin pérdida de borradores ni interrupción del guardado automático.
- **FR-010**: Se DEBEN conservar búsqueda por nombre/correo, fecha, marcar pendientes como presentes, estado/resumen, reintentos, bloqueo de salida con cambios sin guardar, importación/matrícula y reportes.
- **FR-011**: Los tres cambios DEBEN respetar permisos y aislamiento por usuario/materia. No se modifican retrospectivamente criterios, preguntas, notas, evidencias, matrículas ni asistencias guardadas; tampoco se duplican evaluaciones vinculadas.

### Key Entities

- **Recurso**: actividad o material de apoyo con tipo, contenido, contexto pedagógico y posible evaluación vinculada.
- **Criterio de evaluación**: logro observable con evidencia y regla de puntuación; no es la pregunta ni la clave de respuestas.
- **Rúbrica**: conjunto de criterios con niveles de logro y pesos/escala coherentes.
- **Bandeja docente**: reclamos y notas pendientes de decisión, con contadores y estado de actualización.
- **Registro de asistencia**: alumno, materia, día, estado, observación y estado del guardado automático.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El crucigrama de regresión y una muestra válida de cada tipo de recurso evaluable pasan la separación de preguntas/respuestas/criterios; ninguna copia literal sin regla de logro se acepta como criterio correcto.
- **SC-002**: Todos los casos de criterios inválidos de la batería reciben advertencia accionable y no se presentan como rúbricas listas; las propuestas válidas conservan clave, preguntas y escala.
- **SC-003**: Con cero reclamos confirmados hay cero bloques vacíos de reclamos; con uno o más reclamos su acceso sigue presente. Los casos de carga, error e inconsistencia son distinguibles.
- **SC-004**: A 1280 × 800 se ven al menos ocho alumnos de asistencia por cada tramo de 600 píxeles de lista, con sus estados y guardado, sin contar cabeceras ni observaciones expandidas.
- **SC-005**: A 360/390/768/1280 píxeles, claro/oscuro, no hay desbordamiento horizontal ni superposición que bloquee el flujo; marcar, buscar, observar y reintentar siguen accesibles con objetivos táctiles mínimos de 44 × 44.
- **SC-006**: El 100 % de las regresiones aplicables de permisos, puntuación, conservación de registros, guardado automático y recuperación pasan antes de fusionar.

## Assumptions

- El cambio cubre todos los tipos de recurso evaluables existentes, empezando por el crucigrama; no añade herramientas ni un segundo sistema de calificación.
- Las correcciones de criterios se aplican a nuevas propuestas y futuras conversiones; reparar criterios de una evaluación ya asignada exige decisión explícita del docente y no está autorizado como modificación masiva.
- Los criterios elegidos por el docente prevalecen si son coherentes; si no lo son se pide corrección, no se reemplazan silenciosamente.
- En el inicio se oculta el bloque vacío de reclamos, no la bandeja de notas pendientes ni necesariamente el breve estado «Todo al día».
- La compactación de asistencia es de presentación: no cambia reglas de estados, fechas, permisos ni guardado automático.
- Alcance y plan requieren aprobación humana conforme a la constitución; esta especificación no autoriza fusión ni despliegue.
