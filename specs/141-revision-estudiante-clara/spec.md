# Especificación: revisión de estudiante clara

**Rama**: `codex/141-revision-estudiante-clara` | **Creada**: 2026-11-02 | **Estado**: Aprobada; revisión de calidad 8/8 completa; implementación en curso | **Issue**: #301

**Aprobación**: el usuario aprobó el alcance y plan en este chat el 2026-11-02 e indicó priorizar un frontend premium. No autorizó fusionar ni desplegar en este mensaje.

## Escenarios de usuario y pruebas

### Historia 1 - Entender de dónde sale la nota (Prioridad: P1)

El docente abre un estudiante de una evaluación y puede reconstruir su nota con los puntos guardados, sin interpretar mensajes técnicos ni confundir una sugerencia con la decisión docente.

**Razón de prioridad**: la claridad visual no puede ocultar discrepancias ni explicar una nota histórica con los pesos actuales de otra versión.

**Prueba independiente**: con datos sintéticos, una entrega con 7/10 puntos y escala de 5 muestra `7 ÷ 10 × 5 = 3,50`; un ajuste docente de +0,25 conduce a 3,75. La presentación no cambia ningún valor guardado.

**Aceptación**:
1. **Dada** una nota con desglose completo, **cuando** se abre «Ver cálculo», **entonces** aparecen puntos logrados y posibles, conversión a la escala, ajuste cuando exista, redondeo y nota resultante en una explicación breve y verificable.
2. **Dados** pesos por secciones, **cuando** esos datos constan en el resultado guardado, **entonces** se muestran subtotales por sección; si no constan, no se inventa una agrupación.
3. **Dada** una nota final distinta del cálculo, **cuando** se consulta, **entonces** se distingue el cálculo de la decisión docente y se muestra la causa guardada o se indica que no quedó una explicación registrada; nunca se atribuye a otro modelo sin evidencia.
4. **Dados** puntajes faltantes o un resultado antiguo sin desglose, **cuando** se abre el cálculo, **entonces** se identifica como pendiente o no disponible, sin convertir datos desconocidos en ceros ni presentar una fórmula inventada.

### Historia 2 - Revisar respuestas sin ruido (Prioridad: P1)

El docente recorre preguntas compactas y ve la respuesta, su evidencia, el puntaje y el porqué. Las explicaciones generales se consultan solo cuando se necesitan.

**Razón de prioridad**: avisos y ayudas repetidos desplazan el trabajo real, especialmente en celular.

**Prueba independiente**: recorrer ocho preguntas a 384 px, con una incidencia real, muestra un solo resumen accionable y el detalle propio de la pregunta seleccionada, sin repetir ayudas generales en cada pregunta.

**Aceptación**:
1. **Dada** una respuesta sin incidencias, **cuando** se abre, **entonces** no aparece una alerta de éxito ni una advertencia genérica de comprobarla; quedan accesibles el puntaje, la respuesta, la evidencia y su explicación.
2. **Dadas** varias causas equivalentes, **cuando** se resumen, **entonces** no se repite el mismo aviso en el encabezado, la tarjeta y la explicación; el detalle completo sigue disponible en Historial.
3. **Dada** una incidencia que impide una decisión segura, **cuando** se abre la revisión, **entonces** sigue visible un aviso breve con acción concreta, sin eliminar las restricciones de publicación existentes.
4. **Dadas** preguntas en verde, amarillo o rojo, **cuando** se consultan, **entonces** el color conserva el significado de prioridad de revisión, con icono y texto accesible; una respuesta errónea pero claramente leída no se confunde con una falla del sistema.

### Historia 3 - Ajustar las hojas desde Evidencia (Prioridad: P1)

El docente puede ver una hoja en grande, girarla para leerla y abrir «Editar hojas» para corregir su preparación o añadir una foto sin buscar otro desplegable ni volver a subir todo manualmente.

**Razón de prioridad**: una evidencia mal orientada o incompleta debe poder corregirse sin perder el original ni desvincular silenciosamente el resultado de la imagen usada.

**Prueba independiente**: con dos hojas sintéticas guardadas, girar la vista no modifica datos; recortar una hoja, añadir otra y cancelar conserva exactamente evidencia y nota; confirmar el nuevo paquete conserva originales y resultado anterior en el historial y solicita una nueva revisión.

**Aceptación**:
1. **Dada** la hoja guardada, **cuando** se gira solo para verla o se amplía, **entonces** no se altera la evidencia persistente, la nota, el enlace ni se llama a IA.
2. **Dadas** hojas existentes, **cuando** se abre «Editar hojas», **entonces** se cargan conservando orden y procedencia; se puede recortar/ajustar esquinas, girar, añadir, ordenar o quitar hojas en un borrador.
3. **Dado** un cambio persistente de evidencia, **cuando** se confirma «Guardar y volver a calificar», **entonces** se informa antes qué cambia: nueva evidencia, resultado pendiente de revisión y tratamiento de los enlaces compartidos. El motivo continúa siendo opcional.
4. **Dados** originales y un resultado vigente, **cuando** se confirma, **entonces** se conserva la versión anterior auditable y no se presenta su nota como calculada sobre la nueva imagen. La nueva nota nunca se publica automáticamente.
5. **Dado** un fallo, cancelación o conflicto concurrente, **cuando** ocurre antes de la aceptación completa, **entonces** no se deja un paquete de hojas parcial, no se duplica trabajo y el borrador local permite corregir o reintentar.

### Historia 4 - Retroalimentación individual como diseño 3 (Prioridad: P1)

El docente abre una retroalimentación limpia del estudiante: nombre, nota y comentarios legibles; una acción principal permite generar o copiar el enlace. No aparece una segunda lista de alumnos ni controles de selección de grupo.

**Razón de prioridad**: la pantalla actual incrusta una superficie grupal dentro del detalle y acumula tarjetas, revisión, publicación, edición e impresión.

**Prueba independiente**: abrir, editar y volver a una retroalimentación sintética a 384 y 1440 px conserva el texto, el enlace y el estado real; muestra una sola acción principal y no muestra contador de seleccionados ni impresión de grupo en el detalle.

**Aceptación**:
1. **Dado** un comentario con logros y recomendaciones explícitos, **cuando** se abre, **entonces** se organiza como «Lo que hiciste bien», «Qué puedes mejorar» y «Tu siguiente paso», siguiendo el diseño 3, sin inventar ni eliminar contenido.
2. **Dado** un comentario antiguo sin esa estructura, **cuando** se presenta, **entonces** se conserva íntegro y legible; no se deducen logros de la nota ni se generan recomendaciones nuevas para llenar las tres secciones.
3. **Dado** un enlace válido, **cuando** se vuelve al estudiante, **entonces** se recupera el enlace guardado y la acción principal es «Copiar enlace»; no se regenera ni se crea un duplicado por abrir la pantalla.
4. **Dado** un estudiante listo pero sin enlace, **cuando** se pulsa «Generar enlace», **entonces** la misma zona pasa a «Copiar enlace» al completarse; no hay que buscar el resultado más abajo o en otro panel.
5. **Dado** un enlace vencido, suspendido, desactivado, ambiguo o un resultado pendiente, **cuando** se consulta, **entonces** aparece un solo estado comprensible con la acción pertinente; no se presenta como listo ni se eluden permisos, revisiones o confirmaciones reales.
6. **Dada** una edición sin guardar, **cuando** se intenta cambiar de estudiante o generar una entrega, **entonces** se conserva la protección del borrador y no se comparte texto no guardado por accidente.

### Historia 5 - Conservar una entrada clara para el grupo (Prioridad: P2)

El docente distingue la lista de la evaluación del detalle de un estudiante. Para compartir con varios usa la propuesta 1 ya elegida, sin repetir las mismas herramientas dentro de cada estudiante.

**Razón de prioridad**: simplificar un detalle no debe retirar selección múltiple, impresión, publicación o enlaces existentes.

**Prueba independiente**: entrar por Materia → Evaluación → Ver notas, abrir un estudiante y regresar conserva contexto, filtro, posición y selección; los enlaces antiguos siguen llevando a la misma revisión autorizada.

**Aceptación**:
1. **Dada** la lista de una evaluación, **cuando** se entra, **entonces** la búsqueda y selección pertenecen a esa lista y «Añadir entregas» sigue disponible allí; en celular, abrir un estudiante no mantiene la lista y sus controles encima del detalle.
2. **Dado** el detalle, **cuando** se navega, **entonces** hay un solo regreso contextual y un encabezado compacto; las acciones de materia, libro de notas y resumen quedan accesibles sin repetirlas en la cabecera, pie y panel interior.
3. **Dada** una selección grupal, **cuando** se comparten enlaces, **entonces** se usa la lista compacta de la opción 1 y una zona de acción estable para generar/copiar; se mantienen selección múltiple, impresión, fallos parciales y enlaces guardados.

### Casos límite

- Nota manual sin desglose; cálculo incompleto; componentes con máximo fraccionario; suma que difiere por redondeo; ajuste global; pesos históricos distintos de los actuales.
- Comentario sin logros explícitos, largo o con Markdown; texto en edición; ausencia de comentario; acceso de solo lectura.
- Enlace heredado no recuperable, varios enlaces activos, vencimiento durante una copia, restricción del portapapeles o fallo de consulta. No revelar ni memorizar tokens fuera del ámbito autorizado.
- Evidencia antigua sin original adicional, imagen o PDF de varias páginas, hoja ilegible, archivo inválido, paquete vacío, límites excedidos, giro de 90/180/270°, recuperación tras error.
- Modificación simultánea de puntos, publicación, evidencia o permisos; sesión expirada; trabajo ya procesándose; doble toque; cambio de estudiante durante una petición.
- Teclado móvil, barra inferior del sistema, texto ampliado, pantalla de 360 px y modo oscuro. Fuera del visor ampliado la imagen no debe capturar el desplazamiento vertical de toda la pantalla.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE separar lista de evaluación, detalle individual y compartir grupo, conservando sus destinos y permisos. La vista individual DEBE usar diseño 3 y la entrega grupal diseño 1.
- **FR-002**: El detalle DEBE tener una única ubicación y regreso contextual. En celular NO DEBE conservar una segunda lista, búsqueda, cabecera de grupo o contador de seleccionados dentro del estudiante.
- **FR-003**: «Ver cálculo» DEBE explicar el resultado guardado mediante puntos, escala, ajuste, redondeo y resultado. NO DEBE recalcular con la versión actual de la evaluación ni con puntajes meramente redondeados para mostrar.
- **FR-004**: Los subtotales por sección DEBEN mostrarse solo si están sustentados por los datos guardados. Las notas faltantes NO DEBEN transformarse en ceros y los cálculos provisionales DEBEN identificarse.
- **FR-005**: Una discrepancia entre sugerencia, desglose y decisión docente DEBE distinguirse explícitamente, sin atribuir causas que no consten en el historial ni duplicar la misma advertencia.
- **FR-006**: La revisión DEBE priorizar respuesta, evidencia, puntaje y porqué. Las ayudas genéricas, fuentes, confianza, trazas y avisos históricos DEBEN reubicarse en Historial o ayuda única, sin perder su acceso.
- **FR-007**: Las incidencias activas DEBEN conservar una advertencia breve accionable. La limpieza NO DEBE convertir una calificación pendiente en publicable ni ocultar ausencia de evidencia, puntajes, revisiones o conflictos reales.
- **FR-008**: El navegador de preguntas DEBE ser compacto, accesible, con texto e icono además del color, y conservar ubicación cercana a la respuesta cuando esté validada.
- **FR-009**: Evidencia DEBE permitir giro de vista, ampliación y pantalla completa sin escrituras. «Editar hojas» DEBE ofrecer un borrador con hojas existentes, recorte/esquinas, giro y adición/ordenación/eliminación de fotos.
- **FR-010**: Guardar cambios persistentes de evidencia DEBE requerir confirmación y una acción explícita «Guardar y volver a calificar». DEBE conservar originales, evidencia anterior y resultado anterior auditable, sin publicar automáticamente el nuevo resultado.
- **FR-011**: La aceptación del nuevo paquete DEBE ser completa, idempotente y protegida frente a cambios simultáneos. Un fallo NO DEBE dejar hojas parciales ni duplicar trabajos. El motivo DEBE seguir siendo opcional.
- **FR-012**: La retroalimentación individual DEBE mostrar contenido legible con jerarquía del diseño 3, conservando íntegro el contenido guardado. Solo se pueden clasificar logros y recomendaciones explícitos; no se inventa información para decorar.
- **FR-013**: Generar/copiar enlace DEBE ocupar la misma zona principal; después de volver o recargar DEBE recuperarse el enlace autorizado guardado sin emitir otro. La presentación NO DEBE incluir un segundo panel de grupo o impresión grupal.
- **FR-014**: Editar, imprimir y gestionar vigencia/desactivación/reactivación DEBEN seguir disponibles como acciones secundarias sin tarjetas/desplegables abiertos por defecto ni copias duplicadas del mismo control.
- **FR-015**: Toda operación DEBE terminar en éxito, espera o error comprensible. Los estados de enlace, publicación y revisión DEBEN reflejar la fuente vigente, sin mostrar un bloqueo genérico cuando basta una acción concreta.
- **FR-016**: Se DEBEN conservar roles, permisos, revisiones reales, enlaces privados, caducidad, límites de chat de 5 preguntas cada 10 minutos, conversaciones persistentes y el comportamiento de impresión. No se amplía información pública del estudiante.
- **FR-017**: Abrir, cambiar de pestaña, girar la vista, copiar o reordenar la presentación NO DEBE modificar notas, evidencias persistentes, modelos o comentarios ni provocar llamadas adicionales a IA.
- **FR-018**: Los flujos DEBEN funcionar entre 360 y 1440 px, claro/oscuro, con objetivos táctiles de al menos 44 px, sin desbordamiento horizontal ni desplazamiento atrapado en tarjetas o controles ocultos por el teclado/pie fijo.
- **FR-019**: Toda acción que cambia evidencia o solicita nueva calificación DEBE proteger borradores y validar el estudiante y evaluación vigentes; el historial DEBE permitir identificar qué imagen sustentaba cada resultado.
- **FR-020**: La entrega DEBE tener pruebas con datos sintéticos y evidencia visual real de la implementación, separada de las maquetas. No se usan notas ni fotografías reales para esta fase ni se despliega sin CI verde y autorización correspondiente.
- **FR-021**: La presentación premium DEBE concretarse en una única cabecera contextual, una acción primaria por tarea, lectura sin tarjetas dentro de tarjetas, tipografía legible, espaciado consistente y estados de foco/carga/error accesibles. Se conservan la identidad y los modos claro/oscuro; no se añaden adornos que desplacen la información útil.

### Entidades clave

- **Contexto de revisión**: materia, evaluación, estudiante, retorno, pestaña y pregunta seleccionada; no implica una nueva copia de los datos académicos.
- **Cálculo guardado**: componentes, máximos, puntos logrados, escala, redondeo, ajustes, versión y decisión docente que explican un resultado concreto.
- **Borrador de hojas**: orden propuesto, operaciones de preparación y fotos añadidas, separado de la evidencia aceptada y descartable sin consecuencias.
- **Versión de evidencia**: paquete aceptado, hojas originales/preparadas y relación auditable con el resultado que las utilizó.
- **Retroalimentación individual**: texto y procedencia guardados, lectura estructurada sin alterar su contenido y edición explícita protegida.
- **Acceso compartido**: identidad persistente, estado, vigencia y recuperación autorizada del enlace; no se almacena su secreto en la especificación ni en capturas.

## Criterios de éxito

- **SC-001**: En todos los casos sintéticos de cálculo completo, la explicación permite reconstruir exactamente la nota guardada a su precisión publicada; los casos incompletos no muestran un resultado definitivo inventado.
- **SC-002**: A 384 px el detalle individual no contiene controles de selección grupal y mantiene una sola acción principal visible de enlace; generar y luego copiar no exige buscar controles arriba y abajo de la página.
- **SC-003**: Abrir y volver a un estudiante con enlace vigente conserva el mismo enlace en el 100 % de las pruebas de reentrada autorizada; el acceso cruzado o vencido nunca se presenta como disponible.
- **SC-004**: Las pruebas de lectura, giro de vista y cancelación conservan exactamente notas, comentarios, evidencia persistente y enlaces. Las confirmaciones de cambio conservan el resultado y evidencia previos en el historial.
- **SC-005**: Ocho y veinte preguntas pueden recorrerse en 360, 384, 412 y 1440 px sin listas verticales desproporcionadas de botones, pérdida de selección, avisos duplicados ni desplazamiento atrapado.
- **SC-006**: Cada entrada de comentario conservado es recuperable íntegramente; no se añaden aciertos o recomendaciones que no consten en los datos fuente.
- **SC-007**: La regresión de publicación, edición manual, recalificación con pesos actuales, escáner, original/preparada, enlaces, impresión, chat, permisos y enlaces antiguos se mantiene verde antes de fusionar.
- **SC-008**: Las capturas a 384/1440 px muestran una sola cabecera de estudiante, una única acción primaria por contexto y ninguna barra grupal dentro de la retroalimentación individual; el texto principal usa al menos 16 px en celular y las acciones mantienen objetivos de 44 px.

## Supuestos

- Este trabajo combina las elecciones previas: opción 1 para entregar al grupo y opción 3 para leer una retroalimentación individual. No se sustituye la lista principal de calificaciones por otra lista incrustada.
- «Girar» sin guardar es una preferencia de visualización; guardar recorte, orientación o nuevas fotos exige volver a calificar con confirmación, para no asociar una nota antigua con una evidencia distinta.
- La aritmética, pesos, modelos y decisiones docentes no se modifican por la reorganización. El cálculo usa la versión del resultado, no el borrador de una evaluación posterior.
- Los límites actuales de páginas y tamaño, así como la disponibilidad configurable del escáner, siguen siendo la fuente de verdad; no se amplían aquí.
- No se regenera retroalimentación por IA para reorganizarla; los comentarios antiguos no se reescriben automáticamente.
- Especificación y plan fueron aprobados. El control de calidad, tareas y análisis deben preceder al código; la aprobación no autoriza pruebas con datos reales, llamadas a IA, fusión ni despliegue.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Contexto | Cabecera individual compacta | Rutas y retorno de materia/evaluación | Regresos repetidos y acciones de grupo dentro del estudiante |
| Cálculo | Explicación numérica verificable única | Desglose, escala, ajustes e historial guardados | Resúmenes parciales y fórmulas duplicadas entre encabezado y preguntas |
| Respuestas | Resumen de incidencia activo único | Navegación compacta, colores y evidencia por pregunta | Ayudas genéricas repetidas, confianza y trazas al Historial |
| Evidencia | Giro de vista y «Editar hojas» contextual | Visor, preparación, originales, historial y recalificación | «Cambiar evidencia» separado del visor; historial técnico fuera de cada pestaña |
| Individual | Lectura del diseño 3 y acción principal generar/copiar | Texto, edición protegida, recuperación de enlaces | Tarjeta «Enlace para el estudiante», barra grupal, revisión y publicación duplicadas; avanzado al menú |
| Grupo | Jerarquía de opción 1 | Selección, enlaces persistentes, impresión y publicación existentes | Tarjetas largas de cada alumno, acciones alejadas y copias redundantes |

## Evidencia visual requerida

- Maquetas aprobadas como orientación: opción 1 grupal y opción 3 individual. Son propuestas, no prueba de implementación.
- Antes de implementar: maqueta sintética de las cuatro pestañas a 384 px que muestre cabecera/pie y cantidad de controles; incluir nota con discrepancia, evidencia en edición y enlace guardado. No reutilizar nombres de la captura docente.
- Antes de fusionar: capturas reales de implementación a 384 y 1440 px, claro/oscuro; pruebas adicionales a 360/412 px, teclado y desplazamiento táctil. Distinguir estados sin enlace, enlace recuperado, error, edición y conflicto.
- Validación física Android e iPhone pendiente para las operaciones táctiles nuevas; no declararla realizada por pruebas de navegador o por una validación de una versión anterior.
