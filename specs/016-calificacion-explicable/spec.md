# Especificación: Calificación explicable y auditable

**Rama**: `codex/016-calificacion-explicable` | **Creada**: 2026-08-21 | **Estado**: Aprobada | **Issue**: #20

## Clarifications

### Session 2026-08-21

- Q: Cuando el profesor cambie una puntuación, ¿qué explicación debe ver el estudiante? → A: El ajuste conserva un motivo interno auditable y una explicación pedagógica separada visible para el estudiante.

## Escenarios de usuario y pruebas

### Historia 1 - Comprender cómo se obtuvo la nota sugerida (Prioridad: P1)

Como profesor, necesito ver cuánto obtuvo el estudiante en cada respuesta, contra qué se comparó y por qué recibió esos puntos, para decidir con evidencia si confirmo la nota sugerida.

**Razón de prioridad**: Una cifra aislada no permite auditar errores de extracción, clave, rúbrica o criterio. El desglose por componente es la base para una revisión docente confiable.

**Prueba independiente**: Una entrega con varias preguntas produce una única nota sugerida acompañada por todos sus componentes puntuables y una fórmula cuya operación reproduce exactamente la nota mostrada.

**Aceptación**:
1. **Dada** una evaluación con preguntas puntuadas, **cuando** termina la calificación automática, **entonces** el profesor ve por cada pregunta el enunciado, la respuesta detectada, la respuesta correcta o referencia, puntos obtenidos, puntos máximos, estado y justificación breve.
2. **Dada** una respuesta objetiva verificada como correcta, **cuando** se forma el desglose, **entonces** recibe el puntaje completo de esa pregunta y la explicación identifica la coincidencia con la clave.
3. **Dada** una respuesta abierta o parcialmente correcta, **cuando** se valora, **entonces** la explicación identifica qué parte cumple, qué parte falta y cómo eso determina los puntos, sin revelar razonamiento interno privado.
4. **Dadas** dos valoraciones automáticas que coinciden en la nota total pero discrepan en una pregunta, **cuando** se consolidan, **entonces** esa pregunta queda destacada para revisión y la diferencia no se oculta por la coincidencia global.
5. **Dada** una foto o PDF multihoja, **cuando** una respuesta se extrae de la evidencia, **entonces** el componente indica la página de origen cuando pueda determinarse.
6. **Dada** una evaluación alineada con DBA, rúbrica o ambos, **cuando** se explica un puntaje, **entonces** el profesor distingue la respuesta y referencia evaluadas, el criterio de rúbrica aplicado y el DBA curricular relacionado; ningún referente curricular produce puntos por sí solo.

### Historia 2 - Ajustar con trazabilidad sin romper la fórmula (Prioridad: P1)

Como profesor, necesito corregir puntos o explicaciones y ver la nota recalculada inmediatamente, para conservar el control humano sin dejar una nota final desconectada de su respaldo.

**Razón de prioridad**: El docente decide la nota definitiva. Sus cambios deben ser sencillos, visibles y auditables, no sobrescribir silenciosamente la propuesta automática.

**Prueba independiente**: Modificar el puntaje de una pregunta recalcula la nota final; el historial conserva valores anterior y nuevo, actor, momento y motivo.

**Aceptación**:
1. **Dado** un desglose pendiente, **cuando** el profesor modifica los puntos de un componente, **entonces** la fórmula y la nota se actualizan y permanecen dentro de los límites de la evaluación.
2. **Dado** un cambio docente, **cuando** se guarda, **entonces** exige un motivo interno auditable, una explicación pedagógica para el estudiante y conserva una instantánea anterior sin borrar la propuesta de IA.
3. **Dado** que el profesor necesita una nota distinta de la derivada por componentes, **cuando** registra un ajuste global, **entonces** este aparece como una línea separada con su valor, motivo interno y explicación estudiantil; nunca se altera la suma de forma invisible.
4. **Dado** un componente con evidencia ilegible o ausente, **cuando** el profesor lo resuelve manualmente, **entonces** queda identificado como decisión docente y deja de bloquear la confirmación.
5. **Dada** una nota con desglose incompleto, discrepancias abiertas o suma inconsistente, **cuando** se intenta publicar sin resolverlas, **entonces** la operación se detiene con indicaciones concretas.

### Historia 3 - Recibir una explicación útil después de la publicación (Prioridad: P1)

Como estudiante, necesito entender qué respuestas estuvieron bien, cuáles debo mejorar y cómo se sumó mi nota, para aprender y solicitar revisión sobre un punto concreto si encuentro una inconsistencia.

**Razón de prioridad**: La transparencia debe beneficiar al estudiante sin divulgar claves mientras otros compañeros todavía pueden entregar.

**Prueba independiente**: Tras publicar una calificación, el estudiante accede a su desglose aprobado y puede iniciar una solicitud vinculada a una pregunta; antes de publicar no obtiene esa información.

**Aceptación**:
1. **Dada** una nota publicada, **cuando** el estudiante abre su entrega, **entonces** ve la nota final, la operación de cálculo, puntos por componente y explicaciones aprobadas por el docente.
2. **Dada** una evaluación con entregas aún abiertas, **cuando** el estudiante consulta su nota, **entonces** no recibe la clave completa ni respuestas que permitan resolver la evaluación de otros estudiantes.
3. **Dadas** entregas cerradas o una clave liberada explícitamente por el profesor, **cuando** se muestra el desglose, **entonces** el estudiante puede comparar su respuesta con la respuesta correcta o de referencia.
4. **Dado** un componente que considera incorrecto, **cuando** solicita revisión, **entonces** la solicitud queda vinculada a esa pregunta o criterio y conserva su explicación y puntaje publicados.
5. **Dada** una calificación histórica sin desglose confiable, **cuando** se consulta, **entonces** se informa que el detalle no está disponible y nunca se inventan respuestas, puntos ni justificaciones retroactivas.

### Historia 4 - Mantener una explicación consistente en todas las modalidades (Prioridad: P2)

Como responsable académico, necesito que calificaciones online, por visión, mixtas, manuales y por rúbrica usen un respaldo coherente, para que el significado de una nota no dependa de cómo se entregó el trabajo.

**Razón de prioridad**: El producto admite múltiples modalidades. La transparencia se perdería si solo funcionara para fotografías o preguntas objetivas.

**Prueba independiente**: Cada modalidad genera o registra una explicación válida y una sola nota vigente; las modalidades sin respuestas individuales usan componentes de criterio o una valoración manual explícita.

**Aceptación**:
1. **Dada** una entrega online, física o mixta, **cuando** se califica, **entonces** sus respuestas se normalizan en el mismo concepto de componente puntuable sin duplicar preguntas.
2. **Dada** una actividad evaluada únicamente por rúbrica, **cuando** se califica, **entonces** cada criterio puntuable ocupa el lugar de un componente y participa una sola vez en la fórmula.
3. **Dada** una evaluación que combina preguntas y criterios descriptivos, **cuando** se calcula, **entonces** los criterios ayudan a explicar cada respuesta y no duplican puntaje salvo que el profesor haya definido pesos puntuables separados.
4. **Dada** una nota manual, una ausencia o una entrega fuera de plazo, **cuando** el profesor registra la calificación, **entonces** se muestra como valoración manual con motivo y ajuste explícitos, sin fabricar respuestas inexistentes.
5. **Dado** un trabajo en cola o reintentado, **cuando** termina el procesamiento, **entonces** actualiza el mismo desglose y la misma calificación sin duplicar componentes, entregas ni notas.

### Casos límite

- Una pregunta no tiene puntaje explícito; se aplica la distribución aprobada para la evaluación y se muestra esa regla en la fórmula.
- La suma de puntos máximos no coincide con la nota máxima; se normaliza de forma visible o se solicita revisión, nunca se oculta la diferencia.
- Una respuesta está en blanco de forma legible; se distingue de una respuesta que la visión no pudo leer.
- Falta una hoja o un bloque de preguntas; los componentes ausentes quedan como cobertura incompleta y requieren revisión, no como respuestas incorrectas automáticas.
- Una respuesta comienza en una página y termina en otra; se representa una vez con todas sus referencias de evidencia.
- La clave de respuestas está incompleta; la calificación no puede confirmarse automáticamente y la interfaz identifica las preguntas afectadas.
- El modelo devuelve puntajes negativos, mayores al máximo, componentes duplicados o una suma incoherente; el resultado se rechaza o repara de forma determinista antes de mostrarse.
- El profesor cambia varias preguntas y luego cancela; el desglose persistido permanece intacto.
- Dos sesiones docentes intentan ajustar la misma calificación; la segunda recibe el estado actualizado y debe revisar antes de sobrescribir.
- La nota final requiere redondeo; se usa una única regla visible y reproducible.
- Una evaluación permanece abierta durante semanas; la explicación estudiantil no filtra claves mientras el profesor no cierre entregas o libere respuestas.
- Un proveedor automático falla después de extraer respuestas; la evidencia queda disponible y el sistema conserva un estado recuperable sin inventar nota.

## Requisitos

### Requisitos funcionales

- **FR-001**: Toda nueva nota automática válida DEBE incluir un desglose estructurado que respalde la nota sugerida.
- **FR-002**: El desglose DEBE representar todas las preguntas o criterios puntuables esperados exactamente una vez y en un orden estable.
- **FR-003**: Cada componente DEBE incluir identidad, tipo, título o enunciado, puntos obtenidos, puntos máximos, estado y una explicación breve verificable.
- **FR-004**: Cuando exista una respuesta estudiantil, el componente DEBE conservar la respuesta detectada o recibida sin reemplazarla por una interpretación inventada.
- **FR-005**: Cuando exista clave o referencia, el profesor DEBE poder verla junto al componente; su visibilidad estudiantil DEBE respetar el estado de entregas y la liberación de respuestas.
- **FR-006**: Los componentes provenientes de visión DEBEN incluir las páginas de evidencia asociadas cuando esa relación esté disponible.
- **FR-007**: Los estados de componente DEBEN distinguir al menos correcta, parcialmente correcta, incorrecta, sin respuesta, ilegible, no evaluable y pendiente de revisión.
- **FR-008**: Una respuesta objetiva comprobada como correcta DEBE recibir el total de sus puntos máximos y no puede ser reducida por una valoración probabilística posterior.
- **FR-009**: Una respuesta ilegible, una hoja faltante o una clave incompleta NO DEBE convertirse automáticamente en cero; DEBE requerir resolución docente.
- **FR-010**: Las valoraciones abiertas DEBEN explicar de manera concisa los logros y faltantes que justifican el puntaje, usando pregunta, referencia y criterios aprobados.
- **FR-011**: La explicación visible NO DEBE contener ni persistir razonamiento interno privado, instrucciones del sistema, secretos o texto técnico innecesario del proveedor.
- **FR-012**: El sistema DEBE mostrar una fórmula reproducible con puntos obtenidos, puntos posibles, escala de la evaluación, nota base, ajuste global, redondeo y nota final.
- **FR-013**: La nota sugerida DEBE coincidir exactamente con la fórmula y permanecer entre cero y la nota máxima.
- **FR-014**: Un componente puntuable NO DEBE contarse más de una vez; los DBA y criterios descriptivos aportan contexto y trazabilidad, pero no añaden puntos salvo que el profesor haya configurado explícitamente un criterio de rúbrica puntuable y su peso.
- **FR-015**: Si faltan puntajes por pregunta, la regla de distribución o normalización DEBE quedar registrada y visible en el cálculo.
- **FR-016**: Los evaluadores automáticos DEBEN producir componentes comparables; una discrepancia material por componente DEBE permanecer visible aunque las notas totales sean cercanas.
- **FR-017**: Una consolidación automática NO DEBE elegir silenciosamente el desglose de un solo evaluador cuando los componentes difieren de forma material.
- **FR-018**: El profesor DEBE revisar el desglose antes de confirmar y conserva la decisión final sobre cada componente y la nota.
- **FR-019**: Modificar puntos de un componente DEBE recalcular la nota inmediatamente y validar los límites del componente y de la evaluación.
- **FR-020**: Cada ajuste docente DEBE registrar actor, momento, motivo interno auditable, explicación pedagógica visible para el estudiante, valores anteriores y nuevos, y origen automático o manual.
- **FR-021**: Un ajuste global DEBE aparecer separado de los componentes y requerir motivo interno y explicación estudiantil; la diferencia nunca puede quedar oculta dentro de la nota final.
- **FR-022**: Una calificación con cobertura incompleta, componentes duplicados, suma inconsistente o discrepancias pendientes NO DEBE publicarse hasta que el docente las resuelva explícitamente.
- **FR-023**: Confirmar, ajustar, publicar o reintentar DEBE conservar una única calificación vigente por entrega y un historial auditable de sus desgloses.
- **FR-024**: El estudiante DEBE acceder únicamente a su desglose después de que el docente publique la calificación.
- **FR-025**: Mientras las entregas estén abiertas, el desglose estudiantil DEBE ocultar claves o referencias que faciliten resolver la evaluación; el profesor conserva la vista completa.
- **FR-026**: Al cerrar entregas o liberar respuestas, el profesor DEBE poder habilitar la comparación estudiantil con la clave o referencia.
- **FR-027**: Una solicitud estudiantil de revisión DEBE poder vincularse a un componente publicado sin modificar la nota por sí sola.
- **FR-028**: Las calificaciones históricas sin desglose confiable DEBEN mostrarse como tales y NO DEBEN reconstruirse con información inventada.
- **FR-029**: Online, visión, PDF multihoja, modalidad mixta, rúbrica y nota manual DEBEN usar el mismo contrato conceptual de desglose o una excepción manual explícita.
- **FR-030**: Una nota manual sin evidencia DEBE registrar motivo y valoración docente sin crear respuestas o referencias ficticias.
- **FR-031**: Los trabajos asíncronos DEBEN mantener estados visibles de cola, procesamiento, revisión y error, y completar el desglose de forma idempotente.
- **FR-032**: Profesor, estudiante y administrador DEBEN recibir únicamente el nivel de detalle permitido por su rol y ámbito académico.
- **FR-033**: La vista de revisión DEBE ser usable desde 360 px, en modo claro y oscuro, con controles táctiles legibles y sin desbordamiento horizontal.
- **FR-034**: La especificación viva de calificaciones, sus contratos, historial y pruebas DEBEN actualizarse junto con este cambio.
- **FR-035**: La adopción del desglose DEBE ser aditiva, progresiva y reversible; calificaciones históricas, endpoints actuales y el flujo vigente DEBEN conservarse hasta que pruebas de regresión y validación controlada demuestren que el nuevo cálculo puede asumir la autoridad sin pérdida funcional.

### Entidades clave

- **Desglose de calificación**: respaldo versionado de una nota, con componentes, fórmula, estado de cobertura, procedencia y revisión docente.
- **Componente puntuable**: pregunta, criterio de rúbrica o valoración manual que aporta puntos una sola vez y conserva su explicación.
- **Referencia de evidencia**: vínculo de un componente con una o más páginas, respuesta online o fragmento visible de la entrega.
- **Fórmula de nota**: operación reproducible que transforma puntos en nota base, aplica ajuste explícito y redondea la nota final.
- **Discrepancia de componente**: diferencia entre evaluadores sobre respuesta, estado, puntaje o explicación que requiere consolidación visible.
- **Ajuste docente**: cambio autorizado de puntos, explicación o nota global con motivo interno, explicación pedagógica estudiantil e historial antes/después.
- **Instantánea de calificación**: versión inmutable del desglose relevante para confirmación, ajuste, publicación o reclamo.
- **Política de visibilidad**: regla que determina qué explicación y clave puede ver cada rol según publicación y cierre de entregas.
- **Solicitud de revisión**: reclamo estudiantil asociado a la calificación completa o a un componente publicado específico.

## Criterios de éxito

- **SC-001**: El 100 % de las nuevas notas automáticas válidas puede reproducirse exactamente a partir de sus componentes y fórmula.
- **SC-002**: El 100 % de las preguntas o criterios puntuables esperados aparece una sola vez en el desglose o queda identificado como cobertura pendiente.
- **SC-003**: El 100 % de las respuestas objetivas verificadas como correctas recibe el puntaje completo correspondiente.
- **SC-004**: El 100 % de las notas publicadas con desglose incompleto o ajustado conserva actor, motivo interno, explicación estudiantil, valores anterior/nuevo y momento de la decisión docente.
- **SC-005**: Ninguna explicación entregada a profesor o estudiante contiene razonamiento interno privado, secretos o instrucciones del proveedor.
- **SC-006**: Un profesor puede identificar en menos de 30 segundos qué componentes originaron una nota y cuál fue la operación final.
- **SC-007**: Un profesor puede ajustar una pregunta y comprender la nota recalculada en menos de un minuto, sin calcularla manualmente.
- **SC-008**: Un estudiante llega desde “Ver entrega” al desglose publicado en máximo dos acciones y puede señalar una pregunta concreta al solicitar revisión.
- **SC-009**: En pruebas de evaluaciones abiertas, cero claves completas quedan expuestas a estudiantes antes del cierre o liberación explícita.
- **SC-010**: El 100 % de notas históricas sin evidencia suficiente se identifica como “sin desglose disponible” y no muestra detalle inventado.
- **SC-011**: La experiencia funciona sin contenido cortado ni desplazamiento horizontal en 360×800, 390×844, 768×1024 y escritorio, en modo claro y oscuro.
- **SC-012**: Añadir el desglose no bloquea la navegación y no aumenta en más de 20 % el tiempo mediano del procesamiento automático respecto de la línea base equivalente.
- **SC-013**: Los reintentos y lotes producen una sola calificación vigente y un solo conjunto de componentes por entrega.

## Supuestos

- El desglose completo siempre está disponible para el profesor autorizado antes de confirmar.
- El estudiante ve el desglose únicamente después de publicación; la clave completa permanece oculta mientras las entregas estén abiertas, salvo liberación docente explícita.
- La nota base se obtiene de componentes puntuables; criterios meramente descriptivos explican el resultado y no duplican puntos.
- Cuando los puntos posibles no usan la misma escala de la nota máxima, la conversión proporcional se muestra explícitamente.
- El redondeo final es único, reproducible y se conserva con precisión suficiente para que la operación coincida con la nota almacenada.
- Un ajuste global docente sigue permitido para casos excepcionales, pero se registra como delta separado con motivo interno y explicación pedagógica estudiantil.
- Las calificaciones históricas se conservan; solo se muestran desgloses heredados cuando pueden validarse sin inferencias.
- Los metadatos técnicos de proveedor pueden formar parte de la auditoría docente, pero no sustituyen la justificación pedagógica ni se muestran al estudiante.
- Un DBA expresa alineación curricular y puede aparecer en la explicación, pero no representa puntos. Una rúbrica solo participa en la fórmula cuando el profesor definió criterios puntuables y pesos; de lo contrario es descriptiva.
