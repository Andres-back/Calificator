# Feature Specification: Aislar y organizar el flujo del estudiante

**Feature Branch**: `codex/074-aislar-flujo-estudiante`

**Created**: 2026-09-25

**Status**: Implemented hotfix

**Issue**: [#153](https://github.com/Andres-back/Calificator/issues/153)

**Input**: El usuario confirmó que el estudiante todavía veía opciones docentes y solicitó repararlas y organizar su frontend sin perder el acceso legítimo a sus materiales, actividades, resultados y ayuda.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Materia sin controles docentes (Priority: P1)

Como estudiante estándar, quiero entrar a una materia y ver únicamente las secciones y acciones relacionadas con mi aprendizaje, para no confundirme con tareas reservadas al docente.

**Why this priority**: La exposición de acciones docentes contradice la separación de roles y lleva al estudiante a pantallas de acceso denegado.

**Independent Test**: Iniciar sesión con un estudiante estándar que tenga el conjunto completo de permisos de lectura vigente, abrir una materia con evaluaciones y comprobar que solo aparecen Vista general, Evaluaciones, Recursos y Boletín, sin controles de calificación ni gestión curricular.

**Acceptance Scenarios**:

1. **Given** un estudiante estándar matriculado, **When** abre una materia, **Then** no ve Calificar, Asistencia, DBA ni Criterios de aprendizaje.
2. **Given** una materia con evaluaciones publicadas, **When** el estudiante abre Evaluaciones, **Then** ve acciones estudiantiles de resolución o entrega y nunca Calificar y revisar.
3. **Given** una URL docente interna de la materia, **When** el estudiante estándar intenta abrirla directamente, **Then** recibe una denegación clara sin cargar la herramienta docente.

---

### User Story 2 - Contenido compartido con lenguaje estudiantil (Priority: P2)

Como estudiante, quiero consultar únicamente el contenido que mis docentes publicaron para mis materias, con títulos y estados comprensibles para mi rol.

**Why this priority**: Los permisos de lectura compartidos son legítimos, pero no deben convertir una biblioteca asignada en una interfaz de autoría docente.

**Independent Test**: Abrir las rutas de recursos y presentaciones con un estudiante estándar y comprobar que la biblioteca de autoría de recursos está bloqueada, mientras las presentaciones publicadas usan textos y estados orientados al estudiante.

**Acceptance Scenarios**:

1. **Given** un estudiante estándar, **When** intenta abrir la biblioteca docente de recursos, **Then** se muestra Acceso denegado y conserva acceso a los recursos publicados desde sus materias.
2. **Given** presentaciones publicadas para una materia matriculada, **When** el estudiante abre el listado permitido, **Then** ve una biblioteca de presentaciones asignadas sin mensajes de creación, revisión editorial ni eliminación.
3. **Given** que no existen presentaciones publicadas, **When** el estudiante abre el listado permitido, **Then** ve un estado vacío que explica que todavía no tiene presentaciones asignadas.

---

### User Story 3 - Roles personalizados conservados (Priority: P3)

Como administrador, quiero que un usuario con rol personalizado conserve los módulos que le asigné expresamente, para que el arreglo no anule la administración modular.

**Why this priority**: El sistema admite perfiles personalizados y el aislamiento del estudiante estándar no debe convertirse en una restricción rígida que ignore decisiones administrativas.

**Independent Test**: Configurar un usuario con rol base estudiante y rol personalizado que incluya un módulo docente, y comprobar que el módulo continúa sujeto a sus permisos efectivos.

**Acceptance Scenarios**:

1. **Given** un usuario estudiante sin rol personalizado, **When** posee permisos de lectura predeterminados, **Then** esos permisos no activan superficies docentes.
2. **Given** un usuario con rol personalizado, **When** el administrador le otorgó explícitamente un permiso del módulo, **Then** puede abrir la superficie correspondiente dentro de los límites de ese permiso.
3. **Given** un usuario con rol personalizado sin el permiso requerido, **When** intenta abrir el módulo, **Then** recibe Acceso denegado.

### Edge Cases

- Un estudiante conserva permisos de lectura utilizados para consultar sus propias notas y contenido publicado; el arreglo no debe eliminar esos permisos ni romper sus endpoints legítimos.
- Un enlace antiguo o marcador directo a una ruta docente debe terminar en Acceso denegado, no en una pantalla vacía ni en un bucle de redirección.
- Una materia sin evaluaciones o recursos debe mantener un estado vacío estudiantil y no sugerir crear contenido.
- En pantallas de 360 px, las pestañas permitidas deben seguir siendo accesibles sin que las pestañas docentes reaparezcan por desbordamiento horizontal.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El frontend MUST distinguir un estudiante estándar de un usuario con un rol personalizado otorgado por administración.
- **FR-002**: Las pestañas docentes Calificar, Asistencia y DBA/Criterios de aprendizaje MUST permanecer ocultas para estudiantes estándar aunque posean permisos de lectura compartidos.
- **FR-003**: Las rutas docentes internas de una materia MUST rechazar por URL directa al estudiante estándar.
- **FR-004**: Las tarjetas de evaluaciones MUST decidir entre acciones docentes y estudiantiles usando el contexto real de gestión de la materia, no únicamente permisos de lectura.
- **FR-005**: La biblioteca docente de recursos MUST permanecer inaccesible para estudiantes estándar; los recursos asignados MUST continuar disponibles desde las materias y rutas estudiantiles existentes.
- **FR-006**: El listado de presentaciones permitido al estudiante MUST usar títulos, descripciones y estados vacíos orientados al aprendizaje y MUST omitir acciones de autoría.
- **FR-007**: Los perfiles con rol personalizado MUST continuar sujetos a sus permisos efectivos y no ser tratados automáticamente como estudiantes estándar.
- **FR-008**: La navegación lateral, superior y contextual MUST mantener etiquetas estudiantiles coherentes en escritorio y celular.
- **FR-009**: La solución MUST incluir pruebas con el conjunto real de permisos predeterminados del estudiante, incluidas rutas directas y tarjetas de evaluación.
- **FR-010**: La solución MUST preservar las validaciones del servidor y no ampliar acceso de escritura, publicación, calificación ni administración.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cero controles docentes visibles en las vistas de materia y evaluación de un estudiante estándar con sus permisos reales de producción.
- **SC-002**: El 100 % de las rutas docentes auditadas rechaza al estudiante estándar o presenta una variante estudiantil explícita.
- **SC-003**: El estudiante puede seguir abriendo sus materias, evaluaciones, recursos asignados, boletín y Xali sin regresiones.
- **SC-004**: Las vistas críticas permanecen utilizables desde 360 px sin desbordamiento horizontal de la página ni controles inaccesibles.
- **SC-005**: Las pruebas automatizadas cubren al menos un estudiante estándar, un profesor y un perfil personalizado para las decisiones de navegación y acceso afectadas.

## Assumptions

- Los permisos de lectura predeterminados del estudiante se conservan porque también protegen consultas legítimas de notas y contenido asignado.
- Un estudiante estándar es quien tiene rol base `estudiante` y no tiene un rol personalizado activo.
- Un rol personalizado representa una decisión administrativa explícita y conserva el modelo de permisos vigente.
- No se requieren cambios de base de datos ni de contratos públicos para este hotfix.
