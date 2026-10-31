# Especificación: generar una vez y volver a copiar la retroalimentación

**Rama**: `codex/139-envio-retroalimentacion-simple` | **Creada**: 2026-10-31 | **Estado**: alcance y plan aprobados mediante «aprobado»; implementación y validación local completas, preparado para PR/CI | **Issue**: [#297](https://github.com/Andres-back/Calificator/issues/297)

## Contexto y alcance

El docente necesita generar los enlaces una vez y encontrarlos al volver a la evaluación o al estudiante, sin reconstruir una selección ni aprender conceptos internos. Esta revisión concreta la propuesta aportada y el reporte «cuando vuelvo a entrar a la evaluación del estudiante ya no está el link».

Se priorizan generación, copia repetible, recuperación al reingresar, una lista común y mensajes claros. Se reutilizan Spec135 y la navegación de Spec138. La aprobación autoriza implementar y probar este alcance; no IA, datos reales, fusión ni despliegue.

## Escenarios de usuario y pruebas

### US1 — Generar una vez y copiar cuando haga falta (Prioridad: P1)

Como docente quiero un bloque «Enlace para el estudiante» dentro de su retroalimentación, siempre en el mismo lugar. Si ya existe un enlace vigente, quiero copiarlo sin volver a aprobar ni generar nada.

**Razón de prioridad**: perder de vista un enlace creado provoca trabajo repetido y la impresión de que no quedó guardado.

**Prueba independiente**: generar un enlace sintético, copiarlo, salir a la lista, volver, recargar e iniciar una nueva sesión del mismo docente, también desde otro dispositivo.

**Aceptación**:
1. Sin enlace y con contenido apto, «Generar enlace» muestra lo que se compartirá y solicita una sola confirmación explícita. Después aparece «Copiar enlace» en el mismo bloque.
2. Con enlace vigente, abrir el estudiante muestra «Enlace disponible», vencimiento y «Copiar enlace», sin seleccionar estudiantes ni abrir opciones avanzadas.
3. Salir, volver, recargar o iniciar una nueva sesión autorizada recupera exactamente el mismo enlace y vencimiento. Copiar repetidamente no modifica contenido autorizado ni preguntas disponibles.
4. Recuperar no depende de conservar abierta la pantalla, de los datos temporales del dispositivo ni de haber copiado la primera vez.
5. Si falla la consulta o recuperación, se explica el problema y se ofrece reintentar; no se afirma ausencia ni se genera otro enlace por ese fallo.

### US2 — Un solo flujo individual y grupal (Prioridad: P1)

Como docente quiero Revisar → Generar enlaces → Copiar y compartir, con las acciones junto a sus resultados.

**Prueba independiente**: treinta estudiantes sintéticos, notas sugeridas/confirmadas/ajustadas, mensajes pendientes y enlaces vigentes/vencidos/desactivados/ausentes.

**Aceptación**:
1. «Compartir retroalimentación» desde evaluación o revisión abre el mismo centro, conservando contexto, permisos y selección.
2. Cada fila muestra nombre, nota que se compartirá, un estado comprensible y acción principal. Un enlace vigente recuperable tiene «Copiar enlace» en su fila, aunque no esté seleccionada para generación.
3. La selección inicial incluye casos aptos; excluye falta de nota o contenido que requiere corrección. Antes de generar, una confirmación identifica destinatarios, notas, mensajes, alcance y opciones, distinguiendo existentes, faltantes y excluidos.
4. La confirmación acepta sugeridas solo cuando lo autoriza expresamente y conserva ajustes docentes. Crea solo faltantes aptos; no sustituye ni amplía enlaces existentes.
5. Doble clic, respuesta incierta y fallo parcial conservan identidad de operación, selección y éxitos; reintentan solo lo pendiente, sin duplicados.
6. Al terminar, se copia por destinatario o desde «Copiar lista de N» en una barra accesible. Si todos los enlaces ya existen, se pasa directamente a copiar, sin confirmaciones vacías.

### US3 — Entender por qué un enlace no está disponible (Prioridad: P1)

Como docente quiero distinguir un enlace oculto de uno vencido o que requiere atención, con una acción concreta.

**Prueba independiente**: suspensión por cambio de nota, vencimiento, desactivación voluntaria, copia antigua no recuperable, varios accesos y permiso revocado.

**Aceptación**:
1. Los estados son «Falta revisar», «Listo para generar», «Enlace disponible», «Necesita reenvío», «Vencido», «Desactivado» y «Requiere atención». Tener nota publicada no significa tener enlace.
2. Si cambió el contenido compartido, «Revisar y aprobar» autoriza explícitamente la nueva revisión. Conserva el mismo enlace aún vigente y no revocado, sin ampliar vencimiento.
3. Un vencido o desactivado no se abre otra vez por copiar, seleccionar o reaprobar; requiere una decisión independiente y explícita.
4. Una copia antigua no recuperable ofrece reemplazo explícito; no se inventa el enlace ni se reemplaza silenciosamente.
5. Varios enlaces vigentes se muestran sin elegir o invalidar uno silenciosamente. Cambiar de cuenta/estudiante no expone resultados tardíos del contexto anterior.

### US4 — Copiar y compartir cómodamente (Prioridad: P1)

Como docente quiero copiar desde celular/computador, individualmente o en lote, con alternativa cuando el navegador lo impide.

**Prueba independiente**: 360/384/390/768/1440 px, claro/oscuro, teclado, texto al 200 %, nombres largos, portapapeles denegado y treinta estudiantes.

**Aceptación**:
1. «Copiar enlace» copia «Hola. Esta es la retroalimentación de [nombre] en [evaluación]: [enlace]», sin nota ni texto académico. El bloque también permite consultar/seleccionar el enlace completo para copia manual.
2. «Copiar lista de N» copia «Nombre: enlace», una línea por destinatario confirmado. Es una lista privada del profesor para repartir individualmente, no para publicar en grupos.
3. Si se deniega copiar, los enlaces se conservan y aparece el texto seleccionado para copia manual. «Enlace copiado» solo se anuncia después de copia exitosa.
4. «Enviar por WhatsApp» y «Compartir», cuando el dispositivo lo permita, usan el mismo mensaje individual, sin pedir/guardar contactos. Cancelar o abrir el menú no acredita entrega.
5. Copiar, imprimir o abrir un canal no afirma «Enviado» ni «Visto». La impresión existente sigue disponible y no publica ni genera enlaces implícitamente.
6. Tarjetas con acción cercana, filtros horizontales y barra de selección evitan ir arriba para generar y abajo para copiar. Revisar en contexto conserva la posición de la lista.

### Casos límite

- Error de lectura distinto de ausencia confirmada: reintentar consulta, no crear otro acceso.
- Generación con respuesta perdida: consultar la misma operación y accesos guardados antes de otra escritura, incluso con datos temporales locales vacíos.
- Enlace creado en otro dispositivo: aparece al consultar; no depende de la selección anterior.
- Cambio concurrente de nota al copiar: no entregar una autorización suspendida; ofrecer revisión del conflicto.
- Cierre de sesión, cambio de cuenta o permisos: quitar enlaces de pantalla y rechazar resultados tardíos.
- La simplificación no elimina rechazos por falta de nota, contradicciones o evidencia insuficiente; conserva avisos relevantes.

## Requisitos

### Requisitos funcionales

- **FR-001**: Evaluación y revisión DEBEN abrir el mismo centro con Revisar → Generar enlaces → Copiar y compartir; sin circuito paralelo.
- **FR-002**: La retroalimentación individual DEBE mostrar «Enlace para el estudiante», con «Generar enlace» solo ante ausencia confirmada y «Copiar enlace» cuando existe uno vigente recuperable.
- **FR-003**: Al volver o iniciar sesión/dispositivo autorizado, DEBEN consultarse los enlaces guardados y recuperarse el mismo enlace vigente, sin selección previa ni generación adicional.
- **FR-004**: Generar DEBE requerir confirmación de destinatarios, notas, mensajes, alcance y opciones; crear solo faltantes aptos y conservar identidad/recuperación ante doble clic, concurrencia y respuesta incierta.
- **FR-005**: Copiar DEBE ser repetible y por gesto propio, sin aprobar, publicar, recalificar, renovar, extender vigencia ni reiniciar cinco preguntas cada diez minutos.
- **FR-006**: DEBEN distinguirse carga, ausencia confirmada, fallo de consulta y fallo de recuperación. Un fallo de lectura no habilita creación automática.
- **FR-007**: El estado único DEBE derivarse de contenido y accesos autorizados e incluir «Necesita reenvío», «Desactivado» y «Requiere atención», sin confundir nota confirmada y enlace disponible.
- **FR-008**: Reaprobar contenido suspendido DEBE ser explícito y conservar el mismo enlace vigente no revocado sin extenderlo; vencidos/desactivados requieren decisión separada, nunca reapertura silenciosa.
- **FR-009**: Copias antiguas no recuperables o varios vigentes DEBEN ofrecer solución concreta sin inventar, sustituir ni escoger credenciales silenciosamente.
- **FR-010**: Copia individual/lista DEBE estar junto al resultado, incluir solo accesos confirmados y ofrecer alternativa manual; mensajes principales de máximo dos frases y una acción, términos internos solo en ayuda/opciones.
- **FR-011**: Compartir individualmente DEBE permitir WhatsApp y compartir nativo disponible, sin contactos ni notas en el mensaje. Las listas masivas son privadas, no para grupos de familias.
- **FR-012**: Copiar, abrir un canal o imprimir NO DEBE afirmar envío, recepción o lectura; «Enlace copiado» no es estado académico ni acuse de recibo.
- **FR-013**: DEBEN conservarse permisos, ajustes, evidencias, edición, borradores, historial, privacidad y garantías de Spec135; aceptar sugeridas solo con decisión expresa mostrada, nunca por abrir/copiar.
- **FR-014**: El flujo DEBE funcionar en 360/384/390/768/1440 px, ambos temas, teclado, texto ampliado y controles de 44 px, sin desbordamiento ni scroll solo desde el borde.
- **FR-015**: Las pruebas DEBEN usar datos sintéticos sin IA y cubrir salir/volver, recarga, nueva sesión/dispositivo y datos locales vacíos; verificar identidad y vencimiento, sin escrituras académicas por lectura/copia.
- **FR-016**: Este incremento NO DEBE cambiar duraciones existentes ni la política actual; 30 días institucionales, extensión, QR y aperturas quedan explícitamente como propuestas posteriores, no eliminadas ni activadas.

### Entidades clave

- **Acceso compartido**: enlace individual guardado, identidad, revisión autorizada y vigencia; volver a copiar no lo crea de nuevo.
- **Disponibilidad de copia**: estado verificable distinto de aptitud académica y del resultado de consulta.
- **Decisión de generación**: destinatarios, contenido y opciones explícitos y recuperables; no equivale a copiar.
- **Mensaje de copia**: nombre, evaluación y enlace, sin nota; copiar no prueba entrega.

## Criterios de éxito

- **SC-001**: Todos los recorridos sintéticos de reentrada recuperan enlace y vencimiento idénticos; cero accesos adicionales o escrituras académicas por abrir/copiar.
- **SC-002**: Tras generar se copia en el mismo bloque; al volver al estudiante se copia con un gesto tras cargar, sin selección ni otra confirmación de generación.
- **SC-003**: Fallos parciales/inciertos conservan éxitos y selección; cero duplicados por la misma operación y ningún éxito anunciado sin confirmación.
- **SC-004**: Matriz de pantallas, temas y texto ampliado sin acciones inaccesibles/desbordamiento; capturas verificadas a 384 px/escritorio antes de fusionar.
- **SC-005**: Regresiones de Spec135/138 conservan permisos, borradores, privacidad, cuota, vencimientos y ajustes; sin datos reales ni proveedor de IA.
- **SC-006**: Antes de afirmar facilidad validada, tres docentes ensayan treinta destinatarios sin ayuda; se miden tiempo/clics y comprensión. Meta de menos de tres minutos, no resultado demostrado ni prueba de mejora pedagógica.

## Supuestos

- El servidor es la fuente de enlaces guardados; los datos temporales del dispositivo no son la única copia ni autoridad.
- El incidente real sigue por reproducir. Que hoy exista recuperación en el código no demuestra que el caso del usuario esté solucionado.
- No se cambian claves ni configuración. Una copia histórica indescifrable requiere diagnóstico y reemplazo explícito, nunca rotación improvisada.
- Se preservan para fases posteriores las propuestas de 30 días, fin de periodo, extensión, QR y apertura, con aprobación de backend/privacidad. No bloquean corregir copia y reentrada ahora.
- No se conocen contactos de familias ni se autentica a quien recibe un enlace. No se certifica identidad, envío o lectura por compartir.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Individual | Bloque permanente con copia al reingresar | Consulta y copia autorizadas de enlaces guardados | Copia escondida en opciones y compartir duplicado |
| Grupo | Tres pasos y copia por fila/barra | Selección, aprobación, recuperación de Spec135 | Confirmaciones redundantes y términos internos principales |
| Estados | Disponibilidad clara y fallo distinto de ausencia | Vencimiento, suspensión, revocación y permisos | «Enviado» por copiar y falso «sin enlace» ante error |
| Navegación | Retorno con posición conservada | Contexto de Spec138 | Desplazarse arriba/abajo para generar/copiar |

## Evidencia visual requerida

- Maqueta sintética a 384/1440 px antes de implementar: ausencia, enlace disponible al volver, error y resultado parcial, identificada como diseño.
- Capturas de implementación a 384 px/escritorio claro/oscuro y reentrada, separadas de maquetas y sin datos reales. Emulación no equivale a teléfonos físicos.
