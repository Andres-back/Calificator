# Especificación: Importar estudiantes desde una lista fotografiada

**Rama**: `codex/061-importar-estudiantes-lista` | **Creada**: 2026-09-22 | **Estado**: Aprobada | **Issue**: #121

## Aclaraciones

### Sesión 2026-09-22

- La fotografía se interpretará con el proveedor visual OpenCode configurado para la función; la extracción solo propone nombres y no crea cuentas.
- Una cuenta estudiantil ya creada puede matricularse explícitamente en otras materias sin cambiar su correo ni contraseña.

## Escenarios de usuario y pruebas

### Historia 1 - Revisar una lista antes de matricular (Prioridad: P1)

Como docente titular de una materia, quiero fotografiar mi lista de asistencia y corregir los nombres detectados para matricular a mi grupo sin registrar a cada estudiante a mano.

**Razón de prioridad**: La lectura de una foto puede confundir nombres, encabezados y marcas de asistencia; crear cuentas directamente sería difícil de corregir.

**Prueba independiente**: Una lista legible de 30 nombres se convierte en una vista de revisión. Ninguna cuenta ni matrícula existe antes de confirmar las filas seleccionadas.

**Aceptación**:
1. **Dado** un docente titular y una foto legible, **cuando** solicita la lectura, **entonces** ve nombres propuestos, filas dudosas y controles para corregir, quitar o añadir nombres.
2. **Dado** un encabezado, fecha, casilla vacía o marca de asistencia, **cuando** se analiza la foto, **entonces** no se propone como estudiante.
3. **Dado** un nombre ilegible, **cuando** termina la lectura, **entonces** la fila queda para corrección humana y no se confirma automáticamente.
4. **Dado** un docente ajeno, un estudiante o una sesión vencida, **cuando** intenta consultar o confirmar el lote, **entonces** se rechaza sin revelar la foto ni los nombres.

### Historia 2 - Crear accesos y matrículas seguros (Prioridad: P1)

Como docente, quiero confirmar los nombres revisados y recibir un acceso temporal individual para cada alumno nuevo, ya matriculado en mi materia.

**Razón de prioridad**: Las listas disponibles contienen solo nombres, sin correos reales, y los alumnos necesitan poder iniciar sesión inmediatamente.

**Prueba independiente**: Al confirmar tres alumnos nuevos, aparecen exactamente tres cuentas estudiantiles y tres matrículas activas en la materia elegida. Cada acceso generado es único y su contraseña temporal se muestra una sola vez.

**Aceptación**:
1. **Dado** un lote corregido, **cuando** el docente confirma, **entonces** se crean únicamente las cuentas seleccionadas con identificadores de correo internos únicos y contraseñas temporales individuales.
2. **Dado** un alumno nuevo, **cuando** usa su acceso por primera vez, **entonces** debe cambiar su contraseña antes de utilizar las funciones estudiantiles.
3. **Dado** un alumno que perdió su clave provisional, **cuando** el docente titular restablece ese acceso, **entonces** recibe una nueva clave temporal individual y la anterior deja de servir.
4. **Dado** un error durante la confirmación, **cuando** el lote falla, **entonces** no quedan cuentas, matrículas ni credenciales parciales.

### Historia 3 - Resolver duplicados sin confundir personas (Prioridad: P2)

Como docente, quiero identificar alumnos ya matriculados y nombres repetidos para no duplicar cuentas ni vincular notas a un homónimo.

**Prueba independiente**: Reenviar el mismo lote confirmado no crea nuevas cuentas. Dos alumnos con el mismo nombre quedan señalados y requieren decisión explícita.

**Aceptación**:
1. **Dado** un alumno ya matriculado en la materia, **cuando** aparece en la lista, **entonces** se avisa y no se crea otra cuenta automáticamente.
2. **Dado** dos nombres iguales o parecidos, **cuando** se revisa el lote, **entonces** el docente debe decidir si son dos personas, una fila repetida o un alumno existente.
3. **Dado** una cuenta de otra materia que solo coincide por nombre, **cuando** se procesa la lista, **entonces** no se vincula automáticamente con ella.

### Historia 4 - Reutilizar alumnos en otras materias (Prioridad: P2)

Como docente, quiero seleccionar cuentas estudiantiles ya verificadas de mis otras materias para matricularlas sin generar nuevas credenciales.

**Prueba independiente**: Un alumno existente se añade a una segunda materia y conserva la misma cuenta, correo interno y contraseña.

**Aceptación**:
1. **Dado** un estudiante identificado en otra materia del docente, **cuando** se selecciona explícitamente para la materia actual, **entonces** se crea únicamente la nueva matrícula.
2. **Dado** un nombre parecido sin selección de cuenta, **cuando** se confirma el lote, **entonces** no se reutiliza esa identidad automáticamente.
3. **Dado** un alumno ya matriculado, **cuando** se intenta añadir de nuevo, **entonces** el sistema muestra su estado sin duplicar el vínculo.

### Casos límite

- Foto borrosa, girada o sin nombres: error recuperable; no se crean cuentas.
- Lote con filas sin corregir: no se confirma hasta resolverlas o excluirlas.
- Identificador de acceso ya existente: se genera otro sin sobrescribir cuentas.
- Reintento por doble clic o pérdida de conexión: no duplica alumnos ni matrículas.
- Dos nombres iguales pueden corresponder a personas distintas; la coincidencia textual nunca prueba identidad.
- Un acceso con correo generado sirve para entrar, pero no representa un buzón que reciba recuperación por correo.
- La foto de la lista puede incluir datos de menores: se limita su lectura a los responsables autorizados y se descarta al terminar la revisión o al cancelar.

## Requisitos

### Requisitos funcionales

- **FR-001**: La importación DEBE estar disponible desde estudiantes de la materia y desde llamar a lista, usando el mismo flujo.
- **FR-002**: Solo el docente titular de la materia o un administrador autorizado DEBE poder leer, revisar, confirmar y restablecer accesos del lote.
- **FR-003**: El sistema DEBE aceptar una foto de lista y procesarla en segundo plano con estado visible, sin bloquear la navegación.
- **FR-004**: La vista previa DEBE permitir corregir, añadir y excluir filas, y señalar lecturas inciertas y duplicados antes de cualquier alta.
- **FR-005**: Leer o cancelar una foto NO DEBE crear usuarios ni matrículas.
- **FR-006**: La confirmación DEBE crear exclusivamente cuentas de estudiante y matrículas activas en la materia autorizada.
- **FR-007**: Cada alumno nuevo sin correo real DEBE recibir un identificador de correo generado y único, señalado como acceso interno no entregable.
- **FR-008**: Cada alumno nuevo DEBE recibir una contraseña temporal individual; la contraseña en claro solo DEBE poder consultarse en la entrega inicial y nunca recuperarse posteriormente.
- **FR-009**: Al primer inicio con contraseña temporal, el alumno DEBE reemplazarla antes de acceder al resto de la aplicación.
- **FR-010**: El docente titular DEBE poder emitir una nueva contraseña temporal para un alumno de su materia; esto invalida la anterior y las sesiones previas.
- **FR-011**: El sistema NO DEBE vincular cuentas de materias distintas usando únicamente la similitud del nombre.
- **FR-012**: Los duplicados dentro de la materia y las filas ambiguas DEBEN quedar pendientes de resolución humana.
- **FR-013**: Confirmar o reintentar un mismo lote DEBE ser atómico e idempotente; nunca debe dejar altas o matrículas parciales.
- **FR-014**: Los identificadores, contraseñas y listas NO DEBEN aparecer en registros técnicos, eventos analíticos ni errores públicos.
- **FR-015**: El docente DEBE ver un resumen de creados, ya matriculados, excluidos y errores, y poder entregar las credenciales nuevas individualmente.
- **FR-016**: El flujo DEBE ser utilizable en teléfono y escritorio, en modo claro y oscuro, con estados de carga, éxito y recuperación visibles.
- **FR-017**: La foto original DEBE conservarse solo durante el tiempo necesario para reconocer y revisar el lote; cancelar o finalizar elimina la copia temporal.
- **FR-018**: La extracción DEBE usar la ruta visual OpenCode configurada para esta función y congelar la selección de proveedor/modelo al crear el trabajo.
- **FR-019**: El docente DEBE poder buscar y seleccionar cuentas estudiantiles de sus materias para matricularlas en otra materia propia sin regenerar credenciales.
- **FR-020**: Reutilizar una cuenta existente DEBE conservar su correo, contraseña, historial y rol; solo crea o reactiva la matrícula seleccionada.

### Entidades clave

- **Lote de importación**: materia, propietario, estado, filas propuestas y resolución, sin credenciales permanentes.
- **Fila de lista**: nombre detectado, corrección docente, incertidumbre y decisión de crear, omitir o asociar a un alumno verificado.
- **Cuenta estudiantil**: identidad con acceso interno único, contraseña temporal protegida y obligación de cambio inicial.
- **Matrícula**: vínculo activo y único entre cuenta estudiantil y materia.

## Criterios de éxito

- **SC-001**: Una docente puede revisar y confirmar una lista legible de 30 alumnos en menos de cinco minutos de interacción humana, sin transcribir los 30 nombres.
- **SC-002**: En las pruebas de importación, el 100 % de alumnos confirmados queda matriculado solo en la materia indicada y el 0 % de filas excluidas crea cuentas.
- **SC-003**: Repetir una confirmación o subir de nuevo la misma lista no crea cuentas ni matrículas duplicadas para los alumnos ya registrados en esa materia.
- **SC-004**: El 100 % de accesos temporales probados exige cambio de contraseña inicial y deja de aceptar la clave anterior tras el cambio o restablecimiento.
- **SC-005**: En una pantalla de 360 px, la docente puede revisar cada fila, resolver advertencias y consultar el resultado sin controles cortados.

## Supuestos

- La foto de asistencia contiene solo nombres; no se presume que incluya correo, documento o identificador escolar.
- El correo generado es un identificador de inicio de sesión, no un buzón real. La recuperación por correo no se ofrecerá para estas cuentas mientras no tengan un correo verificado.
- La docente confirma el reconocimiento antes de crear alumnos. La similitud de nombres entre materias no autoriza una unión automática de identidades.
- La creación de la cuenta concreta de Esby Ruth es una operación administrativa separada; se utilizará un acceso provisional único si no se proporciona un correo real.
