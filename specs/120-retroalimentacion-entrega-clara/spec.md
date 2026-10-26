# Especificación: devolución docente clara y compartible

**Extensión aprobada**: [Spec126](../126-retroalimentacion-unificada-chat/spec.md), 2026-10-24, aplica el mismo espacio de revisión a estudiante y grupo. Añade guardado explícito del mensaje sin confirmar/publicar nota, con historial, huella, permisos e invalidación; conserva la autorización separada de entrega y todas las reglas de esta especificación.

**Rama**: `codex/120-retroalimentacion-entrega-clara` | **Creada**: 2026-10-23 | **Estado**: Aprobada por el usuario el 2026-10-23 («si usemoslo … adicional lo de la retroalimentacion»); continuación confirmada («sigue») | **Issue**: #255

**Solicitud**: Resolver de forma común la selección de estudiantes para enlaces e impresión, incluso después de confirmar una nota, y ordenar la retroalimentación para que sea comprensible.

## Escenarios de usuario y pruebas

### Historia 1 - Seleccionar estudiantes y resolver lo pendiente (Prioridad: P1)

Como docente necesito seleccionar uno, varios o todos los estudiantes con nota desde una evaluación, ver qué falta para entregar sus devoluciones y resolverlo sin buscar opciones escondidas ni solicitar ayuda técnica.

**Razón de prioridad**: En producción se observó que una nota publicada podía seguir bloqueada para compartir. Publicar la nota no revisa necesariamente el mensaje ni resuelve los avisos del análisis original.

**Prueba independiente**: Un grupo sintético contiene devoluciones listas, notas confirmadas con avisos previos, mensajes provisionales y estudiantes sin nota. La selección funciona y cada impedimento conduce a una acción concreta; nada se entrega sin autorización.

**Aceptación**:
1. **Dadas** devoluciones con nota, **cuando** el docente selecciona una, varias o todas, **entonces** conserva la selección y distingue listas para entregar de pendientes de revisión; no presenta la selección como autorización de entrega.
2. **Dada** una devolución pendiente, **cuando** solicita preparar impresión o enlaces, **entonces** puede revisar exactamente su nota oficial, mensaje y alcance, corregir el mensaje si hace falta y autorizar explícitamente esa revisión. No exige reconstruir el desglose para compartir solo un resumen docente.
3. **Dado** un lote mixto, **cuando** quedan pendientes, **entonces** se informa cuáles faltan y se permite entregar únicamente los listos mediante elección explícita; no se ocultan exclusiones ni se autoriza automáticamente a todos.
4. **Dado** un estudiante sin nota docente confirmada, **cuando** se prepara la entrega, **entonces** no se comparte una sugerencia de IA como resultado definitivo y se ofrece ir a revisar la nota.

### Historia 2 - Entregar la decisión docente sin publicar un desglose incompleto (Prioridad: P1)

Como docente necesito que mi devolución revisada pueda entregarse aunque queden avisos históricos de IA, sin presentarlos como resueltos ni divulgar respuestas o puntajes que todavía no he validado.

**Razón de prioridad**: Una autorización clara debe evitar tanto bloqueos heredados innecesarios como la divulgación de análisis inconsistentes.

**Prueba independiente**: Autorizar el resumen de una nota confirmada con desglose incompleto; comprobar que la devolución conserva la nota oficial y mensaje aprobado, omite respuestas/puntajes no validados y mantiene intacto el análisis privado.

**Aceptación**:
1. **Dada** una nota confirmada con avisos anteriores, **cuando** el docente autoriza el resumen revisado, **entonces** puede imprimir o emitir un enlace de ese resumen; no cambia la nota ni elimina los avisos del análisis original.
2. **Dado** un desglose incompleto, pendiente o distinto de la nota oficial, **cuando** se comparte solo el resumen, **entonces** no se incluyen sus preguntas, puntajes, respuestas de referencia ni contexto no autorizado para Xali. Se explica que la devolución no incluye detalle por pregunta, sin afirmar una revisión dual completa.
3. **Dado** un desglose validado y coherente, **cuando** se entrega la devolución, **entonces** se puede incluir el detalle permitido por las reglas actuales de soluciones y evidencia.
4. **Dada** una revisión aprobada, **cuando** cambian nota, mensaje, desglose o evidencia, **entonces** no se reutiliza silenciosamente su aprobación ni se mezclan versiones; los accesos afectados conservan la suspensión y reautorización existentes.

### Historia 3 - Leer una retroalimentación ordenada (Prioridad: P2)

Como docente, estudiante o acudiente necesito distinguir aciertos, qué mejorar y siguiente paso, sin recibir un bloque largo de texto ni mensajes internos del sistema.

**Razón de prioridad**: La presentación debe permitir comprender y aplicar una recomendación concreta, especialmente desde celular.

**Prueba independiente**: Revisar mensajes cortos, largos y heredados en lista, previsualización, impresión y enlace; conservar el contenido sustantivo completo, la identidad del estudiante y el mismo alcance aprobado.

**Aceptación**:
1. **Dado** un mensaje con aciertos, dificultades y recomendaciones identificables, **cuando** se visualiza, **entonces** presenta esas partes separadas y legibles, sin duplicar las mismas frases.
2. **Dado** un mensaje antiguo que no permite identificar esas partes con seguridad, **cuando** se visualiza, **entonces** conserva el texto en una sección general; no inventa logros, errores ni recomendaciones para llenar casillas.
3. **Dada** una devolución extensa, **cuando** se imprime, **entonces** no se trunca ni mezcla con otro estudiante; las continuaciones conservan identificación y orden. El enlace muestra la misma devolución autorizada.

### Casos límite

- Cero confirmado válido, nota ausente, calificación anulada o en procesamiento: no confundir estados ni inventar notas.
- Mensaje vacío, genérico, provisional o contradictorio: señalar lo que debe revisar el docente; no quitar automáticamente una advertencia para simular aprobación.
- Análisis antiguo sin desglose: conservar la vía de resumen docente; no reconstruir resultados históricos.
- Cambios en otra pestaña, sesión cerrada, pérdida de permisos, matrícula retirada o selección obsoleta: rechazar entrega y pedir actualización sin perder trabajo válido ni mostrar datos ajenos.
- Fallos parciales y reintentos: conservar resultados confirmados sin duplicar enlaces ni anunciar éxito total.
- Devoluciones de hasta 30 estudiantes y mensajes de hasta 6.000 caracteres en prueba: vista resumida legible, detalle completo disponible y continuidad de impresión.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE aplicar el mismo criterio de elegibilidad y autorización a todos los docentes, sin habilitaciones particulares. La lista DEBE distinguir nota ausente, devolución pendiente y devolución lista, con motivo y acción comprensibles.
- **FR-002**: El docente DEBE poder seleccionar uno, varios o todos los estudiantes con nota, buscar por nombre y conservar la selección al revisar pendientes. Seleccionar NO equivale a confirmar la nota ni autorizar un enlace.
- **FR-003**: La entrega DEBE exigir nota oficial confirmada y autorización explícita de la devolución vigente. Los avisos anteriores de IA no DEBEN invalidar por sí solos un resumen que el docente haya revisado y autorizado; tampoco se borran ni se declaran resueltos por esa autorización.
- **FR-004**: Si el desglose no es completo, revisado y coherente con la nota oficial, la entrega autorizada DEBE limitarse al resumen docente y omitir todo detalle por pregunta no validado, incluidas referencias y contexto para Xali. Su alcance DEBE mostrarse antes de autorizar.
- **FR-005**: La revisión DEBE permitir editar y aprobar el mensaje visible sin recalificar. Mensajes vacíos, provisionales sin revisar o con contradicciones detectadas DEBEN conducir a una corrección explícita; no se habilitan mediante borrado automático de advertencias o aprobación masiva implícita.
- **FR-006**: Lista, previsualización, ficha impresa y enlace DEBEN reutilizar la misma organización de contenido: aciertos, qué mejorar y siguiente paso cuando se puedan distinguir con seguridad; de lo contrario, conservar el texto general completo. No crear contenido pedagógico nuevo ni exigir llamadas adicionales a IA.
- **FR-007**: Una modificación de la fuente DEBE invalidar la aprobación correspondiente y suspender los accesos afectados conforme a las reglas vigentes. La autorización, autor y revisión compartida DEBEN ser auditables; el historial original permanece intacto.
- **FR-008**: Impresión y enlaces DEBEN validar permisos, matrícula, selección vigente, destinatario y revisión también al entregar. Se conservan vigencia finita, revocación, separación por estudiante, soluciones privadas, evidencia opcional y cupo de cinco preguntas cada diez minutos de Xali.
- **FR-009**: El flujo DEBE funcionar desde 360 px hasta escritorio, en ambos temas y con teclado, sin desbordamientos, botones tapados ni un cuadro diminuto para leer mensajes extensos; controles principales de al menos 44×44 px y errores recuperables en lenguaje docente.
- **FR-010**: El cambio NO DEBE alterar automáticamente notas, evidencias, matrícula, mensajes guardados, modelos o análisis históricos. Emitir, imprimir, seleccionar y actualizar NO recalifican ni envían mensajes externos. Solo una edición o autorización explícita del docente modifica su devolución o control de entrega.

### Entidades clave

- **Decisión docente**: nota oficial vigente e historial académico, distintos de la propuesta original de IA.
- **Devolución autorizada**: mensaje revisado, alcance resumen/detalle, revisión de fuente, autor y fecha; no certifica automáticamente todos los resultados originales.
- **Estado de preparación**: listo, pendiente de revisar o sin nota, con explicación y acción asociadas.
- **Ficha y acceso individual**: dos formas de entregar la misma revisión autorizada; cada acceso conserva destinatario, vigencia y controles de Spec107.

## Criterios de éxito

- **SC-001**: El 100 % de casos de la matriz sintética —dos docentes, nota publicada con avisos históricos, texto provisional, desglose incompleto, cero confirmado, nota ausente y cambio concurrente— permite una entrega autorizada o muestra un motivo y acción concretos; nunca habilita resultados no revisados.
- **SC-002**: Con una nota oficial y mensaje válido ya disponibles, preparar una devolución pendiente para impresión o enlace requiere como máximo tres acciones principales adicionales: revisar, autorizar y entregar. La corrección de texto voluntaria no se oculta como aprobación automática.
- **SC-003**: En 30 devoluciones sintéticas, las vistas de 360/390/768/1440 px, dos motores y ambos temas conservan todo el contenido y las acciones accesibles. Impresión Carta/A4 y enlace coinciden con la revisión aprobada, sin truncamientos ni mezcla de estudiantes.
- **SC-004**: Las pruebas de permisos, cambios, reintentos y fallos parciales producen cero entregas ajenas, cero duplicados de emisión y cero cambios automáticos en registros académicos; omitir un desglose no validado también excluye ese contenido de Xali.

## Supuestos

- Esta corrección precisa la entrega de Spec107, no sustituye la validación pedagógica pendiente de #236 ni afirma que la IA siempre acierta. Al implementar se actualizarán sus requisitos afectados para evitar contradicciones.
- Aprobación de nota y aprobación de devolución tienen propósitos distintos. Las notas ya confirmadas se respetan; un aviso histórico no se elimina por el hecho de autorizar un resumen.
- Se reutiliza la infraestructura existente de impresión, enlaces, auditoría y autorización; no se crean listas públicas del grupo ni familiares por apellido.
- La organización de texto es presentación conservadora, no una nueva generación o evaluación de calidad académica. Los mensajes guardados no se migran ni reescriben masivamente.
- Las comprobaciones de producción realizadas hasta ahora fueron de solo lectura y emitieron únicamente cantidades y categorías de bloqueo, sin nombres, fotos o respuestas. No se autoriza enviar nuevas evidencias reales a IA.
- Fuera de alcance: cambiar modelos, recalificar en lote, modificar automáticamente notas, divulgar detalles incompletos, retirar controles de acceso o desplegar manualmente.
- La especificación recibió aprobación humana el 2026-10-23. El proceso de hotfix conserva las pruebas, PR y CI obligatorios; permite omitir únicamente la pausa humana del plan, no la revisión de requisitos. No hay hooks de extensión configurados.
- Spec122 (#257), aprobada posteriormente, incorpora una alternativa de aceptación global sobre notas y mensajes exactos mostrados. La autorización explícita puede ser por lote, no necesariamente por estudiante en una pantalla separada. Su orden es aceptación/publicación académica y luego autorización de devolución contra la fuente final; se conservan alcance resumen, edición opcional, historial e invalidación.
- Spec129 (#272) reorganiza el flujo docente sin relajar revisión/alcance: selección compacta, detalle contextual y resultado de entrega en el mismo panel. Las notas pendientes se explican, nunca se aceptan silenciosamente al compartir. Se conservan borradores, edición sucia y texto formativo guardado.
