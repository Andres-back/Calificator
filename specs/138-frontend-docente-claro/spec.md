# Feature Specification: Revisión docente clara y contextual

**Feature Branch**: `codex/138-frontend-docente-claro`
**Created**: 2026-10-30
**Issue**: [#295](https://github.com/Andres-back/Calificator/issues/295)
**Status**: Implementación verificada en local; CI y revisión del PR previos a cualquier fusión
**Input**: «adelante vamos con los cambios que habíamos propuesto para mejorar el frontend».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Revisar sin ruido ni duplicados (Priority: P1)

El docente comprende la respuesta, la evidencia, el puntaje y su explicación, sin repetir instrucciones generales por cada pregunta. Conserva acceso al análisis y a los avisos que cambian su decisión.

**Why this priority**: Es la tarea cotidiana y debe mejorar sin alterar notas ni su validación.
**Independent Test**: Abrir una entrega existente, recorrer preguntas, consultar Historial, editar un borrador y preparar su retroalimentación sin repetir acciones ni perder información.
**Acceptance Scenarios**:
1. **Given** una respuesta analizada, **When** se abre la revisión, **Then** respuesta, evidencia, puntaje y explicación son el contenido principal; fuentes, valoraciones y proceso permanecen en Historial identificados por pregunta.
2. **Given** una inconsistencia, una cobertura insuficiente o una evidencia no verificable, **When** se consulta la revisión, **Then** el aviso específico sigue visible y conserva sus acciones y restricciones actuales.
3. **Given** la retroalimentación individual, **When** se prepara compartir, **Then** hay un solo acceso principal a compartir y la impresión sigue disponible, sin cambiar la política de aprobación o los permisos.

### User Story 2 - Permanecer dentro de la materia (Priority: P2)

El docente entra desde Materia → Evaluación → Estudiante y conserva esa ubicación, sus filtros y los enlaces guardados.

**Why this priority**: Evita saltos de contexto después de simplificar el contenido.
**Independent Test**: Abrir desde evaluaciones y boletín, cambiar estudiante/pregunta, volver un nivel y abrir el mismo enlace directamente.
**Acceptance Scenarios**:
1. **Given** una evaluación de una materia, **When** se revisa un estudiante, **Then** se muestra la ubicación materia/evaluación/estudiante y una sola flecha de regreso al nivel superior; no hay cabeceras ni monitores duplicados.
2. **Given** un enlace antiguo con selección, pregunta, hoja, filtros y modo, **When** se abre, **Then** mantiene el contexto reconocido y las autorizaciones; un enlace con materia/evaluación contradictorias muestra un error sin habilitar acciones de otra materia.
3. **Given** un docente procedente del boletín, **When** vuelve al libro mediante su acceso secundario, **Then** conserva los filtros validados y no acepta destinos externos o de otra materia.
4. **Given** un perfil que puede calificar pero no abrir materias, **When** entra por su acceso compatible, **Then** puede seguir revisando sin recibir nuevos permisos ni quedar atrapado en una ruta inaccesible.

### User Story 3 - Encontrar pendientes y secciones en celular (Priority: P2)

La bandeja permite encontrar casos pendientes de distintas materias; las secciones de la materia son visibles sin abrir un selector.

**Independent Test**: Consultar Pendientes con/sin permiso, abrir un caso y recorrer las secciones de una materia a384px con teclado y desplazamiento horizontal.
**Acceptance Scenarios**:
1. **Given** permiso para la bandeja, **When** se muestran sus casos, **Then** se distinguen totales globales y muestra disponible; nunca se presentan conteos de muestra como totales de una evaluación.
2. **Given** que falta ese permiso, **When** se abre el acceso global, **Then** no se consulta la bandeja prohibida y sigue disponible la selección de evaluación permitida.
3. **Given** una materia, **When** se usa en celular, **Then** sus secciones autorizadas aparecen en una fila deslizable, con la activa identificada y alcanzable sin desbordar toda la página.

### User Story 4 - Mantener coherencia en cambios futuros (Priority: P3)

Las nuevas propuestas documentan lo que agregan, reutilizan y retiran, con evidencia visual antes de fusionarse.

**Independent Test**: Revisar esta especificación y su registro visual de384px y escritorio, claro/oscuro, incluyendo ayuda y estados de error.
**Acceptance Scenarios**:
1. **Given** una propuesta nueva, **When** se prepara, **Then** declara controles/textos añadidos, reutilizados y retirados; «ninguno» requiere una razón.
2. **Given** una entrega implementada, **When** se solicita fusión, **Then** incluye capturas sintéticas de384px y escritorio; la maqueta previa se distingue de las capturas del sistema real y no se afirma validación física inexistente.

### Edge Cases

- Usuario estudiante o con permisos revocados: sin acciones docentes ni exposición del análisis privado; resultados globales del estudiante intactos.
- Enlace directo sin historial del navegador: destino superior determinista, sin depender solo de Atrás.
- Cambio de sección, ruta, evaluación o estudiante durante una edición: conservar bloqueos de borrador y decisiones explícitas.
- Bandeja vacía, limitada o con error: no afirmar ausencia de pendientes ante un fallo; permitir reintentar o elegir evaluación.
- Texto largo,200% de letra, teclado abierto y pantalla horizontal: controles alcanzables, sin scrollers anidados que bloqueen el gesto.
- Ayuda cerrada: nunca oculta el problema específico que requiere decisión del profesor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La revisión DEBE priorizar respuesta, evidencia, puntaje y explicación; las instrucciones generales se ofrecen en una ayuda cerrada por defecto, disponible a voluntad y sin ocultar errores específicos.
- **FR-002**: Historial DEBE conservar fuentes, valoraciones y proceso identificados por pregunta, junto al análisis y trazabilidad ya existentes; los datos no se borran ni se reinterpretan como decisiones nuevas.
- **FR-003**: El vocabulario visible del recorrido docente y enlaces públicos DEBE usar «Retroalimentación», «Nota sugerida», «Nota final» y «Recursos». Nombres internos y direcciones antiguas pueden conservarse; las palabras escritas por docentes/estudiantes no se reescriben.
- **FR-004**: Cada paso de retroalimentación individual DEBE tener una sola acción principal de compartir; confirmar, publicar, imprimir, copiar, cancelar y los fallos parciales siguen disponibles donde corresponden, con sus restricciones actuales.
- **FR-005**: La revisión desde Materias DEBE conservar una ubicación materia/evaluación/estudiante y una sola flecha superior por nivel, con acceso secundario al libro cuando está autorizado; sin cabeceras o monitores duplicados.
- **FR-006**: Los enlaces antiguos y las selecciones reconocidas DEBEN seguir funcionando. No se conceden permisos, se inventan destinos ni se muestra una evaluación bajo una materia distinta; los enlaces directos tienen regreso determinista.
- **FR-007**: La bandeja «Pendientes» DEBE reutilizar datos autorizados y declarar su limitación de muestra. Si no hay permiso, no solicita esa información y conserva el acceso compatible a revisión. No consulta una vez por cada evaluación para simular totales.
- **FR-008**: Las secciones de materia DEBEN ser visibles como navegación horizontal deslizable también en celular, con sección activa, controles táctiles de44px y acceso por teclado; no un selector exclusivo móvil.
- **FR-009**: Navegar o abrir ayuda NO DEBE cambiar notas, evidencias, respuestas, publicaciones, solicitudes ni modelos. Los borradores y bloqueos existentes se conservan y los resultados del estudiante no se convierten en una superficie docente.
- **FR-010**: Los flujos DEBEN funcionar a360/384/390/768/1440px, claro/oscuro,200% de letra y teclado abierto, con contenido y acciones alcanzables, sin desbordamiento global ni desplazamiento solo desde el borde.
- **FR-011**: Cada especificación futura DEBE declarar qué agrega/reutiliza/retira y requerir capturas a384px antes de fusión; maqueta antes de implementar, diferenciada del resultado verificado. No cambia los principios de la constitución ni su aprobación humana.
- **FR-012**: La entrega DEBE ser incremental y reversible por código, sin migraciones, cambios de contratos públicos de datos, nuevas dependencias o llamadas adicionales a IA; pruebas y CI completo antes de cualquier fusión.

### Key Entities

- **Contexto de revisión**: materia/evaluación/estudiante, selección de pregunta/hoja, filtros y retorno autorizado; no concede acceso académico.
- **Detalle de análisis**: datos guardados asociados a la pregunta, solo disponibles para quien ya puede consultarlos.
- **Caso pendiente**: referencia autorizada de la bandeja, con total global y muestra separados.
- **Ayuda de revisión**: explicación voluntaria de colores, cálculo y comprobación; no almacena datos académicos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: En todos los escenarios docentes cubiertos, las instrucciones generales y el proceso repetido desaparecen de la lectura principal, sin perder datos del Historial ni alertas específicas.
- **SC-002**: Cada escenario de retroalimentación individual ofrece una sola acción principal de compartir por paso, manteniendo impresión y recuperación de fallos.
- **SC-003**: Todos los enlaces de regresión conservan selección/contexto y autorizaciones; cero escrituras académicas causadas por navegación y cero pérdida de borradores.
- **SC-004**: La matriz360–1440px y200% conserva alcance de acciones, scroll desde contenido/márgenes y ausencia de desbordamiento global, con capturas verificadas a384px y escritorio.
- **SC-005**: La bandeja no realiza consultas prohibidas ni presenta conteos de muestra como totales; el flujo del estudiante y los perfiles personalizados conservan acceso permitido y rechazo de acceso ajeno.

## Assumptions

- La aprobación del usuario cubre las dos entregas propuestas y las dos reglas de reducción/validación visual; no autoriza publicar notas ni desplegar manualmente.
- «Retroalimentación» es el nombre elegido por continuidad con el vocabulario mayoritario actual. Las rutas técnicas `herramientas`, `dba` y `devolucion` no necesitan renombrarse para que el profesor vea nombres coherentes.
- Se usa una sola vista de revisión; no se eliminan boletines existentes ni se duplican lógica o estados.
- La ayuda voluntaria no requiere persistir una bandera «ya vista»: cerrada por defecto y siempre disponible, evita almacenamiento o sincronización innecesarios.

## Añade, reutiliza y retira

| Área | Añade | Reutiliza | Retira o reubica |
| --- | --- | --- | --- |
| Revisión | Ayuda voluntaria y detalle técnico en Historial | Evidencia, razones, colores/alertas actuales | Párrafos generales y proceso repetidos por pregunta |
| Retroalimentación | Jerarquía única por paso | Edición, selección, impresión y enlaces | CTA de compartir individual duplicado; «devolución» en etiquetas propias |
| Navegación | Contexto y regreso de nivel, Pendientes explícitos | Workspace, filtros, retorno seguro y bandeja | Saltos de contexto y flechas simultáneas |
| Materia móvil | Secciones visibles deslizables | Enlaces y permisos de tabs existentes | Selector móvil exclusivo |
| Proceso | Registro de sustracción y evidencia384px | Spec Kit y CI existentes | Agregados sin explicar qué reemplazan |
