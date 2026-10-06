# Feature Specification: Docente primero en celular

**Feature Branch**: `codex/084-docente-mobile-first`

**Created**: 2026-10-05

**Status**: Especificación, plan y revisión asistida aprobados por el usuario (2026-10-05). Cinco historias implementadas; pruebas locales de backend/frontend, matriz final Chromium/WebKit y construcciones Docker aprobadas. PR/CI remoto pendientes. Sin despliegue.

**Issue**: [#174](https://github.com/Andres-back/Calificator/issues/174).

**Input**: El profesor necesita visualizar evaluaciones digitalizadas dentro del celular, añadir o modificar criterios, usar materias sin información repetida, imprimir credenciales después de registrar alumnos por foto o manualmente y editar su nombre completo, correo y contraseña. El celular es el dispositivo principal.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Revisar una evaluación digitalizada en celular (Priority: P1)

El docente abre «Visualizar» desde su materia y recorre las preguntas sin salir de XCalificator ni depender de que su navegador abra documentos incrustados. Las descargas permanecen disponibles como acciones adicionales.

**Why this priority**: Actualmente en algunos celulares el visor queda vacío y obliga a abrir el PDF fuera de la aplicación.

**Independent Test**: Abrir evaluaciones guardadas con varias páginas y distintos tipos de preguntas, recorrerlas y cerrar sin cambiar su contenido.

**Acceptance Scenarios**:

1. **Given** una evaluación digitalizada guardada, **When** el profesor pulsa «Visualizar» en celular, **Then** consulta título, instrucciones, preguntas, opciones y puntajes sin pulsar «Abrir PDF».
2. **Given** una evaluación de varias páginas, **When** la recorre o amplía, **Then** todas las preguntas siguen accesibles y puede cerrar la vista sin perder su posición en la lista.
3. **Given** un solucionario, **When** el propietario autorizado lo selecciona explícitamente, **Then** ve las respuestas guardadas; la versión inicial para estudiantes no las expone.
4. **Given** un error de preparación, **When** vuelve a intentar, **Then** recibe un estado comprensible, sin duplicar la evaluación ni bloquear la navegación.

### User Story 2 - Ajustar criterios en el examen digitalizado (Priority: P1)

Después de digitalizar, el profesor puede seleccionar criterios de su materia y editar la rúbrica de esa evaluación desde acciones visibles, sin retroceder por pasos destinados a generar un examen nuevo.

**Why this priority**: Debe decidir qué aprendizaje demuestra el estudiante antes de calificar.

**Independent Test**: Abrir un borrador digitalizado, seleccionar dos criterios, añadir y editar un criterio de rúbrica, guardar y comprobar su conservación al reabrir.

**Acceptance Scenarios**:

1. **Given** un borrador digitalizado, **When** el docente abre su revisión, **Then** encuentra «Criterios de aprendizaje» y «Rúbrica» sin navegar hacia atrás por el asistente.
2. **Given** criterios de la materia, **When** elige algunos, **Then** solo esos criterios quedan vinculados a la evaluación; no se selecciona el catálogo completo.
3. **Given** una materia sin criterios, **When** decide añadir uno, **Then** puede crearlo y seleccionarlo sin perder preguntas o cambios del examen. La rúbrica de la evaluación continúa siendo una sección diferente.
4. **Given** pesos inválidos, **When** intenta guardar la rúbrica, **Then** el sistema indica qué corregir y conserva su trabajo.
5. **Given** una evaluación con entregas o notas, **When** cambia criterios, **Then** recibe aviso de su impacto, y las notas históricas no se recalculan ni publican automáticamente.

### User Story 3 - Materias con una interfaz breve (Priority: P1)

El docente entra a una materia y encuentra primero el nombre y las tareas útiles. Las instrucciones extensas, datos secundarios y recomendaciones repetidas quedan en ayudas o detalles opcionales.

**Why this priority**: Los docentes necesitan actuar con una mano y no desplazarse por paneles explicativos antes de llegar a los controles.

**Independent Test**: En materias vacías y pobladas, navegar a Evaluaciones, Estudiantes, Asistencia, Notas, Recursos y Criterios desde celular.

**Acceptance Scenarios**:

1. **Given** una materia en celular, **When** la abre, **Then** el nombre y el selector de sección aparecen en la primera pantalla, sin paneles promocionales o tutoriales extensos desplegados.
2. **Given** cualquier sección de la materia, **When** busca la tarea principal, **Then** la encuentra sin pasar por tarjetas que repitan las mismas instrucciones o acciones.
3. **Given** información secundaria, **When** necesita consultarla, **Then** puede desplegarla. Los mensajes de error, procesamiento y avisos de seguridad nunca se ocultan como decoración.
4. **Given** una evaluación, **When** necesita calificar o consultar notas, **Then** continúa usando sus acciones dentro de Evaluaciones; no se introduce otra sección duplicada de calificación.

### User Story 4 - Registrar alumnos y entregar sus accesos (Priority: P1)

Desde los estudiantes de su materia, el profesor puede registrar una lista por foto o añadir alumnos manualmente. Después del alta imprime fichas individuales con los accesos temporales creados en esa operación, sin imprimir navegación, botones o información de otros grupos.

**Why this priority**: Completa el flujo de inscripción en el aula sin depender de un administrador para cada alumno.

**Independent Test**: Crear cuentas ficticias por ambos caminos en local, imprimir las fichas, reabrir la materia y probar la renovación explícita de una clave interna perdida.

**Acceptance Scenarios**:

1. **Given** nombres revisados desde foto, **When** confirma la lista, **Then** obtiene alumnos matriculados y fichas imprimibles con nombre, usuario único, clave temporal e indicación de cambio inicial.
2. **Given** un alta manual, **When** el profesor confirma el nombre, **Then** recibe una cuenta interna con acceso temporal y matrícula en esa materia, sin invocar lectura de imagen.
3. **Given** un alumno que ya existe, **When** lo matricula en otra materia, **Then** reutiliza su identidad y no crea una cuenta ni cambia su contraseña.
4. **Given** fichas nuevas, **When** el profesor imprime, **Then** la impresión incluye únicamente los accesos seleccionados, con cortes entre fichas y sin contenido del resto de la aplicación.
5. **Given** una lista cerrada o un alumno existente, **When** necesita recuperar el acceso de una cuenta interna que puede gestionar, **Then** dispone de una renovación explícita y confirmada de clave temporal, imprimible. No recupera contraseñas personales ni cambia claves al solo pulsar «Imprimir».
6. **Given** un estudiante ajeno o una cuenta no gestionable, **When** intenta emitir o renovar su acceso, **Then** el sistema deniega la operación. Gestionar alumnos no permite cambiar roles ni administrar otros profesores.

### User Story 5 - Editar la cuenta propia (Priority: P2)

Desde el menú de cuenta, el profesor accede a «Mi perfil» y modifica su nombre completo, correo o contraseña con confirmación clara y formularios cómodos en celular.

**Why this priority**: Evita depender del administrador para corregir sus datos personales o renovar su clave.

**Independent Test**: Editar una cuenta docente ficticia y verificar datos, acceso con el nuevo correo, rechazo de correo repetido y renovación de contraseña sin perder relaciones educativas.

**Acceptance Scenarios**:

1. **Given** una sesión docente, **When** abre «Mi perfil», **Then** consulta sus datos y puede editar nombre completo, incluidos apellidos.
2. **Given** un cambio de correo, **When** proporciona su contraseña actual y confirma un correo válido y único, **Then** ve un éxito claro y conoce cuál usar para iniciar sesión.
3. **Given** un cambio de contraseña, **When** proporciona la actual y confirma la nueva, **Then** el sistema invalida accesos anteriores y deja un camino explícito para continuar con la nueva clave.
4. **Given** contraseña actual incorrecta, correo duplicado o confirmación distinta, **When** guarda, **Then** no cambia la cuenta y puede corregir el campo señalado.
5. **Given** cualquier edición de perfil, **When** guarda o cancela, **Then** no modifica su rol, permisos, materias, evaluaciones, alumnos, evidencias o notas.

### Edge Cases

- Navegador móvil sin visor de documentos, modo oscuro, giro del celular, teclado abierto y documentos largos o con fórmulas.
- Evaluación sin preguntas, de origen recurso, o con respuestas ausentes: indicar su estado sin inventar contenido.
- Criterio eliminado o de otra materia, cambios concurrentes y evaluación con entregas: preservar registros y rechazar referencias inválidas.
- Foto de lista ilegible, nombres iguales de personas diferentes, doble confirmación y pérdida de red tras un alta: no fusionar por nombre ni duplicar cuentas.
- No hay accesos nuevos al asociar alumnos existentes: informar el resultado, no ofrecer una impresión vacía como si contuviera claves.
- Cancelar impresión no cambia accesos. Renovar una clave sí los cambia y necesita consentimiento específico.
- Cuenta interna con contraseña personal, alumnado compartido por docentes, sesión expirada, correo repetido y fallo de guardado.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Mostrar evaluaciones digitalizadas dentro de la aplicación en celular sin depender del visor de documentos del navegador, conservando todas las preguntas y sus formatos compatibles.
- **FR-002**: Mantener descarga PDF y Word, solucionario de selección explícita y autorización por propietario, sin exponer respuestas privadas a alumnos u otros docentes.
- **FR-003**: Dar acceso visible a selección y edición de criterios de aprendizaje y rúbrica desde la revisión del examen digitalizado, conservando la diferencia entre ambos conceptos.
- **FR-004**: Permitir añadir un criterio de materia durante la revisión y conservar el examen pendiente; vincular únicamente criterios elegidos por su docente.
- **FR-005**: Conservar preguntas, claves, entregas, evidencias, notas e historial anteriores. Editar criterios no recalifica ni publica automáticamente.
- **FR-006**: Reducir encabezados y textos repetidos en todas las secciones de materia; mantener nombre, navegación, acción principal y estados importantes visibles, con detalles opcionales.
- **FR-007**: Registrar alumnos por foto o manualmente desde la materia, con nombres revisados, usuarios internos únicos, claves temporales individuales y control de duplicados sin fusionar homónimos.
- **FR-008**: Imprimir fichas de credenciales nuevas seleccionadas, de forma privada y separada del resto de la página, desde el final del registro por ambos caminos.
- **FR-009**: Ofrecer después del registro impresión de datos de acceso disponibles y renovación explícita de claves internas autorizadas cuando se necesite una nueva ficha. Nunca recuperar, guardar como texto o mostrar contraseñas personales.
- **FR-010**: Respetar propiedad de materia y permisos en altas, matrícula, impresión y renovación. «Control de sus alumnos» no implica permisos administrativos globales.
- **FR-011**: Proporcionar «Mi perfil» al docente para editar nombre completo, correo válido y único, y contraseña; proteger cambios de correo y contraseña mediante comprobación de la contraseña actual.
- **FR-012**: Invalidar accesos previos tras cambiar la contraseña y actualizar claramente los datos de sesión tras cambios de perfil, sin dejar al docente en un estado ambiguo.
- **FR-013**: No persistir ni enviar credenciales a registros, analítica, direcciones de páginas, almacenamiento local o capturas de pruebas. Cancelar, imprimir o cerrar no renueva claves por sí solo.
- **FR-014**: Priorizar 360×800 y 390×844, también 768×1024 y escritorio, claro/oscuro: controles táctiles de al menos 44×44 píxeles, sin texto cortado, desplazamiento atrapado ni elementos fijos que tapen campos.
- **FR-015**: Entregar cada mejora con verificaciones dirigidas de recorrido y permisos, sin cambios de modelos, tiempos de calificación o políticas de publicación dentro de este alcance.

### Key Entities

- **Materia**: contexto que reúne alumnos, criterios y evaluaciones de su docente.
- **Evaluación guardada**: preguntas, respuestas esperadas, puntajes, selección de criterios y rúbrica propia.
- **Cuenta estudiantil interna**: identidad reutilizable entre materias con acceso inicial temporal; no guarda contraseñas recuperables.
- **Ficha de acceso**: representación privada imprimible de usuario y clave temporal emitida en una operación autorizada.
- **Perfil docente**: identidad, nombre completo, correo de acceso y secreto de autenticación, sin capacidad de cambiar su rol.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En las dos dimensiones móviles principales el 100 % de las preguntas de los casos representativos puede consultarse dentro de la aplicación sin abrir un visor externo.
- **SC-002**: Desde una evaluación digitalizada, criterios y rúbrica se alcanzan con una acción explícita; los cambios se conservan al guardar y reabrir.
- **SC-003**: Al entrar a cada sección de materia, el nombre y la navegación están en la primera pantalla móvil y ningún panel explicativo extenso aparece desplegado por defecto.
- **SC-004**: Ambos recorridos de alta terminan con fichas imprimibles por una acción adicional. No se imprimen menús, botones ni datos de otros grupos.
- **SC-005**: Las pruebas de perfil permiten guardar datos válidos y rechazan cambios de correo repetido, contraseña actual incorrecta y acceso a otras cuentas.
- **SC-006**: Las pruebas de permisos no conceden roles nuevos ni exponen solucionarios o credenciales a terceros; ningún recorrido altera notas, evidencias o matrículas anteriores salvo la matrícula nueva confirmada.
- **SC-007**: En cada tamaño definido se completan los cinco recorridos sin desbordamiento horizontal, controles solapados o desplazamiento atrapado, incluyendo teclado móvil y estados de error.

## Assumptions

- Se evoluciona la versión estable actual; no se cambia el motor de calificación ni se digitalizan nuevamente evaluaciones guardadas.
- Nombre y apellidos se editan como «Nombre completo», conservando las identidades y relaciones existentes.
- La simplificación afecta las secciones dentro de materia y el perfil requerido, no una renovación de todas las pantallas del producto.
- El docente puede gestionar accesos de cuentas internas autorizadas de su materia. Los alumnos conservan su contraseña personal privada y las cuentas con correo real mantienen los límites de recuperación existentes.
- Las claves temporales nuevas solo están disponibles al emitirlas. Reimprimir claves olvidadas requiere renovación explícita, no descifrarlas o recuperarlas.
- El alta manual es por nombre o lista de nombres revisados, con usuario interno generado; no exige que el profesor invente un correo real para cada alumno.
- La vista previa y las fichas no envían datos a modelos. La lectura de lista por foto conserva el proveedor y la revisión humana actuales.
- Primero se aprueba esta especificación, después el plan técnico. Implementación y producción siguen condicionadas a PR y controles verdes.
