# Feature Specification: Revisión visual y edición directa de la nota

**Feature Branch**: `codex/134-revision-visual-nota-directa`

**Created**: 2026-10-28

**Status**: Especificación y plan ampliado aprobados mediante «adelante». Revisión de ocho criterios autorizada mediante «Sí, revisa y continúa» y completada; implementación y Converge completos, con resultados locales en [validation.md](./validation.md). PR/CI requeridos; sin producción modificada.

**Issue**: [#281](https://github.com/Andres-back/Calificator/issues/281)

**Input**: El profesor necesita distinguir preguntas con revisión urgente o baja confianza mediante colores y editar fácilmente la nota general de un estudiante, incluso si aceptó antes un 4,1.

## User Scenarios & Testing

### User Story 1 - Escribir la nota final deseada (Priority: P1)

Como docente autorizado, quiero pulsar «Editar nota» junto a la nota actual y escribir el resultado final, sin buscar opciones avanzadas ni calcular cuánto sumar o restar.

**Why this priority**: La decisión final corresponde al docente; el ajuste actual está disperso entre formularios diferentes.

**Independent Test**: Cambiar una nota sintética confirmada de 4,1 a 4,5, recargar y consultar revisión, libro de notas e historial, sin modificar las respuestas ni sus puntos.

**Acceptance Scenarios**:

1. **Given** una nota sugerida, confirmada o ajustada, **When** su docente abre «Editar nota», **Then** ve el valor vigente, la escala, un campo para la nota final y guardar/cancelar; el comentario es opcional.
2. **Given** una escala de 0 a 5, **When** introduce `4,5` o `4.5`, **Then** guarda 4,5; cero es válido y vacío, valores negativos, no finitos o superiores a cinco no se guardan.
3. **Given** un desglose completo, **When** cambia únicamente la nota final, **Then** se conserva la suma por preguntas y el cambio docente aparece por separado, con la nota anterior, nueva, actor y fecha; la propuesta original de IA sigue consultable.
4. **Given** una nota publicada, **When** su docente desea cambiarla, **Then** se le advierte que quedará ajustada y necesitará volver a publicar, y que los enlaces anteriores afectados se suspenderán; no se publica ni reactiva nada automáticamente.
5. **Given** otra sesión guardó primero o el trabajo sigue procesándose, **When** intenta guardar, **Then** no se sobrescribe el resultado y el borrador se conserva con una explicación sencilla.

### User Story 2 - Reconocer qué pregunta revisar primero (Priority: P1)

Como profesor, quiero identificar la prioridad de revisión con color, icono y texto, sin confundir una respuesta equivocada del estudiante con una calificación poco confiable.

**Why this priority**: Permite dirigir la comprobación docente sin declarar que la confianza de una IA demuestra exactitud.

**Independent Test**: Abrir un caso con preguntas bien sustentadas, dudas moderadas y problemas urgentes; comprobar que navegación, resumen y pregunta seleccionada coinciden y no cambian ningún puntaje.

**Acceptance Scenarios**:

1. **Given** una pregunta sustentada sin avisos vigentes, **When** se muestra al profesor, **Then** aparece verde con «Sin avisos de revisión»; puede ser académicamente correcta o incorrecta.
2. **Given** evidencia de confianza baja, lectura ilegible, puntos ausentes o una contradicción material, **When** se muestra, **Then** aparece roja con «Revisión prioritaria» y una razón comprensible.
3. **Given** confianza intermedia, información de verificación insuficiente o una observación no urgente, **When** se muestra, **Then** aparece amarilla con «Conviene comprobar»; la ausencia de datos no se presenta como seguridad.
4. **Given** una pregunta seleccionada, **When** cambia de pregunta, **Then** el color de prioridad se conserva y un indicador adicional identifica la selección; la leyenda explica que el color no es la nota ni la exactitud comprobada.
5. **Given** una corrección explícita de esa pregunta hecha por el docente, **When** se consulta su versión vigente, **Then** los avisos originales siguen en el historial pero no se confunden con una observación actual; editar solo la nota global no elimina avisos por pregunta.

### User Story 3 - Revisar y corregir desde el celular (Priority: P2)

El profesor puede usar ambos flujos desde un celular o computador, con lectura clara, teclado y errores recuperables.

**Why this priority**: La corrección es una operación frecuente en la clase y no debe exigir desplazarse entre secciones ocultas.

**Independent Test**: Completar el cambio 4,1 → 4,5 y navegar por preguntas a 360, 390 y 1440 px, en temas claro/oscuro, usando teclado y entrada táctil.

**Acceptance Scenarios**:

1. **Given** el teclado abierto en una pantalla estrecha, **When** se edita, **Then** guardar/cancelar son alcanzables sin desbordamiento horizontal y los controles táctiles miden al menos 44 px.
2. **Given** una caída de red, un doble clic o un intento de salir con cambios, **When** se guarda o navega, **Then** no se duplica el ajuste ni se pierde silenciosamente el borrador.

### Edge Cases

- Cero confirmado frente a nota sugerida distinta; números con coma/punto, precisión guardada mayor que la mostrada, apertura/cancelación sin cambios.
- Calificaciones antiguas sin desglose o con preguntas aún sin puntos: no se inventan respuestas, ceros ni verificaciones para permitir una decisión global docente.
- Nota publicada, entrega anulada o en proceso; estudiante y docente ajeno intentando editar; permiso de calificar distinto del de publicar.
- Confianza ausente, vacía, booleana, fuera de rango, expresada como fracción o porcentaje; solo una valoración, varias contradictorias o advertencias generales sin pregunta identificable.
- Profesor corrige una pregunta pero conserva las valoraciones originales como historial; corregir el total no equivale a revisar todas las respuestas.
- Conflicto de versión, reenvío del mismo guardado, error después de guardar y vista antigua en otro dispositivo.

## Requirements

### Functional Requirements

- **FR-001**: El profesor con permiso y acceso a la evaluación DEBE poder abrir «Editar nota» junto al valor principal de cada calificación apta para edición, incluidas las previamente confirmadas. Estudiantes y docentes ajenos NO DEBEN modificarla.
- **FR-002**: El editor DEBE recibir la nota final deseada, aceptar coma o punto decimal y validar la escala vigente, con comentario opcional. No DEBE exigir calcular diferencias ni redactar una justificación pedagógica.
- **FR-003**: La presentación DEBE usar hasta dos decimales sin ceros sobrantes. Abrir, cancelar o guardar sin cambios NO DEBE redondear ni modificar un valor previamente almacenado con más precisión.
- **FR-004**: Guardar DEBE conservar propuesta original, evidencias, respuestas y puntos por pregunta; registrar antes/después, actor y fecha; y explicar por separado la diferencia entre el cálculo y la decisión global docente, sin inventar motivos.
- **FR-005**: El cambio DEBE ser atómico, rechazar una versión desactualizada y no duplicar ajustes en reenvíos. No DEBE editarse una calificación en procesamiento o anulada. Los fallos DEBEN conservar el borrador.
- **FR-006**: Guardar una nota NO DEBE publicarla automáticamente. Una publicada DEBE advertir antes del guardado, pasar a ajustada y suspender sus enlaces previos afectados conforme a la política de cambios académicos; publicar nuevamente es una decisión separada.
- **FR-007**: Los registros antiguos o incompletos DEBEN admitir una decisión global docente sin fabricar un desglose completo ni anular las comprobaciones existentes de evidencia; su falta de detalle sigue visible.
- **FR-008**: La prioridad de revisión docente DEBE identificarse con verde, amarillo o rojo, además de icono, etiqueta y explicación. NO DEBE confundirse con correcta, parcial o incorrecta ni presentarse como garantía de exactitud.
- **FR-009**: Una bandera vigente de revisión, evidencia ilegible/no evaluable, puntaje ausente/inválido, confianza baja o contradicción material DEBE ser roja; dudas moderadas o verificación insuficiente, amarillas; solo respaldo suficiente y sin avisos permite verde.
- **FR-010**: La prioridad DEBE ser consistente entre resumen, botones y detalle, conservando el color al seleccionar una pregunta. Los avisos generales no localizables DEBEN seguir visibles sin asignarse arbitrariamente a una pregunta.
- **FR-011**: La corrección individual vigente del profesor DEBE distinguirse de las valoraciones históricas de IA. Cambiar la nota global NO DEBE borrar avisos ni marcar todas las preguntas como revisadas.
- **FR-012**: Los colores privados de revisión NO DEBEN filtrar observaciones internas a estudiantes ni alterar puntajes, modelos, colas, reglas de publicación o resultados por sí mismos.
- **FR-013**: Ambos flujos DEBEN funcionar desde 360 px hasta escritorio, en claro/oscuro, con teclado y sin depender solo del color. Los mensajes DEBEN ser comprensibles y distinguir guardar, confirmar y publicar.

### Key Entities

- **Calificación vigente**: nota sugerida/confirmada, escala, estado y versión para detectar conflictos.
- **Decisión global docente**: valor anterior/nuevo, diferencia frente a la base, observación opcional, autor y fecha.
- **Desglose versionado**: puntos por pregunta, cálculo base, ajuste y versiones previas preservadas.
- **Prioridad de revisión**: resultado visual derivado de los datos actuales, con motivos diferenciados de la corrección académica.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Editar una nota final requiere como máximo abrir el editor, escribir y guardar, sin entrar a historial u opciones avanzadas ni redactar comentarios.
- **SC-002**: En el 100 % de los casos de prueba, la nota guardada coincide al recargar revisión y libro de notas; evidencia, puntos e historial original permanecen intactos.
- **SC-003**: Se rechaza el 100 % de los intentos sin permiso, fuera de escala o con versión obsoleta; cancelar y repetir el mismo guardado no producen decisiones adicionales.
- **SC-004**: La matriz de revisión distingue todos los casos de baja/intermedia/alta confianza, datos desconocidos, contradicciones y revisión docente, sin modificar ninguna nota.
- **SC-005**: Los dos flujos son utilizables a 360, 390 y 1440 px, en claro/oscuro y sin desbordamiento horizontal; cada control principal tiene objetivo táctil mínimo de 44 px.
- **SC-006**: Ninguna prueba de esta entrega recalifica o modifica datos de producción ni realiza llamadas a modelos de IA.

## Assumptions

- «Nota general de cada evaluación» se refiere aquí a la nota final de cada estudiante en esa evaluación, no al máximo de la escala ni a asignar una nota común a toda la clase.
- El color refleja prioridad de comprobación, no una probabilidad de exactitud calibrada. Los umbrales concretos y el tratamiento de datos desconocidos quedan documentados en el plan.
- Se reutilizan permisos, historial y reglas de suspensión de enlaces; el comentario opcional no exime registrar el cambio mecánico real.
- Esta entrega concreta la edición pendiente del issue #242 sin reactivar su antigua propuesta de cambiar todos los modelos a GLM; los modelos institucionales actuales no se modifican.
- Complementa las especificaciones 016 (desglose), 050 (revisión por excepciones) y 087 (calificación clara). No incorpora el escáner pendiente de Spec 131 ni declara validados teléfonos físicos.
- Fuera de alcance: correcciones masivas, cambiar puntos individuales, recalificaciones, algoritmos de nota de IA, rúbricas, nuevos modelos y despliegues manuales.
- La aprobación del plan ampliado es previa a implementar; esta preparación no modifica producción ni autoriza fusionar un futuro PR.
