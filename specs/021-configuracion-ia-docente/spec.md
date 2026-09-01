# Especificación: Configuración de IA global y por docente

**Rama original**: codex/021-configuracion-ia-docente | **Creada**: 2026-08-24 | **Estado**: Ampliación Ollama especificada y plan aprobado | **Issues**: #29, #60

## Clarifications

### Session 2026-08-30

- Q: ¿Ollama local corresponde al servidor o al computador del profesor? → A: El VPS utilizará Ollama Cloud; el docente podrá elegir Ollama Cloud con su propia clave o un conector para el Ollama local de su computador.

### Session 2026-08-31

- Q: ¿Qué datos puede procesar la primera versión del conector local? → A: Por decisión delegada y minimización de datos, únicamente prompts de Presentaciones; fotos, PDF, entregas, respuestas, digitalización y calificación permanecen en proveedores Cloud autorizados.
- Q: ¿Cómo se distribuye el conector Windows? → A: Las compilaciones locales sin firma son solo de validación y requieren una bandera explícita; todo artefacto distribuible debe tener una firma de código válida y SHA-256 verificable.
- Q: ¿Qué sistemas operativos debe soportar la primera versión del conector local? → A: Windows inicialmente; macOS y Linux quedan como ampliaciones posteriores.

## Escenarios de usuario y pruebas

### Historia 1 - Administrar modelos por capacidad (Prioridad: P1)

Como administrador quiero elegir el proveedor y modelo principal y alternativo de cada capacidad de IA para controlar precisión, disponibilidad y costo sin modificar código ni exponer credenciales.

**Razón de prioridad**: La configuración institucional es la base segura que mantiene operativa la plataforma cuando un docente no aporta credenciales propias.

**Prueba independiente**: Un administrador configura modelos distintos para digitalización y generación de contenido, prueba la conexión, publica el cambio y comprueba que cada trabajo nuevo usa la ruta correspondiente mientras los trabajos ya iniciados conservan su configuración original.

**Aceptación**:
1. **Dado** un administrador autenticado, **cuando** consulta la configuración de IA, **entonces** puede ver cada capacidad con su proveedor, modelo principal, alternativa y estado sin ver secretos completos.
2. **Dado** un modelo incompatible con una capacidad, **cuando** el administrador intenta seleccionarlo, **entonces** el sistema impide publicar la configuración y explica la incompatibilidad.
3. **Dado** un cambio válido, **cuando** el administrador lo publica, **entonces** solo los trabajos creados después del cambio utilizan la nueva configuración.

### Historia 2 - Usar una API propia como docente (Prioridad: P1)

Como docente quiero conectar opcionalmente mi propia cuenta de un proveedor autorizado para que mis generaciones, digitalizaciones y calificaciones utilicen mi credencial y mis modelos preferidos sin afectar a otros usuarios.

**Razón de prioridad**: Permite autonomía y control de consumo al docente sin eliminar el servicio institucional ni debilitar la separación de roles.

**Prueba independiente**: Un docente conecta una credencial válida, selecciona un modelo compatible y ejecuta un trabajo; el registro identifica su configuración personal sin revelar la clave y otro docente continúa usando la configuración global.

**Aceptación**:
1. **Dado** un docente sin configuración personal, **cuando** inicia una operación de IA, **entonces** se usa la configuración global autorizada por el administrador.
2. **Dado** un docente con una configuración personal válida y activa, **cuando** inicia una operación compatible, **entonces** se utiliza primero su proveedor y modelo personales únicamente para su trabajo.
3. **Dado** un proveedor personal no autorizado o un modelo incompatible, **cuando** el docente intenta guardarlo, **entonces** el sistema rechaza la selección con una explicación comprensible.
4. **Dado** que el docente elimina su credencial, **cuando** inicia un trabajo posterior, **entonces** vuelve a utilizar la configuración institucional sin afectar trabajos anteriores.

### Historia 3 - Configuración sencilla con control avanzado (Prioridad: P2)

Como docente quiero conectar mi proveedor mediante un asistente sencillo, probarlo y elegir entre configuración automática o avanzada para no necesitar conocimientos técnicos de modelos.

**Razón de prioridad**: La facilidad de uso reduce errores de configuración y evita que opciones técnicas saturen la experiencia docente.

**Prueba independiente**: Un docente completa la configuración recomendada en un único recorrido, recibe confirmación visible y posteriormente puede personalizar modelos por capacidad desde opciones avanzadas.

**Aceptación**:
1. **Dado** un proveedor autorizado, **cuando** el docente ingresa su credencial y solicita probarla, **entonces** recibe un resultado claro de conexión correcta o una causa segura del fallo.
2. **Dado** el modo automático, **cuando** el docente guarda su proveedor, **entonces** el sistema asigna modelos compatibles recomendados sin exigir configuración por capacidad.
3. **Dado** el modo avanzado, **cuando** el docente personaliza una capacidad, **entonces** solo esa capacidad sustituye la selección automática.

### Historia 4 - Recuperación, trazabilidad y control institucional (Prioridad: P2)

Como administrador y docente quiero conocer qué configuración atendió cada trabajo y controlar el uso de alternativas para recuperar fallos sin cambiar silenciosamente de cuenta o proveedor.

**Razón de prioridad**: Las credenciales y calificaciones requieren trazabilidad, consentimiento y recuperación predecible.

**Prueba independiente**: Se inicia un trabajo con una credencial personal, la credencial falla durante la operación y el resultado respeta la autorización de fallback registrada, conserva la evidencia y muestra un estado recuperable.

**Aceptación**:
1. **Dado** que el docente autorizó fallback institucional y el administrador lo permite, **cuando** su proveedor personal falla temporalmente, **entonces** el sistema puede continuar con la ruta institucional y registra el cambio sin exponer secretos.
2. **Dado** que el docente no autorizó fallback institucional, **cuando** su proveedor falla, **entonces** el trabajo queda en un estado visible y reintentable sin consumir la credencial institucional ni perder información.
3. **Dado** un trabajo en cola, **cuando** cambia cualquier configuración global o personal, **entonces** el trabajo conserva la versión de configuración capturada al crearse.
4. **Dado** un administrador, **cuando** consulta la auditoría, **entonces** puede identificar quién cambió proveedor, modelo, política o estado, pero nunca recuperar una credencial en texto claro.

### Historia 5 - Usar Ollama Cloud o el Ollama del computador (Prioridad: P1)

Como administrador quiero conectar el VPS a Ollama Cloud y como docente quiero elegir entre mi cuenta Cloud o el Ollama de mi computador para aprovechar modelos propios sin exponer servicios locales a Internet.

**Razón de prioridad**: La integración actual muestra Ollama, pero no aplica completamente la dirección, credencial y modelo guardados; además, el servidor no puede alcanzar directamente el equipo del docente.

**Prueba independiente**: Un administrador prueba Ollama Cloud y selecciona uno de sus modelos; otro docente conecta su propia cuenta Cloud; un tercer docente empareja su computador, selecciona un modelo local y genera contenido sin abrir el puerto local a Internet.

**Aceptación**:
1. **Dado** un administrador con una credencial Cloud válida, **cuando** prueba la conexión, **entonces** obtiene los modelos accesibles para esa cuenta y puede elegirlos por capacidad.
2. **Dado** un docente que elige Ollama Cloud personal, **cuando** guarda y prueba una nueva clave, **entonces** la clave queda cifrada, nunca vuelve a mostrarse y solo se usa en sus trabajos.
3. **Dado** un docente con Ollama ejecutándose en su computador, **cuando** empareja el conector local, **entonces** XCalificator muestra sus modelos disponibles sin publicar el servicio local en Internet.
4. **Dado** un conector desconectado, **cuando** se intenta iniciar un trabajo local, **entonces** la interfaz informa que el computador debe reconectarse y ofrece la política de fallback autorizada.
5. **Dado** un trabajo enviado al conector local, **cuando** el profesor cierra la página, **entonces** el trabajo continúa mientras el conector permanezca activo y su resultado vuelve únicamente a la cuenta emparejada.

### Casos límite

- Una credencial válida para texto no habilita automáticamente visión, imágenes o embeddings.
- Un modelo retirado o renombrado por el proveedor queda señalado y no se asigna a trabajos nuevos hasta seleccionar una alternativa válida.
- La configuración personal de un docente nunca modifica rutas globales ni configuraciones de otros docentes.
- Una credencial revocada durante un trabajo produce un estado recuperable y respeta la política de fallback capturada al iniciar.
- Ollama del VPS usa exclusivamente el servicio Cloud; el Ollama del computador docente se alcanza mediante un conector emparejado que inicia una conexión saliente y no publica el puerto local.
- Un conector local desconectado nunca se interpreta como un proveedor Cloud disponible.
- Un código de emparejamiento vencido, reutilizado o perteneciente a otro docente debe rechazarse.
- Un docente no puede ver conectores, modelos locales ni resultados pertenecientes a otro docente.
- Guardar simultáneamente desde dos sesiones no debe producir una combinación parcial de configuraciones.
- Deshabilitar el uso de credenciales personales impide trabajos nuevos con ellas, pero no altera el historial ni borra credenciales sin una acción explícita.
- Las configuraciones antiguas sin modelos por capacidad continúan interpretándose con los valores globales existentes.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE permitir al administrador definir proveedor y modelo principal por cada capacidad de IA.
- **FR-002**: El sistema DEBE permitir al administrador definir proveedor y modelo alternativo opcional por cada capacidad.
- **FR-003**: El sistema DEBE diferenciar al menos generación de contenido, digitalización visual, extracción de respuestas, evaluación principal, verificación, retroalimentación, presentaciones, generación de imágenes, conversación y embeddings.
- **FR-004**: El sistema DEBE validar que cada modelo declarado sea compatible con la capacidad donde será utilizado.
- **FR-005**: El sistema DEBE permitir probar una conexión y modelo antes de publicar o activar su configuración.
- **FR-006**: El sistema DEBE permitir al administrador habilitar o deshabilitar proveedores, modelos y uso de credenciales personales por docentes.
- **FR-007**: El sistema DEBE permitir al docente registrar, sustituir y eliminar credenciales propias únicamente para proveedores autorizados.
- **FR-008**: El sistema DEBE ofrecer al docente un modo automático recomendado y un modo avanzado por capacidad.
- **FR-009**: El sistema DEBE aplicar la configuración personal válida antes de la global únicamente a trabajos propiedad del docente que la configuró.
- **FR-010**: El sistema DEBE usar la configuración global cuando el docente no tenga una configuración personal activa y compatible.
- **FR-011**: El sistema DEBE solicitar una autorización explícita del docente para usar credenciales institucionales como fallback de una ruta personal, y además respetar la política global del administrador.
- **FR-012**: El sistema NO DEBE modificar la configuración efectiva de un trabajo después de que este haya sido creado o puesto en cola.
- **FR-013**: El sistema DEBE registrar en cada trabajo la versión, capacidad, proveedor, modelo y origen global o personal de la configuración efectiva, sin guardar la credencial utilizada.
- **FR-014**: El sistema DEBE cifrar credenciales personales almacenadas y nunca devolverlas completas, registrarlas en logs ni incluirlas en mensajes de error.
- **FR-015**: El sistema DEBE limitar al administrador la configuración global y al docente propietario la lectura y modificación de su configuración personal.
- **FR-016**: El sistema DEBE mostrar estados comprensibles de conexión, guardado, prueba, error, fallback y restauración en escritorio y celular.
- **FR-017**: El sistema DEBE conservar como comportamiento predeterminado la configuración institucional actual para usuarios que no utilicen la nueva personalización.
- **FR-018**: El sistema DEBE permitir regresar a la última configuración publicada válida sin alterar trabajos ya iniciados.
- **FR-019**: El sistema DEBE evitar cambios parciales: una publicación debe aplicar todas sus rutas válidas o ninguna.
- **FR-020**: El sistema DEBE mantener trazabilidad auditable de cambios globales y personales sin registrar secretos.
- **FR-021**: El sistema DEBE identificar OpenAI como servicio de API separado de una suscripción de ChatGPT y explicar los requisitos de conectividad para proveedores locales.
- **FR-022**: El sistema DEBE distinguir Ollama Cloud institucional, Ollama Cloud personal y Ollama local mediante conector como tres orígenes de conexión diferentes.
- **FR-023**: El administrador DEBE poder registrar, sustituir, probar y retirar una credencial institucional de Ollama Cloud sin que el secreto vuelva a mostrarse.
- **FR-024**: El docente DEBE poder registrar, sustituir, probar y retirar su propia credencial de Ollama Cloud cuando el administrador lo permita.
- **FR-025**: El sistema DEBE consultar los modelos disponibles usando la conexión y credencial efectivas, permitir seleccionar solo modelos devueltos o validados y actualizar su disponibilidad sin editar archivos del servidor.
- **FR-026**: Las operaciones de Ollama Cloud DEBEN usar la dirección, credencial, modelo, timeout y política guardados para la configuración efectiva del trabajo, no valores fijos distintos.
- **FR-027**: El sistema DEBE ofrecer un conector local emparejado con la cuenta del docente mediante un código de un solo uso, con expiración y revocación visible.
- **FR-028**: El conector DEBE iniciar la comunicación hacia XCalificator y llamar al Ollama del mismo computador sin exigir puertos públicos ni recibir credenciales Cloud.
- **FR-029**: El docente DEBE poder ver el estado de su conector, actualizar sus modelos locales, elegir un modelo compatible, desvincular el equipo y distinguirlo claramente de Cloud.
- **FR-030**: Cada solicitud al conector DEBE pertenecer a un único docente, expirar, evitar ejecuciones duplicadas y devolver un resultado autenticado sin incluir secretos en registros.
- **FR-031**: Los trabajos locales DEBEN mostrar estados de espera de conector, ejecución, éxito, error y reintento, y respetar la política de fallback capturada al crearse.
- **FR-032**: La primera versión instalable del conector local DEBE soportar Windows; la comunicación y el empaquetado DEBEN permitir incorporar macOS y Linux posteriormente sin cambiar el contrato de emparejamiento.
- **FR-033**: La primera versión del conector local DEBE limitarse a Presentaciones y NO DEBE recibir fotografías, PDF, entregas, respuestas, evidencias ni calificaciones de estudiantes; esas capacidades solo pueden seleccionar proveedores Cloud autorizados.
- **FR-034**: El empaquetado Windows DEBE distinguir una compilación local de desarrollo de un artefacto distribuible, exigir firma de código válida para distribución y exponer el SHA-256 resultante.

### Entidades clave

- **Proveedor de IA**: Servicio autorizado, capacidades disponibles, estado y reglas de conexión; no contiene secretos visibles.
- **Modelo de IA**: Identificador ofrecido por un proveedor, capacidades compatibles, disponibilidad y recomendación.
- **Ruta por capacidad**: Selección principal y alternativa publicada para una operación concreta.
- **Configuración personal del docente**: Preferencias opcionales, modo automático o avanzado, consentimiento de fallback y referencias cifradas a credenciales.
- **Versión de configuración**: Instantánea inmutable de las decisiones efectivas capturadas al crear un trabajo.
- **Evento de auditoría**: Actor, momento, entidad modificada, valores no sensibles y resultado.
- **Conector local**: Instalación emparejada con un docente que anuncia disponibilidad y modelos, recibe exclusivamente trabajos de su propietario y utiliza el Ollama del mismo computador.
- **Emparejamiento**: Asociación revocable entre una cuenta docente y una instalación del conector, creada mediante un código temporal de un solo uso.

## Criterios de éxito

- **SC-001**: Un administrador puede configurar y probar una ruta completa por capacidad en menos de tres minutos sin editar archivos del servidor.
- **SC-002**: Un docente puede conectar un proveedor autorizado mediante el modo automático en menos de dos minutos y recibe un resultado visible de la prueba.
- **SC-003**: El 100 % de los trabajos nuevos identifica de forma auditable la capacidad, proveedor, modelo, versión y origen de configuración empleados.
- **SC-004**: Ninguna respuesta, log, auditoría, prueba o interfaz devuelve credenciales completas.
- **SC-005**: Cambiar una configuración durante la ejecución de trabajos no altera el proveedor o modelo de ninguno de esos trabajos.
- **SC-006**: Un docente sin configuración personal conserva los mismos resultados funcionales y rutas predeterminadas disponibles antes del cambio.
- **SC-007**: Las rutas incompatibles o incompletas se rechazan antes de ser publicadas y explican al usuario qué debe corregir.
- **SC-008**: La configuración puede completarse desde una pantalla de 360 px sin desplazamiento horizontal ni controles inaccesibles.
- **SC-009**: Tres o más docentes pueden utilizar configuraciones distintas simultáneamente sin compartir credenciales ni preferencias.
- **SC-010**: Un administrador o docente puede conectar Ollama Cloud, probarlo y seleccionar un modelo disponible en menos de dos minutos.
- **SC-011**: Un docente puede emparejar el conector local en menos de tres minutos sin abrir puertos ni copiar direcciones técnicas.
- **SC-012**: El 100 % de los trabajos de Ollama identifica si utilizó Cloud institucional, Cloud personal o conector local sin registrar la clave.
- **SC-013**: Ningún trabajo local puede ser leído, aceptado o respondido por el conector de otro docente.
- **SC-014**: El conector se instala, empareja, detecta Ollama y completa un trabajo en Windows 10 22H2 y Windows 11 23H2 o posteriores sin configuración manual de red.

**Excepción temporal de aceptación (2026-08-31)**: Windows 11 superó el recorrido
E2E completo. La distribución declarada compatible con Windows 10 permanece
bloqueada hasta cerrar [#62](https://github.com/Andres-back/Calificator/issues/62)
con evidencia en Windows 10 22H2. Responsable: mantenedor del repositorio;
fecha límite: antes de publicar el conector Windows al público.
- **SC-015**: El 100 % de las rutas de visión, digitalización, entregas y calificación rechaza Ollama local antes de crear un trabajo con evidencia estudiantil.

## Supuestos

- La configuración global es administrada exclusivamente por usuarios con rol administrador.
- Las credenciales personales son opcionales y el modo institucional continúa siendo el recomendado.
- OpenCode, OpenAI, Groq, proveedores compatibles con Qwen y Ollama se incorporan mediante contratos autorizados; la disponibilidad concreta de modelos depende del proveedor.
- El acceso a Ollama instalado en el computador docente requiere el conector local emparejado; el servidor nunca intenta acceder directamente al localhost del navegador.
- La credencial de Ollama Cloud se considera un secreto y se gestiona con las mismas protecciones que las demás claves personales o institucionales.
- La primera entrega del conector se distribuye para Windows; macOS y Linux quedan fuera de esta ampliación inicial.
- El fallback institucional desde una ruta personal requiere consentimiento del docente y permiso global; nunca ocurre de manera silenciosa.
- La adopción será progresiva por capacidad y dispondrá de una reversión inmediata al comportamiento institucional actual.


## Inventario técnico

Las superficies de backend, frontend, datos y trabajos propiedad de esta especificación se mantienen en [inventory.md](./inventory.md).
