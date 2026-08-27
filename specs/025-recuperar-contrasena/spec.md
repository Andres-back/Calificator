# Especificación de funcionalidad: Recuperación segura de contraseña

**Rama**: `codex/025-recuperar-contrasena`

**Creada**: 2026-08-27

**Estado**: Aprobada

**Aprobación humana**: 2026-08-27

**Entrada**: Permitir que estudiantes, docentes y administradores recuperen el acceso cuando olvidan su contraseña, sin comprometer cuentas ni datos educativos.

## Aclaraciones

### Sesión 2026-08-27

- P: ¿Cómo se enviarán inicialmente los enlaces de recuperación? → R: SMTP configurable, compatible inicialmente con una cuenta de Google y sin acoplar el producto exclusivamente a Gmail.
- P: ¿Quién administrará el remitente y cómo se podrá rotar su credencial? → R: Solo el administrador podrá configurar el correo SMTP global y reemplazar su contraseña de aplicación; el valor se almacenará cifrado y nunca volverá a mostrarse.

## Escenarios de usuario y pruebas

### Historia de usuario 1 - Solicitar recuperación sin revelar cuentas (Prioridad: P1)

Como usuario que olvidó su contraseña, quiero solicitar un enlace de recuperación desde el inicio de sesión para recuperar mi cuenta sin depender de soporte.

**Por qué esta prioridad**: Es el valor principal del flujo y evita que una persona externa pueda averiguar qué correos están registrados.

**Prueba independiente**: Se puede solicitar recuperación con un correo existente y uno inexistente; ambos reciben la misma confirmación visible y solo la cuenta válida genera una recuperación utilizable.

**Escenarios de aceptación**:

1. **Dado** un correo asociado a una cuenta activa, **cuando** se solicita recuperar la contraseña, **entonces** la interfaz confirma que se enviarán instrucciones si la cuenta existe.
2. **Dado** un correo inexistente, inactivo o escrito con distinta capitalización, **cuando** se solicita recuperación, **entonces** se muestra la misma respuesta neutral sin revelar el estado de la cuenta.
3. **Dado** un usuario que repite solicitudes rápidamente, **cuando** supera el límite permitido, **entonces** recibe una respuesta neutral y el sistema evita generar o enviar solicitudes adicionales durante el periodo de protección.

---

### Historia de usuario 2 - Definir una contraseña nueva (Prioridad: P1)

Como usuario que recibió un enlace válido, quiero establecer una contraseña nueva y volver a iniciar sesión con seguridad.

**Por qué esta prioridad**: Completa la recuperación y debe impedir reutilización, robo o permanencia de sesiones anteriores.

**Prueba independiente**: Con un enlace válido se cambia la contraseña una vez; el enlace deja de servir, la contraseña anterior deja de autenticar y las sesiones previas quedan invalidadas.

**Escenarios de aceptación**:

1. **Dado** un enlace válido y vigente, **cuando** el usuario introduce y confirma una contraseña que cumple la política, **entonces** el cambio se guarda, el enlace queda consumido y se ofrece volver al inicio de sesión.
2. **Dado** un enlace vencido, ya usado, alterado o perteneciente a una cuenta inactiva, **cuando** se intenta restablecer la contraseña, **entonces** no se modifica la cuenta y se ofrece solicitar un enlace nuevo.
3. **Dado** un restablecimiento exitoso, **cuando** se intenta usar la contraseña anterior o una sesión emitida previamente, **entonces** el acceso se rechaza y solo la contraseña nueva permite iniciar sesión.

---

### Historia de usuario 3 - Operación y trazabilidad segura (Prioridad: P2)

Como administrador, quiero que los intentos y resultados de recuperación sean auditables sin exponer contraseñas ni enlaces para diagnosticar abusos y problemas de entrega.

**Por qué esta prioridad**: Permite operar el servicio y responder a incidentes sin convertir los registros en una fuente de credenciales.

**Prueba independiente**: Un administrador puede identificar solicitudes, limitaciones, envíos y consumos por fecha y resultado, pero ningún registro o respuesta permite reconstruir el token o la contraseña.

**Escenarios de aceptación**:

1. **Dado** cualquier solicitud o intento de consumo, **cuando** se registra el evento, **entonces** conserva fecha, resultado y contexto mínimo permitido sin contraseña, token completo ni contenido sensible.
2. **Dado** un fallo temporal del mecanismo de entrega, **cuando** una cuenta válida solicita recuperación, **entonces** el usuario mantiene una respuesta segura y el fallo queda observable para operación sin crear enlaces ilimitados.
3. **Dado** un administrador autenticado, **cuando** configura el remitente SMTP o reemplaza su credencial, **entonces** puede verificar la conexión sin recibir de vuelta el secreto almacenado y ningún otro rol puede consultar ni modificar esa configuración.

### Casos límite

- Dos solicitudes válidas consecutivas para la misma cuenta invalidan los enlaces anteriores; solo el más reciente puede utilizarse.
- Solicitudes simultáneas no crean más de un enlace vigente por cuenta.
- El correo se normaliza antes de buscar la cuenta, pero nunca se devuelve información que confirme su existencia.
- Una cuenta inactiva, bloqueada o eliminada no puede recuperar acceso mediante este flujo.
- Un cambio administrativo de contraseña o estado invalida cualquier recuperación pendiente.
- El usuario que abre un enlace en otro dispositivo puede completar el flujo sin depender de una sesión autenticada previa.
- Los errores de conectividad conservan el formulario y permiten reintentar sin duplicar el cambio de contraseña.

## Requisitos

### Requisitos funcionales

- **FR-001**: El inicio de sesión DEBE ofrecer un acceso visible a “Olvidé mi contraseña”.
- **FR-002**: Cualquier visitante DEBE poder solicitar recuperación indicando un correo con formato válido.
- **FR-003**: La respuesta a la solicitud DEBE ser indistinguible para correos existentes, inexistentes, inactivos o bloqueados.
- **FR-004**: El sistema DEBE limitar solicitudes repetidas por cuenta y origen, manteniendo una respuesta neutral ante el límite.
- **FR-005**: Para una cuenta activa, el sistema DEBE generar un secreto aleatorio de un solo uso, almacenar únicamente una representación no reversible y asociarlo a un vencimiento de 30 minutos.
- **FR-006**: Una nueva solicitud válida DEBE invalidar cualquier enlace de recuperación previo pendiente para la misma cuenta.
- **FR-007**: El enlace DEBE enviarse mediante SMTP configurable, compatible inicialmente con una cuenta de Google y sustituible por otro servicio SMTP sin cambiar el flujo de recuperación.
- **FR-008**: El formulario de restablecimiento DEBE validar el enlace antes de aceptar una contraseña nueva y nunca debe mostrar el secreto en registros, analítica o mensajes de error.
- **FR-009**: La nueva contraseña DEBE cumplir la misma política utilizada por el registro y requerir confirmación coincidente.
- **FR-010**: Un restablecimiento exitoso DEBE consumir el enlace de forma atómica, actualizar la contraseña e invalidar todas las sesiones y recuperaciones anteriores de la cuenta.
- **FR-011**: Los enlaces vencidos, usados, alterados o asociados a cuentas no activas DEBEN ser rechazados con un mensaje comprensible y una acción para solicitar otro.
- **FR-012**: Las solicitudes y consumos DEBEN ser idempotentes frente a reintentos de red y seguros ante concurrencia.
- **FR-013**: El sistema DEBE registrar eventos operativos de solicitud, límite, entrega, fallo y consumo sin guardar contraseñas, secretos completos ni información que permita enumerar usuarios.
- **FR-014**: El flujo DEBE estar disponible para estudiantes, docentes y administradores sin cambiar el rol, estado ni demás datos de la cuenta.
- **FR-015**: Las vistas DEBEN funcionar desde 360 px hasta escritorio, en modo claro y oscuro, con campos etiquetados, foco visible, objetivos táctiles y estados de carga, éxito y error comprensibles.
- **FR-016**: La entrega del enlace NO DEBE bloquear la respuesta web; los fallos temporales deben poder observarse y reintentarse sin generar múltiples enlaces vigentes.
- **FR-017**: La aplicación NO DEBE almacenar contraseñas, secretos de recuperación ni credenciales del proveedor de correo en texto claro dentro de datos persistentes, logs, analítica o código versionado.
- **FR-018**: La interfaz administrativa DEBE permitir conocer el estado operativo agregado de las recuperaciones sin mostrar enlaces ni confirmar correos concretos a actores no autorizados.
- **FR-019**: Solo un administrador autenticado DEBE poder configurar el host, puerto, modo TLS, correo remitente y una nueva credencial SMTP global; profesores y estudiantes NO DEBEN acceder a esta configuración.
- **FR-020**: La credencial SMTP configurada desde Administración DEBE cifrarse antes de persistir, sustituir atómicamente la anterior y responder únicamente con un indicador de presencia; ningún endpoint DEBE devolverla en texto claro.
- **FR-021**: La Administración DEBE permitir probar la configuración enviando un mensaje al propio remitente, mostrando un resultado comprensible y registrando únicamente metadatos no sensibles.

### Entidades clave

- **Solicitud de recuperación**: Representa un enlace emitido para una cuenta; conserva propietario, representación no reversible del secreto, creación, vencimiento, consumo, invalidación y estado de entrega.
- **Usuario**: Cuenta existente que conserva rol y estado; el cambio de contraseña invalida sesiones y solicitudes anteriores sin modificar sus permisos.
- **Evento de recuperación**: Registro mínimo de solicitud, límite, entrega, fallo o consumo para diagnóstico y seguridad, sin credenciales recuperables.
- **Configuración SMTP global**: Conserva host, puerto, TLS, remitente, credencial cifrada, estado de configuración y fecha de actualización; solo el administrador puede modificarla y las respuestas nunca incluyen la credencial.

## Criterios de éxito

### Resultados medibles

- **SC-001**: Un usuario completa la solicitud de recuperación en menos de 60 segundos desde el inicio de sesión.
- **SC-002**: Un usuario con enlace válido establece una contraseña nueva en menos de 2 minutos y puede iniciar sesión inmediatamente.
- **SC-003**: El 100 % de enlaces usados, vencidos, invalidados o alterados son rechazados sin modificar la cuenta.
- **SC-004**: El 100 % de respuestas públicas de solicitud ocultan si el correo pertenece a una cuenta.
- **SC-005**: Ninguna contraseña, secreto completo o credencial de entrega aparece en respuestas, registros, analítica ni artefactos de prueba.
- **SC-006**: El flujo crítico es utilizable sin desbordamiento horizontal en 360×800, 390×844 y escritorio, tanto en modo claro como oscuro.
- **SC-007**: Cinco solicitudes concurrentes para una cuenta producen como máximo un enlace vigente y un restablecimiento efectivo.
- **SC-008**: Un fallo del servicio de entrega deja una señal operativa visible y recuperable sin bloquear el resto de la aplicación.

## Supuestos

- Se reutilizan las cuentas, política de contraseñas y autenticación actuales.
- El correo registrado es el canal primario de recuperación; no se incorporan SMS, preguntas secretas ni recuperación social.
- Los usuarios no necesitan estar autenticados para solicitar o consumir una recuperación.
- El enlace público usa el dominio configurado de XCalificator y nunca una dirección proporcionada por el visitante.
- No se cambia el rol ni se reactiva una cuenta durante la recuperación.
- El alcance inicial no incluye cambio de correo ni autenticación multifactor.
- La entrega real depende de una cuenta de Google con autenticación SMTP permitida y credenciales de aplicación almacenadas exclusivamente como secretos de producción; otros servicios SMTP podrán sustituirla sin cambiar el comportamiento público.
