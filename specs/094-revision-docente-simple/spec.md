# Especificación: revisión docente sencilla en celular y computador

**Feature Branch**: `codex/094-revision-docente-simple`

**Created**: 2026-10-11

**Status**: Alcance, plan y lista aprobados; implementación y regresiones focalizadas completas. Preparación del PR, sin fusión ni despliegue.

**Issue**: [#198](https://github.com/Andres-back/Calificator/issues/198)

**Input**: El docente encuentra confusa la revisión del análisis original. Solicita revisar fácilmente cada evaluación, conservar evidencia, comprobar la coherencia de la calificación y mejorar ambas distribuciones, celular y computador, con mensajes entendibles para profesores no técnicos.

**Aprobación del alcance**: El usuario respondió «si» a la propuesta de distinguir nota confirmada e historial, y añadió evidencia accesible, comprobación de nota y adaptación móvil/escritorio. Esta confirmación no aprueba un plan aún no presentado ni autoriza modificar calificaciones reales.

**Aprobación del plan**: El usuario respondió «aprove» tras recibir el plan, el 2026-10-11. Posteriormente autorizó «Sí, revisa y continúa» para revisar los ocho puntos de la lista contra el plan y continuar si son consistentes. No autoriza fusión ni despliegue.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Saber qué revisar y qué ya decidió el docente (Priority: P1)

Como profesor, quiero ver primero la nota vigente y su estado, y entender si hay una tarea pendiente o un aviso antiguo, sin interpretar códigos del sistema.

**Why this priority**: Un aviso del análisis inicial no debe parecer una orden de corregir una nota ya confirmada ni una prueba de que esa nota es incorrecta.

**Independent Test**: Consultar una nota pendiente, otra confirmada con discrepancia histórica y otra en proceso, sin modificar sus registros.

**Acceptance Scenarios**:

1. **Given** una nota confirmada o publicada y avisos iniciales, **When** se abre su detalle, **Then** se muestra el estado vigente; el historial está cerrado inicialmente, explica que los avisos pertenecen al análisis inicial y no afirma que hayan sido resueltos individualmente si no existe ese registro.
2. **Given** una nota pendiente con diferencia entre propuesta global y suma de puntos, **When** se abre, **Then** se explica en lenguaje sencillo qué comparar y hay acceso a puntajes por pregunta; la advertencia no se oculta ni se publica automáticamente.
3. **Given** una calificación en proceso, **When** se consulta, **Then** no se presenta una nota provisional como definitiva ni se usa texto que atribuya una decisión al docente.
4. **Given** motivos conocidos o desconocidos, **When** se expanden los avisos, **Then** no se muestran códigos internos; cada aviso tiene explicación y destino de revisión, o un mensaje de comprobación general sin inventar su causa.
5. **Given** respuestas sin señales de revisión, **When** se ven los contadores, **Then** no se las describe como respuestas correctas ni se garantiza que toda la nota sea correcta.

### User Story 2 - Contrastar la nota con la evidencia (Priority: P1)

Como profesor, quiero acceder a la foto y a cada respuesta con su puntaje y motivo, para comprobar la nota y mantener la evidencia organizada por alumno y evaluación.

**Why this priority**: La simplificación solo es útil si conserva la comprobación de la evaluación y la decisión final docente.

**Independent Test**: Abrir una evaluación sintética de varias hojas; navegar a una respuesta, contrastar su evidencia, editar puntos y comprobar actualización de nota, historial y advertencias existentes.

**Acceptance Scenarios**:

1. **Given** una evaluación con evidencia, **When** se consulta la nota, **Then** evidencia y respuestas/puntajes se abren con un control explícito cada una, sin buscar en menús secundarios; se conservan página seleccionada, visor y acceso en grande.
2. **Given** puntajes y criterios registrados, **When** se consulta el cálculo, **Then** se distingue la suma de puntos de la nota en su escala, indicando su procedencia; no se sustituye una decisión docente explícita por una suma diferente.
3. **Given** una respuesta corregida por el docente, **When** se guardan puntos, **Then** siguen funcionando las reglas existentes de cálculo, revisión, guardado e historial; no se duplican registros ni se pierde la evidencia.
4. **Given** evidencia ausente, carga fallida o información insuficiente, **When** se consulta, **Then** se informa qué falta y qué hacer; no se interpreta ausencia de lectura como respuesta incorrecta ni como cero definitivo.

### User Story 3 - Revisar con comodidad en cualquier pantalla (Priority: P2)

Como profesor, quiero nombres, controles y contenido legibles, tanto al usar el celular como al revisar varios estudiantes en computador.

**Why this priority**: La lista y el detalle necesitan aprovechar el espacio sin paneles que tapen contenido ni exceso de tarjetas anidadas.

**Independent Test**: Grupo sintético de 30 estudiantes y nombres largos en 360/390/768/1280/1440 píxeles, claro y oscuro; buscar, abrir un estudiante y llegar a las acciones al final.

**Acceptance Scenarios**:

1. **Given** un celular, **When** se abre el detalle, **Then** se mantiene un encabezado breve con identidad, nota y estado; se puede volver a la lista y desplegar evidencia/respuestas/retroalimentación sin superposición ni bloqueo del desplazamiento.
2. **Given** un computador, **When** se revisan varios estudiantes, **Then** búsqueda y nombres tienen espacio legible, filtros no requieren arrastre horizontal, y lista y detalle permiten llegar a su final sin atrapar el desplazamiento.
3. **Given** nombres largos, avisos extensos o teclado abierto, **When** se navega o escribe, **Then** no hay desbordamiento horizontal y los controles conservan etiquetas, foco y objetivos táctiles de al menos 44 × 44 píxeles.

### Edge Cases

- Nota publicada con advertencia antigua que nunca se marcó resuelta: conservar historial sin afirmar resolución ni reabrir el estado vigente.
- Suma de puntos distinta de la escala final; ajuste global docente documentado; nota cero real; discrepancia de origen: no inventar una fórmula ni corregir registros al consultar.
- Motivo desconocido o texto técnico del proveedor: explicar la acción general, sin perder trazabilidad interna ni reproducirlo como mensaje docente.
- Respuesta corta, texto largo, múltiples hojas, criterios además de preguntas y calificación histórica sin desglose: mantener acceso y distinguir ausencia de información.
- Fallo de carga/guardado, sesión sin permisos, borrador sin guardar y navegación entre estudiantes: mantener aislamiento y recuperación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El detalle DEBE distinguir nota pendiente, en proceso, confirmada y publicada, priorizando nota vigente y estado sobre avisos del análisis inicial.
- **FR-002**: Las notas decididas DEBEN presentar avisos iniciales como historial cerrado por defecto, con lenguaje pasado y botones de consulta; no afirmar resolución de cada aviso sin registro ni reabrir decisiones.
- **FR-003**: Los avisos activos DEBEN conservar su visibilidad y explicar qué comprobar con una acción directa. El lenguaje docente NO DEBE incluir códigos internos, nombres de campos o términos como desglose, excepciones o cobertura sin explicación sencilla.
- **FR-004**: Motivos originales y señales DEBEN conservarse para trazabilidad sin exponerse como texto técnico al profesor. Avisos desconocidos DEBEN recibir mensaje genérico accionable sin inventar la causa. Ausencia de avisos NO significa respuesta correcta.
- **FR-005**: Desde el resumen DEBE poder abrirse la evidencia y los puntajes por pregunta con una acción explícita cada uno; conservar varias hojas, visor, acceso en grande y navegación entre respuestas y evidencia.
- **FR-006**: La explicación DEBE diferenciar suma de puntos, nota en su escala y ajuste docente cuando existe, mostrando datos registrados sin inventar valores. Se DEBEN verificar regresiones de suma, modificación por pregunta y protección frente a información insuficiente.
- **FR-007**: Se DEBEN conservar preguntas, criterios, notas, evidencia, retroalimentación, estados, historial, permisos, reintentos y protección de cambios sin guardar. Consultar o desplegar esta mejora NO modifica registros ni algoritmos/modelos de calificación.
- **FR-008**: Celular y computador DEBEN aprovechar su espacio con encabezado breve, identidad legible, contenido progresivo y controles de al menos 44 × 44 píxeles; no haber desbordamiento horizontal, contenido tapado ni desplazamiento bloqueado.
- **FR-009**: La búsqueda y navegación entre estudiantes DEBEN seguir fluidas y preservar el contexto; en escritorio filtros y nombres no deben necesitar arrastre horizontal para usarse.
- **FR-010**: Carga, error, falta de evidencia y proceso pendiente DEBEN tener mensajes sencillos y acciones reales; no representarse como cero definitivo ni nota confirmada.

### Key Entities

- **Calificación vigente**: nota, escala, estado y eventual decisión/ajuste docente.
- **Puntaje por respuesta o criterio**: puntos registrados, máximo, motivo y relación con la evidencia.
- **Evidencia**: foto/documento con hojas asociado a una entrega, alumno y evaluación.
- **Aviso de revisión**: motivo original, prioridad y destino de comprobación; es histórico tras una decisión docente, sin presumir resolución individual.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Los casos pendiente, en proceso, confirmado y publicado muestran el estado esperado; ningún caso histórico exige una corrección como si siguiera pendiente.
- **SC-002**: Cero códigos internos o motivos técnicos literales visibles en los mensajes de revisión, incluidos avisos desconocidos y detalles expandidos.
- **SC-003**: Evidencia y puntajes por respuesta se abren desde el resumen con un control cada uno; todas las hojas sintéticas siguen accesibles tras cambiar de estudiante.
- **SC-004**: En la matriz 360/390/768/1280/1440, claro/oscuro, se busca, abre y recorre una calificación sin desbordamiento horizontal, controles tapados o bloqueo del desplazamiento.
- **SC-005**: Todas las regresiones focalizadas de permisos, nota/suma, ajustes, procesamiento, guardado e historial pasan; consultar no produce escrituras académicas ni cambia la evidencia.

## Assumptions

- Evolución de la presentación 087/088 bajo el propietario 008; no introduce otra vista de calificación ni sustituye sus contratos.
- Se revisa la corrección del cálculo y la conservación de barreras existentes; no se promete que un modelo nunca falle ni se cambian modelos, prompts o calificaciones reales dentro de este alcance.
- No hay nuevas rutas, dependencias, migraciones ni llamadas de IA. La evidencia seguirá en su almacenamiento actual.
- Se valida con datos sintéticos. CI y aprobación de fusión/despliegue son pasos separados.
