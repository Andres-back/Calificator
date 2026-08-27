# Especificación: landing pública, solicitudes docentes y mapas conceptuales

**Rama**: `codex/024-landing-publica-mapas`
**Fecha**: 2026-08-26
**Estado**: Aprobado por el usuario el 2026-08-26
**Issue**: [#35](https://github.com/Andres-back/Calificator/issues/35)

## Contexto

XCalificator necesita una entrada pública que explique el propósito del proyecto, su carácter de
código abierto y la búsqueda de docentes que quieran probarlo. El registro debe ser seguro: toda
cuenta nueva empieza con permisos de estudiante, incluso cuando solicita ser docente, y solo un
administrador puede aprobar el cambio. Además, los mapas conceptuales actuales se leen como una
lista de tarjetas y relaciones; deben convertirse en representaciones jerárquicas claras tanto en
la vista web como en los documentos descargables.

## Historias de usuario

### US1 — Conocer y comenzar a usar XCalificator (P1)

Como visitante quiero entender qué ofrece XCalificator, que es un proyecto de código abierto y
que busca docentes para pruebas, para decidir si inicio sesión o creo una cuenta.

**Prueba independiente**: una persona sin sesión abre `/`, comprende la propuesta y puede llegar a
`/login` o `/registro` con una sola acción.

**Criterios de aceptación**:

1. Dado un visitante, cuando abre la raíz, entonces ve una landing pública y no una redirección automática.
2. Dado un visitante, cuando elige ingresar, entonces llega a `/login`.
3. Dado un visitante, cuando elige participar, entonces llega a `/registro` y puede elegir estudiante o solicitar docencia.
4. Dado un dispositivo de 360 px o modo oscuro, cuando se recorre la landing, entonces no hay contenido cortado ni desplazamiento horizontal.

### US2 — Solicitar y administrar el rol docente (P1)

Como persona que se registra quiero solicitar ser docente sin recibir privilegios inmediatos; como
administrador quiero aprobar o rechazar la solicitud y gestionar roles de forma auditable.

**Prueba independiente**: registrar una solicitud docente crea una cuenta utilizable como
estudiante; la aprobación administrativa habilita el rol profesor y el rechazo conserva el rol estudiante.

**Criterios de aceptación**:

1. Dado un registro como estudiante, cuando finaliza, entonces la cuenta queda activa como estudiante sin solicitud pendiente.
2. Dado un registro con solicitud docente, cuando finaliza, entonces la cuenta queda activa como estudiante y la solicitud queda pendiente.
3. Dada una solicitud pendiente, cuando un administrador la aprueba, entonces el usuario pasa a profesor y la decisión queda registrada.
4. Dada una solicitud pendiente, cuando un administrador la rechaza, entonces el usuario conserva el rol estudiante y la solicitud queda rechazada.
5. Dado un usuario no administrador, cuando intenta decidir solicitudes o modificar roles, entonces el servidor rechaza la operación.
6. Dado un administrador, cuando abre la gestión de usuarios, entonces puede filtrar pendientes, ver roles y ejecutar decisiones con confirmación visible.

### US3 — Crear y comprender mapas conceptuales (P2)

Como docente quiero generar mapas conceptuales con jerarquía y conexiones legibles para usarlos en
clase, visualizarlos en pantalla y descargarlos sin convertirlos en una lista redundante.

**Prueba independiente**: generar un mapa produce un concepto central, nodos conectados en niveles
y relaciones verbales visibles en web y PDF.

**Criterios de aceptación**:

1. Dado un tema y grado, cuando se genera el mapa, entonces contiene entre 6 y 12 nodos únicos, hasta 3 niveles y ninguna relación hacia nodos inexistentes.
2. Dado un mapa generado, cuando se visualiza, entonces la jerarquía se reconoce mediante conectores, color y agrupación, sin depender solo de una lista textual.
3. Dado un mapa existente con el contrato anterior, cuando se abre, entonces continúa siendo legible.
4. Dado un mapa ancho en celular, cuando se visualiza, entonces ofrece una vista adaptada sin cortar nodos y mantiene una relación textual accesible.
5. Dado un mapa válido, cuando se descarga como PDF, entonces conserva el concepto central, niveles, conectores y etiquetas de relación con contraste legible.

## Casos límite

- Una solicitud docente repetida no crea duplicados ni concede permisos.
- Una decisión concurrente sobre la misma solicitud produce una sola transición terminal.
- Un administrador no puede degradarse accidentalmente a sí mismo desde la interfaz de gestión.
- Un mapa con salida incompleta del modelo se normaliza; si no alcanza un mínimo útil, se informa que debe regenerarse.
- Relaciones duplicadas, ciclos accidentales o referencias inválidas no rompen la vista ni el PDF.
- La landing permanece útil si una imagen de marca no carga y respeta movimiento reducido.

## Requisitos funcionales

- **FR-001**: La ruta `/` DEBE mostrar una landing pública con identidad de XCalificator, propuesta de valor, carácter de código abierto e invitación a docentes para probar el sistema.
- **FR-002**: La landing DEBE ofrecer acciones inequívocas para ingresar en `/login`, registrarse en `/registro` y consultar el repositorio público.
- **FR-003**: `/login` y `/registro` DEBEN ser rutas públicas separadas; una sesión válida solo obtiene permisos dentro de `/app`.
- **FR-004**: El registro DEBE permitir elegir entre cuenta de estudiante y solicitud de docencia.
- **FR-005**: Toda cuenta pública nueva DEBE persistirse inicialmente con rol estudiante; la selección docente solo crea una solicitud pendiente.
- **FR-006**: El backend DEBE impedir que el cliente establezca directamente los roles profesor o administrador.
- **FR-007**: El administrador DEBE poder listar usuarios, filtrar solicitudes pendientes, aprobarlas, rechazarlas y gestionar roles permitidos.
- **FR-008**: Aprobar una solicitud DEBE activar el rol profesor; rechazarla DEBE conservar el rol estudiante y ambas decisiones DEBEN registrar actor y fecha.
- **FR-009**: Las decisiones de solicitud DEBEN ser atómicas y rechazar transiciones repetidas o no autorizadas.
- **FR-010**: El usuario con solicitud pendiente o rechazada DEBE ver un estado comprensible en su espacio de estudiante.
- **FR-011**: El generador de mapas DEBE solicitar una estructura jerárquica acotada, conceptos breves, descripciones pedagógicas y relaciones expresadas con verbos o frases de enlace.
- **FR-012**: El servidor DEBE normalizar identificadores, niveles y relaciones del mapa, eliminar referencias inválidas y mantener compatibilidad con contenido ya guardado.
- **FR-013**: La vista web DEBE representar el mapa como diagrama conectado y ofrecer una descripción textual equivalente para accesibilidad.
- **FR-014**: El PDF DEBE representar visualmente la jerarquía y no reducir el mapa a tablas de nodos y listas de relaciones.
- **FR-015**: Landing, registro, administración y mapas DEBEN funcionar entre 360 px y escritorio, en modo claro y oscuro, con controles táctiles y foco visible.
- **FR-016**: Las pruebas se limitarán a contratos y componentes modificados, más tipos/lint/build aplicables; no se repetirá la batería completa durante cada ajuste.

## Entidades

- **Usuario**: identidad autenticada y rol efectivo; una cuenta pública nace como estudiante.
- **Solicitud docente**: estado pendiente, aprobada o rechazada; relaciona solicitante, administrador decisor y marcas de tiempo.
- **Mapa conceptual**: título, concepto central, descripción, nodos jerárquicos y relaciones etiquetadas.

## Criterios de éxito

- **SC-001**: Un visitante llega desde `/` a login o registro en una sola acción y entiende el carácter abierto y de prueba docente sin iniciar sesión.
- **SC-002**: Ningún registro público obtiene permisos docentes antes de una aprobación administrativa.
- **SC-003**: El administrador completa una decisión docente en menos de 30 segundos desde la bandeja de pendientes.
- **SC-004**: Un mapa válido muestra entre 6 y 12 conceptos, cero relaciones huérfanas y una jerarquía reconocible en web y PDF.
- **SC-005**: Las cuatro superficies nuevas o modificadas no presentan desplazamiento horizontal a 360 px ni texto ilegible en modo oscuro.
- **SC-006**: Los flujos existentes de login, acceso por rol y recursos distintos de mapa conceptual mantienen su comportamiento.

## Supuestos y límites

- Se reutilizan autenticación, branding y componentes actuales; no se añade inicio de sesión social.
- El repositorio público enlazado es `https://github.com/Andres-back/Calificator`.
- La solicitud docente no requiere documentos en esta fase; el administrador decide con nombre y correo.
- No se crea un editor gráfico de arrastrar y soltar; los mapas siguen siendo contenido editable como JSON mediante el editor de recursos existente.
- La mejora no cambia la calificación ni la entrega de actividades.
