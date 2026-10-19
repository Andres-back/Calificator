# Especificación: materia móvil y seguimiento de calificación discreto

**Rama**: `codex/105-materia-movil-cola` | **Creada**: 2026-10-18 | **Estado**: Aprobada para implementación | **Issue**: [#218](https://github.com/Andres-back/Calificator/issues/218)

Evolución de materias (003), calificaciones (008) y presentación del creador de evaluaciones (005). El usuario aprobó avanzar sobre las mejoras móviles propuestas y añadió que el cuadro «Calificando en segundo plano» permanece visible. Confirmó que se refiere a ese monitor, no a la ventana de tomar/subir foto.

## Escenarios de usuario y pruebas

### Historia 1 - Crear una materia sin saturación (Prioridad: P1)

Como docente desde el celular, quiero indicar nombre, área y grado, añadir una descripción solo si la necesito y continuar sin que el teclado o las ayudas oculten el campo que estoy usando.

**Razón de prioridad**: el primer paso del flujo debe ser sencillo y legible; la revisión previa detectó contenido excesivo y un campo enfocado parcialmente cortado.

**Prueba independiente**: desde 360 y 390 px completar los campos obligatorios, abrir opciones, escribir descripción y continuar; se conserva la información y se abre la sección correspondiente de la materia.

**Aceptación**:
1. **Dado** que abre Crear materia, **cuando** aún no toca un campo, **entonces** ve los tres datos obligatorios y no se fuerza la escritura; las ayudas extensas y descripción quedan bajo una opción reconocible.
2. **Dado** un campo activo y espacio reducido, **cuando** escribe o cambia de campo, **entonces** puede leer su etiqueta y lo escrito, finalizar la escritura y llegar a Crear y continuar sin elementos superpuestos.
3. **Dado** datos válidos, **cuando** pliega opciones o termina de escribir, **entonces** no pierde los valores ni se crea nada hasta confirmar; el alta conserva validaciones, sugerencias, límite de materias y destino actuales.

### Historia 2 - Enviar a calificar y seguir con otro estudiante (Prioridad: P1)

Como profesor, cuando la entrega ya quedó guardada y en cola quiero seguir trabajando sin un cuadro grande permanente, conservando una forma sencilla de consultar su avance.

**Razón de prioridad**: el trabajo en segundo plano no debe ocupar ni bloquear el espacio del siguiente estudiante.

**Prueba independiente**: simular una entrega aceptada cuyo trabajo permanezca pendiente, iniciar otra captura o navegar y ampliar/minimizar su seguimiento; el trabajo original no se cancela ni se envía otra vez.

**Aceptación**:
1. **Dado** un trabajo aceptado en cola, **cuando** continúa trabajando, **entonces** el seguimiento se muestra compacto con cantidad/estado y acceso a Ver progreso, sin abrir automáticamente el cuadro grande.
2. **Dado** el detalle abierto, **cuando** pulsa Minimizar, **entonces** vuelve al indicador sin borrar trabajos, detener seguimiento ni cambiar notas/evidencias; puede ampliarlo otra vez.
3. **Dado** uno o varios trabajos, **cuando** navega, actualiza su estado o añade otro, **entonces** no se expande solo ni toma el foco; cada trabajo conserva su identidad y su actualización.
4. **Dado** una subida aún no aceptada o fallida, **cuando** intenta continuar, **entonces** no recibe una confirmación falsa de que está guardada. Tras aceptación, un fallo posterior muestra que necesita atención y conserva las opciones actuales de revisión/reintento.
5. **Dado** trabajos pendientes, finalizados o con incidencias, **cuando** llegan sus resultados, **entonces** se distinguen sin mostrar una nota provisional de cero y sin navegación forzada; ocultar el detalle no oculta permanentemente incidencias ni modifica resultados.

### Historia 3 - Leer formularios y avisos en celular o computador (Prioridad: P2)

Como docente, quiero controles legibles y notificaciones que no se superpongan innecesariamente a la cabecera del creador de evaluaciones.

**Prueba independiente**: crear materia y abrir/ampliar el seguimiento con teclado, táctil y ambos temas; generar un borrador sintético y revisar su cabecera sin aviso de éxito redundante superpuesto.

**Aceptación**:
1. **Dado** 360/390 px o escritorio, **cuando** completa los recorridos, **entonces** no hay desbordamiento horizontal, controles tapados ni dependencia de hover/color; los campos móviles son legibles y las acciones tienen área táctil de al menos 44 px.
2. **Dado** un borrador recién generado, **cuando** pasa a Revisar, **entonces** reconoce el éxito dentro del flujo sin un aviso redundante que cubra cabecera/cierre; los errores y advertencias importantes siguen visibles.

### Casos límite

- Descripción con texto ya escrito, opciones plegadas y cambio de tamaño/orientación: conservar valor; no confundir Listo con enviar.
- Formulario inválido, límite de seis materias, permiso insuficiente, sesión vencida o error de alta: comportamiento y mensajes actuales preservados; no cerrar como éxito.
- Foto aún subiendo, respuesta demorada, doble toque o conexión incierta: no generar otra entrega por minimizar o navegar; no afirmar guardado antes de aceptación real.
- Cola recuperada tras recarga, varios trabajos o lote con algunos casos fallidos: indicador compacto mantiene estados y permite acceder a detalles; no eliminar pendientes para ocultarlos.
- Cambio de cuenta: no exponer nombres, detalles ni preferencias de la cuenta anterior.
- Trabajo terminado, cancelado o inexistente: aplicar las reglas actuales de retiro/resultado; ningún cambio de calificación por una acción de presentación.
- Lectura con teclado, foco en el detalle al minimizar y regreso a la página: foco predecible y no perdido; avisos no se anuncian repetidamente por cada consulta de progreso.

## Requisitos

### Requisitos funcionales

- **FR-001**: Crear materia DEBE priorizar nombre, área y grado, ocultando descripción y ayudas extensas bajo opciones voluntarias, sin foco automático al abrir.
- **FR-002**: En celular, la escritura DEBE conservar visible el campo/etiqueta activo y ofrecer finalizar sin enviar; valores, selección y opciones DEBEN conservarse al plegar/cambiar tamaño.
- **FR-003**: El alta DEBE conservar validaciones, límite, sugerencias, permisos, payload y destino actuales; ningún cambio de presentación DEBE crear o duplicar materias.
- **FR-004**: El monitor de calificación DEBE iniciar compacto, con estado/cantidad y Ver progreso; el detalle DEBE poder minimizarse sin bloquear captura, búsqueda o navegación, tanto dentro como fuera de calificaciones.
- **FR-005**: Minimizar/ampliar DEBE ser solo presentación: NO borrar/cancelar/reintentar trabajos, cambiar consultas de estado ni generar envíos; nuevas actualizaciones/trabajos NO DEBEN expandir automáticamente el detalle ni tomar foco.
- **FR-006**: La vista DEBE distinguir subida/aceptación/cola/resultados/incidencias; errores de subida no aceptada y atención posterior DEBEN conservarse visibles y recuperables sin éxito falso, nota provisional cero o publicación automática.
- **FR-007**: Identidad, seguimiento y resultados de cada trabajo DEBEN conservarse al navegar/recargar; cambio de cuenta NO DEBE mostrar datos de otra cuenta. Las reglas existentes de retiro/reintento DEBEN preservarse.
- **FR-008**: Los recorridos DEBEN funcionar en 360/390 px y escritorio, claro/oscuro, con campos móviles legibles, teclado/foco, acciones de 44 px y scroll local sin desbordamiento ni superposición del área de trabajo.
- **FR-009**: Al generar un borrador de evaluación, el éxito DEBE reconocerse dentro del flujo sin aviso redundante sobre cabecera/cierre; errores y advertencias relevantes DEBEN seguir visibles.
- **FR-010**: No se DEBEN cambiar notas, evidencias, criterios, evaluaciones, modelos, contratos públicos ni registros existentes; no usar datos reales ni APIs de IA de pago para la validación.

### Entidades clave

- **Borrador de materia**: nombre, área, grado, descripción, validez, estado de alta y opciones de presentación.
- **Trabajo de calificación**: identidad, materia/evaluación/estudiante, estado, avance e incidencias existentes; independiente de estar ampliado/minimizado.
- **Preferencia de seguimiento**: vista compacta o detallada de la sesión actual; sin autoridad para modificar trabajos ni datos académicos.

## Criterios de éxito

- **SC-001**: En 360/390 px y espacio reducido, todos los campos obligatorios y descripción opcional pueden editarse y confirmarse sin campos enfocados cortados ni datos perdidos.
- **SC-002**: Tras aceptar una entrega pendiente, el profesor puede seleccionar otra o navegar sin esperar el resultado y sin un cuadro expandido permanente; minimizar/ampliar produce cero altas, cancelaciones o reintentos adicionales.
- **SC-003**: En pruebas de múltiples trabajos y fallos, el 100 % conserva su identidad/estado y las incidencias son accesibles; no aparecen notas falsas, datos cruzados de cuenta ni publicaciones nuevas.
- **SC-004**: Recorridos aprobados en dos motores de navegador, ambos temas y 360/390/1440 px sin overflow de página; acciones accesibles por teclado y de al menos 44 px.
- **SC-005**: El borrador recién generado mantiene cabecera y acciones legibles; las regresiones de creación/subida/seguimiento preservan payloads y registros, con cero cambios académicos por acciones visuales.

## Supuestos

- Se mejora el monitor que dice «Calificando en segundo plano», confirmado por el usuario. No se presume que esté detenida la IA ni que la subida espere a terminar la calificación.
- Indicador compacto no significa trabajo terminado ni cancelado; el detalle permanece accesible y las incidencias conservan una señal visible.
- El cambio es de presentación frontend; se reutilizan las operaciones y el seguimiento existentes. Si la investigación demostrara un defecto backend, se informará antes de ampliar alcance.
- Las pruebas usan respuestas y cuentas sintéticas; emulación de teclado/viewport no acredita un iPhone/Android físico ni producción.
- El usuario aprobó especificación, plan y revisión de requisitos el 2026-10-18. No autoriza fusionar ni desplegar.
