# Especificación: inicio docente claro en iPhone y Android

**Rama**: `codex/089-inicio-docente-movil` | **Creada**: 2026-10-06 | **Estado**: Implementación verificada localmente; pendiente CI y entrega autorizada | **Issue**: #184

**Solicitud**: mejorar cómo recibe al profesor la app instalada en su celular. Tras «ADELANTE ANDROIND», el usuario aprobó esta especificación con la condición explícita «APRUEBO PERO DEE SERVIR EN IPHONE Y ANDROID». El alcance cubre ambas plataformas, también desde navegador móvil. La aprobación de especificación no sustituye la aprobación del plan ni autoriza fusión o producción.

## Aclaraciones

### Sesión 2026-10-06

- P: ¿La instalaste en Android o en iPhone? → R: Inicialmente Android; el usuario amplió expresamente el alcance aprobado a iPhone y Android. Se toma como referencia la app instalable que ofrece actualmente el sitio, no una aplicación nativa distinta. No se necesita otra pregunta para confirmar las plataformas.

## Escenarios de usuario y pruebas

### Historia 1 - Abrir la app y llegar al trabajo (Prioridad: P1)

El docente abre XCalificator desde el icono del celular y llega a su espacio de trabajo si su sesión sigue vigente. No debe recorrer otra vez la página de presentación o introducir credenciales innecesariamente.

**Razón de prioridad**: el inicio instalado debe facilitar el trabajo en el salón sin alterar las reglas de sesión ni crear una segunda instalación.

**Prueba independiente**: abrir desde el icono con sesión válida y sin sesión; comprobar destino, identidad instalada y separación de roles. La visita pública al sitio conserva su presentación.

**Aceptación**:

1. **Dado** un docente con sesión vigente y conectividad, **cuando** abre la app instalada, **entonces** se valida su acceso y llega al inicio docente sin pasar por la presentación pública ni volver a ingresar credenciales.
2. **Dado** un usuario sin sesión o con sesión vencida, **cuando** abre la app, **entonces** inicia el flujo de acceso vigente; una contraseña temporal conserva el cambio obligatorio antes de entrar.
3. **Dado** un estudiante o administrador autenticado, **cuando** abre la misma app, **entonces** llega al inicio de su rol, nunca a funciones docentes.
4. **Dado** un visitante que abre la dirección pública en su navegador, **cuando** carga el sitio, **entonces** sigue viendo la landing y sus accesos de ingreso/registro.
5. **Dada** la app ya instalada en iPhone o Android con su dirección histórica de arranque, **cuando** recibe el código actualizado del sitio, **entonces** mantiene su identidad y aplica la entrada instalada sin exigir otra instalación o una actualización inmediata de metadatos. Un marcador que abre el navegador conserva la entrada pública normal.

### Historia 2 - Entrar a la materia sin saturación (Prioridad: P1)

El profesor identifica su grupo desde una bienvenida breve y una lista de materias, con accesos claros a sus evaluaciones y asistencia. Los números de recursos, paneles promocionales y herramientas de preparación no desplazan esa tarea principal.

**Razón de prioridad**: durante la clase importan el grupo y la actividad concreta, no recorrer un panel de estadísticas.

**Prueba independiente**: un docente ficticio con tres materias abre el inicio a 360×800 y 390×844 en los recorridos de iPhone y Android; distingue los grupos, entra a sus evaluaciones/asistencia y desde una evaluación publicada llega a los alumnos por calificar.

**Aceptación**:

1. **Dado** un docente con al menos tres materias y sin avisos extraordinarios, **cuando** entra desde celular y la carga termina, **entonces** ve saludo compacto, pendientes resumidos y las dos primeras materias completas sin desplazar la pantalla; la ayuda inicial puede omitirse para trabajar.
2. **Dada** una materia visible, **cuando** pulsa «Evaluaciones» o «Asistencia», **entonces** abre esa sección de esa materia, con contexto y permisos vigentes.
3. **Dadas** muchas materias o nombres largos, **cuando** busca un grupo, **entonces** puede identificarlo y abrirlo sin desplazamiento horizontal; limpiar la búsqueda restaura los resultados y no cambia materias.
4. **Dado** un docente sin materias, **cuando** termina la consulta, **entonces** ve un estado vacío y el acceso permitido para crear su primera materia; no se confunde ausencia con fallo de carga.
5. **Dado** un docente con permisos personalizados, **cuando** consulta el inicio, **entonces** solo aparecen acciones autorizadas; los controles y restricciones de las rutas de destino se conservan.

### Historia 3 - Revisar pendientes y pedir ayuda cuando haga falta (Prioridad: P2)

El docente ve cuántas notas o solicitudes necesitan atención, decide si abre el detalle y encuentra las demás herramientas sin que dominen la pantalla inicial. En la primera visita recibe orientación breve que puede cerrar y volver a consultar.

**Razón de prioridad**: orientar sin bloquear al profesor y mantener sus decisiones académicas explícitas.

**Prueba independiente**: probar cero pendientes, notas/solicitudes pendientes, error de bandeja, recursos fallidos y primera visita/visita posterior con datos ficticios.

**Aceptación**:

1. **Dada** una bandeja con pendientes, **cuando** carga el inicio, **entonces** presenta cantidades separadas y una acción explícita para consultar los casos; no despliega de entrada toda la lista.
2. **Dado** un caso abierto voluntariamente, **cuando** el docente entra a revisarlo, **entonces** conserva la evaluación/calificación correspondiente y sus comprobaciones de acceso, sin confirmar ni publicar automáticamente.
3. **Dado** un error de bandeja o recursos, **cuando** la lista de materias está disponible, **entonces** puede seguir trabajando en ella; el apartado fallido muestra aviso y reintento, no un cero ficticio.
4. **Dada** la primera visita al inicio docente, **cuando** aparece la ayuda, **entonces** puede omitirla inmediatamente y consultar de nuevo sus instrucciones desde un control visible; no reaparece automáticamente en cada entrada tras cerrarla.
5. **Dado** el inicio móvil, **cuando** busca recursos, presentaciones u otras herramientas, **entonces** puede acceder a ellas por el menú vigente o un apartado secundario del inicio, sin nuevos accesos duplicados ni acciones exclusivas de otros roles.

### Casos límite

- Nombre docente/materia largo, nombre docente vacío, grado no registrado y muchas materias: texto legible, identificación completa y saludo alternativo «Hola, docente».
- Carga, error, cero materias y búsqueda sin coincidencias: estados diferentes; reintentar o limpiar no crea ni modifica registros.
- Sesión vencida, cambio obligatorio de contraseña, cierre de sesión y cambio de cuenta: conservar el comportamiento de acceso vigente; no prolongar sesiones ni mostrar materias de otra cuenta.
- Falta de permiso para asistencia, evaluaciones o creación de materias: no ofrecer acciones denegadas ni sustituir autorización por una comprobación visual.
- iPhone o Android con instalación antigua, modo app o marcador que abre navegador: preservar identidad y dirección histórica, distinguir los modos de ejecución sin deducir sesión o rol a partir del dispositivo y conservar la landing pública normal.
- La sesión se valida en el contexto desde el que se abre la app; no se promete transferir automáticamente sesiones entre navegador y app instalada, ni se comparte una sesión con otra cuenta.
- Pantalla baja, orientación horizontal, teclado de búsqueda, texto ampliado y trabajo en segundo plano: permitir llegar a los controles finales; no añadir paneles fijos que tapen materias o acciones.
- Sin conectividad: no prometer funcionamiento sin conexión, resultados actualizados ni recuperación de fotos no enviadas; no cambiar los mecanismos de persistencia o autenticación en este alcance.
- Escritorio, estudiante y administrador: preservar navegación, permisos, funciones y acceso a herramientas; no imponerles la bienvenida docente.

## Requisitos

### Requisitos funcionales

- **FR-001**: La entrada de la app instalada DEBE dirigirse al espacio protegido y respetar sesión, rol y cambio obligatorio de contraseña, sin cambiar duraciones ni almacenar credenciales adicionales. [Historia 1, aceptación 1–3]
- **FR-002**: La actualización DEBE conservar la identidad de la app instalable y la landing pública; distinguir actualización del sitio de incorporación de la configuración por una instalación anterior. [Historia 1, aceptación 4–5]
- **FR-003**: El inicio docente móvil DEBE priorizar saludo breve, resumen de pendientes y materias; estadísticas, textos promocionales y preparación de recursos DEBEN quedar en un nivel secundario, no antes de las materias. [Historia 2, aceptación 1]
- **FR-004**: Cada materia presentada DEBE conservar su nombre completo consultable, identificar el grado cuando exista y ofrecer accesos autorizados a «Evaluaciones» y «Asistencia» con el contexto correcto. La lista DEBE permitir búsqueda y limpieza sin mutaciones. [Historia 2, aceptación 2–3]
- **FR-005**: Las materias y la bandeja DEBEN mostrar carga, vacío, error y reintento inequívocos; la indisponibilidad de recursos o bandeja NO DEBE impedir usar materias que sí se cargaron. [Historia 2, aceptación 4; Historia 3, aceptación 3]
- **FR-006**: Los pendientes DEBEN presentarse resumidos y el detalle abrirse voluntariamente; consultar un caso NO DEBE confirmar, cambiar, reintentar, calificar ni publicar por sí solo. [Historia 3, aceptación 1–2]
- **FR-007**: La ayuda del inicio docente DEBE ser breve, omisible y reabrible; después de omitirla no debe abrirse automáticamente en cada visita. Los controles de ayuda DEBEN ser explicativos, no simular acciones académicas. [Historia 3, aceptación 4]
- **FR-008**: Todos los accesos secundarios y permisos existentes DEBEN mantenerse; no añadir otra sección global «Calificar», barra fija inferior ni un sistema paralelo de navegación. Estudiante y administrador DEBEN conservar sus propios inicios. [Historias 1–3, aceptación de roles/permisos/herramientas]
- **FR-009**: Inicio, búsqueda, detalle voluntario y ayuda DEBEN ser legibles y operables en claro/oscuro, teclado y objetivos táctiles de al menos 44×44, sin desbordamiento o solapamiento que impida trabajar; conservar monitores de trabajos y su navegación. [Historias 2–3 y casos límite]
- **FR-010**: El cambio NO DEBE modificar notas, evidencias, asistencia, criterios, cuentas, permisos, trabajos, proveedores o contratos de datos. Las verificaciones DEBEN usar datos ficticios y distinguir pruebas automatizadas de una comprobación física en iPhone y Android. [Todas las historias]

### Entidades clave

- **Usuario autenticado**: identidad, nombre, rol y permisos vigentes; los datos de una cuenta no deben reutilizarse al cambiar a otra.
- **Materia existente**: identidad, nombre y grado opcional; sus accesos conservan la pertenencia y las autorizaciones actuales.
- **Resumen de atención docente**: cantidades de notas por revisar y solicitudes; cada caso mantiene su evaluación/calificación de origen y decisión docente.
- **Identidad de instalación y ayuda presentada**: conservan la continuidad del acceso instalado y la condición de primera visita; no contienen contraseñas ni evidencias de alumnos. No se crean entidades académicas.

## Criterios de éxito

- **SC-001**: En 360×800 y 390×844, tras la carga y con ayuda cerrada, tres materias ficticias con nombres de hasta 40 caracteres, sin avisos extraordinarios, las dos primeras tarjetas y sus acciones se ven completas sin scroll inicial.
- **SC-002**: Desde una materia visible en el inicio se llega a su asistencia o evaluaciones con un toque; se llega al listado de alumnos de una evaluación publicada con un máximo de dos toques de selección (materia/evaluación), sin pasar por un calificador global.
- **SC-003**: Abrir la app con sesión vigente no requiere volver a ingresar credenciales; sin sesión exige el acceso vigente y no muestra contenido protegido. Los tres roles y el cambio obligatorio de contraseña cumplen los destinos definidos.
- **SC-004**: En 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, ambos temas, no hay desbordamiento horizontal ni controles tapados; controles del inicio de al menos 44×44 y búsqueda/ayuda operables con teclado. Se cubren los recorridos de Android e iPhone, navegador y modo instalado; se distingue expresamente automatización de comprobación física y se registra cualquier dispositivo físico no disponible como pendiente, nunca como aprobado.
- **SC-005**: Con 30 materias ficticias, la búsqueda distingue coincidencias y cero resultados; con bandeja o recursos fallidos conserva acceso a materias cargadas, sin anunciar cantidades ficticias. Abrir, buscar, ayudar o consultar pendientes realiza cero mutaciones académicas y cero solicitudes nuevas a IA.
- **SC-006**: Omitir la ayuda permite trabajar inmediatamente; no reaparece al volver al inicio en el mismo contexto de visita, y el control «Cómo empezar» permite reabrirla. No hay apartados duplicados o funciones de profesor expuestas a otros roles.

## Supuestos

- iPhone y Android son objetivos obligatorios confirmados. Se trabaja sobre la app instalable que ya ofrece XCalificator desde el navegador, no sobre APK, app nativa iOS o publicación en una tienda.
- La bienvenida docente se simplifica también cuando se usa el sitio desde un navegador móvil, evitando mantener dos interfaces divergentes. Escritorio conserva las capacidades actuales.
- Se reutilizan identidad de usuario, materias, bandeja, recursos, navegación y ayuda existentes. No se añade historial de «última materia», notificaciones push ni persistencia académica local.
- La configuración incorporada por instalaciones anteriores depende del navegador; no se garantiza un cambio instantáneo de metadatos. Se conserva el arranque histórico y se resuelve la entrada instalada con el código del sitio, sin cambiar su identidad.
- No se añade funcionamiento sin conexión, un trabajador de caché nuevo, cambios de autenticación o migraciones. No se sustituye el proceso de calificación recién estabilizado.
- La especificación está aprobada con ampliación explícita a iPhone y Android. El usuario aprobó posteriormente el plan presentado con «apruebo». La revisión de checklist y las pruebas continúan obligatorias; no se autoriza fusión ni despliegue de #184.
