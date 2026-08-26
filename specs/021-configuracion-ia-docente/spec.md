# Especificación: Configuración de IA global y por docente

**Rama**: `codex/021-configuracion-ia-docente` | **Creada**: 2026-08-24 | **Estado**: Aprobada | **Issue**: #29

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

### Casos límite

- Una credencial válida para texto no habilita automáticamente visión, imágenes o embeddings.
- Un modelo retirado o renombrado por el proveedor queda señalado y no se asigna a trabajos nuevos hasta seleccionar una alternativa válida.
- La configuración personal de un docente nunca modifica rutas globales ni configuraciones de otros docentes.
- Una credencial revocada durante un trabajo produce un estado recuperable y respeta la política de fallback capturada al iniciar.
- Los proveedores locales, incluido Ollama, deben ser alcanzables de forma segura desde el entorno donde se ejecuta XCalificator; una dirección local del dispositivo del docente no se asume accesible desde el servidor.
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

### Entidades clave

- **Proveedor de IA**: Servicio autorizado, capacidades disponibles, estado y reglas de conexión; no contiene secretos visibles.
- **Modelo de IA**: Identificador ofrecido por un proveedor, capacidades compatibles, disponibilidad y recomendación.
- **Ruta por capacidad**: Selección principal y alternativa publicada para una operación concreta.
- **Configuración personal del docente**: Preferencias opcionales, modo automático o avanzado, consentimiento de fallback y referencias cifradas a credenciales.
- **Versión de configuración**: Instantánea inmutable de las decisiones efectivas capturadas al crear un trabajo.
- **Evento de auditoría**: Actor, momento, entidad modificada, valores no sensibles y resultado.

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

## Supuestos

- La configuración global es administrada exclusivamente por usuarios con rol administrador.
- Las credenciales personales son opcionales y el modo institucional continúa siendo el recomendado.
- OpenCode, OpenAI, Groq, proveedores compatibles con Qwen y Ollama se incorporan mediante contratos autorizados; la disponibilidad concreta de modelos depende del proveedor.
- El sistema no garantiza acceso desde el servidor a un Ollama instalado únicamente en el computador personal del docente.
- El fallback institucional desde una ruta personal requiere consentimiento del docente y permiso global; nunca ocurre de manera silenciosa.
- La adopción será progresiva por capacidad y dispondrá de una reversión inmediata al comportamiento institucional actual.


## Inventario técnico

Las superficies de backend, frontend, datos y trabajos propiedad de esta especificación se mantienen en [inventory.md](./inventory.md).
