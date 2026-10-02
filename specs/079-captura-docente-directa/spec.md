# Especificación: asistencia sin superposición y captura docente directa

**Rama**: `codex/079-captura-docente-directa` | **Creada**: 2026-09-30 | **Estado**: Alcance y plan aprobados el 2026-10-01 | **Issue**: #165

**Petición**: el panel de asistencia permanece estático y tapa la pantalla; reducir los pasos para que el profesor pueda calificar de manera sencilla.

## Escenarios de usuario y pruebas

### Historia 1 - Tomar asistencia sin un panel que tape la lista (Prioridad: P1)

Como docente quiero ver y marcar a los estudiantes sin que un resumen superpuesto o explicaciones repetidas reduzcan el espacio útil.

**Razón de prioridad**: el resumen actual se mantiene encima de las filas en pantallas anchas. La corrección anterior lo liberó solo en celular.

**Prueba independiente**: recorrer un grupo de 30 alumnos, marcar estados, buscar y limpiar la búsqueda; comprobar que se alcanzan todas las filas y que el guardado incluye al grupo completo.

**Aceptación**:
1. **Dada** la lista, **cuando** se desplaza en cualquier tamaño admitido, **entonces** el resumen ocupa su lugar en el documento y nunca permanece flotando sobre los estudiantes o sus botones.
2. **Dado** el resumen, **cuando** se consulta inicialmente, **entonces** muestra cantidad marcada, pendientes y estado del guardado de manera compacta; el desglose de presentes, tarde, ausentes y excusas se amplía mediante una acción identificada.
3. **Dada** la fecha actual seleccionada, **cuando** se abre asistencia, **entonces** el docente puede buscar y marcar sin atravesar pantallas de instrucciones o confirmar la fecha por separado. La ayuda y los pasos explicativos se consultan bajo una expansión opcional.
4. **Dadas** marcas y observaciones sin guardar, **cuando** se busca, pliega el resumen o consulta ayuda, **entonces** se conservan todos los cambios; el guardado sigue siendo explícito e incluye a los estudiantes ocultos.
5. **Dado** un alumno pendiente, **cuando** se intenta guardar, **entonces** sigue impedido el guardado incompleto y se indica cuántos faltan. Cambiar fecha o salir conserva la advertencia de cambios pendientes.

### Historia 2 - Iniciar calificación directamente desde la evaluación (Prioridad: P1)

Como docente quiero abrir la captura desde la evaluación que ya elegí, sin entrar primero en una pantalla de consulta ni seleccionar otra vez mi materia y evaluación.

**Razón de prioridad**: separar consulta y captura reduce navegación y errores de contexto sin crear otra vista de calificación.

**Prueba independiente**: abrir una evaluación publicada en papel o mixta y entrar en su captura; repetir con una evaluación distinta y con perfiles de consulta, estudiante y administrador.

**Aceptación**:
1. **Dada** una evaluación publicada en papel o mixta y un docente autorizado a calificar por evidencia, **cuando** pulsa «Calificar por foto», **entonces** abre directamente la captura existente con materia y evaluación identificadas, sin elegirlas de nuevo.
2. **Dada** la misma evaluación, **cuando** pulsa «Notas y entregas», **entonces** abre el grupo para consultar notas, revisar o publicar; ambos destinos son distintos y sus etiquetas explican su finalidad.
3. **Dada** una evaluación online, en borrador o un perfil sin permiso de captura, **cuando** se muestran sus acciones, **entonces** no se añade un acceso que permita saltarse sus reglas; se conservan los accesos de revisión ya autorizados.
4. **Dado** un alumno identificado desde el grupo que aún no tiene entrega, **cuando** se abre su captura, **entonces** conserva ese alumno cuando siga siendo elegible; no cambia silenciosamente a otro ni mezcla materias.
5. **Dada** una nota existente o un enlace anterior, **cuando** se abre, **entonces** sigue funcionando con sus permisos y contexto, sin recalificar ni duplicar entregas.

### Historia 3 - Enviar evidencia una sola vez y seguir con el siguiente alumno (Prioridad: P1)

Como docente quiero seleccionar al estudiante, tomar o elegir la evidencia, comprobar a quién corresponde y enviarla con una sola acción explícita.

**Razón de prioridad**: actualmente «Enviar a calificar» abre un segundo diálogo «Confirmar y enviar» que repite la decisión. La identificación y revisión del paquete siguen siendo necesarias, pero pueden ocurrir en la propia pantalla.

**Prueba independiente**: preparar una foto, varias fotos y un documento; enviar, simular aceptación o fallo y comprobar estados, integridad y candidatos siguientes.

**Aceptación**:
1. **Dado** un paquete válido, **cuando** se prepara el envío, **entonces** se ven juntos estudiante, evaluación, cantidad y orden de fotos, o identificación del documento PDF, y un único botón «Enviar a calificar». No se pide después otra confirmación modal del mismo envío ni se inventa el número de páginas de un PDF cuando no se conoce.
2. **Dado** un paquete sin estudiante, vacío o inutilizable según los controles vigentes, **cuando** se consulta, **entonces** el envío está impedido con una explicación y posibilidad de corregirlo; simplificar no elimina controles de calidad, orden o límites.
3. **Dado** un envío en curso, **cuando** se vuelve a pulsar o se intenta cambiar su destinatario, **entonces** no se genera una segunda entrega ni se cambia la asociación. Se mantiene protección frente a salir con evidencia sin guardar.
4. **Dado** un envío aceptado, **cuando** se confirma la recepción del sistema, **entonces** se indica «Entrega guardada; calificando», el alumno deja de ser candidato a otra carga ordinaria y puede añadirse la evidencia de otro sin esperar al resultado de la IA.
5. **Dado** un fallo de envío, **cuando** se muestra, **entonces** no se anuncia éxito ni se elimina al alumno; conserva el paquete y permite corregir o reintentar sin cambiar el destinatario.
6. **Dada** una calificación terminada, **cuando** se consulta, **entonces** mantiene nota y explicación primero, detalle progresivo y decisión final docente; enviar evidencia no confirma ni publica automáticamente la nota.

### Casos límite

- Grupos vacíos o grandes, nombres extensos, búsqueda sin coincidencias y alumnos pendientes ocultos conservan sus estados actuales.
- Un día con asistencia guardada no se convierte en nuevo registro al plegar ayuda o resumen; ampliar detalles no guarda datos.
- Red lenta, fallo y doble pulsación no deben confundirse con aceptación del envío. Las hojas no se descartan antes de una respuesta aceptada.
- Actualizar los candidatos en segundo plano no borra la evidencia preparada. Mientras su elegibilidad o la calidad local de una foto se comprueban, el envío permanece bloqueado con un estado visible, sin añadir una confirmación humana extra.
- Un paquete multihoja requiere revisar todas sus hojas; no se fuerza una selección de una sola imagen para cumplir la meta de menos acciones.
- Un estudiante con entrega o trabajo en cola sigue fuera de candidatos ordinarios; reemplazo y reintento de una entrega existente mantienen su recorrido separado.
- Los avisos de calidad, bloqueos, cambio de fecha o salida con borrador no se omiten por la simplificación. Su aceptación, cuando corresponda, no cuenta como un paso repetido inútil.
- A 200 % de zoom el resumen no se convierte en una superposición. Botones y ayuda siguen accesibles con teclado y desplazamiento.
- La nueva entrada no concede permisos de carga a perfiles de consulta, estudiantes o administradores sin autorización específica.

## Requisitos

### Requisitos funcionales

- **FR-001**: El resumen de asistencia DEBE desplazarse con el documento en todas las anchuras admitidas y NO DEBE cubrir filas ni controles.
- **FR-002**: El resumen DEBE priorizar cantidades marcadas/pendientes, estado y guardado; el desglose completo estará bajo expansión identificada y accesible.
- **FR-003**: Asistencia DEBE abrir con la fecha actual y acceso directo a buscar/marcar; la ayuda repetitiva estará plegada por defecto, sin pantallas o confirmaciones nuevas obligatorias.
- **FR-004**: Marcas, observaciones, pendientes globales, acciones de todo el grupo, guardado explícito y protección de borrador DEBEN conservar su significado y reglas.
- **FR-005**: Una evaluación publicada en papel o mixta DEBE ofrecer captura directa a usuarios ya autorizados y mantener «Notas y entregas» como consulta diferenciada.
- **FR-006**: La captura DEBE conservar materia, evaluación y alumno elegible previamente elegido; no pedirá decisiones de contexto ya conocidas ni creará una vista duplicada.
- **FR-007**: Un paquete válido DEBE enviarse con una única acción explícita, precedida por identidad, evaluación y resumen visible del paquete; NO habrá un segundo diálogo redundante de confirmación.
- **FR-008**: La simplificación DEBE mantener controles de calidad, cantidad y orden de hojas, límites, permisos, exclusión de entregas existentes y protección contra doble envío/cambio de destinatario en curso.
- **FR-009**: Solo un envío aceptado DEBE indicar evidencia guardada y retirarse de candidatos; un fallo conservará destinatario y paquete, mostrará error y permitirá reintento.
- **FR-010**: Tras recepción DEBE poder continuarse con otro estudiante mientras la calificación ocurre en segundo plano; el estado de procesamiento NO DEBE representarse como nota cero.
- **FR-011**: Consulta, revisión por pregunta, alertas, nota manual, confirmación, publicación, evidencia existente y enlaces anteriores DEBEN conservarse, sin publicación automática ni alteración de registros previos.
- **FR-012**: Las acciones DEBEN ser accesibles con teclado, foco y etiquetas, con controles principales de al menos 44 px, claro/oscuro y sin desbordamiento horizontal desde 360 px.

### Entidades clave

- **Borrador de asistencia**: estados y observaciones del grupo para una fecha; solo se guarda mediante acción explícita.
- **Resumen de asistencia**: representación del borrador global, independiente de la búsqueda; expandirlo no cambia registros.
- **Contexto de captura**: materia, evaluación y alumno autorizados que identifican el destino de la evidencia.
- **Paquete de evidencia**: conjunto ordenado existente de fotos o documento, con controles de calidad y límites vigentes.
- **Entrega aceptada**: evidencia recibida y protegida que pasa a procesamiento; no equivale a una nota confirmada o publicada.

## Criterios de éxito

- **SC-001**: A 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, en ambos temas y con zoom 200 %, el resumen nunca flota sobre estudiantes; se alcanzan todas las filas, ayuda, detalle y guardado sin bloqueos ni desbordamiento horizontal.
- **SC-002**: A 390 px y zoom 100 %, el resumen de una jornada con cantidades de hasta dos cifras ocupa como máximo 160 px de alto inicialmente; sus detalles pueden ocupar más al abrirse, siempre dentro del documento. Aumentar zoom conserva acceso y reflujo, sin exigir la misma altura física.
- **SC-003**: Con 30 estudiantes y búsqueda activa, la totalidad de marcas/observaciones y pendientes se conserva al cambiar filtros y expansiones; el guardado incluye al 100 % del grupo y nunca acepta pendientes ocultos.
- **SC-004**: Para una foto válida de un alumno sin entrega, desde la tarjeta de la evaluación el envío requiere como máximo cuatro acciones de la aplicación: abrir captura, elegir estudiante, abrir selección/cámara y enviar. Se excluyen escritura de búsqueda y acciones del selector/cámara del dispositivo, y se compara con las seis acciones actuales equivalentes.
- **SC-005**: Con fotografía, paquete multihoja y documento controlados, un solo envío válido genera una entrega aceptada y un estado visible; fallo o doble pulsación generan cero duplicados, sin pérdida de evidencia ni anuncio de éxito falso.
- **SC-006**: Una entrega aceptada permite continuar con otro estudiante sin esperar al resultado; cero notas se confirman, publican, sustituyen o recalculan por abrir captura, plegar paneles o consultar.
- **SC-007**: Los recorridos y permisos de estudiante, administración, roles personalizados y notas históricas conservan su comportamiento; las verificaciones actuales aplicables siguen pasando.

## Supuestos

- Evolución de la interfaz docente de 078, no un rediseño del cálculo ni del sistema de evaluación. Complementa sus requisitos y conserva su organización progresiva de resultados.
- El acceso rápido se limita a papel/mixta; actividades online conservan su resolución y revisión actuales. La carga desde recorridos ya autorizados sigue funcionando.
- La revisión del destinatario y el paquete se realiza en la propia pantalla antes del botón; no se propone enviar automáticamente al tomar una foto.
- Sin cambios en proveedores/modelos, tiempos de análisis, datos, escala, rúbrica ni publicación. Menos acciones no promete menor latencia del modelo.
- No se incorporan dependencias, servicios o registros nuevos para esta mejora.
- El usuario aprobó este alcance el 2026-10-01 mediante «APROVE» en respuesta a la propuesta consolidada. Al aprobarse el alcance no había cambios funcionales ni despliegue. Posteriormente aprobó el plan y autorizó la revisión asistida de requisitos; la implementación local y su evidencia se registran en `quickstart.md`. Fusión y producción requieren autorización explícita.

## Aclaraciones

### Sesión 2026-09-30

- «Calificar de manera sencilla» se concreta en reducir navegación y confirmación repetida de captura por evidencia, manteniendo la decisión final del docente y sin abreviar el análisis de IA.
- «Panel estático» corresponde a la superposición observada en pantallas anchas, no solo al móvil: la eliminación de la posición flotante debe ser global.
- Se conservan las decisiones necesarias de identidad, evidencia y envío; no se requieren preguntas adicionales de arquitectura o modelos. En esta sesión la aprobación del alcance quedó pendiente.

### Sesión 2026-10-01

- Aprobaciones humanas del alcance y del plan registradas en el issue #165 con etiquetas `spec-approved` y `plan-approved`. No se interpretan como autorización de fusión o despliegue.
- Precisión de presentación: para fotos se cuentan hojas; para un PDF sin cantidad de páginas conocida se identifica un documento, sin fabricar un conteo.
- La comprobación de calidad y la actualización de candidatos son estados de trabajo, no nuevas decisiones del docente; deben conservar la evidencia y las protecciones vigentes.
