# Especificación: retroalimentaciones fáciles de revisar y compartir

**Rama**: `codex/129-retroalimentacion-flujo-claro` | **Creada**: 2026-10-26 | **Estado**: Especificación y plan aprobados por el usuario el 2026-10-26 («Aprueb») | **Issue**: [#272](https://github.com/Andres-back/Calificator/issues/272)

## Escenarios de usuario y pruebas

### Historia 1 - Compartir sin recorrer repetidamente la pantalla (Prioridad: P1)

Como docente, quiero seleccionar estudiantes en cualquier punto de la lista y preparar/copiar sus enlaces sin tener que volver al comienzo o buscar resultados al final.

**Razón de prioridad**: el usuario reporta desplazamientos repetidos entre selección, creación y copia; afecta especialmente a grupos numerosos desde celular.

**Prueba independiente**: con cuarenta estudiantes y estados mixtos, seleccionar al comienzo, mitad y final; preparar enlaces y copiarlos desde el mismo lugar. Comprobar destinatarios y no modificar notas, vigencias ni accesos que no se solicitaron.

**Aceptación**:
1. **Dado** un grupo largo, **cuando** selecciono estudiantes mientras me desplazo, **entonces** veo siempre el contador y las acciones Compartir/Imprimir, sin regresar al inicio o final; nada tapa la última fila.
2. **Dado** que abro Compartir, **cuando** reviso destinatarios y opciones, **entonces** puedo crear únicamente los enlaces que faltan y están listos, y ver en el mismo panel el resultado y las acciones de copia individual/en conjunto.
3. **Dado** un enlace activo recuperable, **cuando** pido copiarlo, **entonces** se reutiliza sin crear otro, cambiar su duración ni reactivar uno cerrado.
4. **Dado** un fallo parcial o de conexión, **cuando** termina la solicitud, **entonces** distingo confirmados, fallidos e inciertos, conservo la selección y puedo recuperar/reintentar la misma operación sin duplicar enlaces.

### Historia 2 - Entender cada estudiante con una lista ordenada (Prioridad: P2)

Como docente, quiero identificar nombre, nota y estado de cada devolución de un vistazo, y abrir el mensaje completo o sus opciones solo cuando lo necesite.

**Razón de prioridad**: varias listas, párrafos extensos y botones repetidos compiten con el objetivo de entregar la retroalimentación.

**Prueba independiente**: buscar y filtrar una muestra con homónimos, mensajes largos, enlaces activos/vencidos y notas pendientes. Abrir, revisar y volver a la lista sin perder selección ni posición innecesariamente.

**Aceptación**:
1. **Dado** el grupo, **cuando** entro, **entonces** cada fila compacta identifica estudiante, nota, estado y acciones pertinentes, sin desplegar automáticamente todo el texto ni duplicar una lista de enlaces al final.
2. **Dado** una búsqueda o filtro, **cuando** cambia lo visible, **entonces** la selección se conserva por identidad y el contador explica si incluye estudiantes fuera del filtro; seleccionar en bloque declara su alcance.
3. **Dado** un estudiante, **cuando** abro su retroalimentación, **entonces** la leo/edito/reviso en un detalle coherente con el acceso individual; respuestas/evidencia siguen accesibles y los cambios sin guardar no se pierden silenciosamente.
4. **Dado** una nota pendiente, **cuando** intento compartir, **entonces** entiendo qué requiere revisión y puedo revisar o elegir explícitamente solo los listos. Compartir/copiar/imprimir nunca publica o confirma una nota de manera implícita.

### Historia 3 - Trabajar cómodamente desde celular y computador (Prioridad: P2)

Como docente, quiero la misma devolución y reglas en ambas pantallas, con una distribución adaptada al espacio, legibilidad y acciones fáciles de encontrar.

**Razón de prioridad**: una ventana de escritorio reducida no resuelve el espacio del teclado ni los desplazamientos en celular.

**Prueba independiente**: completar selección, detalle, compartir/copia e impresión en anchuras 360/390/1440 y ambos temas, con texto ampliado, teclado y nombres extensos.

**Aceptación**:
1. **Dado** escritorio, **cuando** reviso el grupo, **entonces** dispongo de lista y detalle relacionados sin listas duplicadas ni superposición de controles; el contenido mantiene una jerarquía clara.
2. **Dado** celular, **cuando** abro la vista, **entonces** utiliza el espacio disponible, conserva búsqueda y acciones accesibles y no tapa contenidos con barras, zona inferior del dispositivo o teclado.
3. **Dado** que el navegador rechaza copiar, **cuando** pulso la acción, **entonces** dispongo del texto individual o del conjunto preparado para copiar manualmente sin perder el resultado.
4. **Dado** la preparación de impresión, **cuando** vuelvo, **entonces** conservo selección y contexto; siguen disponibles las fichas, motivos y formatos existentes sin convertir la impresión en una publicación o un enlace público.

### Casos límite

- Nombres iguales, largos, notas cero y mensajes extensos: identidad estable, nota correcta y texto legible, sin truncamiento irreversible ni mezclar alumnos.
- Una selección puede incluir resultados ocultos por búsqueda, pendientes de revisión, sin nota o con enlace vencido; nunca compartir implícitamente otro conjunto ni sustituir la selección por todo el grupo.
- Un enlace activo antiguo puede no ser recuperable. Explicar y ofrecer sus opciones actuales; no renovarlo automáticamente ni presentar un botón que promete copiar algo inexistente.
- Si ya hay varios enlaces históricos o activos, conservarlos e identificar sus opciones; no borrarlos ni afirmar que el sistema garantiza un único enlace por estudiante frente a operaciones nuevas simultáneas de otras pestañas.
- Enlaces vencidos, desactivados, suspendidos o contenido modificado requieren el tratamiento vigente; copiar no elude la autorización ni restablece preguntas disponibles.
- Cambios concurrentes de nota, mensaje, evidencia o estado del enlace: respetar el resultado actual del servidor, actualizar el estado visible y no considerar válida una preparación obsoleta.
- Fallos parciales, doble clic y respuesta incierta: mantener identidad de la operación y distinguir los casos que aún no tienen confirmación, sin avisos falsos de éxito completo.
- Renovación normal de sesión del mismo usuario no debe perder selección por un cambio de referencia; cambio de cuenta, cierre de sesión o revocación de permiso retira el estado privado y bloquea resultados tardíos.
- Navegación atrás, cierre del detalle/compartir y retorno de impresión conservan contexto cuando es seguro; un mensaje sin guardar exige resolverlo antes de descartarlo.
- La vista individual integrada en revisión de calificaciones no debe producir dos barras inferiores simultáneas ni otro centro con reglas distintas.
- Copia restringida por el navegador o teclado/pantalla estrecha: alternativa manual, foco controlado y acciones accesibles sin desbordamiento ni contenido tapado.

## Requisitos

### Requisitos funcionales

- **FR-001**: El docente autorizado DEBE disponer de un centro de retroalimentaciones coherente entre acceso de grupo e individual, sin listas funcionalmente duplicadas de estudiantes/enlaces recién creados/enlaces guardados.
- **FR-002**: La lista DEBE mostrar de forma compacta nombre, nota cuando exista, estado comprensible, selección y acciones pertinentes; el mensaje completo DEBE poder abrirse sin desplegar todos por defecto.
- **FR-003**: Selección, búsqueda y filtros DEBEN operar por identidad, conservar el conjunto entre vistas y explicar seleccionados fuera del filtro. La selección masiva DEBE indicar su alcance y permitir limpiar o seleccionar los listos del filtro activo.
- **FR-004**: El contador y las acciones Compartir/Imprimir DEBEN permanecer accesibles al desplazarse, con un único punto principal de acciones por contexto, sin tapar contenido ni competir con otra barra de la página.
- **FR-005**: Compartir DEBE mostrar destinatarios, estado y opciones de vigencia/evidencia, manteniendo tres días y evidencia oculta como valores iniciales; ninguna escritura DEBE ocurrir solo por seleccionar o abrir el panel.
- **FR-006**: Preparar enlaces DEBE reutilizar los activos recuperables y crear solo los faltantes elegibles bajo confirmación explícita. Copiar NO DEBE crear, renovar, reemplazar, reactivar o prolongar accesos ni reiniciar el límite de preguntas.
- **FR-007**: El resultado DEBE aparecer en el mismo panel desde el que se preparó, con cantidad y destinatarios, copia del conjunto preparado y copia individual; sin exigir volver al principio/final de la lista para encontrarlo.
- **FR-008**: Ante fallo parcial, incertidumbre o acceso no recuperable, la vista DEBE distinguir listos/fallidos/sin confirmar, conservar selección y ofrecer recuperación/reintento sin duplicados. Copiar un subconjunto confirmado DEBE identificar exactamente qué se copiará.
- **FR-009**: El docente DEBE conservar revisión, edición del mensaje y aceptación/publicación individual o en lote actuales, como operaciones expresas separadas de compartir/copiar/imprimir; ajustes previos y mensajes sin guardar NO DEBEN perderse ni sobrescribirse por cambiar de vista.
- **FR-010**: Enlaces vencidos, desactivados o suspendidos DEBEN mostrar su estado y opciones actuales en contexto, con las confirmaciones vigentes. Reemplazar o reactivar NO DEBE confundirse con copiar.
- **FR-011**: Lista, detalle, opciones y resultado DEBEN respetar permisos y estado académico actuales; resultados tardíos tras cambio de contexto/cuenta o retirada de permisos NO DEBEN exponerse ni ejecutarse como válidos.
- **FR-012**: El panel DEBE permitir copia manual cuando el navegador impide copiar, conservando el conjunto confirmado y sin almacenar enlaces privados fuera del contexto autorizado.
- **FR-013**: Escritorio DEBE relacionar lista y detalle; celular DEBE usar una vista de espacio completo con navegación clara. Ambos DEBEN conservar lectura/acciones en 360/390/1440, claro/oscuro, texto ampliado, teclado y zona segura del dispositivo, sin desbordamiento horizontal ni controles tapados.
- **FR-014**: Controles DEBEN tener nombres claros y objetivos táctiles mínimos de 44 px, foco visible, navegación con teclado, estados no dependientes solo del color y mensajes accesibles de progreso/éxito/error. No mostrar mensajes técnicos ni notificar enlaces como copiados si no ocurrió.
- **FR-015**: Impresión y motivos existentes DEBEN mantenerse accesibles desde la selección sin perderla al volver; las fichas siguen siendo individuales y privadas, sin rehacer su contenido o distribución como parte de este cambio.
- **FR-016**: La entrega NO DEBE alterar notas, evidencias, historial, modelos IA, enlaces anteriores ni reglas de duración/revisión/límite de cinco preguntas por diez minutos. DEBE incluir pruebas con datos sintéticos, ambos contextos y fallos, sin llamadas IA ni cambios de producción no autorizados.

### Entidades clave

- **Centro de retroalimentaciones**: contexto de evaluación y docente que reúne selección, detalle y entrega, con acciones coherentes entre entradas.
- **Fila de estudiante**: identidad, nota, devolución revisable y estado de enlace, sin confundir disponibilidad de mensaje con autorización para entregarlo.
- **Selección docente**: conjunto explícito que persiste al buscar/cambiar de detalle y define exactamente los destinatarios de una acción.
- **Preparación de entrega**: destinatarios, opciones y resultados confirmados, fallidos o inciertos de la misma solicitud; no equivale a publicación de notas.
- **Acceso individual**: enlace privado existente con estado, vigencia y controles que conservan sus reglas actuales.

## Criterios de éxito

- **SC-001**: En un grupo de cuarenta estudiantes, el docente puede seleccionar desde el comienzo/mitad/final y completar preparar/copiar sin regresar al comienzo o final para localizar controles o resultados; las acciones permanecen visibles y la última fila no queda tapada.
- **SC-002**: En todos los casos de selección, búsqueda y resultados parciales de la muestra, el conjunto copiado coincide exactamente con los destinatarios confirmados mostrados; ningún estudiante no seleccionado o resultado incierto se presenta como compartido.
- **SC-003**: El 100 % de los casos de copiar un enlace activo conserva su identidad, vigencia, estado y uso de preguntas; compartir/copiar/imprimir por sí solos no cambian notas ni evidencias. Reintentos de la misma operación no producen duplicados.
- **SC-004**: Los flujos de grupo e individual son completables en 360/390/1440 y ambos temas, con texto ampliado y espacio reducido de teclado, sin desbordamiento, acciones tapadas o pérdida silenciosa de selección/edición.
- **SC-005**: Fallos de red/copia, permisos revocados y cambios concurrentes dejan un estado comprensible y recuperable en todos los casos ensayados; nadie recibe un mensaje falso de copia completa ni acceso a otro contexto.

## Supuestos

- «Adelante» del 2026-10-26 aceptó preparar el diseño; «Aprueb» aprobó después este documento, el plan y la revisión de calidad para continuar implementando si está completa. No autoriza fusionar, desplegar ni probar con alumnos reales.
- «Premium» significa jerarquía, legibilidad, consistencia y menos desplazamientos; no añade generación de imágenes, animaciones nuevas ni decoración que compita con el mensaje.
- El alcance es organización e interacción del frontend, reutilizando reglas y operaciones existentes. Si los contratos no permiten conservar el comportamiento previsto, se explicará el límite antes de ampliar backend o esquema.

## Corrección del recorrido de pendientes — 2026-10-29

Hotfix [#283](https://github.com/Andres-back/Calificator/issues/283), autorizado mediante «resuelve y continua», después de mostrar el bloqueo de compartir una nota publicada. Concreta US1/AC2, US2/AC3–4 y FR-005/007/009/011/014/016 sin cambiar elegibilidad ni backend: ofrecer la revisión docente permitida por el servidor dentro del mismo panel de compartir. Una nota publicada no autoriza por sí sola un desglose pendiente; el docente puede aprobar expresamente solo nota/mensaje mediante la operación existente.

Abrir o cancelar esta revisión no emite enlaces. Aprobar vuelve al mismo panel, conservando destinatarios, opciones y enlaces ya preparados; crear y copiar continúan siendo gestos separados. Guardar solo el mensaje no equivale a aprobarlo. Los accesos cerrados y solicitudes inciertas conservan su tratamiento, y cero enlaces preparados no se presenta como éxito. Casos de aceptación: ambas entradas, nota publicada con desglose pendiente, mezcla de listos/pendientes, borrador/conflicto, opciones conservadas y retirada de permisos. Sin datos reales ni cambios en producción; implementación y validación local del hotfix completadas, con evidencia y límites en quickstart.md.
- Se mantienen enlaces individuales; copiar varios produce una lista privada para el docente que se entrega por separado. No se crea un enlace público con las notas del grupo.
- Aprobar/publicar sigue siendo decisión explícita docente. No se añade un nuevo bloqueo académico ni se retiran protecciones para hacer parecer más corto el recorrido.
- Los valores y límites vigentes de enlaces, evidencia y chat se conservan; las pruebas de navegador no acreditan por sí solas un iPhone/Android físico.
- La protección de duplicados se refiere a doble clic y recuperación/reintento de la misma operación. No se amplía la regla actual para impedir de forma global dos solicitudes nuevas independientes concurrentes.
