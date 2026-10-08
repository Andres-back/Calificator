# Especificación: recursos y resultados claros para el estudiante

**Feature Branch**: `codex/091-estudiante-recursos-resultados`

**Created**: 2026-10-07

**Status**: Alcance, plan y revisión de lista aprobados; implementado y validado localmente, sin despliegue

**Issue**: [#192](https://github.com/Andres-back/Calificator/issues/192)

**Input**: «repara los errores mejora su frontend», después de revisar aislamiento de rol, entregas, resultados y recursos estudiantiles.

Evoluciona 074 (flujo estudiante), reutilizando los dominios responsables 006 (recursos), 007 (entregas) y 008 (notas y retroalimentación). No redefine sus reglas de negocio ni crea versiones contradictorias de ellas.

## Clarifications

### Session 2026-10-07

- Q: ¿Apruebas las cuatro correcciones del alcance? → A: «si mejora el la vista estudiante que el frontend sea coherente». Aprobación del alcance, con énfasis en consistencia de los boletines, acciones y estados del recorrido estudiante. No equivale a aprobación del plan técnico todavía no presentado, ni de fusión/despliegue.
- Q: ¿Apruebas el plan técnico para implementar y verificar las correcciones? → A: «aprovado». Plan aprobado; fusión/despliegue siguen requiriendo autorización separada y CI verde.
- No se detectan ambigüedades críticas adicionales. La ausencia de desglose no permite afirmar su antigüedad: si el sistema solo informa ausencia, el mensaje será neutral y conservará la nota/retroalimentación disponible; si la consulta falla, se mostrará error/reintento.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Resolver actividades sin acceder al solucionario (Priority: P1)

El estudiante abre un recurso evaluativo publicado para su materia y resuelve la actividad en el lugar donde puede entregarla. No recibe la solución antes de enviar sus respuestas ni una valoración falsa hecha sin criterios de corrección.

**Why this priority**: Revelar respuestas invalida la actividad; presentar respuestas correctas como incorrectas confunde al alumno y afecta su confianza.

**Independent Test**: Con una cuenta ficticia matriculada, abrir un crucigrama y un emparejamiento evaluativos desde Recursos; comprobar que no se revelan soluciones ni se emiten resultados locales sin solucionario, y que se llega al formulario de entrega correcto.

**Acceptance Scenarios**:

1. **Given** un crucigrama asignado como actividad, **When** el alumno abre su recurso, **Then** no puede revelar ni recibir sus letras de solución y puede abrir la actividad para resolver y entregar.
2. **Given** un emparejamiento evaluativo sin soluciones visibles, **When** el alumno abre el recurso, **Then** no encuentra una verificación local que invente aciertos o errores.
3. **Given** material de apoyo para práctica, **When** el alumno lo abre, **Then** conserva su interacción de práctica y entiende que no requiere entrega ni modifica la nota.
4. **Given** el autor docente, **When** consulta su material, **Then** conserva las soluciones y herramientas de revisión autorizadas.
5. **Given** una persona no matriculada, **When** intenta consultar el recurso o su evaluación por enlace directo, **Then** no recibe contenido ni soluciones.

---

### User Story 2 - Entender una nota desde Mis resultados (Priority: P2)

El estudiante consulta una nota publicada y abre su explicación y retroalimentación en una sola acción, tanto desde Mis resultados como desde el boletín de la materia.

**Why this priority**: La explicación ya existe, pero buscarla en Mis actividades dificulta aprovechar la retroalimentación.

**Independent Test**: Abrir los dos boletines con una nota ficticia publicada y comprobar que «Ver explicación de mi nota» lleva al resultado de esa evaluación, con sus respuestas y retroalimentación, sin herramientas docentes.

**Acceptance Scenarios**:

1. **Given** una nota publicada, **When** el alumno consulta cualquiera de sus boletines, **Then** ve nombre de evaluación, nota y acceso directo a su explicación.
2. **Given** una entrega todavía procesándose o pendiente de decisión docente, **When** consulta sus resultados, **Then** no ve una nota cero ficticia ni una explicación presentada como definitiva.
3. **Given** una nota histórica sin desglose, **When** abre su explicación, **Then** conserva la retroalimentación disponible y recibe un mensaje de ausencia de desglose sin inventar datos.
4. **Given** una evaluación cerrada, **When** consulta el resultado autorizado, **Then** puede leerlo sin reabrir entregas ni producir un nuevo intento.

---

### User Story 3 - Distinguir una carga fallida de una nota histórica (Priority: P2)

El estudiante entiende cuándo no pudo cargarse su explicación y puede reintentar sin perder su entrega ni cambiar su nota.

**Why this priority**: Un fallo de conexión no significa que la nota sea antigua ni que carezca de desglose.

**Independent Test**: Simular un fallo de carga del desglose y recuperarlo; comprobar aviso y reintento, seguido del detalle correcto, sin escrituras académicas.

**Acceptance Scenarios**:

1. **Given** una consulta de explicación que falla por conexión o fallo del servicio, **When** el alumno abre su resultado, **Then** ve un aviso comprensible y «Reintentar», no «Detalle histórico».
2. **Given** ausencia histórica de desglose confirmada por el sistema, **When** consulta el resultado, **Then** ve el mensaje histórico y conserva la retroalimentación original.
3. **Given** un permiso revocado, **When** intenta acceder al detalle, **Then** ve una denegación clara sin respuestas, notas de terceros ni acciones docentes.

### Edge Cases

- La nota confirmada igual a cero es legítima; una nota todavía pendiente no debe convertirse en cero.
- Un recurso puede estar publicado como apoyo o como actividad: no asumir que todos los recursos se califican.
- Respuestas introducidas en una práctica no deben aparentar estar entregadas ni perderse silenciosamente al cambiar de pantalla; la actividad evaluativa identifica claramente dónde resolver y enviar.
- Una actividad o recurso no publicado sigue inaccesible para el estudiante.
- Un error de carga, una ausencia histórica real y una denegación de permisos son situaciones diferentes.
- Evaluaciones históricas o archivadas deben mostrar sus resultados según las políticas existentes; no crear permisos nuevos para forzar acceso.
- En 360 px y con nombres largos, controles y texto siguen visibles sin desbordamiento horizontal de la página ni paneles que bloqueen el scroll.
- Roles personalizados conservan los permisos otorgados explícitamente por administración; no se amplía acceso de un estudiante estándar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST impedir que el estudiante reciba soluciones ocultas de crucigramas evaluativos por la consulta de Recursos, incluso al abrir su enlace directamente.
- **FR-002**: El visor de recursos evaluativos MUST evitar acciones locales de revelar soluciones o verificar sin información de corrección autorizada.
- **FR-003**: La actividad evaluativa MUST identificar dónde resolver y entregar, sin hacer pasar una práctica local por una entrega guardada.
- **FR-004**: Materiales de apoyo y herramientas del autor docente MUST conservar su comportamiento autorizado; el cambio no deshabilita la práctica no evaluativa.
- **FR-005**: Ambos boletines estudiantiles MUST ofrecer una acción directa «Ver explicación de mi nota» para cada nota publicada cuya evaluación sea accesible.
- **FR-006**: La explicación MUST reutilizar el detalle existente de esa evaluación y mostrar únicamente información del estudiante autenticado.
- **FR-007**: Un fallo al cargar el desglose MUST mostrar un mensaje de error comprensible y una acción de reintento; MUST NOT interpretarse como ausencia histórica.
- **FR-008**: La ausencia histórica confirmada MUST mantener el mensaje correspondiente y la retroalimentación disponible sin inventar puntajes.
- **FR-009**: Las vistas modificadas MUST funcionar desde 360 px hasta escritorio, claro/oscuro, con controles táctiles de al menos 44 px, orden de lectura claro y scroll de página no bloqueado.
- **FR-010**: El cambio MUST preservar notas, evidencias, matrículas, usuarios, claves, borradores y políticas existentes de recepción, revisión y publicación; no requiere modificar registros anteriores.
- **FR-011**: Las consultas MUST conservar las restricciones actuales de matrícula, publicación y titularidad; ocultar botones no sustituye la protección del contenido.
- **FR-012**: Las regresiones MUST comprobar casos de estudiante permitido/denegado, docente, material de apoyo, actividad evaluativa y resultado pendiente/confirmado/histórico/error.
- **FR-013**: Ambos boletines estudiantiles MUST mantener el mismo orden de evaluación, nota, estado, explicación y retroalimentación, con las mismas etiquetas para la misma acción. El resultado se presenta primero; información secundaria se abre bajo demanda sin ocultar acciones esenciales ni cambiar interfaces docentes.

### Key Entities

- **Recurso publicado**: material de apoyo o actividad evaluativa, con materia y autor; su contenido visible depende de la asignación y la autorización.
- **Actividad y entrega**: evaluación vinculada al recurso y respuestas del alumno; conserva su estado y mecanismo existente de entrega.
- **Resultado del estudiante**: nota docente vigente, evaluación, retroalimentación y desglose opcional; se distingue de una sugerencia no publicada.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Cero letras de solución de crucigramas evaluativos expuestas en las consultas estudiantiles afectadas y cero controles para revelarlas.
- **SC-002**: Cero verificaciones locales falsas en recursos de emparejamiento evaluativos sin solucionario visible.
- **SC-003**: El estudiante abre la explicación de una nota publicada con una acción desde cualquiera de los dos boletines.
- **SC-004**: El 100 % de los escenarios de fallo simulado del desglose muestra error/reintento y ninguno muestra por ese fallo el mensaje de nota histórica.
- **SC-005**: Los recorridos afectados son utilizables a 360 y 390 px en navegadores representativos de Android/iPhone y a 1366 px en escritorio, sin desbordamiento de página ni scroll bloqueado.
- **SC-006**: Cero escrituras a notas, evidencias, matrícula o credenciales durante consultas, navegación y reintentos del cambio; pruebas dirigidas y controles obligatorios verdes antes de merge.

## Assumptions

- Se corrigen los cuatro hallazgos de la revisión precedente; no se rediseña toda la aplicación ni se crean módulos nuevos.
- La práctica con material de apoyo puede seguir mostrando soluciones; la prohibición aquí corresponde a contenido evaluativo antes de la entrega.
- Se conserva la explicación y experiencia de retroalimentación existentes, añadiendo accesos claros y estados fiables.
- No se cambian proveedores de IA, modelos, prompts de calificación, fórmulas, permisos persistidos ni datos guardados.
- La autorización para reparar no se interpreta como autorización para fusionar ni desplegar; esos pasos requieren CI verde y confirmación separada.
