# Especificación: revisión móvil de evaluaciones calificadas

**Rama**: `codex/136-revision-movil-calificada` | **Creada**:2026-10-30 | **Estado**: especificación y plan aprobados por el usuario el2026-10-30 | **Issue**: [291](https://github.com/Andres-back/Calificator/issues/291).

**Solicitud**: revisar la navegación de respuestas/puntajes y retroalimentación desde un Samsung S23 Ultra: ocho preguntas aparecen como una lista vertical extensa y el mensaje solo se desplaza desde el margen derecho. Concreta la experiencia responsive de Specs131/134/135 sin cambiar sus contratos académicos, prioridades de revisión o permisos.

## Escenarios de usuario y pruebas

### Historia1 — Llegar a la respuesta sin recorrer una lista extensa (Prioridad P1)

Como docente quiero elegir una pregunta desde controles compactos y leer enseguida la respuesta, evidencia y puntaje, sin que ocho botones ocupen casi toda la pantalla.

**Razón de prioridad**: navegar no debe exigir más espacio que revisar la respuesta.

**Prueba independiente**: evaluaciones sintéticas con8,17 y30 preguntas, números largos o repetidos, estados mixtos y una respuesta con puntaje en edición.

**Aceptación**:
1. Con ocho preguntas y texto normal en un celular de360–412px, sus accesos caben en dos filas, conservando número, prioridad identificable sin depender solo del color y selección visible. El puntaje/estado completo se mantiene en el detalle seleccionado y su nombre accesible.
2. El docente puede ir a la pregunta anterior o siguiente sin buscar de nuevo la lista; primera y última no salen de rango ni seleccionan otra evaluación.
3. Cambiar de pregunta conserva el comportamiento vigente de confirmación de borradores y la evidencia/versionado de131. No modifica puntajes, nota global o estado de publicación.
4. En computador los controles siguen siendo legibles y aprovechan el ancho; con texto ampliado se reorganizan sin ocultar preguntas o forzar dos filas a costa de la legibilidad.

### Historia2 — Leer retroalimentación deslizando sobre el mensaje (Prioridad P1)

Como docente quiero recorrer el mensaje y llegar a sus acciones arrastrando desde el centro o cualquiera de los márgenes de la zona de lectura, no únicamente junto a la barra lateral.

**Razón de prioridad**: un cuadro interior no debe dejar inmóvil una página larga.

**Prueba independiente**: retroalimentación larga dentro de la calificación, revisión/edición, compartir, imprimir y centro del grupo abierto como ventana independiente.

**Aceptación**:
1. En la retroalimentación integrada, desplazar sobre el texto mueve el contenido principal en ambas direcciones; no hay un recuadro sin recorrido que intercepte el gesto.
2. Leer, editar, compartir o previsualizar la impresión no atrapa el desplazamiento ni deja acciones inaccesibles; cerrar el teclado no pierde el mensaje.
3. La ventana independiente del grupo conserva su propio desplazamiento y bloqueo del fondo; no desplaza la página que queda detrás.
4. Cambiar entre Respuestas y puntajes, Evidencia, Retroalimentación e Historial conserva el estudiante y sus datos. Cabecera, acciones fijas y zona segura no tapan el final del contenido.

### Casos límite

- Nombres, números de pregunta, criterios y mensajes largos; prioridades seguras, dudosas y urgentes: reorganizar presentación sin cambiar la clasificación existente.
-8/17/30 preguntas, horizontal, texto150%/200%, ambos temas y poco alto por teclado: permitir más filas cuando sea necesario y mantener controles de al menos44px.
- Borradores sin guardar, operación pendiente, cambio de estudiante/cuenta/permisos y lectura tardía: respetar bloqueos y descarte existentes, sin guardar o publicar al navegar.
- Nota confirmada/publicada, sin desglose o sin coordenadas: no exigir recalificar para obtener la mejora de presentación. La evidencia antigua mantiene hoja completa y zoom manual.
- Una imagen ampliable mantiene sus gestos deliberados de zoom; no eliminar globalmente sus protecciones para resolver el texto de retroalimentación.

## Requisitos

### Requisitos funcionales

- **FR-001**: Mostrar accesos compactos de preguntas en celular, con número/prioridad/selección y acceso inequívoco al contenido completo; ocho preguntas en dos filas con texto normal desde360px.
- **FR-002**: Permitir avanzar o retroceder una pregunta con posición actual y total identificables, límites de inicio/fin y las protecciones vigentes de borrador.
- **FR-003**: Permitir desplazar la retroalimentación integrada desde el centro y márgenes útiles, sin zonas internas que retengan un gesto sin poder desplazarse.
- **FR-004**: Distinguir la lectura integrada de una ventana independiente: la primera comparte el recorrido principal y la segunda conserva desplazamiento propio y bloqueo del fondo.
- **FR-005**: Conservar lectura, edición, compartir, copia, impresión y retorno de foco/selección durante la navegación; no ejecutar acciones académicas por desplazarse, seleccionar o abrir.
- **FR-006**: Mantener controles y contenido accesibles desde360px hasta escritorio, ambos temas, horizontal y texto ampliado, sin desbordamiento horizontal, solapamientos o acciones tapadas por el teclado/zona segura.
- **FR-007**: Conservar nota, puntajes, texto, evidencias, prioridades, permisos y enlaces existentes; no modificar modelos, llamadas, contratos de servidor ni registros históricos para aplicar la mejora visual.
- **FR-008**: Verificar listas cortas/largas y desplazamiento desde el contenido, no solo dimensiones o asignaciones directas de posición. Distinguir la emulación de una comprobación física en el S23 Ultra.

### Entidades clave

- **Pregunta seleccionada**: identidad y posición vigentes del componente; reutiliza su puntaje, estado y evidencia sin generar una nueva calificación.
- **Borrador docente**: cambios todavía no guardados que mantienen sus confirmaciones existentes al navegar.
- **Contexto de lectura**: detalle integrado o ventana independiente, con su dueño de desplazamiento, selección y retorno.

## Criterios de éxito

- **SC-001**: En360/384/390/412px y texto normal, ocho accesos ocupan como máximo112px en dos filas; los ocho son seleccionables y la respuesta conserva la información completa.
- **SC-002**: En las muestras de8/17/30 preguntas, anterior/siguiente y selección directa llegan siempre al componente esperado, sin salir de rango ni perder un borrador sin la decisión vigente.
- **SC-003**: Los recorridos de retroalimentación integrada avanzan y retroceden desde centro, izquierda y derecha; ningún caso exige usar exclusivamente la barra lateral. La ventana del grupo no mueve el fondo.
- **SC-004**: En la matriz360/384/390/412/768/1440px, dos temas, horizontal y texto ampliado no hay desbordamiento horizontal ni pérdida de acciones; los recorridos de diagnóstico/navegación generan cero escrituras académicas y cero llamadas a IA.

## Supuestos

- El usuario aprobó este alcance y plan el2026-10-30. La implementación requiere tareas y análisis; fusionar o desplegar requiere autorización y CI posteriores.
- La intervención prevista es exclusivamente frontend, sin migración, nuevos recursos gráficos o dependencias. No se cambia el contenido de la retroalimentación ni su regla de aprobación.
- Las coordenadas opcionales y el acercamiento de131 se conservan, sin solicitudes adicionales al seleccionar una pregunta.
- La prueba inicial usa datos sintéticos locales. El usuario dispone de un S23 Ultra, pero no se ha confirmado una comprobación física del arreglo. No se accede a cuentas docentes o fotografías reales para este diagnóstico.
