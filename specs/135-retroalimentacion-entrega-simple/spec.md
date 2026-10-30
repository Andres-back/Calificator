# Especificación: retroalimentación clara y entrega en una confirmación

**Rama**: `codex/135-retroalimentacion-entrega-simple` | **Creada**: 2026-10-29 | **Issue**: #287

**Estado**: alcance y diseño funcional aprobados mediante «SI ADELANTE», después de explicar las seis mejoras. No autoriza fusionar, desplegar, cambiar modelos ni usar datos reales o nuevas llamadas a IA.

**Solicitud**: reducir la carga docente al aprobar y compartir, ordenar el mensaje, reutilizar motivos existentes y mejorar celular/computador. Concreta Specs120/122/123/126/129; sustituye únicamente la separación obligatoria entre aprobar y preparar enlaces de Spec129 por una confirmación compuesta explícita. Copiar sigue siendo una acción distinta y sin escrituras académicas.

## Escenarios de usuario y pruebas

### US1 — Aprobar y entregar sin repetir pasos (Prioridad P1)

Como docente quiero seleccionar estudiantes, comprobar qué recibirán, aprobar y preparar sus enlaces con una confirmación, y copiarlos en el mismo lugar.

**Valor**: una nota confirmada no debería obligarme a descubrir otro formulario para convertir un aviso interno en un mensaje entregable.

**Prueba independiente**: grupo sintético de cuarenta estudiantes con notas sugeridas, ajustadas, publicadas y sin nota; mensajes válidos, provisionales conocidos y contradictorios; enlaces activos, ausentes y cerrados.

**Aceptación**:
1. Con nota confirmada y envoltorio provisional conocido, la preparación individual y en lote muestra el mismo mensaje entregable, conserva el análisis original y permite aprobación expresa sin editar manualmente ese envoltorio.
2. Con notas sugeridas y ajustadas, una confirmación identifica estudiantes, notas, mensajes y opciones antes de aceptar las sugeridas o conservar las ajustadas y crear solamente los enlaces autorizados que faltan.
3. Un enlace activo se recupera y copia sin sustituirlo, renovar vigencia, reiniciar cuota o volver a aprobar su contenido. Los cerrados requieren gestionar su estado por separado, sin reactivación implícita.
4. Doble clic, respuesta perdida y fallo parcial conservan solicitudes, selección y resultados por destinatario; no se anuncia copia o éxito de destinatarios inciertos.
5. Copiar e imprimir no aprueban notas por sí mismos. Mensajes vacíos, genéricos, contradictorios o con dudas sustantivas siguen ofreciendo una explicación concreta y una corrección en contexto.

### US2 — Entender cómo mejorar (Prioridad P1)

Como estudiante o familiar quiero leer qué muestra mi entrega y qué puedo practicar, sin instrucciones internas ni párrafos interminables.

**Valor**: ordenar el mensaje no debe inventar logros ni convertir dudas de lectura en errores del estudiante.

**Prueba independiente**: mensajes con encabezados, preguntas, pasos concretos, texto antiguo sin estructura y advertencias desconocidas.

**Aceptación**:
1. Los logros presentes, las explicaciones por pregunta y los pasos de práctica se distinguen visualmente y conservan el contenido original; una sección ausente no se rellena con una afirmación inventada.
2. Solo se separa del mensaje entregable el envoltorio interno conocido. Los avisos originales siguen disponibles para el docente, y la incertidumbre académica o textual desconocida no se borra.
3. La vista del docente y el enlace individual reutilizan la misma presentación legible. Decoración y formato no certifican corrección académica ni alteran la nota.
4. La impresión mantiene completo el mensaje autorizado, con lectura en blanco y negro y opción sin decoración.

### US3 — Trabajar cómodamente en celular y computador (Prioridad P1)

Como docente quiero leer y entregar desde una vista amplia con acciones cercanas, sin buscar botones entre cuadros con desplazamientos propios.

**Prueba independiente**: 360/390/768/1440 px, claro/oscuro, teclado, texto ampliado, nombres y mensajes largos, imágenes decorativas ausentes.

**Aceptación**:
1. El detalle integrado usa el espacio de lectura disponible, sin otro recuadro de altura fija dentro; el grupo conserva lista/detalle en escritorio y navegación de una vista en celular.
2. La acción principal y el resultado de copia permanecen accesibles en el mismo panel; no hay desplazamiento horizontal ni botones tapados por teclado o zona segura.
3. «Sin guardar» aparece solo por cambios reales. Una operación pendiente tiene su propio estado y conserva los bloqueos necesarios sin fingir una edición.
4. Los motivos existentes se muestran pequeños, proporcionales y decorativos; si fallan, no ocultan texto ni bloquean acciones. Nunca dependen de la nota, género o capacidad del estudiante.

### Casos límite

- Cambio de cuenta, permisos, estudiante, evaluación o evidencia durante una operación: no exponer resultados tardíos ni perder la recuperación idempotente autorizada.
- Un mensaje editado no se reemplaza por el mensaje automático. Una modificación concurrente produce conflicto recuperable, no una aceptación del contenido antiguo.
- La aprobación de un resumen no aprueba un desglose incompleto: no se publican puntajes dudosos ni se envían ocultamente a Xali.
- Enlace vencido/desactivado/suspendido o múltiples accesos: no confundir copiar con renovar ni escoger silenciosamente una nueva autorización.
- Portapapeles denegado: selección manual del conjunto confirmado, sin crear enlaces adicionales.
- Sin nota, sin texto útil o evidencia ilegible: explicar la acción pendiente; no inventar una calificación o recomendar estudiar un error no demostrado.

## Requisitos

### Requisitos funcionales

- **FR-001**: La preparación individual y en lote DEBE usar la misma regla de mensaje entregable y separar únicamente el envoltorio provisional interno conocido; el texto académico, original e historial se conservan.
- **FR-002**: El docente DEBE poder aprobar y preparar enlaces individuales o de los seleccionados mediante una confirmación explícita con destinatarios, notas, mensajes y opciones visibles; abrir o seleccionar no realiza esas operaciones.
- **FR-003**: La operación compuesta DEBE conservar notas ajustadas/confirmadas y aceptar sugeridas solo conforme a la decisión explícita mostrada. Un resumen no autoriza el detalle pendiente por pregunta.
- **FR-004**: Los enlaces activos DEBEN reutilizarse. Preparar solo crea los faltantes elegibles; no reactiva, sustituye ni prolonga accesos cerrados ni reinicia cuotas.
- **FR-005**: La operación DEBE conservar identidad e idempotencia ante doble clic, fallos parciales y respuesta incierta, con estados por destinatario y recuperación de la misma solicitud antes de otra escritura.
- **FR-006**: Copiar DEBE requerir un gesto propio, mostrar el conjunto confirmado y ofrecer alternativa manual; no cambia notas, mensajes, accesos ni su vigencia. Imprimir tampoco publica de forma implícita.
- **FR-007**: Mensajes genéricos, vacíos, contradictorios y dudas sustantivas DEBEN conservar sus comprobaciones y ofrecer una explicación concreta y corrección en el mismo contexto.
- **FR-008**: La presentación DEBE distinguir logros documentados, aspectos concretos por mejorar y práctica recomendada cuando existan, sin crear contenido ni perder o reinterpretar texto antiguo.
- **FR-009**: Docente y enlace individual DEBEN compartir una presentación legible del mensaje autorizado; avisos internos e historial permanecen privados. No afirmar corrección académica por pasar una comprobación de presentación.
- **FR-010**: La vista DEBE reutilizar motivos curados existentes, sin solicitudes nuevas de generación ni dibujos asociados al desempeño; decoración ausente o sin cargar no impide leer ni entregar.
- **FR-011**: La impresión DEBE conservar mensaje completo, identidad y nota, opción sin decoración y compatibilidad A4/Carta en color o blanco y negro.
- **FR-012**: El detalle integrado NO DEBE introducir otro contenedor de altura fija con desplazamiento independiente; acciones/resultados se mantienen en contexto en 360/390/768/1440, ambos temas, texto ampliado, teclado y zona segura.
- **FR-013**: Cambios reales y operaciones pendientes DEBEN tener estados distintos. «Sin guardar» no se usa para carga, aprobación ni preparación de enlaces sin una edición.
- **FR-014**: Se DEBEN conservar selección y borradores ante errores y rechazar resultados tardíos/cambios concurrentes; permisos y autorización se comprueban en cliente y servidor.
- **FR-015**: Las pruebas DEBEN cubrir ambos accesos al centro, individual/lote, estados mixtos, permisos, conflictos, copia, impresión y tamaños de pantalla con datos sintéticos, sin llamadas IA ni datos reales.
- **FR-016**: El cambio NO DEBE recalificar, alterar evidencias o modelos ni modificar caducidad, privacidad por estudiante y cinco preguntas cada diez minutos; no incluye despliegue ni activaciones.

### Entidades clave

- **Mensaje entregable**: texto derivado conservadoramente del análisis o de la edición docente, separado de avisos internos, autorizado con su revisión vigente.
- **Decisión de entrega**: aceptación explícita de notas y mensajes concretos, con alcance de resumen o detalle ya permitido.
- **Preparación compuesta**: instantánea de destinatarios/opciones, recibos de aprobación y creación y resultados confirmados/fallidos/inciertos; no equivale a copiar.
- **Presentación del mensaje**: grupos legibles y motivo decorativo, independientes de la calificación y de la autorización.

## Criterios de éxito

- **SC-001**: Después de seleccionar, un caso válido se aprueba/prepara con una confirmación y se copia con otro gesto, sin salir del contexto para aprobar y sin recorrer inicio/final de la lista.
- **SC-002**: Todas las pruebas de mensajes con envoltorio conocido producen igual texto entregable individual/lote; avisos originales y dudas desconocidas se conservan y ninguna nota ajustada se sobrescribe.
- **SC-003**: En todos los casos ensayados, solo se copian destinatarios confirmados; doble clic/recuperación no duplican la misma operación y los accesos activos/cerrados conservan sus reglas.
- **SC-004**: Los mensajes de la muestra conservan íntegro su contenido académico en pantalla/enlace/impresión, sin introducir logros ni pasos ausentes; los rechazos por incoherencia y falta de utilidad permanecen comprobados.
- **SC-005**: Los recorridos de los cuatro tamaños, ambos temas y teclado no presentan desbordamiento, acciones inaccesibles ni falsos «Sin guardar» por una operación; un motivo ausente no bloquea la lectura.
- **SC-006**: Las regresiones aplicables y CI pasan sin omitir permisos, privacidad, límites, conflictos o recuperación; ninguna prueba utiliza datos reales, proveedor IA o modifica producción.

## Supuestos

- La aprobación humana corresponde al diseño presentado y se concreta aquí sin ampliar a regeneración masiva ni nuevas inferencias.
- «Buena» retroalimentación implica conservar explicaciones y pasos específicos ya sustentados, y no presentar decoración como evidencia de validez pedagógica. La evaluación humana de calidad es independiente.
- Se reutilizan biblioteca y operaciones actuales. No se introduce una migración, un modelo de IA, una cuota ni un enlace público con las notas del grupo.
