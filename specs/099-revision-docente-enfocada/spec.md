# Especificación: revisión docente enfocada en celular

**Rama**: `codex/099-revision-docente-enfocada` | **Creada**: 2026-10-14 | **Estado**: Alcance y plan aprobados | **Issue**: [#207](https://github.com/Andres-back/Calificator/issues/207)

El usuario confirmó conservar nota sugerida IA, respuestas, evidencia, historial y quejas/reclamos, priorizando facilidad de entrada y comprensión en celular. También se conserva retroalimentación y toda acción docente vigente. Propietario: 008-calificaciones. La impresión de fichas 098 queda pendiente y fuera de este incremento.

## Escenarios de usuario y pruebas

### Historia 1 - Entender la nota sin atravesar avisos repetidos (Prioridad: P1)

Como docente quiero ver quién entregó, la nota propuesta y qué debo comprobar, sin una pantalla llena de explicaciones repetidas.

**Razón de prioridad**: Los avisos actuales desplazan respuestas y evidencia y atribuyen una diferencia de nota a una decisión docente aunque el resultado sigue pendiente.

**Prueba independiente**: Abrir una entrega pendiente con sugerencia 2,52 y cálculo por respuestas 2,48; ver ambos valores identificados mediante un único aviso de diferencia, sin afirmar cuál es correcto ni atribuir ajuste al docente inexistente.

**Aceptación**:
1. **Dado** una entrega pendiente, **cuando** abre revisión, **entonces** identifica estudiante, nota sugerida y estado, con un resumen breve de lo necesario para revisar.
2. **Dado** varios avisos relacionados, **cuando** abre revisión, **entonces** ve una acción principal que lleva a la pregunta o sección afectada; puede consultar todos los motivos sin mensajes repetidos en portada.
3. **Dado** nota confirmada distinta de la suma, **cuando** consulta explicación, **entonces** se distingue un ajuste docente registrado de una discrepancia no explicada, sin inventar motivos ni recalcular notas.

### Historia 2 - Acceder fácilmente a lo que necesita revisar (Prioridad: P1)

Como docente quiero entrar a respuestas, evidencia, retroalimentación e historial sin recorrer una página larga, manteniendo acceso a quejas y reclamos.

**Razón de prioridad**: El celular es el dispositivo principal y debe permitir trabajo enfocado sin perder funciones.

**Prueba independiente**: Desde una entrega, abrir cada sección, editar un puntaje, consultar su foto y volver sin perder contexto ni cambios; consultar un reclamo y su historial.

**Aceptación**:
1. **Dado** celular, **cuando** cambia de sección, **entonces** trabaja con una sección principal a la vez, con identificación y accesos claros, sin scroll horizontal.
2. **Dado** respuesta pendiente, **cuando** pulsa revisar, **entonces** abre esa pregunta; respuesta del estudiante, referencia y puntaje permanecen disponibles para comparar y editar según permiso.
3. **Dado** reclamos existentes, **cuando** abre la entrega, **entonces** dispone de acceso con contador de abiertos y puede consultar/resolver con las capacidades existentes. Si no existen, no se muestra un panel vacío; registrar uno sigue disponible en opciones.
4. **Dado** consulta de reclamos fallida, **cuando** se muestra el acceso, **entonces** indica que no se pudieron consultar y permite reintentar; no afirma que no existen.

### Historia 3 - Conservar el trabajo y la trazabilidad (Prioridad: P1)

Como docente quiero reorganización, no cambios en mis notas ni pérdida de evidencias, ajustes o reclamos.

**Razón de prioridad**: Producto en fase demo, con registros reales.

**Prueba independiente**: Recorrer las secciones sin editar y comprobar cero cambios académicos; realizar una edición autorizada y confirmar conservación de las reglas actuales de guardado/historial.

**Aceptación**:
1. **Dado** cambios sin guardar, **cuando** intenta cambiar sección/alumno, **entonces** conserva el borrador y recibe la protección existente antes de descartar.
2. **Dado** calificación histórica sin detalle por pregunta, **cuando** abre revisión, **entonces** conserva nota/evidencia/historial sin fabricar respuestas o puntajes.
3. **Dado** computador, **cuando** revisa, **entonces** mantiene lista de alumnos y aprovecha el ancho para comparar respuestas con evidencia, sin paneles que bloqueen el desplazamiento.

### Casos límite

- Procesando o sin nota: mostrar estado real, no cero ni decisión final; conservar navegación al siguiente alumno.
- Cero confirmado válido, ajustes globales, nota publicada y versiones anteriores: conservar valores y trazabilidad.
- Aviso general sin pregunta identificada: dirigir a sección relacionada y explicar la incertidumbre sin inventar asociación.
- Nombres largos, 360 px, teclado abierto, ampliación de texto y ambos temas: identidad/controles accesibles, sin cubrir el editor.
- Foto ausente o error de carga: comunicar y mantener recuperación existente; no indicar evidencia eliminada por un fallo temporal.
- Enlace directo a pregunta/hoja o devolución al libro: abrir el destino y preservar rutas actuales.
- Reclamos resueltos siguen consultables; cero abiertos no equivale a cero reclamos históricos.
- Permiso perdido, cambio de sesión o respuesta tardía de otro alumno: no mostrar datos ajenos ni permitir acciones no autorizadas.

## Requisitos

### Requisitos funcionales

- **FR-001**: Mostrar identificación, nota sugerida o decidida según estado y escala sin duplicar la explicación completa en portada.
- **FR-002**: Ofrecer acceso claro a Respuestas, Evidencia, Retroalimentación e Historial; celular con una sección principal visible y retorno a notas del grupo. Conservar Quejas y reclamos según datos/permisos.
- **FR-003**: Resumir avisos en una llamada breve priorizada con acción contextual; motivos íntegros disponibles bajo detalle. No ocultar inconsistencias activas ni presentar ausencia de avisos como corrección garantizada.
- **FR-004**: Identificar sugerencia IA, cálculo por respuestas y decisión docente como conceptos distintos. Solo atribuir ajuste/decisión a evidencia registrada; diferencias no explicadas requieren comprobación, sin elegir automáticamente una nota.
- **FR-005**: Conservar consulta/edición de respuestas, puntajes, referencia, evidencia y retroalimentación, con autorización y guardado vigentes.
- **FR-006**: Conservar historial de cambios, análisis previo, ajustes globales, publicación, liberación de respuestas y reanálisis bajo accesos progresivos; sin eliminar capacidades por simplificar.
- **FR-007**: Mostrar contador y acceso a reclamos existentes, diferenciando abiertos/resueltos; ocultar panel vacío tras consulta correcta. Registrar reclamo permanece disponible; carga/error nunca equivalen a ausencia.
- **FR-008**: Funcionar desde 360 px hasta escritorio en ambos temas, con objetivos táctiles de 44 px, controles legibles y sin desbordamiento horizontal. Teclado no debe quedar bajo una barra fija de acciones.
- **FR-009**: Mantener enlaces directos, identidad del alumno, protección de borradores y selección contextual al navegar, sin escrituras por cambiar de vista.
- **FR-010**: Conservar notas, evidencias, respuestas, historial, reclamos y políticas de confirmación/publicación. No modificar modelos IA ni ejecutar nuevas inferencias al abrir/cambiar secciones.
- **FR-011**: Probar discrepancias, estados, reclamos, permisos y navegación celular/computador con datos sintéticos y regresiones focalizadas; CI y autorización de fusión independientes del alcance.

### Entidades clave

- **Entrega revisada**: alumno, evaluación, nota, estado y evidencia vigentes.
- **Aviso de revisión**: motivo, alcance general/por respuesta, prioridad y destino; no altera la nota.
- **Sección activa**: contenido consultado temporalmente, vinculado a la entrega y sus enlaces.
- **Reclamo**: solicitud trazable con estado, contenido e historial existentes.

## Criterios de éxito

- **SC-001**: En 360/390 px se identifica alumno, nota y estado al abrir la entrega, sin recorrer la lista completa de avisos.
- **SC-002**: Cada sección y reclamos existentes se alcanzan en un máximo de dos activaciones desde el resumen, sin desplazarse por una lista de mensajes.
- **SC-003**: Todos los avisos originales permanecen consultables; portada no repite el mismo mensaje/acción equivalente y conserva explícita toda discrepancia de nota activa.
- **SC-004**: En los casos pendientes probados no se atribuye una diferencia a decisión docente inexistente; no se cambian valores para resolverla visualmente.
- **SC-005**: Navegar sin editar produce cero modificaciones académicas y cero llamadas de generación; edición/confirmación/reclamos conservan permisos y trazabilidad.
- **SC-006**: Celular/computador en ambos temas, con nombres largos y edición activa, sin controles tapados ni scroll horizontal; ausencia/error de reclamos diferenciados.

## Supuestos

- El «sí» confirmó el alcance; «aprove» del 2026-10-14 aprobó el plan y la revisión asistida de requisitos antes de implementar. No autoriza fusión/despliegue.
- Resumen compacto común; navegación principal por Respuestas, Evidencia, Retroalimentación e Historial. Quejas y reclamos con acceso contextual, y alta desde opciones cuando esté vacío.
- Revisar presentación no demuestra que 2,48 o 2,52 sea la nota correcta; cualquier diagnóstico de una calificación real se trata aparte, sin corregir registros automáticamente.
- Impresión 098 sigue pendiente; no se mezcla su implementación con esta mejora.
