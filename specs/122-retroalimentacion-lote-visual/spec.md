# Especificación: retroalimentaciones en lote, enlaces copiables y fichas visuales

**Extensión aprobada**: [Spec126](../126-retroalimentacion-unificada-chat/spec.md), 2026-10-24, reutiliza lote, enlaces y fichas en un espacio común. Permite recordar solo scope/UUID opacos para continuidad del chat; mantiene prohibido almacenar credenciales, mensajes y datos académicos en localStorage. Copiar no crea, renueva ni publica enlaces.

**Rama**: `codex/122-retroalimentacion-lote-visual` | **Creada**: 2026-10-23 | **Estado**: Aprobada por el usuario («aprobe»); revisión de requisitos autorizada («Sí, revisa y continúa») | **Issue**: #257

**Solicitud**: «Aceptar todas y publicarlas», copiar el enlace individual desde el estudiante y todos los enlaces desde retroalimentaciones, mejorar celular y computador y disponer de al menos veinte motivos sin fondo para decorar las fichas impresas.

## Escenarios de usuario y pruebas

### Historia 1 - Aceptar y publicar las notas del grupo (Prioridad: P1)

Como docente quiero aceptar las sugerencias de nota disponibles y publicar las notas y devoluciones de mi evaluación en un lote, sin entrar en cada estudiante ni recalificar con IA.

**Razón de prioridad**: Existen operaciones separadas para confirmar, publicar y autorizar la devolución. Encadenarlas sin un resumen y protección de reintentos puede producir bloqueos, duplicación de historial o sobrescribir ajustes previos.

**Prueba independiente**: Un grupo sintético mezcla propuestas, notas ajustadas, confirmadas, publicadas, cero, resultados en proceso y errores. La acción docente publica únicamente lo autorizado y conserva los ajustes existentes, con resultado individual.

**Aceptación**:
1. **Dadas** notas disponibles, **cuando** el docente pulsa «Aceptar todas y publicar», **entonces** ve el número y alcance del lote, notas que se aceptarán, notas ya ajustadas que se conservarán y casos que requieren intervención; puede cancelar antes de modificar registros.
2. **Dado** ese resumen, **cuando** confirma el lote, **entonces** acepta explícitamente las propuestas seleccionadas y publica sus resultados autorizados; las notas ajustadas o ya confirmadas conservan su valor, y las publicadas no se reconfirman ni retroceden de estado.
3. **Dadas** devoluciones que admiten un resumen docente sin detalle revisado, **cuando** se acepta el lote y su mensaje visible, **entonces** la autorización de la devolución queda ligada a la fuente académica final y no exige otra aprobación por alumno para imprimir o generar enlaces.
4. **Dado** un fallo individual, fuente modificada o ausencia de resultado, **cuando** finaliza el lote, **entonces** el sistema indica qué se publicó, qué no y la acción necesaria; no muestra éxito total ni publica datos obsoletos.
5. **Dado** un reintento tras una respuesta perdida o envío concurrente, **cuando** se consulta o reenvía la misma decisión, **entonces** se recupera su resultado sin duplicar notas, historial, autorizaciones o accesos.

### Historia 2 - Copiar enlaces desde donde trabaja el profesor (Prioridad: P1)

Como docente quiero copiar el enlace de un estudiante desde su ficha y copiar todos los enlaces activos de una evaluación, incluso después de cerrar y volver a abrir la pantalla.

**Razón de prioridad**: El botón individual actual solo funciona para enlaces recién emitidos en esa sesión; la lista guardada no conserva una forma recuperable de copiarlos. No hay copia conjunta.

**Prueba independiente**: Crear enlaces sintéticos, cerrar la pantalla, volver a abrir y copiar uno o varios; los mismos enlaces conservan su vigencia y límite de preguntas.

**Aceptación**:
1. **Dado** un estudiante seleccionado en el espacio docente, **cuando** su devolución está autorizada, **entonces** existe «Copiar enlace»; si todavía no se ha creado, se ofrece crearlo con duración y evidencia opcional claramente visibles.
2. **Dados** enlaces nuevos activos y vigentes, **cuando** el profesor reabre retroalimentaciones o la ficha individual, **entonces** puede copiar el mismo enlace sin reemplazarlo, ampliar su duración ni reiniciar el cupo.
3. **Dados** varios enlaces disponibles, **cuando** pulsa «Copiar todos» o «Copiar seleccionados», **entonces** obtiene una lista privada con el nombre y enlace de cada destinatario, con cantidad copiada y advertencia de entrega individual; no se crea un enlace público común al grupo.
4. **Dado** un enlace histórico cuyo texto ya no es recuperable, **cuando** se desea copiarlo, **entonces** se explica la limitación y se ofrece reemplazo explícito; consultar o copiar otros enlaces no invalida el anterior.
5. **Dado** un navegador que impide copiar, **cuando** falla el portapapeles, **entonces** el profesor puede seleccionar y copiar manualmente el contenido completo sin regenerar enlaces.

### Historia 3 - Entregar fichas claras y agradables (Prioridad: P2)

Como docente quiero fichas individuales organizadas, fáciles de recortar y con motivos decorativos apropiados para estudiantes, sin fondo sólido ni gasto excesivo de tinta.

**Razón de prioridad**: La impresión actual presenta principalmente texto plano; la decoración no debe reducir legibilidad ni desplazar información fuera de la página.

**Prueba independiente**: Previsualizar veinte motivos distintos y la opción sin decoración; imprimir una clase sintética con textos cortos, largos y continuaciones, tanto en A4 como en Carta.

**Aceptación**:
1. **Dado** el selector de impresión, **cuando** el docente lo abre, **entonces** encuentra al menos veinte motivos visualmente diferentes, sin fondo opaco, y una opción «Sin decoración»; puede elegir un motivo o una mezcla estable por estudiante.
2. **Dada** una ficha, **cuando** se previsualiza o imprime, **entonces** conserva nombre, evaluación, nota y retroalimentación organizada; la decoración nunca cubre texto ni comunica éxito o fracaso según la nota.
3. **Dada** una devolución larga, **cuando** ocupa varias partes, **entonces** conserva todo el texto y la identidad del estudiante en sus continuaciones; las líneas de corte y márgenes no recortan el contenido.
4. **Dada** una impresión en blanco y negro o sin ilustración disponible, **cuando** se prepara, **entonces** el texto y la jerarquía siguen siendo legibles y la entrega no queda bloqueada por un fallo decorativo.

### Historia 4 - Trabajar desde celular o computador (Prioridad: P1)

Como docente quiero seleccionar, aceptar, compartir e imprimir sin que un cuadro estrecho, el teclado o una barra fija oculten mis opciones.

**Razón de prioridad**: La aplicación se usa principalmente desde celulares y también debe aprovechar el ancho de escritorio sin saturar la vista.

**Prueba independiente**: Completar los flujos con teclado y en anchos de 360/390/768/1440 px, ambos temas y dos motores de navegador.

**Aceptación**:
1. **Dada** una lista larga, **cuando** se busca, selecciona o cambia de detalle, **entonces** se conserva la selección y el progreso; se diferencia «todo el grupo» de «resultados filtrados» con cantidad explícita.
2. **Dado** un celular con teclado abierto, **cuando** el profesor escribe o copia, **entonces** las acciones y el área de lectura siguen accesibles sin scroll horizontal ni una barra que tape el contenido.

### Casos límite

- Nota cero válida; sin nota, resultado fallido, anulado, en proceso, estudiante retirado o evaluación inaccesible: nunca inventar resultados ni sustituirlos por cero.
- La aceptación global es una decisión explícita del docente, no una publicación automática en segundo plano. Los bloqueos reales de procedencia, claves pendientes o integridad académica conservan sus restricciones y motivo.
- Avisos históricos y desglose pendiente no equivalen por sí solos a ausencia de resumen entregable; no presentar un resumen como detalle revisado ni divulgar claves privadas.
- Los mensajes educativos y recomendaciones se conservan. Las explicaciones técnicas se expresan de forma sencilla y se mantiene visible la incertidumbre pertinente; no inventar logros, errores ni mejoras del aprendizaje.
- Notas publicadas/ajustadas, varias pestañas, reintentos y fallo parcial: nunca sobrescribir decisiones manuales ni duplicar historial.
- Enlace vencido, suspendido, desactivado, heredado no recuperable o secreto de recuperación indisponible: no reactivar ni reemplazar silenciosamente y no mostrar una credencial incompleta.
- Nombres largos, saltos de línea, enlaces extensos, textos de hasta 6.000 caracteres y treinta estudiantes: conservar identidad, asociación y texto completo.
- Ilustración ausente o impresora sin color: mantener la ficha útil sin depender de la decoración.

## Requisitos

### Requisitos funcionales

- **FR-001**: La lista DEBE permitir seleccionar uno, varios o todos los estudiantes con resultado disponible, con alcance y cantidad explícitos, búsqueda y conservación de la selección. La entrega global NO DEBE depender de abrir cada alumno.
- **FR-002**: «Aceptar todas y publicar» DEBE presentar un único resumen y una confirmación global antes de aceptar notas propuestas y publicar. DEBE conservar notas ajustadas/confirmadas y no reconfirmar las ya publicadas. No equivale a recalificar ni puede solicitar otra inferencia.
- **FR-003**: La decisión global DEBE incluir la devolución exacta y su alcance visible. La autorización DEBE corresponder a la fuente final tras publicar, sin otra aceptación por alumno cuando el resumen ya es entregable. Detalles por pregunta no revisados se omiten de la entrega y del contexto de Xali; no se certifican avisos históricos como resueltos.
- **FR-004**: La operación DEBE ser idempotente, aislar fallos por estudiante y conservar un resultado recuperable por solicitud. Cada cambio académico y autorización DEBE registrar actor, fecha y valor o alcance, sin duplicar historial ni emitir enlaces automáticamente.
- **FR-005**: La ficha individual docente DEBE ofrecer copiar su enlace y el menú de la evaluación DEBE ofrecer copiar todos o los seleccionados, con nombre asociado, conteo y aviso de privacidad. Copiar NO DEBE publicar, crear, reemplazar, reactivar ni extender accesos silenciosamente.
- **FR-006**: Los enlaces nuevos DEBEN poder volver a copiarse tras reabrir la pantalla mediante acceso docente autorizado, sin exponer credenciales en listados públicos ni almacenamiento sin protección. Enlaces históricos no recuperables DEBEN conservar su funcionamiento hasta un reemplazo explícito; no se promete reconstruir credenciales que no se guardaron.
- **FR-007**: Se DEBEN conservar permisos, matrícula, versiones de fuente, evidencia opcional, soluciones privadas, destinatario individual, duración de uno a treinta días, revocación y cinco preguntas cada diez minutos por estudiante/evaluación. Copiar o emitir otro acceso NO reinicia la cuota ni la duración de uno anterior.
- **FR-008**: La impresión DEBE ofrecer veinte motivos distintos sin fondo opaco y la opción sin decoración. Cada motivo DEBE poder seleccionarse o asignarse de manera estable en modo variado; no representar premios o castigos según nota ni exigir generación de imágenes por impresión.
- **FR-009**: Las fichas DEBEN conservar nombre, evaluación, materia, nota y retroalimentación con jerarquía, líneas de corte y continuaciones identificadas en A4/Carta. El texto será de al menos 12 pt, sin superposición, truncamiento ni fondos sólidos; debe conservar legibilidad en blanco y negro.
- **FR-010**: Los flujos DEBEN funcionar desde 360 px hasta escritorio, ambos temas y teclado, sin desbordamiento horizontal; objetivos táctiles de al menos 44×44 px y acciones accesibles con teclado abierto. Se DEBE usar detalle progresivo y mensajes comprensibles en lugar de mostrar todo el texto a la vez.
- **FR-011**: Una falla parcial DEBE mostrar por estudiante el resultado efectivo y una acción concreta, con reintento seguro y alternativa de copia manual. NO DEBE excluir casos silenciosamente, afirmar éxito total ni dejar la vista de procesamiento abierta indefinidamente.
- **FR-012**: El cambio NO DEBE recalificar, modificar evidencias, mensajes académicos originales, matrículas, modelos ni configuración de producción. Solo la decisión global explícita solicitada puede confirmar/publicar notas; consultar, decorar, imprimir y copiar nunca realizan esos cambios.

### Entidades clave

- **Decisión docente de lote**: selección y fuente conocidas, opciones visibles, autor, resultado por estudiante y estado recuperable de la misma solicitud.
- **Nota y devolución vigentes**: decisión académica y mensaje entregable, con historial y alcance distintos del análisis original de IA.
- **Acceso individual copiable**: enlace ligado a un destinatario, versión y vigencia; recuperar su copia no otorga nuevos permisos ni renueva su duración.
- **Motivo de ficha**: ilustración decorativa sin fondo, identificador estable, nombre y composición equivalente en previsualización e impresión.

## Criterios de éxito

- **SC-001**: En un grupo sintético de treinta resultados disponibles, el docente puede seleccionar todos, solicitar aceptar/publicar y confirmar el resumen en tres acciones principales, sin entrar en cada estudiante. Las excepciones quedan identificadas individualmente.
- **SC-002**: El 100 % de notas ajustadas conserva su valor y el 100 % de reintentos recupera el resultado sin nuevos cambios, publicaciones, revisiones o accesos duplicados. Consultar, imprimir y copiar produce cero cambios académicos.
- **SC-003**: Los veinte motivos y la opción sin decoración conservan el texto completo y asociación de treinta fichas sintéticas en A4/Carta, color y blanco y negro, incluidos textos extensos y continuaciones.
- **SC-004**: Cada enlace nuevo disponible se copia idéntico antes y después de reabrir, individualmente y en conjunto, conservando vigencia y cupo. La matriz de permisos, versiones y fallos produce cero divulgaciones ajenas ni reemplazos silenciosos.
- **SC-005**: En 360/390/768/1440 px, ambos temas y dos motores, todos los pasos principales son alcanzables con teclado y táctil, sin scroll horizontal, texto tapado ni pérdida de selección.

## Supuestos

- «Aceptar todas y publicar» significa decisión académica explícita sobre notas ya calculadas, no volver a ejecutar la IA. Para las propuestas se aceptará el valor mostrado; ajustes previos tienen prioridad. Los impedimentos de integridad reales no se eluden.
- El acceso «desde el niño» se refiere a la ficha del estudiante vista por su profesor, no a dar al rol estudiante acceso a enlaces de compañeros.
- Los motivos son ilustraciones estáticas creadas una sola vez para el proyecto. No se utilizan fotografías ni nombres de alumnos para generarlas ni se carga el coste de generación a cada impresión.
- Moreno Olivos orienta claridad, concreción y siguiente paso de la presentación; no se añade una evaluación de mejora del aprendizaje ni se amplían los objetivos de tesis.
- Esta propuesta amplía Spec120. Durante la implementación se precisarán los contratos vigentes de Spec107/120 y calificaciones para que no existan reglas contradictorias. El borrador Spec121 no fue aprobado y queda fuera del cambio.
- Se conserva la infraestructura y controles de Xali. No se autoriza enviar preguntas reales a una IA ni ejecutar una aceptación o publicación masiva en producción durante la preparación.
- Fuera de alcance: modelos nuevos, reconfiguración de proveedores, recalificación, listas públicas del grupo, cambios retroactivos de notas y despliegue manual. Pruebas sintéticas, PR y CI precederán a cualquier fusión.
- Spec129 (#272) cambia ubicación/composición, no contratos: publicación explícita en su vista de revisión, pie accesible de selección, preparación/copia juntas y gestión de acceso en contexto. Fichas/motivos siguen intactos; copiar enlaces mantiene vigencia y preguntas disponibles.

## Continuación aprobada: entrega simple135

Spec135 (#287), aprobada mediante «SI ADELANTE» el2026-10-29, concreta la preparación común de mensajes y permite una confirmación explícita compuesta para aceptar/publicar y preparar enlaces, individuales o seleccionados. Sustituye para ese recorrido la obligación anterior de pantallas/gestos separados, no las autorizaciones ni guardas académicas. Copiar sigue siendo otro gesto sin escrituras; notas ajustadas, incertidumbres sustantivas, originales y accesos cerrados se conservan. Presentación/recuperación y pruebas se definen en [spec135](../135-retroalimentacion-entrega-simple/spec.md); no implica despliegue.
