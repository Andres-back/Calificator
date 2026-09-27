# Especificación: Flujo docente móvil de calificación

**Rama**: `codex/043-flujo-docente-movil` | **Creada**: 2026-09-23 | **Estado**: Aprobada | **Issue**: #131

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar rápidamente a un estudiante (Prioridad: P1)

Como docente que usa un teléfono, necesito encontrar y abrir la entrega de un estudiante sin que la interfaz se congele ni perder el texto escrito.

**Razón de prioridad**: La búsqueda es la puerta de entrada a la revisión y actualmente concentra la mayor fricción móvil reportada.

**Prueba independiente**: En una lista con varios estudiantes, escribir un nombre mantiene el foco, conserva la lista anterior mientras busca y presenta el resultado sin saltos de pantalla.

**Aceptación**:
1. **Dado** un docente en la lista de calificaciones, **cuando** escribe varias letras seguidas, **entonces** puede seguir escribiendo y recibe un estado visible de búsqueda sin que la lista desaparezca.
2. **Dado** un filtro activo, **cuando** abre y cierra el detalle de un estudiante, **entonces** conserva el filtro, la búsqueda y la posición de revisión.

### Historia 2 - Revisar una entrega con pocas decisiones visibles (Prioridad: P1)

Como docente, necesito revisar evidencia y respuestas en una pantalla móvil ordenada, con las inconsistencias primero y las funciones poco frecuentes apartadas.

**Razón de prioridad**: Disminuye la carga cognitiva y permite concentrarse en la decisión pedagógica.

**Prueba independiente**: Un docente puede abrir una calificación, alternar entre evidencia y respuestas y localizar la primera excepción sin recorrer controles administrativos.

**Aceptación**:
1. **Dado** un detalle abierto, **cuando** desplaza la pantalla, **entonces** las opciones Evidencia y Revisar respuestas continúan accesibles.
2. **Dado** un desglose con alertas, **cuando** abre la revisión, **entonces** puede ir directamente a la primera excepción y avanzar entre excepciones.
3. **Dado** un caso normal, **cuando** revisa la nota, **entonces** las opciones avanzadas no compiten visualmente con confirmar o publicar.

### Historia 3 - Terminar y continuar sin volver al inicio (Prioridad: P1)

Como docente, necesito confirmar o publicar desde una zona siempre accesible y avanzar al siguiente estudiante sin regresar manualmente a la lista.

**Razón de prioridad**: La repetición de este paso determina el tiempo total de calificación de un grupo.

**Prueba independiente**: Desde el detalle móvil, el docente completa la acción vigente y abre el siguiente estudiante con controles visibles al alcance del pulgar.

**Aceptación**:
1. **Dado** un caso sin cambios pendientes, **cuando** el docente llega a cualquier parte del detalle, **entonces** ve la acción principal correspondiente y la opción de continuar.
2. **Dado** un formulario con cambios sin guardar, **cuando** intenta salir o continuar, **entonces** el sistema impide perder los cambios y explica qué debe guardar.
3. **Dado** el último estudiante cargado, **cuando** solicita continuar, **entonces** vuelve a la lista con un cierre de revisión comprensible.

### Historia 4 - Cambiar de materia o evaluación sin ocupar media pantalla (Prioridad: P2)

Como docente, necesito saber qué materia y evaluación estoy revisando y poder cambiarlas sin mantener dos selectores grandes visibles todo el tiempo.

**Razón de prioridad**: Recupera espacio vertical en pantallas pequeñas sin ocultar el contexto.

**Prueba independiente**: El contexto actual se entiende en una línea compacta y se puede desplegar para cambiarlo.

**Aceptación**:
1. **Dado** que materia y evaluación ya están seleccionadas, **cuando** entra al centro de calificación desde el celular, **entonces** ve un resumen compacto y un control explícito para cambiar la selección.
2. **Dado** que todavía falta una selección, **cuando** abre la pantalla, **entonces** los selectores se muestran automáticamente.

### Casos límite

- Una calificación en procesamiento muestra “Calificando” y nunca presenta `0.0` como nota final.
- Si la búsqueda falla, la lista previa permanece visible y el docente puede reintentar.
- Las acciones fijas respetan el área segura del dispositivo y no cubren el contenido final.
- Un docente sin permiso de publicación no ve controles de publicación.
- Las calificaciones antiguas sin desglose mantienen su revisión manual disponible.
- La pantalla funciona con teclado virtual abierto y en orientación vertical desde 360 px de ancho.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE conservar una búsqueda fluida, el foco del campo y resultados previos mientras consulta coincidencias.
- **FR-002**: El sistema DEBE mantener visibles o fácilmente accesibles los filtros de estudiantes en pantallas móviles.
- **FR-003**: El sistema DEBE presentar de manera compacta la materia y evaluación activas y permitir desplegar sus selectores.
- **FR-004**: El sistema DEBE agrupar las acciones generales poco frecuentes en un menú móvil, sin eliminarlas.
- **FR-005**: El sistema DEBE mantener accesibles las vistas Evidencia y Revisar respuestas durante el desplazamiento del detalle.
- **FR-006**: El sistema DEBE mostrar una barra de acciones móvil asociada al estado real: confirmar, publicar, guardar ajuste o continuar.
- **FR-007**: El sistema DEBE impedir cambiar de estudiante o contexto cuando existan cambios sin guardar.
- **FR-008**: El sistema DEBE permitir avanzar al siguiente estudiante cargado conservando materia, evaluación y filtro.
- **FR-009**: El sistema DEBE priorizar alertas e inconsistencias sin ocultar las respuestas correctas ni la evidencia original.
- **FR-010**: El sistema DEBE usar textos docentes comprensibles y evitar términos técnicos en las acciones principales.
- **FR-011**: El sistema DEBE conservar sin cambios el cálculo, la persistencia y las autorizaciones de las calificaciones.
- **FR-012**: Todos los controles táctiles principales DEBEN tener un área mínima de 44 por 44 píxeles y ser operables con teclado y lector de pantalla.

### Entidades clave

- **Contexto de revisión**: Materia, evaluación, filtro, búsqueda, estudiante, pregunta y hoja actualmente seleccionados.
- **Estado de edición**: Indica si existen cambios docentes pendientes que deben protegerse antes de navegar.
- **Acción principal**: Operación válida para el estado actual de la calificación y los permisos del docente.

## Criterios de éxito

- **SC-001**: Un docente encuentra y abre un estudiante en menos de 5 segundos después de escribir su nombre.
- **SC-002**: El 100 % de las acciones principales permanece accesible en 360×800 y 390×844 sin desplazamiento horizontal.
- **SC-003**: Confirmar o publicar y pasar al siguiente estudiante requiere como máximo dos acciones después de completar la revisión.
- **SC-004**: Ninguna entrega en procesamiento muestra una nota final de cero.
- **SC-005**: Volver desde el detalle conserva el filtro y la búsqueda activos en todos los casos probados.
- **SC-006**: Las pruebas existentes de cálculo, autorización y publicación continúan sin regresiones.

## Supuestos

- La mejora se concentra primero en el centro de calificaciones docente, por ser el flujo repetitivo con mayor impacto en la tesis.
- La versión de escritorio conserva su distribución de dos paneles.
- No se modifican contratos de backend ni reglas de cálculo de notas.
- Las acciones avanzadas continúan disponibles, pero con menor prominencia en celular.

