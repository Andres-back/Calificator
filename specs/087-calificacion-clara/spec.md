# Especificación: revisión de calificaciones clara y compacta

**Rama**: `codex/087-calificacion-clara` | **Creada**: 2026-10-06 | **Estado**: Alcance y plan aprobados; revisión de checklist pendiente | **Issue**: #180

## Aprobación y aclaraciones

- 2026-10-06: el usuario aprobó el alcance con «aprobe»; registrado en issue #180 con `spec-approved`.
- Clarify: 0 preguntas necesarias. Alcance, roles, preservación de registros, interacción, accesibilidad, estados, fallos, dependencias, límites y criterios de cierre suficientemente definidos; no hay decisiones críticas pendientes. Validación docente SC-005 diferida explícitamente al piloto, no a pruebas automáticas.
- 2026-10-06: el usuario aprobó el plan con «aprovado»; registrado en issue #180 con `plan-approved`.
- Revisión de la lista personalizada y autorización de fusión/despliegue todavía pendientes.

## Escenarios de usuario y pruebas

### Historia 1 - Entender la nota y qué falta revisar (Prioridad: P1)

Como docente, quiero ver la nota, su estado y el motivo concreto de revisión sin mensajes contradictorios, para decidir qué comprobar antes de confirmar o publicar.

**Razón de prioridad**: Una pantalla que combina una nota máxima, advertencias técnicas y «sin señales de incertidumbre» puede llevar a una decisión equivocada.

**Prueba independiente**: Abrir ejemplos controlados con alerta general, alerta por pregunta y ausencia de alertas; identificar la nota, el estado y la siguiente acción desde el resumen.

**Aceptación**:

1. **Dado** que cuatro respuestas no tienen alertas individuales pero la valoración global difiere del cálculo, **cuando** se abre el resumen, **entonces** indica «Hay una diferencia entre la valoración global de la IA y el cálculo por preguntas. Revisa los puntajes antes de confirmar», sin afirmar que toda la evaluación está libre de alertas.
2. **Dado** un bloqueo de revisión general, **cuando** no hay preguntas individualmente bloqueadas, **entonces** la advertencia sigue visible y distingue «4 respuestas sin alertas individuales» de «1 aviso general»; cero bloqueos individuales no significa que se pueda publicar.
3. **Dado** un motivo no reconocido, **cuando** se presenta, **entonces** conserva la advertencia mediante un mensaje prudente, permite consultar su detalle original y no lo convierte en éxito.
4. **Dado** un estado confirmado o publicado, **cuando** se abre, **entonces** usa ese estado real y no afirma que sigue pendiente o no publicada por un aviso histórico.

### Historia 2 - Revisar en celular con información progresiva (Prioridad: P1)

Como docente que usa principalmente celular, quiero un resumen compacto y abrir solo la información que necesito, sin perder las herramientas para comprobar y ajustar la calificación.

**Razón de prioridad**: Reducir lectura y desplazamiento hace más sencilla la revisión, sin reducir su rigor.

**Prueba independiente**: A 360×800, abrir una calificación, consultar evidencia, comparar respuestas, revisar criterios, ajustar un puntaje y regresar al resumen sin pérdida de datos ni bloqueo del desplazamiento.

**Aceptación**:

1. **Dado** un resultado listo, **cuando** se abre, **entonces** muestra un único resumen de estudiante, evaluación, nota y estado; no repite tarjetas que expliquen la misma cifra.
2. **Dado** un aviso de revisión, **cuando** el docente usa su acción, **entonces** llega a las respuestas, criterios o evidencia relacionados sin buscar controles al final de una página larga.
3. **Dado** el resumen, **cuando** solicita evidencia, respuestas y puntajes, criterios o retroalimentación, **entonces** accede a su detalle mediante controles identificables, con posibilidad de volver y sin crear nuevas pantallas obligatorias.
4. **Dado** un cambio sin guardar, **cuando** intenta cerrar el detalle o cambiar de estudiante, **entonces** conserva la protección existente frente a la pérdida de edición.
5. **Dado** el desplazamiento sobre cualquier sección abierta, **cuando** lo usa en celular, **entonces** puede alcanzar todos los controles sin paneles fijos que cubran contenido.

### Historia 3 - Comprender el cálculo sin alterar registros (Prioridad: P2)

Como docente, quiero distinguir los puntos obtenidos, su conversión a nota y cualquier ajuste humano para comprender qué cifra estoy revisando.

**Razón de prioridad**: Simplificar no debe ocultar cómo se obtuvo la nota ni dar una justificación inventada.

**Prueba independiente**: Comparar el resumen de una nota proporcional, una nota ajustada, un resultado sin desglose y una calificación antigua con los registros originales.

**Aceptación**:

1. **Dado** un desglose completo, **cuando** se consulta el cálculo, **entonces** identifica puntos y escala de nota como conceptos distintos y conserva acceso a motivos y puntajes por respuesta.
2. **Dado** un ajuste global docente, **cuando** la nota difiere del cálculo base, **entonces** distingue explícitamente el ajuste sin presentar el cálculo base como nota final.
3. **Dado** un resultado sin explicación o sin desglose, **cuando** se abre, **entonces** reconoce la información faltante y no inventa criterios, razones o puntajes.

### Casos límite

- Procesamiento en curso y fallo recuperable: no mostrar cero como nota ni permitir acciones que el estado existente impida.
- Varias alertas generales y por pregunta: agrupar avisos equivalentes, sin perder motivos diferentes ni ocultar bloqueos.
- Todos los contadores individuales en cero: no mostrar tarjetas vacías que sugieran ausencia de avisos generales.
- Datos históricos o motivo desconocido: lectura compatible y detalle original conservado; sin recalificación automática.
- Nota legítima de cero, nota máxima, escala distinta de cinco y puntajes decimales: conservar valores y su significado.
- Evidencia ausente, varias hojas, foto o documento: mostrar disponibilidad real y mantener navegación entre hojas.
- Criterios no registrados: no añadir secciones vacías ni prometer una valoración por criterios inexistente.
- Publicada con avisos históricos: distinguir revisión anterior y estado actual; no reabrir o alterar la nota.
- Usuario sin permiso de ajuste: conservar lectura autorizada sin habilitar controles docentes.
- Textos largos, teclado móvil, zoom, modo oscuro y navegación por teclado: contenido y acciones alcanzables.

## Requisitos

### Requisitos funcionales

- **FR-001**: El resumen DEBE identificar nota sugerida, confirmada, publicada, en procesamiento o no disponible conforme al estado vigente, sin afirmaciones incompatibles.
- **FR-002**: La vista DEBE distinguir alertas individuales de alertas generales y mostrar estas últimas aunque no haya excepciones por pregunta. «Sin alertas» solo describe el nivel realmente comprobado y nunca equivale a «respuesta correcta».
- **FR-003**: Cada motivo conocido DEBE expresarse en español docente con su consecuencia y siguiente acción; códigos originales y trazas se mantienen en detalles, no como mensaje principal. Un motivo desconocido DEBE seguir visible como revisión pendiente con detalle consultable.
- **FR-004**: El resumen DEBE evitar repetición de nota, puntaje, estado y avisos equivalentes; el cálculo, escala y ajustes humanos siguen disponibles sin inventar explicaciones.
- **FR-005**: Evidencia, comparación de respuestas y puntajes, criterios existentes y retroalimentación DEBEN abrirse de forma progresiva. La nota y los avisos importantes permanecen visibles en el resumen; los detalles técnicos se abren bajo demanda.
- **FR-006**: Las acciones de revisión DEBEN llevar al detalle pertinente, respetar permisos y conservar confirmación, publicación, ajuste, reanálisis y navegación existentes. No se añaden confirmaciones o pantallas obligatorias para una tarea ya soportada.
- **FR-007**: El desplazamiento, foco y controles DEBEN funcionar en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, en claro y oscuro, sin desbordamiento horizontal, contenido tapado o objetivos táctiles menores de 44×44 px.
- **FR-008**: El cambio NO DEBE modificar cálculo, políticas de bloqueo, modelos, permisos, estados persistidos, notas, evidencias ni historial por el hecho de consultar la pantalla. Las ediciones explícitas mantienen las protecciones actuales de guardado y conflicto.
- **FR-009**: Las pruebas DEBEN cubrir el caso de la captura, motivos conocidos/desconocidos, alertas generales con cero excepciones individuales, procesamiento, históricos, ajuste humano, estados confirmado/publicado y apertura/edición en celular.

### Entidades clave

- **Calificación**: nota y estado vigente, estudiante, evaluación, publicación y decisiones docentes existentes.
- **Desglose**: puntos por pregunta o criterio, fórmula, evidencia y explicaciones registradas.
- **Aviso de revisión**: motivo general o individual, prioridad, detalle original y acción pertinente; su presentación no sustituye los controles de seguridad de la nota.

## Criterios de éxito

- **SC-001**: En todos los escenarios de FR-009, cero mensajes de «sin alertas» generales coexisten con una alerta vigente y cero códigos técnicos aparecen como explicación principal.
- **SC-002**: Desde el resumen, cada detalle principal se abre en una acción; se puede llegar a un ajuste por pregunta en un máximo de dos acciones, sin desplazarse hasta un formulario global.
- **SC-003**: En los cinco tamaños y ambos temas de FR-007, ninguna sección pierde desplazamiento, tapa controles o desborda horizontalmente; todas las acciones existentes son alcanzables.
- **SC-004**: Consultar los escenarios controlados no cambia ninguna nota, evidencia o registro; los flujos de guardar, confirmar y publicar conservan los resultados y restricciones previos.
- **SC-005**: En una validación posterior con tres docentes, al menos dos identifican en 15 segundos la nota, si está publicada y qué revisar a continuación sin guía. Esta validación se registra aparte y no se declara cumplida mediante pruebas automáticas.

## Supuestos

- Alcance: interior de cada calificación docente. No rediseñar bandejas, captura, administración o la vista estudiantil en este cambio.
- Las alertas pueden señalar una discrepancia entre la valoración global inicial y el cálculo por preguntas, aunque la cifra actualmente visible ya corresponda al desglose; no se concluye solo desde la captura que el estudiante esté mal calificado.
- Se reutilizan las funciones disponibles; no se requieren recalificaciones, nuevos datos, nuevas llamadas a IA o migraciones para simplificar la presentación.
- Referentes consultados: Canvas SpeedGrader para reunir evidencia, nota y rúbrica; Gradescope para avisos que conducen a revisión. Se adaptan patrones de organización, no se copian marcas ni diseños.
- La especificación vive bajo el dominio 008 y complementa la revisión explicable existente. Alcance y plan aprobados; conservar el gate de revisión de requisitos antes de implementar. Sin autorización nueva de despliegue.
