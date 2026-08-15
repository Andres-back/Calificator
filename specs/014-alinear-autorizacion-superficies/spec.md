# Especificación: Alineación de autorización efectiva

**Rama**: codex/014-alinear-autorizacion-superficies | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #17

**Entrada**: Continuar la corrección progresiva de los hallazgos del inventario, empezando por las diferencias de autorización entre servidor e interfaz sin dañar los flujos existentes.

## Escenarios de usuario y pruebas

### Historia 1 - Impedir accesos fuera del rol o ámbito (Prioridad: P1)

Como integrante de la comunidad educativa, necesito que las acciones y datos de profesor, estudiante y administrador estén separados para que nadie consulte o modifique información que no le corresponde.

**Razón de prioridad**: Una diferencia de autorización puede exponer asistencia, recursos, presentaciones o reclamos, o permitir una acción docente desde una cuenta inadecuada.

**Prueba independiente**: Para cada superficie señalada, una cuenta sin el rol requerido o sin relación con el objeto recibe una denegación clara y no se produce ningún cambio ni exposición de datos.

**Aceptación**:
1. **Dada** una cuenta de estudiante, **cuando** intenta registrar asistencia, consultar espacios docentes o resolver un reclamo, **entonces** la operación se deniega sin revelar datos del objeto.
2. **Dado** un profesor ajeno a una materia, recurso, presentación o incidencia, **cuando** intenta acceder mediante un identificador válido, **entonces** la operación se deniega igual que para un objeto inexistente.
3. **Dado** un actor no autenticado, **cuando** intenta usar cualquiera de las superficies protegidas, **entonces** debe autenticarse antes de obtener información.

### Historia 2 - Conservar las acciones legítimas (Prioridad: P1)

Como profesor o administrador autorizado, necesito seguir gestionando asistencia, DBA, recursos, presentaciones y reclamos dentro de mi ámbito sin que el refuerzo de seguridad rompa el trabajo cotidiano.

**Razón de prioridad**: La corrección no es aceptable si bloquea funciones docentes que ya operan.

**Prueba independiente**: Un profesor relacionado con la materia u objeto completa cada recorrido permitido y un administrador conserva las capacidades globales previstas.

**Aceptación**:
1. **Dado** un profesor autorizado en una materia, **cuando** consulta DBA o gestiona asistencia y recursos de esa materia, **entonces** obtiene únicamente la información de su ámbito y la acción finaliza correctamente.
2. **Dada** una presentación del profesor, **cuando** consulta la lista, el progreso o la vista previa, **entonces** puede hacerlo sin acceder a presentaciones ajenas.
3. **Dada** una incidencia abierta sobre una entrega bajo responsabilidad del profesor, **cuando** la resuelve, **entonces** se registra la decisión y el estudiante puede consultar el resultado.
4. **Dado** un administrador autenticado, **cuando** realiza una acción permitida, **entonces** conserva el acceso esperado y auditable.

### Historia 3 - Mantener la experiencia estudiantil segura (Prioridad: P2)

Como estudiante, necesito consultar el material que me fue asignado, crear solicitudes de revisión y conocer su resolución sin entrar a pantallas ni contratos internos del profesor.

**Razón de prioridad**: Restringir los espacios docentes no debe eliminar los recorridos estudiantiles legítimos.

**Prueba independiente**: El estudiante consume únicamente sus asignaciones y solicitudes mediante sus recorridos visibles, mientras las operaciones de administración o resolución permanecen inaccesibles.

**Aceptación**:
1. **Dado** un recurso o presentación asignado al estudiante, **cuando** lo abre desde su materia o actividad, **entonces** puede consultarlo por el recorrido estudiantil autorizado.
2. **Dada** una calificación propia, **cuando** el estudiante presenta un reclamo, **entonces** puede crear y consultar su solicitud, pero no marcarla como resuelta.
3. **Dada** una incidencia de otro estudiante, **cuando** intenta consultarla o modificarla, **entonces** no recibe datos sobre su existencia o contenido.

### Historia 4 - Registrar analítica sin suplantación (Prioridad: P2)

Como responsable del producto, necesito medir recorridos de usuarios autenticados sin permitir que el cliente atribuya eventos a otra persona, rol o ámbito.

**Razón de prioridad**: La analítica es transversal y su permiso no debe confundirse con una capacidad docente ni aceptar identidades arbitrarias.

**Prueba independiente**: Profesor, estudiante y administrador pueden registrar eventos permitidos de su propia sesión; valores de identidad o ámbito no autorizados se ignoran o rechazan y nunca alteran datos académicos.

**Aceptación**:
1. **Dado** un usuario autenticado, **cuando** registra un evento permitido, **entonces** el evento queda asociado a la identidad efectiva de su sesión.
2. **Dado** un cliente que intenta declarar otra identidad o rol, **cuando** envía el evento, **entonces** no puede suplantar al actor ni ampliar su acceso.
3. **Dado** un evento desconocido o con datos académicos sensibles innecesarios, **cuando** se intenta registrar, **entonces** se rechaza o minimiza sin afectar la navegación.

### Historia 5 - Eliminar la ambigüedad del inventario (Prioridad: P3)

Como mantenedor, necesito que los permisos observados en interfaz y servidor expresen la misma intención para detectar futuras regresiones de forma automática.

**Prueba independiente**: El inventario no reporta diferencias de autorización para las diez superficies incluidas y enlaza evidencia de acceso permitido y denegado.

**Aceptación**:
1. **Dadas** las diez diferencias actuales, **cuando** se regenera el inventario, **entonces** cada una desaparece o queda resuelta mediante una decisión explícita y comprobable.
2. **Dado** un cambio futuro que vuelva a separar la intención de permisos, **cuando** se ejecuta la validación, **entonces** el control falla con la superficie afectada.

### Casos límite

- Un profesor conoce un identificador válido de una materia, recurso, presentación o incidencia ajena.
- Una materia cambia de profesor mientras existe una sesión abierta o un trabajo en proceso.
- Un administrador también posee relaciones docentes y la acción admite ambos ámbitos.
- Una presentación o recurso se comparte con estudiantes, pero su edición y estado interno continúan siendo docentes.
- Un estudiante puede crear un reclamo propio, pero nunca resolverlo, cerrarlo ni responder en nombre del profesor.
- Un reclamo pertenece a una entrega cuya materia ya no está activa o cambió de profesor.
- Un evento analítico llega sin nombre permitido, con identidad declarada por el cliente o con datos académicos innecesarios.
- La interfaz oculta una acción, pero alguien invoca directamente la operación protegida.
- Si la sesión expira antes de una mutación, el servidor responde con autenticación requerida (`401`) y no ejecuta ni deja cambios parciales, aunque el objeto se hubiera consultado previamente.
- Las denegaciones no deben incluir contenido, propietario ni estado interno del objeto. Los endpoints heredados conservan sus códigos públicos; las nuevas referencias de analítica usan la misma respuesta `404` para objeto inexistente o ajeno.

## Requisitos

### Requisitos funcionales

- **FR-001**: Toda superficie incluida DEBE exigir autenticación en el servidor antes de revelar datos o ejecutar acciones.
- **FR-002**: El servidor DEBE ser la autoridad final; ocultar rutas o botones en la interfaz NO DEBE sustituir la autorización efectiva.
- **FR-003**: Consultar o modificar asistencia de una materia DEBE limitarse a profesores autorizados sobre esa materia y administradores habilitados.
- **FR-004**: Consultar la gestión de DBA de una materia DEBE limitarse a profesores autorizados sobre esa materia y administradores habilitados.
- **FR-005**: Consultar recursos docentes de una materia o un recurso por identificador DEBE limitarse a profesores autorizados sobre el ámbito correspondiente y administradores habilitados.
- **FR-006**: El acceso estudiantil a recursos asignados DEBE conservarse mediante el recorrido estudiantil y limitarse a asignaciones del propio estudiante.
- **FR-007**: Listar presentaciones, consultar su estado y abrir su vista previa DEBE limitarse al profesor propietario o autorizado y a administradores habilitados.
- **FR-008**: El acceso estudiantil a una presentación asignada DEBE conservarse sin exponer listados, estados de generación ni presentaciones ajenas.
- **FR-009**: Crear y consultar reclamos propios DEBE permanecer disponible para el estudiante afectado.
- **FR-010**: Resolver una incidencia DEBE limitarse al profesor responsable de la entrega o materia y a administradores habilitados; el estudiante NO DEBE resolverla.
- **FR-011**: Toda resolución de incidencia DEBE conservar actor, momento, decisión y respuesta visible para el estudiante correspondiente.
- **FR-012**: El registro de analítica DEBE admitir únicamente usuarios autenticados y derivar la identidad y el rol efectivos de la sesión.
- **FR-013**: La analítica NO DEBE aceptar del cliente una identidad, rol o ámbito que permita suplantación ni modificar información académica.
- **FR-014**: Los eventos analíticos DEBEN limitarse a nombres y datos permitidos, minimizando contenido académico y datos personales.
- **FR-015**: Las denegaciones NO DEBEN modificar asistencia, recursos, presentaciones, incidencias, calificaciones ni eventos atribuidos a terceros.
- **FR-016**: Las respuestas de denegación NO DEBEN incluir contenido, propietario ni estado interno de un objeto sensible ajeno. Los endpoints existentes DEBEN conservar sus códigos públicos conforme a FR-020; las referencias académicas nuevas de analítica DEBEN responder igual para objeto inexistente y objeto ajeno.
- **FR-017**: Cada una de las diez superficies inventariadas DEBE tener pruebas de acceso permitido, rol denegado y ámbito ajeno cuando aplique.
- **FR-018**: Las especificaciones responsables DEBEN reflejar la decisión de autorización definitiva sin crear contratos contradictorios.
- **FR-019**: El inventario técnico DEBE dejar de reportar las diez diferencias incluidas y enlazar la evidencia de prueba correspondiente.
- **FR-020**: Los contratos públicos y recorridos legítimos existentes DEBEN conservarse salvo una modificación aprobada explícitamente en esta especificación.

### Decisiones de autorización esperada

| Capacidad | Profesor | Estudiante | Administrador |
|-----------|----------|------------|---------------|
| Consultar o registrar asistencia | Permitido dentro de su ámbito | Denegado en el espacio docente | Permitido sobre cualquier materia existente |
| Consultar gestión de DBA | Permitido dentro de su ámbito | Denegado en el espacio docente | Permitido sobre cualquier materia existente |
| Listar recursos docentes de una materia | Permitido dentro de su ámbito | Solo asignaciones propias por recorrido estudiantil | Permitido sobre cualquier materia existente |
| Consultar un recurso docente por identificador | Permitido si es autor | Solo asignación visible y matrícula activa | Permitido únicamente si el administrador es autor; no obtiene acceso global nuevo |
| Listar, estado o vista previa de presentaciones | Permitido sobre presentaciones propias o autorizadas | Solo material asignado por recorrido estudiantil | Permitido sobre cualquier presentación existente |
| Crear y consultar reclamo | Consulta bajo su ámbito | Permitido únicamente sobre entrega propia | Permitido sobre cualquier reclamo existente |
| Resolver reclamo | Permitido bajo su ámbito | Denegado | Permitido sobre cualquier reclamo existente |
| Registrar analítica permitida | Permitido para su sesión y referencias bajo su ámbito | Permitido para su sesión y referencias propias | Permitido para su sesión según el catálogo cerrado |

### Entidades clave

- **Actor autenticado**: persona cuya identidad y rol efectivos proceden de la sesión vigente.
- **Ámbito docente**: relación verificable que autoriza a un profesor sobre una materia, entrega, recurso, presentación o incidencia.
- **Asignación estudiantil**: vínculo que permite a un estudiante consultar contenido dirigido a su matrícula sin obtener capacidades docentes.
- **Incidencia**: solicitud de revisión asociada a una entrega y estudiante, con estado, respuesta y resolución auditable.
- **Evento analítico permitido**: medición de una acción de la sesión actual con nombre y datos mínimos autorizados.
- **Decisión de autorización**: resultado permitido o denegado basado en rol, propiedad, asignación y estado del objeto.
- **Evidencia de autorización**: prueba que demuestra acceso legítimo y rechazo de rol o ámbito incorrectos.

## Criterios de éxito

- **SC-001**: Las 10 diferencias incluidas quedan resueltas y el inventario reporta cero diferencias para esas superficies.
- **SC-002**: El 100 % de las superficies incluidas cuenta con pruebas de acceso permitido y denegado; las que dependen de propiedad incluyen una prueba de ámbito ajeno.
- **SC-003**: Cero intentos de estudiante permiten ejecutar acciones docentes o resolver reclamos durante las pruebas de aceptación.
- **SC-004**: Cero intentos de profesor permiten consultar o modificar objetos ajenos durante las pruebas de aceptación.
- **SC-005**: El 100 % de los recorridos legítimos incluidos finaliza en un estado visible y comprensible.
- **SC-006**: El 100 % de las resoluciones de reclamo registra actor, momento, decisión y respuesta consultable por el estudiante afectado.
- **SC-007**: Ningún evento analítico de prueba puede atribuirse a una identidad o rol declarado arbitrariamente por el cliente.
- **SC-008**: Las suites de regresión, gobernanza e inventario finalizan sin fallos antes del merge.

## Supuestos

- Las relaciones actuales entre profesor, materia, entrega y estudiante son la fuente válida para determinar ámbito; no se crea un sistema paralelo de permisos.
- Los administradores conservan exactamente el comportamiento actual: acceso global a asistencia, DBA, listados de recursos por materia, presentaciones e incidencias; la consulta directa de un recurso por identificador sigue limitada a recursos cuyo autor sea ese administrador; analítica queda limitada por el catálogo cerrado. Esta iniciativa no amplía sus funciones.
- Los estudiantes reciben recursos y presentaciones mediante recorridos de asignación existentes o especificados en sus dominios, no mediante pantallas internas del profesor.
- El registro de analítica es transversal a roles autenticados, siempre ligado a la sesión y limitado a eventos permitidos.
- Las diez diferencias actuales son: dos de asistencia, una de DBA, dos de herramientas, tres de presentaciones, una de analítica y una de resolución de incidencias.
- Esta iniciativa no elimina tablas históricas ni cubre los hallazgos de pruebas ausentes; esos grupos tendrán cambios posteriores.
