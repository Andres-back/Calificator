# Especificación: base legal, privacidad y aceptación versionada

**Rama**: `codex/067-privacidad-legal`  
**Creada**: 2026-09-24  
**Estado**: Especificación y plan aprobados por el usuario  
**Issue**: [#139](https://github.com/Andres-back/Calificator/issues/139)

## Contexto

El primer piloto en aula confirmó que XCalificator trata información académica, evidencias manuscritas y datos de docentes y estudiantes, incluidos menores de edad. La plataforma no tiene actualmente documentos legales públicos ni conserva una aceptación versionada durante el registro. Esta entrega crea una base transparente y auditable sin modificar usuarios, notas, entregas o evidencias existentes.

Esta base no sustituye la revisión de un abogado, la designación contractual entre la institución y los investigadores, ni la autorización del representante legal y el asentimiento del menor cuando correspondan.

## Historias de usuario

### US1 — Conocer el tratamiento antes de registrarse (P1)

Como visitante, docente, estudiante o representante legal, quiero consultar términos, privacidad, cookies y un aviso resumido antes de entregar datos.

**Prueba independiente**: abrir cada documento sin iniciar sesión desde celular y escritorio y navegar entre ellos mediante enlaces visibles.

**Aceptación**:

1. Dado un visitante no autenticado, cuando abre cualquier documento legal, entonces recibe contenido en español, legible, fechado y versionado.
2. Dado un titular, cuando consulta privacidad, entonces conoce responsable, finalidades, categorías, IA/proveedores, derechos, canal de atención, menores, conservación y seguridad.
3. Dado un visitante, cuando consulta cookies, entonces distingue cookies necesarias, almacenamiento local y medición sin cookies.

### US2 — Registrar aceptación sin alterar cuentas anteriores (P1)

Como nuevo usuario público, quiero aceptar conscientemente los términos y la política de privacidad antes de crear mi cuenta.

**Prueba independiente**: intentar registrarse sin aceptar y comprobar que no se crea cuenta; aceptar ambos documentos y comprobar la creación y la constancia versionada.

**Aceptación**:

1. Dado un registro nuevo sin aceptación completa, cuando se envía, entonces cliente y servidor lo rechazan sin crear datos parciales.
2. Dado un registro nuevo con aceptación completa, cuando se crea la cuenta, entonces se guardan fecha, versión y origen en la misma transacción.
3. Dada una cuenta histórica o creada administrativamente, cuando se despliega el cambio, entonces continúa funcionando y no recibe una aceptación inventada.

### US3 — Diferenciar servicio, IA e investigación (P1)

Como docente, estudiante o acudiente, quiero entender que la IA asiste, el docente decide y participar en la tesis exige una autorización distinta.

**Prueba independiente**: localizar estas tres reglas en los documentos públicos y comprobar que el registro no afirma autorizar automáticamente el estudio.

**Aceptación**:

1. La política explica que evidencia o texto puede enviarse al proveedor de IA configurado y que puede existir circulación internacional.
2. Los términos explican que una salida de IA no es una decisión definitiva y requiere revisión docente.
3. La información del piloto declara que una cuenta no equivale a consentir investigación y que la participación es voluntaria.

### US4 — Acceso permanente a los documentos (P2)

Como usuario autenticado, quiero volver a consultar los documentos sin cerrar sesión.

**Prueba independiente**: acceder a los enlaces desde la portada, autenticación y aplicación protegida a 360 px y escritorio.

## Casos límite

- JavaScript deshabilitado: los documentos están dentro de la aplicación web y requieren su carga normal, pero no autenticación.
- Cambio futuro de versión: la versión aceptada se conserva; una nueva aceptación requiere un flujo posterior y no puede sobrescribir silenciosamente la anterior.
- Cuenta importada por docente: no se fabrica aceptación; la institución debe conservar la autorización aplicable.
- Menor que intenta registrarse directamente: la interfaz indica que debe contar con autorización verificable de su representante o institución y que el registro no sustituye ese soporte.
- Proveedor de IA personal del docente: las obligaciones de tratamiento no desaparecen; el docente solo puede usarlo dentro de las autorizaciones aplicables.
- Cloudflare Web Analytics: se informa como medición de rendimiento sin cookies ni almacenamiento local; cualquier analítica futura no necesaria exige revisión y consentimiento previo cuando aplique.

## Requisitos funcionales

- **FR-001**: DEBEN existir páginas públicas y versionadas de Términos de uso, Política de tratamiento de datos y privacidad, Política de cookies, Aviso de privacidad e Información del piloto.
- **FR-002**: Los documentos DEBEN identificar a XCalificator como proyecto de investigación desarrollado por Samir Andrés Ardila Cabrera y Daniel Felipe Mora Rosas, con domicilio en Mocoa, Putumayo, y canal `toolscoldev@gmail.com`, sin publicar identificaciones ni teléfonos personales.
- **FR-003**: La política DEBE describir categorías, finalidades, derechos, procedimientos, seguridad, conservación, encargados/proveedores, circulación internacional, IA, menores y cambios de política.
- **FR-004**: Los términos DEBEN declarar límites del servicio, responsabilidad del usuario, revisión humana de calificaciones, contenido permitido, propiedad intelectual, disponibilidad, suspensión y legislación colombiana.
- **FR-005**: La política de cookies DEBE inventariar las cookies de acceso, actualización y CSRF, sus duraciones, el almacenamiento local funcional y Cloudflare Web Analytics sin cookies.
- **FR-006**: El aviso DEBE resumir responsable, tratamiento, finalidades, derechos y enlace a la política completa.
- **FR-007**: La información del piloto DEBE separar el uso de la plataforma del consentimiento investigativo y recordar autorizaciones reforzadas para menores.
- **FR-008**: El registro público DEBE exigir aceptación separada y explícita de términos y privacidad; las casillas no pueden aparecer premarcadas.
- **FR-009**: El servidor DEBE rechazar registros sin ambas aceptaciones, aunque el cliente sea manipulado.
- **FR-010**: Una aceptación válida DEBE conservar usuario, tipo de documento, versión, fecha y origen de manera atómica con la cuenta.
- **FR-011**: Las aceptaciones históricas NO DEBEN sobrescribirse; no se crearán aceptaciones retroactivas para cuentas existentes.
- **FR-012**: Los enlaces legales DEBEN estar disponibles en superficies públicas y autenticadas, ser navegables por teclado y funcionar desde 360 px.
- **FR-013**: Las páginas legales NO DEBEN contener datos de estudiantes, secretos, identificadores internos ni afirmaciones no respaldadas sobre proveedores.
- **FR-014**: El despliegue NO DEBE modificar notas, entregas, evidencias, matrículas ni permisos existentes.

## Entidades

- **Documento legal**: tipo, versión vigente, fecha de vigencia, contenido y ruta pública.
- **Aceptación legal**: usuario, documento, versión, fecha y origen. Es inmutable por versión.
- **Responsable del tratamiento**: proyecto XCalificator y sus investigadores responsables; la relación específica con cada institución se formaliza fuera de este cambio.

## Criterios de éxito

- **SC-001**: Las cinco páginas responden sin autenticación y no producen desbordamiento horizontal a 360 px.
- **SC-002**: El 100 % de registros públicos nuevos sin ambas aceptaciones es rechazado antes de crear la cuenta.
- **SC-003**: El 100 % de registros públicos válidos conserva dos constancias versionadas en la misma transacción.
- **SC-004**: Cero usuarios históricos reciben una aceptación retroactiva o cambian de estado, rol o acceso.
- **SC-005**: Los documentos permiten localizar en menos de dos minutos responsable, canal, derechos, menores, IA y participación investigativa.
- **SC-006**: TypeScript, lint, pruebas frontend/backend, migración, E2E aplicable, gobernanza y builds permanecen verdes.

## Supuestos y límites

- La información de responsable se deriva de la propuesta de tesis y del canal de soporte ya suministrado; antes de producción debe ser revisada por ambos investigadores y la institución piloto.
- La dirección publicada será Mocoa, Putumayo, Colombia; una dirección de notificación más específica y teléfono institucional requieren decisión de los responsables.
- No se usan cookies publicitarias. Cloudflare Web Analytics se declara conforme a su operación actual sin cookies ni `localStorage`.
- La conservación exacta por categoría y los contratos de transmisión con proveedores/institución requieren política operativa institucional; el documento no prometerá plazos que el sistema todavía no garantiza.
- Esta entrega es una base de transparencia y consentimiento de servicio, no asesoría jurídica ni cierre automático del cumplimiento colombiano.
