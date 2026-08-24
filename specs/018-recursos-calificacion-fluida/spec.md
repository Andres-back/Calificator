# Especificación: Recursos y calificación fluida

**Rama**: `codex/018-recursos-calificacion-fluida` | **Creada**: 2026-08-21 | **Estado**: Aprobada | **Issue**: #24

## Clarificaciones

### Sesión 2026-08-22

- **P**: Si crear un recurso exige seleccionar materia, ¿cuándo debe aparecer en esa materia? → **R**: Inmediatamente después de generarse; queda visible para el profesor como borrador y solo se muestra al estudiante después de elegir y publicar su tipo de asignación.
- **P**: ¿Una operación lenta debe terminar por tiempo? → **R**: No. Una inferencia aceptada permanece activa hasta recibir respuesta o un fallo real; los umbrales temporales solo informan lentitud.


### Sesión 2026-08-24

- **P**: ¿La rúbrica propuesta por la IA queda bloqueada? → **R**: No. Antes de confirmar la evaluación, el profesor puede editar nombre, descripción, peso y descriptores de nivel, además de agregar, ordenar o eliminar criterios. El total debe ser 100 % y se guarda con las preguntas mediante el contrato vigente.

## Escenarios de usuario y pruebas

### Historia 1 - Asignar un recurso sin perder su contexto (Prioridad: P1)

Como profesor, quiero que un recurso generado para una materia permanezca en mi biblioteca y también pueda asignarse dentro de esa materia como apoyo o actividad evaluativa.

**Razón de prioridad**: La asignación posterior es poco evidente y el profesor puede percibir que el material se perdió.

**Prueba independiente**: Generar un recurso, elegir tipo de asignación y comprobar que una única versión aparece en Recursos y en la materia.

**Aceptación**:

1. **Dado** que se seleccionó una materia, **cuando** termina la generación, **entonces** el recurso aparece inmediatamente en esa materia para el profesor y se puede conservar como borrador, publicar como apoyo o convertir en actividad evaluativa.
2. **Dado** un apoyo visible, **cuando** un estudiante matriculado abre la materia, **entonces** puede verlo y descargarlo sin crear entrega ni nota.
3. **Dado** un recurso respondible, **cuando** se asigna como actividad, **entonces** queda vinculado a una única evaluación configurable antes de publicarse.
4. **Dado** un recurso asignado, **cuando** se consulta biblioteca o materia, **entonces** ambas muestran el mismo recurso, tipo y estado.
5. **Dado** un apoyo, **cuando** se oculta o habilita, **entonces** cambia su disponibilidad sin perder el material.
6. **Dada** una actividad, **cuando** se abren o cierran entregas desde el recurso o evaluación, **entonces** ambos lugares reflejan el mismo estado.

### Historia 2 - Calificar y digitalizar sin perder respuestas tardías (Prioridad: P1)

Como profesor, quiero enviar foto o PDF y seguir navegando mientras el sistema conserva el trabajo hasta recibir la respuesta del proveedor.

**Razón de prioridad**: Cerrar una solicitud por tiempo no detiene necesariamente el cómputo remoto y puede dejar una entrega sin nota aunque el modelo termine correctamente.

**Prueba independiente**: Procesar una imagen legible, simular una respuesta posterior al antiguo límite y comprobar que el job sigue activo y persiste la nota exactamente una vez.

**Aceptación**:

1. **Dado** un archivo válido, **cuando** inicia el proceso, **entonces** se confirma recepción en menos de dos segundos y se puede seguir navegando o agregar trabajos.
2. **Dado** un fallo real de conexión, escritura, pool, 5xx o respuesta inválida, **cuando** ocurre, **entonces** se usa una contingencia finita y observable.
3. **Dado** que una etapa tarda más de lo habitual, **cuando** la conexión con el proveedor sigue activa, **entonces** el trabajo permanece procesando y conserva la solicitud hasta recibir respuesta.
4. **Dado** un trabajo activo por más de 90 segundos, **cuando** se consulta su monitor, **entonces** indica que OpenCode sigue trabajando y que la evidencia está segura.
5. **Dado** un trabajo finalizado, **cuando** se abre su detalle, **entonces** muestra cola, etapas, estrategia y fallos sin secretos ni razonamiento privado.
6. **Dado** un reintento por fallo real o reinicio, **cuando** se procesa, **entonces** no duplica entrega, nota, evaluación ni archivo.
7. **Dada** evidencia insuficiente o clave incompleta, **cuando** el proveedor responde, **entonces** pasa a revisión y no se publica automáticamente.

### Historia 3 - Ajustar cada respuesta donde se revisa (Prioridad: P1)

Como profesor, quiero corregir puntaje y explicación junto a cada pregunta, sin desplazarme al final de una evaluación larga.

**Razón de prioridad**: El editor separado de la pregunta aumenta tiempo y riesgo de error.

**Prueba independiente**: Editar una respuesta intermedia en su tarjeta y comprobar nota e historial sin ir al final.

**Aceptación**:

1. **Dado** un desglose, **cuando** se elige ajustar, **entonces** el editor aparece junto al componente con enunciado, evidencia, respuesta, referencia permitida y máximo visibles.
2. **Dado** un cambio válido, **cuando** se modifican puntos, estado o explicación, **entonces** se previsualiza la nota recalculada.
3. **Dado** que se guarda, **cuando** termina, **entonces** componente, fórmula, nota e historial se actualizan sin mover la vista al final.
4. **Dado** un ajuste, **cuando** se guarda, **entonces** conserva actor, momento, valores anterior/nuevo, motivo interno y explicación pedagógica.
5. **Dado** un cambio sin guardar, **cuando** se cambia de pregunta o se sale, **entonces** se puede guardar, descartar o permanecer.
6. **Dado** un conflicto de versión, **cuando** se guarda, **entonces** se informa y no sobrescribe la corrección ajena.

### Historia 4 - Revisar notas con desplazamiento confiable (Prioridad: P1)

Como profesor, quiero recorrer lista y detalle en celular, tableta y escritorio sin quedar atrapado por paneles o desplazamientos anidados.

**Razón de prioridad**: Un panel fijo o gesto capturado impide terminar la revisión, especialmente en iPhone.

**Prueba independiente**: Recorrer una evaluación extensa en 360×800, 390×844, 768×1024 y escritorio, editar con teclado móvil y volver a la lista sin cortes.

**Aceptación**:

1. **Dado** el listado, **cuando** se desplaza, **entonces** se alcanza primer y último estudiante con mouse, teclado y gesto.
2. **Dado** un detalle móvil, **cuando** se recorre completo, **entonces** existe un único desplazamiento vertical predecible.
3. **Dado** el teclado móvil, **cuando** cambia el área visible, **entonces** el campo y guardar/cancelar siguen accesibles.
4. **Dado** que se vuelve a la lista, **cuando** se cierra el detalle, **entonces** se recuperan posición y filtros sin dejar el cuerpo bloqueado.
5. **Dado** cualquier tamaño admitido, **cuando** se revisa, **entonces** no hay desbordamiento horizontal, texto cortado ni controles inaccesibles.
6. **Dado** modo claro u oscuro, **cuando** se revisa, **entonces** contraste, foco y jerarquía siguen comprensibles.

### Casos límite

- Un recurso con materia puede quedar como borrador: sigue en biblioteca y no es visible.
- Un recurso no respondible explica por qué no puede ser actividad y permite apoyo o edición.
- Reasignar un recurso ya vinculado abre la actividad existente, no crea otra.
- Cambiar de materia exige confirmación y no deja vínculos huérfanos.
- Ocultar apoyo no lo elimina; cerrar entregas no equivale a ocultar contenido.
- Si existen entregas, retirar o cambiar actividad preserva evidencias, notas e historial.
- Una respuesta externa tardía completa el job si sigue vigente y nunca duplica el resultado.
- Si ambos evaluadores fallan o discrepan, termina en revisión, no en una nota inventada.
- Con decenas de componentes solo un editor permanece activo y se conserva posición.
- Rebote táctil, barra inferior o teclado virtual no crean contenedores competidores.
- Si se pierde conexión durante un ajuste, el formulario conserva datos hasta decidir.

## Requisitos

### Requisitos funcionales

- **FR-001**: Todo recurso DEBE conservar una identidad y aparecer en la biblioteca general.
- **FR-002**: La materia elegida al generar DEBE quedar asociada inmediatamente al recurso y este DEBE aparecer en la vista docente de esa materia aunque siga como borrador.
- **FR-003**: Al finalizar, el profesor DEBE elegir borrador, apoyo o actividad sin abandonar el detalle.
- **FR-004**: Todo recurso con materia DEBE aparecer en biblioteca y materia para el profesor con el mismo estado; el estudiante solo lo recibe cuando su visibilidad y asignación lo permitan.
- **FR-005**: Un apoyo DEBE admitir visible/oculto sin crear entregas, notas ni copias.
- **FR-006**: Una actividad DEBE vincularse a una evaluación canónica y reutilizar fechas, visibilidad, entregas, calificación e historial.
- **FR-007**: Controles en recurso y evaluación DEBEN reflejar el mismo estado.
- **FR-008**: El sistema DEBE impedir asignaciones duplicadas.
- **FR-009**: Solo autor o administrador autorizado PUEDE asignar, retirar, mostrar, ocultar, abrir o cerrar.
- **FR-010**: Un estudiante solo DEBE ver recursos visibles de materias donde esté matriculado.
- **FR-011**: Una operación larga DEBE crear un trabajo y confirmar recepción en menos de dos segundos sin bloquear navegación.
- **FR-012**: Cada trabajo DEBE registrar cola, preparación, extracción, evaluación principal, contraste, consolidación y persistencia cuando apliquen.
- **FR-013**: Cada llamada externa DEBE proteger conexión, escritura y pool con tiempos finitos, pero una inferencia aceptada NO DEBE cancelarse por un límite de lectura; los intentos y la causa terminal DEBEN ser observables.
- **FR-014**: Los reemplazos DEBEN considerar disponibilidad y calidad sin acoplar el producto a un proveedor.
- **FR-015**: Visión DEBE conservar valoración por componente, contraste y decisión docente; evidencia insuficiente no puede volverse nota automática.
- **FR-016**: Una etapa lenta DEBE conservar el trabajo activo, visible y navegable hasta recibir respuesta; solo un fallo real de transporte, una respuesta inválida o una cancelación humana explícita puede interrumpirla.
- **FR-017**: Digitalización DEBE evitar llamadas adicionales para respuestas verificables localmente y reparar solo componentes incompletos.
- **FR-018**: La interfaz DEBE informar cola, proceso, revisión, éxito y error, y notificar en otra vista.
- **FR-019**: Un reintento DEBE ser idempotente y no duplicar entidades ni archivos.
- **FR-020**: Telemetría NO DEBE almacenar respuestas, evidencias, credenciales, prompts privados ni razonamiento interno.
- **FR-021**: Cada componente DEBE mostrar edición junto a la respuesta.
- **FR-022**: El editor DEBE aparecer junto al componente, nunca al final del desglose.
- **FR-023**: El editor DEBE ajustar puntos dentro del máximo, estado, motivo interno y explicación pedagógica con validaciones.
- **FR-024**: La nota recalculada DEBE previsualizarse y la oficial solo cambiar mediante la operación auditada.
- **FR-025**: Solo PUEDE existir una edición activa; cambiar de contexto con datos sin guardar exige decisión.
- **FR-026**: Guardar DEBE actualizar desglose, fórmula, nota e historial y manejar conflictos sin sobrescritura.
- **FR-027**: Cada panel visible DEBE tener un único propietario del desplazamiento vertical.
- **FR-028**: Lista, detalle, diálogos y editores DEBEN funcionar entre 360 y 1920 px, claro y oscuro, sin cortes.
- **FR-029**: El bloqueo móvil del cuerpo solo PUEDE durar mientras el detalle esté abierto y siempre DEBE restaurarse.
- **FR-030**: La vista DEBE conservar filtros, selección y posición al alternar lista/detalle.
- **FR-031**: Campos y acciones DEBEN ser accesibles con teclado virtual, áreas seguras y ambas orientaciones.
- **FR-032**: Los cambios DEBEN preservar contratos e historial vigentes y tener regresión de flujos actuales.
- **FR-033**: La extracción física DEBE conservar `qwen3.7-plus` como modelo visual principal configurable; los modelos textuales NO DEBEN recibir nuevamente la imagen completa.
- **FR-034**: El camino normal DEBE producir un desglose completo con un evaluador rápido y validarlo con un verificador compacto; el modelo Pro solo PUEDE invocarse como árbitro ante discrepancia, confianza baja, ambigüedad o fallo del verificador.
- **FR-035**: Los límites de salida DEBEN ser específicos por función. Los umbrales de tiempo solo DEBEN marcar una operación como lenta y alimentar telemetría; NO DEBEN cancelar una solicitud aceptada ni convertir la demora en una entrega sin nota.
- **FR-036**: La rúbrica generada por IA DEBE ser un borrador editable antes de confirmar: el profesor PUEDE modificar nombre, descripción, peso y descriptores, agregar, ordenar o eliminar criterios, y el sistema DEBE impedir continuar mientras los pesos no sumen 100 %.

### Entidades clave

- **Recurso**: Material con identidad única, autor, contenido, materia contextual y estado.
- **Asignación de recurso**: Relación recurso-materia con tipo borrador, apoyo o actividad, visibilidad y fechas.
- **Actividad evaluativa vinculada**: Evaluación canónica creada desde un recurso respondible.
- **Trabajo de IA**: Ejecución idempotente con estado, tiempos, intentos, estrategia y causa terminal.
- **Componente puntuable**: Pregunta o criterio con respuesta, evidencia, puntos, máximo, estado, explicaciones y versión.
- **Sesión de revisión**: Contexto visual temporal de materia, evaluación, filtros, estudiante, posición y edición.

## Criterios de éxito

- **SC-001**: El 100 % de recursos asignados aparece en biblioteca y materia con un identificador y estados coincidentes.
- **SC-002**: Asignar y publicar u ocultar un apoyo toma menos de 60 s después de generarlo, sin copias.
- **SC-003**: Abrir/cerrar desde recurso o evaluación produce el mismo estado en el 100 % de pruebas.
- **SC-004**: El 100 % de trabajos válidos confirma recepción en menos de dos segundos.
- **SC-005**: Para una imagen legible de hasta diez preguntas se mide p50/p90 por etapa y se optimiza el payload; una ejecución que exceda el objetivo permanece visible como procesando en lugar de descartarse.
- **SC-006**: El 100 % de solicitudes aceptadas por el proveedor puede completar aunque exceda 180 s; solo conexión fallida, respuesta inválida, reinicio recuperable o cancelación humana produce reintento/revisión.
- **SC-007**: Una muestra de regresión mantiene decisión por componente y nota dentro de 0,1 del flujo aprobado, salvo revisión explícita.
- **SC-008**: El 100 % de trabajos permite distinguir cola, tiempo activo y etapa lenta sin datos personales.
- **SC-009**: El profesor edita puntos y explicación de cualquier componente visible en menos de 30 s sin ir al final.
- **SC-010**: El 100 % de ajustes crea historial y recalcula sin sobrescribir versiones concurrentes.
- **SC-011**: Revisión pasa en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, claro/oscuro, sin bloqueo.
- **SC-012**: En iPhone y Android se alcanza el último componente, se edita con teclado y se vuelve conservando contexto.
- **SC-013**: En el 100 % de ejecuciones simuladas sin discrepancia se usa `qwen3.7-plus` para extracción, Flash para evaluar/verificar y cero llamadas al árbitro Pro.
- **SC-014**: En el 100 % de ejecuciones simuladas con discrepancia o baja confianza se invoca el árbitro Pro una sola vez y se conserva el desglose transparente y la revisión docente cuando corresponda.
- **SC-015**: Una respuesta simulada que llega después del antiguo límite de 180 s produce y persiste la nota exactamente una vez; el job no cambia a error por duración.
- **SC-016**: En una evaluación con rúbrica generada, el profesor modifica al menos un criterio y su peso antes de confirmar; el 100 % del contenido editado llega al contrato de actualización con pesos totalizados en 100 %.

## Supuestos

- Elegir materia asocia y muestra inmediatamente el recurso en la vista docente de esa materia, pero no lo publica al estudiante; el profesor decide tipo y visibilidad.
- La actividad reutiliza Evaluación; no se crea otro sistema de entregas o notas.
- Los apoyos no reciben entrega ni nota; deben convertirse en actividad para calificarse.
- Cerrar entregas y ocultar contenido son decisiones distintas.
- Una etapa lenta permanece activa; un fallo verificable pasa a fallback o revisión sin inventar una nota.
- Los objetivos iniciales usan una imagen de hasta 10 MB y diez preguntas; multihoja usa payload normalizado por página.
- No se incluye publicación automática, eliminación de historial ni sustitución de autoridad docente.