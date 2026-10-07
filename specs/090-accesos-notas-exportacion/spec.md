# Especificación: exportación de accesos y notas

**Rama**: `codex/090-accesos-notas-exportacion` | **Creada**: 2026-10-07 | **Estado**: Solo exportaciones aprobado | **Issue**: #186

## Alcance vigente aprobado

El usuario aprobó «Solo exportaciones por ahora». Son exigibles Historia 2 y 3, FR-004 a FR-013 y SC-002 a SC-006. Historia 1 y 4, FR-001 a FR-003, FR-014 a FR-018 y SC-001, SC-007 a SC-009 quedan DIFERIDOS en issue #188, no criterios de cierre de este PR. Se mantiene renovación individual existente; no se añade renovación masiva. Verificador opcional: #187, fuera de alcance.

**Solicitud**: facilitar la entrega de accesos desde Estudiantes, acortar los usuarios creados desde listas, reutilizar cuentas entre materias propias o de distintos docentes mediante autorización y exportar el libro de notas de una materia para una o varias evaluaciones. No modificar registros anteriores ni el proceso de calificación.

## Aclaraciones

### Sesión 2026-10-07

- El usuario aclara que puede utilizarse cualquiera de los dos apellidos. Solicita conservar la exportación de accesos y añade exportar notas de una evaluación o varias dentro de una materia.
- El usuario solicitó un sufijo numérico de menos de tres cifras y el dominio `@xcalificator.com`. Se interpreta como apellido sin sufijo cuando esté libre o con un número de 1 a 99 cuando sea necesario.
- El usuario eligió el flujo mixto: el docente propietario o el administrador aprueban solicitudes de reutilización de listas entre materias; el administrador también puede matricular directamente desde interfaz.
- El usuario pide que la foto permita reutilizar cuentas existentes cuando coincidan nombre completo y grado. Las coincidencias únicas autorizadas se proponen por defecto; las de otro docente requieren autorización y las ambiguas requieren revisión. Un mismo alumno conserva su cuenta en materias de distintos profesores.
- El usuario confirmó continuar y recordó expresamente todos los cambios anteriores. El plan técnico y su aprobación continúan pendientes; este documento no certifica implementación.
- Ante la ausencia de botones en producción, el usuario pidió «continua terminalo». Se priorizan las exportaciones dentro de este cambio, sin declarar completado el modo de calificación separado de #187.

## Escenarios de usuario y pruebas

### Historia 1 - Crear estudiantes con accesos fáciles de escribir (Prioridad: P1)

El docente registra estudiantes desde una foto o una lista manual. Antes de confirmar puede revisar el nombre completo y el usuario corto propuesto; después recibe accesos individuales y puede reutilizar esos alumnos en otras materias.

**Razón de prioridad**: los accesos largos dificultan iniciar sesión desde celulares; acortarlos no debe confundir personas distintas ni alterar cuentas existentes.

**Prueba independiente**: registrar una lista ficticia con apellidos repetidos, nombres compuestos y un estudiante ya existente; comprobar usuarios cortos únicos, revisión y matrícula sin duplicar la cuenta existente.

**Aceptación**:

1. **Dada** una persona nueva con apellido reconocido y libre, **cuando** el docente revisa y confirma su registro, **entonces** se crea un usuario como `gallego@xcalificator.com`, con su nombre completo y contraseña temporal individual.
2. **Dadas** dos personas con el mismo apellido, **cuando** se registran, **entonces** sus usuarios son diferentes, usando otro apellido revisado o un sufijo de 1 a 99; nunca se fusionan por coincidir sus nombres.
3. **Dada** una lista con orden ambiguo de nombres/apellidos, **cuando** se revisa, **entonces** el docente puede corregir la base del usuario sin reescribir todo el listado; el sistema no presenta como seguro un apellido que no pudo identificar.
4. **Dado** un alumno ya registrado, **cuando** se asocia a otra materia, **entonces** conserva su usuario y contraseña, incluso si el usuario tiene el formato largo anterior.

### Historia 2 - Entregar accesos desde la materia (Prioridad: P1)

El profesor encuentra un botón permanente «Entregar accesos» en Estudiantes. Puede seleccionar algunos alumnos o «Todos», copiar los usuarios, descargar un archivo compatible con Excel y preparar fichas individuales para imprimir.

**Razón de prioridad**: cerrar la ventana de registro no debe ocultar cómo entregar accesos, ni provocar renovaciones de contraseñas involuntarias.

**Prueba independiente**: abrir Estudiantes después de cerrar el registro; exportar usuarios sin modificar claves. En otra prueba, renovar explícitamente claves temporales de cuentas internas seleccionadas y entregar las credenciales nuevas solo en esa sesión.

**Aceptación**:

1. **Dada** una materia con alumnos, **cuando** el docente abre «Entregar accesos», **entonces** puede seleccionar alumnos o «Todos» y ve el número y alcance de la selección antes de copiar, descargar o imprimir.
2. **Dadas** credenciales recién creadas o renovadas disponibles en la sesión, **cuando** las exporta, **entonces** el archivo y las fichas incluyen nombre, usuario y contraseña temporal individual para esos alumnos.
3. **Dadas** cuentas anteriores cuyas claves ya no están disponibles, **cuando** exporta sus accesos, **entonces** obtiene los usuarios, sin contraseñas inventadas ni supuestamente recuperadas; ve cómo obtener nuevas claves si lo necesita.
4. **Dadas** cuentas internas seleccionadas, **cuando** solicita renovar claves, **entonces** se requiere una confirmación independiente que explica que las claves anteriores dejarán de servir en todas las materias y se cerrarán las sesiones anteriores. Descargar, imprimir, copiar o cancelar no renueva ninguna clave.
5. **Dadas** cuentas con correo personal o sin permiso de gestión, **cuando** se consulta la entrega, **entonces** no se ofrece renovar sus claves mediante este mecanismo docente.

### Historia 3 - Exportar las notas de una o varias evaluaciones (Prioridad: P1)

Desde el libro de notas de la materia, el profesor selecciona una, varias o todas las evaluaciones disponibles y descarga una tabla compatible con Excel, con los alumnos en filas y la nota y estado de cada evaluación en columnas.

**Razón de prioridad**: permite trasladar las notas a los registros docentes sin copiarlas a mano y sin confundir resultados pendientes con notas definitivas.

**Prueba independiente**: exportar dos evaluaciones ficticias con una nota confirmada, una sugerencia pendiente, una entrega calificándose, un alumno sin nota y un cero confirmado; contrastar cada celda con el libro.

**Aceptación**:

1. **Dada** una evaluación seleccionada en el libro, **cuando** abre «Exportar notas», **entonces** esa evaluación queda seleccionada inicialmente; puede añadir otras o elegir «Todas» sin salir de la materia.
2. **Dadas** varias evaluaciones seleccionadas, **cuando** descarga, **entonces** el archivo contiene todos los alumnos matriculados, sus nombres y usuarios, y solamente las evaluaciones seleccionadas, identificadas por nombre y escala de nota.
3. **Dada** una nota confirmada o manual, **cuando** se exporta, **entonces** coincide con la decisión docente vigente. Las sugerencias sin confirmar no se exportan como notas definitivas; se indica «Por revisar». «Calificando» y «Sin calificación» dejan la nota vacía. Un cero confirmado sí se conserva como cero.
4. **Dado** un filtro de búsqueda o seguimiento en pantalla, **cuando** prepara la exportación, **entonces** se informa que el archivo contiene todos los alumnos de la materia y se muestra su cantidad; el filtro no omite alumnos silenciosamente.
5. **Dada** una consulta incompleta, fallida o una evaluación que dejó de estar disponible, **cuando** intenta exportar, **entonces** no recibe un archivo aparentemente completo; ve el problema y puede reintentar o corregir la selección.

### Historia 4 - Reutilizar el salón sin crear alumnos otra vez (Prioridad: P1)

El docente crea una materia y añade alumnos de una materia propia o solicita una lista a otro docente. El propietario o el administrador aprueban la solicitud. También puede fotografiar una lista y reutilizar las coincidencias autorizadas. Cada alumno mantiene una sola cuenta y accede a sus materias de profesores diferentes.

**Razón de prioridad**: compartir un salón no debe obligar a registrar de nuevo sus alumnos ni abrir información académica de otra materia.

**Prueba independiente**: dos docentes ficticios comparten alumnos de quinto mediante aprobación docente y administrativa; una foto reutiliza los ya autorizados, sin crear cuentas ni copiar notas. Un intento sin autorización no matricula ni expone usuarios ajenos.

**Aceptación**:

1. **Dadas** materias propias, **cuando** el profesor añade estudiantes existentes, **entonces** puede elegir la materia de origen, buscar, seleccionar algunos o «Todos» y matricularlos conservando su cuenta.
2. **Dada** una lista de otro docente identificada por invitación/código compartido, **cuando** se solicita reutilizarla, **entonces** queda pendiente hasta que su propietario o un administrador autorizado apruebe o rechace; no se muestran credenciales ni datos académicos de origen al solicitante.
3. **Dada** una solicitud pendiente, **cuando** el administrador la revisa, **entonces** puede aprobar o rechazar la incorporación y queda registro de actor, destino y alumnos autorizados. Aprobar no renueva claves ni copia registros académicos.
4. **Dado** un administrador autorizado, **cuando** elige alumnos existentes y una materia destino desde su panel, **entonces** puede matricular algunos o «Todos» directamente, con resumen y sin crear duplicados.
5. **Dada** una foto revisada con nombres completos y grado coincidentes con cuentas únicas autorizadas, **cuando** se prepara el alta, **entonces** se selecciona «Usar cuenta existente» por defecto. Se ignoran diferencias de tildes, mayúsculas y espacios, pero no se fusionan nombres incompletos, parecidos o con varios candidatos.
6. **Dadas** posibles coincidencias de otros docentes sin autorización, **cuando** se revisa la importación, **entonces** se indica que requieren aprobación y se prepara la solicitud; el administrador o propietario ve los candidatos y decide. La coincidencia no concede acceso ni crea una cuenta sustitutiva automáticamente.
7. **Dado** el mismo alumno matriculado en materias de distintos docentes, **cuando** inicia sesión, **entonces** ve sus materias con el mismo acceso; cada profesor solo gestiona registros académicos de las materias para las que tiene permiso.

### Casos límite

- Dos docentes crean cuentas simultáneamente con la misma base: no se entregan usuarios duplicados ni se confunden alumnos; la selección final identifica la cuenta efectivamente creada.
- Base y variantes 1–99 ocupadas: se solicita otro apellido/base revisado; no se añaden tres cifras ni una cadena larga como sustitución silenciosa.
- Nombres con tildes, apellidos compuestos, listas apellido-primero o un solo nombre: el nombre personal se conserva; la propuesta de acceso es revisable y la ambigüedad se resuelve antes del alta.
- Ningún alumno o evaluación seleccionados: las acciones están deshabilitadas con una explicación breve. Sin evaluaciones disponibles, el libro conserva su estado vacío.
- Renovación parcialmente fallida: identificar alumnos renovados y fallidos sin anunciar éxito completo ni renovar automáticamente otra vez al reintentar una descarga.
- Selección con cuentas personales: se entregan sus usuarios; se excluyen explícitamente de renovar claves temporales internas y se explica el motivo.
- Cierre de ventana, cambio de cuenta o cierre de sesión: las contraseñas disponibles dejan de mostrarse; no quedan en almacenamiento persistente del navegador ni en archivos públicos.
- Texto que una hoja de cálculo pudiera interpretar como fórmula se entrega como texto seguro; nombres, tildes, separadores y saltos de línea no desplazan columnas.
- Red lenta, pérdida de sesión o permisos revocados: no entregar archivos incompletos ni datos de otra materia; mostrar recuperación sin modificar registros.
- Móvil iPhone/Android: selección, descarga y copiar tienen resultado visible; un fallo del portapapeles o de impresión no altera credenciales ni notas.
- Grado ausente, cambiado o distinto del detectado en la foto: solicitar revisión del grado antes de proponer reutilización por coincidencia; el grado pertenece a la materia, no a una identidad permanente del alumno.
- Dos personas con igual nombre y grado: mantener pendientes, sin fusionarlas. Un nombre parecido o con errores de lectura nunca sustituye una identificación revisada.
- Solicitud rechazada, cancelada, ya aplicada o alumnos retirados de origen: impedir incorporación no autorizada; repetir una aprobación o matrícula no duplica alumnos.
- Compartir una lista no autoriza consultar notas, evidencias o asistencia de origen, ni concede acceso general a otros estudiantes o materias.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las cuentas estudiantiles internas nuevas DEBEN usar una base corta derivada de cualquiera de los apellidos revisados, sin tildes ni espacios, sufijo opcional 1–99 y dominio `@xcalificator.com`, conservando el nombre completo. Ejemplos: `mora@xcalificator.com`, `mora2@xcalificator.com`.
- **FR-002**: Los usuarios DEBEN ser únicos en todo el sistema, también entre creaciones simultáneas; la revisión DEBE permitir corregir la base propuesta y resolver agotamiento o ambigüedad antes de crear la cuenta afectada.
- **FR-003**: El nuevo formato DEBE aplicarse solo a nuevas cuentas internas creadas desde foto o registro manual. Asociar alumnos existentes a otra materia NO DEBE cambiar usuario, contraseña ni identidad.
- **FR-004**: Estudiantes DEBE ofrecer «Entregar accesos» de forma permanente al docente autorizado, con selección individual, «Todos», recuento, copiar, descarga compatible con Excel y fichas individuales imprimibles.
- **FR-005**: Exportar accesos DEBE incluir contraseñas únicamente cuando estén disponibles tras alta o renovación explícita en la sesión actual. No DEBE recuperar contraseñas anteriores, guardarlas en texto plano ni cambiarlas por descargar, copiar o imprimir.
- **FR-006**: La renovación de claves de alumnos internos seleccionados DEBE ser una acción separada con confirmación explícita de su efecto en todas las materias y sesiones; se excluyen cuentas personales y alumnos fuera del alcance de gestión. Un resultado parcial DEBE permitir identificar qué claves sí cambiaron.
- **FR-007**: El libro de notas DEBE ofrecer «Exportar notas» para una, varias o todas las evaluaciones no borrador disponibles de esa materia, con selección inicial coherente con la evaluación abierta y recuento visible de evaluaciones y alumnos.
- **FR-008**: La exportación de notas DEBE incluir todos los alumnos matriculados, independientemente del filtro de búsqueda/seguimiento, con nombre, usuario, nota, estado y escala por evaluación seleccionada. Solo las decisiones docentes vigentes ocupan la columna de nota definitiva; estados pendientes no equivalen a cero.
- **FR-009**: Las descargas DEBEN reflejar una carga completa y correcta del alcance elegido; no se habilitan ante datos incompletos, consultas fallidas o selecciones obsoletas. Exportar NO DEBE recalcular, confirmar ni publicar notas.
- **FR-010**: La entrega y exportación DEBEN respetar permisos y pertenencia a la materia; ningún estudiante ni docente sin autorización accede a notas o credenciales ajenas. Archivos de notas NO DEBEN contener contraseñas, fotos ni retroalimentación privada.
- **FR-011**: Los accesos internos DEBEN identificarse como usuarios de inicio de sesión, no buzones reales; no se enviarán recuperaciones a sus direcciones ficticias. La entrega advertirá que las credenciales son privadas y que se distribuyen individualmente.
- **FR-012**: Los archivos DEBEN abrirse con columnas y acentos correctos en Excel y herramientas compatibles, sin ejecutar como fórmulas textos controlados por usuarios. La interfaz DEBE funcionar desde iPhone, Android y escritorio, sin desbordamiento de página ni paneles que bloqueen controles.
- **FR-013**: El cambio DEBE conservar calificaciones, evidencias, matrículas, cuentas anteriores, cambio obligatorio de clave temporal y flujos existentes. No añadirá llamadas a IA para exportar ni cambios al razonamiento de calificación.
- **FR-014**: La selección de alumnos existentes DEBE poder filtrarse por materia propia o lista autorizada, conservando búsqueda y selección individual/«Todos». Reutilizar solo añade matrículas; nunca clona cuentas.
- **FR-015**: El docente DEBE poder solicitar una lista de otro docente mediante referencia compartida. El propietario o administrador autorizado DEBEN poder aprobar o rechazar; la autorización queda limitada a alumnos concretos y una materia destino, sin abrir un catálogo público de listas ajenas.
- **FR-016**: El administrador autorizado DEBE poder matricular estudiantes existentes directamente desde interfaz y gestionar solicitudes pendientes. Toda decisión DEBE registrar solicitante, aprobador, origen, destino, alumnos y estado.
- **FR-017**: La importación desde foto/manual DEBE proponer reutilizar una cuenta única cuando coincidan nombre completo normalizado y grado revisado dentro del alcance autorizado. Si requiere permiso, permanece pendiente; si es ambigua, requiere identificación humana. No se crea una cuenta nueva automáticamente para resolver esa incertidumbre.
- **FR-018**: Una matrícula nueva DEBE conservar usuario, contraseña e identidad del alumno, con separación de notas, evidencias y asistencia por materia. Las comprobaciones de autorización DEBEN aplicarse también al confirmar y no solo al mostrar opciones.

### Entidades clave

- **Cuenta estudiantil interna**: identidad global, nombre, usuario único y contraseña temporal individual; puede pertenecer a varias materias y no corresponde a un buzón real.
- **Entrega de accesos**: selección de alumnos autorizados y credenciales recién emitidas disponibles solo durante la sesión de entrega; no es un repositorio de contraseñas recuperables.
- **Selección de exportación de notas**: materia, evaluaciones disponibles elegidas y conjunto completo de alumnos matriculados; no modifica la decisión docente.
- **Resultado por evaluación**: nota vigente, escala y estado diferenciado de decisión docente, por revisar, calificando o sin calificación.
- **Solicitud de reutilización**: referencia de origen, docente solicitante, materia destino, alumnos autorizados, decisión del propietario/administrador y estado pendiente, aprobada, rechazada, cancelada o aplicada; no incluye contraseñas.

## Criterios de éxito

- **SC-001**: En las pruebas con apellidos repetidos y altas simultáneas, el 100% de las cuentas nuevas entregadas tienen usuarios únicos con el formato aprobado, sin sufijos de tres cifras; las cuentas ya existentes permanecen idénticas.
- **SC-002**: Desde Estudiantes se accede a la selección de entrega con un toque y se puede entregar a «Todos» sin seleccionar a cada alumno; copiar/descargar/imprimir no modifica ninguna contraseña ni matrícula.
- **SC-003**: Desde el libro se prepara una exportación de una o varias evaluaciones sin abandonar la materia; el archivo incluye exactamente las evaluaciones elegidas y todos los alumnos indicados por el recuento.
- **SC-004**: Para cada resultado del conjunto de prueba, nota definitiva, escala y estado coinciden con el libro; hay cero pendientes convertidos en cero o sugerencias exportadas como definitivas.
- **SC-005**: Las pruebas de permisos rechazan el 100% de los intentos fuera del alcance del actor; las exportaciones de notas contienen cero contraseñas y las descargas pasivas producen cero escrituras de notas o claves.
- **SC-006**: Los recorridos de selección, copiar y descarga se verifican a 360×800 y 390×844 en motores representativos de Android/iPhone y a 1280×800, sin desbordamiento horizontal de la página ni controles inaccesibles. La impresión individual conserva un formato legible en la vista de impresión; las comprobaciones físicas pendientes se declaran por separado.
- **SC-007**: En las pruebas con dos docentes y aprobación docente/administrativa, cada alumno conserva exactamente una cuenta y las matrículas esperadas; cero contraseñas cambiadas y cero registros académicos copiados.
- **SC-008**: El 100% de las coincidencias únicas autorizadas de nombre/grado se proponen para reutilizar; todos los casos ambiguos o sin permiso permanecen revisables/pendientes, sin alta o vinculación automática incorrecta.
- **SC-009**: Repetir confirmaciones, decisiones o matrículas no crea duplicados; los intentos de reutilizar listas sin permiso son rechazados y no muestran usuarios, claves ni registros ajenos al solicitante.

## Supuestos

- Primera entrega: CSV compatible con Excel, además de copiar e imprimir accesos; no se requiere formato nativo XLSX ni integración con Google Sheets. El nombre del archivo identifica la materia y, para notas, el alcance de evaluaciones.
- La base de usuario es revisable; no se exige escribir apellidos separados para cada alumno ni se considera fiable deducir siempre el apellido de la última palabra.
- «Todos» en entrega refiere al conjunto completo mostrado en el selector de esa materia, con recuento explícito; renovar requiere además limitarse a cuentas internas autorizadas.
- Exportar claves anteriores es imposible: se entregan usuarios o se renuevan explícitamente claves temporales. La aprobación del alcance no autoriza ejecutar renovaciones masivas en producción como prueba.
- Se reutilizan las reglas actuales de permisos, matrícula, estados de notas y contraseñas temporales; no se modifica la inscripción pública ni se renombra masivamente a alumnos existentes.
- El primer flujo compartido reutiliza matrículas actuales y referencias explícitas de listas; no incorpora todavía instituciones, salones centrales o cursos lectivos nuevos. Coincidencia de grado/nombre no sustituye autorización ni garantiza identidad entre personas homónimas.
- Una aprobación autoriza un conjunto revisado de alumnos para una materia destino; no incorpora automáticamente futuros alumnos de origen ni copia bajas entre materias. Los alumnos ya añadidos no se eliminan al cerrar la solicitud.
- Fuera de alcance: promedio oficial nuevo, boletines institucionales, exportación de notas entre materias, envío masivo de correos, cambios del modelo evaluador y despliegue antes de plan aprobado y CI verde.
