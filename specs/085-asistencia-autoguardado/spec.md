# Feature Specification: Asistencia con guardado automático

**Feature Branch**: `codex/085-asistencia-autoguardado`

**Created**: 2026-10-06

**Status**: Especificación aprobada con «sigue» y plan aprobado con «aprove» el 2026-10-06. Revisión asistida final autorizada con «autorizo», 8/8 requisitos satisfechos antes de implementar. En validación; sin despliegue.

**Issue**: [#176](https://github.com/Andres-back/Calificator/issues/176).

**Input**: «que cuando seleccione asistencia se guarde automaticamente».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Marcar y guardar en una sola acción (Priority: P1)

El docente selecciona Presente, Llegó tarde, Ausente o Con excusa y la marca se guarda automáticamente para ese estudiante, materia y día. No necesita completar el grupo ni pulsar Guardar.

**Why this priority**: Evita un paso adicional y el riesgo de olvidar guardar después de llamar a lista.

**Independent Test**: Marcar solamente un alumno de una lista de tres, esperar la confirmación y volver a consultar el día: el alumno conserva su marca y los otros dos siguen pendientes.

**Acceptance Scenarios**:

1. **Given** un día con estudiantes pendientes, **When** se selecciona un estado, **Then** comienza el guardado sin otra acción y se distingue la selección de la confirmación de guardado.
2. **Given** una marca guardada, **When** el docente la corrige, **Then** se guarda el nuevo estado sin duplicar el registro.
3. **Given** estudiantes pendientes y otros ya marcados, **When** se pulsa Marcar pendientes como presentes, **Then** se guardan solo los pendientes sin alterar estados ni observaciones existentes.
4. **Given** una búsqueda activa, **When** se marca un alumno, **Then** no cambia la asistencia de alumnos ocultos por el filtro.

### User Story 2 - Continuar sin perder cambios ni bloquear la lista (Priority: P1)

El docente puede marcar varios alumnos rápidamente y corregir una marca mientras una anterior se guarda. Siempre entiende si sus cambios están guardados o necesitan atención.

**Why this priority**: El celular y las conexiones variables del aula no deben provocar marcas perdidas o confirmaciones falsas.

**Independent Test**: Con una respuesta de guardado demorada, marcar y corregir varios alumnos; confirmar que al terminar se conserva la última selección de cada uno.

**Acceptance Scenarios**:

1. **Given** un guardado en curso, **When** se selecciona otro alumno o se corrige el mismo, **Then** la lista permanece utilizable y una confirmación anterior no sobrescribe cambios más recientes.
2. **Given** un fallo de conexión o del servidor, **When** falla el guardado, **Then** se conserva la selección en la vista, se muestra No guardado y se ofrece Reintentar sin duplicar registros.
3. **Given** cambios pendientes o fallidos, **When** se intenta salir, recargar o cambiar de día, **Then** se advierte antes de descartarlos; no se envían al nuevo día ni a otra materia.
4. **Given** marcas confirmadas, **When** se vuelve al día o se abre el reporte, **Then** se muestran los datos guardados y el resumen correspondiente.

### User Story 3 - Guardar observaciones con una interfaz compacta (Priority: P2)

El docente puede añadir una observación opcional sin volver al guardado manual. La vista informa del guardado sin avisos emergentes por cada alumno ni paneles que tapen la lista.

**Why this priority**: Mantiene el contexto de una excusa o tardanza sin saturar el flujo móvil.

**Independent Test**: Escribir una observación sobre un alumno marcado, terminar de escribir o salir del campo, esperar confirmación y volver a consultar el día.

**Acceptance Scenarios**:

1. **Given** un alumno con estado elegido, **When** se edita una observación y se termina de escribir, **Then** se guarda automáticamente sin enviar cada pulsación ni perder el foco.
2. **Given** un alumno sin estado, **When** se escribe una observación, **Then** se indica que falta seleccionar su estado y no se inventa asistencia; al elegirlo se guarda también la observación.
3. **Given** un celular de 360 px o texto ampliado al 200 %, **When** se recorre y marca la lista, **Then** todos los controles siguen accesibles sin un resumen fijo que tape estudiantes.

### Edge Cases

- Respuesta demorada o perdida después de un guardado: reintentar debe conservar un solo registro por estudiante, materia y fecha.
- No hay alumnos, fecha futura, sesión vencida o permiso insuficiente: no guardar ni mostrar éxito.
- Consulta que se actualiza mientras existen cambios locales: no reemplazarlos silenciosamente por datos anteriores.
- Dos sesiones editan alumnos diferentes: los guardados no deben sobrescribir marcas ajenas. Si editan el mismo alumno, prevalece la última escritura aceptada por el servidor, no el orden en que llegan las confirmaciones a la pantalla.
- Un estudiante deja de estar matriculado durante el guardado: mostrar el error sin cambiar otros estudiantes.
- Cambiar materia o fecha mientras se guarda: una respuesta anterior solo pertenece a su materia y día originales.
- Se pierde conexión: no prometer funcionamiento sin conexión ni persistencia de cambios pendientes después de cerrar o descartar la vista.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Cada selección de estado DEBE iniciar guardado automático sin botón adicional ni requisito de completar la lista.
- **FR-002**: Los alumnos no seleccionados DEBEN seguir pendientes; un guardado parcial NO DEBE borrarlos ni modificar otros registros existentes.
- **FR-003**: Cada alumno DEBE distinguir selección pendiente de guardado, guardando, guardado y error; solo una confirmación del servidor permite indicar Guardado.
- **FR-004**: Los cambios rápidos DEBEN conservar la última selección local y observación; una respuesta antigua NO DEBE revertirlas ni declararlas guardadas prematuramente.
- **FR-005**: Un fallo DEBE mantener los cambios visibles y ofrecer reintento explícito e idempotente, sin bucles ilimitados ni avisos de éxito falsos.
- **FR-006**: Marcar pendientes como presentes DEBE guardar automáticamente, preservar marcas previas y no depender del filtro de búsqueda.
- **FR-007**: Las observaciones de alumnos marcados DEBEN guardarse automáticamente al terminar de escribir; una observación sin estado DEBE esperar a que el docente lo elija.
- **FR-008**: Los cambios pendientes DEBEN advertirse antes de salir o cambiar fecha; los guardados y sus respuestas DEBEN mantenerse aislados por materia y día.
- **FR-009**: El resumen, las consultas posteriores y el reporte DEBEN reflejar las marcas confirmadas, sin exigir jornada completa.
- **FR-010**: La autorización de asistencia y matrícula activa DEBE verificarse en el servidor; el cambio NO DEBE habilitar gestión para estudiantes ni docentes ajenos.
- **FR-011**: Las asistencias históricas, evaluaciones, notas y credenciales DEBEN conservarse; el cambio se limita al guardado y experiencia de asistencia.
- **FR-012**: La ayuda y controles DEBEN explicar el guardado automático y sustituir instrucciones contradictorias de guardar la lista completa; el estado visual DEBE ser compacto, accesible y no bloquear scroll ni escritura.

### Key Entities

- **Registro de asistencia**: Estado y observación de un estudiante matriculado, en una materia y fecha, con docente responsable; conserva su identidad al corregirse.
- **Cambio pendiente**: Selección local aún no confirmada, asociada a estudiante, materia y día; no equivale a dato guardado.
- **Resumen diario**: Conteos de estados y pendientes que distinguen completitud del grupo de persistencia del guardado.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una marca se guarda con una sola selección y cero pulsaciones adicionales, aunque queden alumnos pendientes.
- **SC-002**: En una prueba controlada con confirmaciones demoradas, 30 selecciones/correcciones conservan el último estado de cada alumno sin duplicados ni pérdida de observaciones.
- **SC-003**: En el 100 % de los fallos simulados se muestra el cambio como no guardado; un reintento exitoso permite recuperarlo sin alterar otras marcas.
- **SC-004**: Después de una confirmación, reabrir el día y el reporte reproduce los datos guardados; todos los registros previos no afectados se conservan.
- **SC-005**: En 360×800, 390×844, 768×1024 y escritorio, modos claro/oscuro y ampliación al 200 %, la lista puede recorrerse y marcarse sin controles ocultos ni desbordamiento horizontal.
- **SC-006**: Las pruebas de acceso denegado impiden el 100 % de escrituras de estudiantes y docentes sin autorización sobre la materia.

## Assumptions

- El usuario se refiere a seleccionar el estado del alumno dentro de Tomar asistencia, no solamente a abrir la pestaña Asistencia.
- Se conservan los cuatro estados, búsqueda, fechas anteriores, matrícula y reportes actuales.
- No se requiere un modo sin conexión ni almacenamiento persistente de borradores en el dispositivo en este alcance.
- La velocidad de confirmación depende de la conexión; guardar automáticamente no significa informar éxito antes de recibir confirmación.
- No se modifican la calificación ni los modelos de IA. No se crearán datos reales de producción para probar este cambio.
- La especificación y el plan requieren aprobación humana antes de implementar, según la constitución vigente.
