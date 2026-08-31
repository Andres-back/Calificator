# Investigación: configuración de IA global y por docente

## Ampliación 2026-08-30: Ollama

### Decisión: API Cloud oficial

**Decisión**: utilizar https://ollama.com/api con autenticación Bearer para el origen Cloud.

**Rationale**: la documentación oficial define esa dirección para acceso directo, tags para modelos y chat para inferencia. La dirección de Docker no representa la cuenta Cloud del VPS.

**Alternatives considered**: conservar http://ollama:11434 en producción o usar solo compatibilidad OpenAI. El API nativo expone mejor catálogo y capacidades.

### Decisión: descubrimiento por tags y show

**Decisión**: listar modelos con tags e inspeccionar cada selección con show.

**Rationale**: tags ofrece identificadores disponibles y show declara capacidades como completion y vision.

**Alternatives considered**: catálogo escrito manualmente. Cloud y los modelos locales cambian por cuenta y dispositivo.

### Decisión: conector local saliente

**Decisión**: un ejecutable Windows emparejado reclama trabajos por HTTPS y llama solo al Ollama loopback.

**Rationale**: el VPS no puede alcanzar el computador docente; la conexión saliente funciona detrás de NAT y no publica el puerto 11434.

**Alternatives considered**: navegador a localhost, túneles públicos o URL arbitraria. Se rechazan por CORS, red privada, exposición y SSRF.

### Decisión: trabajos persistentes con lease

**Decisión**: persistir solicitudes locales, permitir reclamación exclusiva temporal y reanudar la operación original al recibir resultado.

**Rationale**: soporta modelos lentos, desconexiones, cierre del navegador y reintentos sin duplicar ni ocupar la cola principal.

**Alternatives considered**: WebSocket solo en memoria o mantener el worker esperando. Se rechazan por pérdida al reiniciar y consumo innecesario de concurrencia.

### Decisión: instalador Windows inicial

**Decisión**: empaquetar el conector como ejecutable e instalador Windows con credencial protegida por el sistema.

**Rationale**: coincide con el entorno inicial y no exige Python al docente.

**Alternatives considered**: script manual, extensión de navegador o tres plataformas simultáneas.


## Ampliación 2026-08-30: Ollama

### Decisión: API Cloud oficial

**Decisión**: utilizar https://ollama.com/api con autenticación Bearer para el origen Cloud.

**Rationale**: la documentación oficial define esa dirección para acceso directo, tags para modelos y chat para inferencia. La dirección de Docker no representa la cuenta Cloud del VPS.

**Alternatives considered**: conservar http://ollama:11434 en producción o usar compatibilidad OpenAI. Se rechaza la primera porque depende de un servicio local lento y la segunda porque el API nativo expone mejor catálogo y capacidades.

### Decisión: descubrimiento por tags y show

**Decisión**: listar modelos con tags e inspeccionar cada selección con show.

**Rationale**: tags ofrece identificadores disponibles y show declara capacidades como completion y vision, necesarias para validar rutas.

**Alternatives considered**: catálogo escrito manualmente. Se rechaza porque Cloud y modelos locales cambian por cuenta y dispositivo.

### Decisión: conector local saliente

**Decisión**: un ejecutable Windows emparejado reclama trabajos por HTTPS y llama solo al Ollama loopback.

**Rationale**: el VPS no puede alcanzar el computador del docente; la conexión saliente funciona detrás de NAT y no publica el puerto 11434.

**Alternatives considered**: llamadas del navegador a localhost, túneles públicos o URL arbitraria. Se rechazan por CORS, red privada, exposición y SSRF.

### Decisión: trabajos persistentes con lease

**Decisión**: persistir solicitudes locales, permitir reclamación exclusiva temporal y reanudar la operación original al recibir resultado.

**Rationale**: soporta modelos lentos, desconexiones, cierre del navegador y reintentos sin duplicar ni ocupar la cola principal.

**Alternatives considered**: WebSocket exclusivamente en memoria o mantener el worker esperando. Se rechazan por pérdida al reiniciar y consumo innecesario de concurrencia.

### Decisión: instalador Windows inicial

**Decisión**: empaquetar el conector como ejecutable e instalador Windows con credencial de dispositivo protegida por el sistema.

**Rationale**: coincide con el entorno inicial acordado y permite una experiencia guiada sin exigir Python al docente.

**Alternatives considered**: script manual, extensión de navegador o tres plataformas simultáneas. Se rechazan por fricción, limitaciones de red y alcance.

## Decisión 1: resolución central por capacidad

**Decisión**: Crear un resolvedor único que reciba capacidad y docente, valide compatibilidad y produzca una instantánea sanitizada con principal, fallback, origen y versión.

**Razón**: Hoy la selección está repartida entre `LLMRouter`, `VisionExtractor`, `image_router` y valores de entorno. Centralizar la decisión permite conservar los adaptadores existentes y evita que la lógica de negocio dependa de modelos concretos.

**Alternativas consideradas**: Consultar tablas desde cada adaptador fue descartado por duplicar precedencia y caché. Pasar claves dentro del payload del job fue descartado por exposición y rotación insegura.

## Decisión 2: catálogo explícito de modelos y capacidades

**Decisión**: Persistir un catálogo administrable de modelos por proveedor con capacidades (`text`, `vision`, `image`, `embedding`), recomendación y estado.

**Razón**: Un campo `model` único por proveedor no permite que el mismo proveedor atienda digitalización, conversación y generación con modelos distintos, ni validar compatibilidad.

**Alternativas consideradas**: Inferir capacidades desde el nombre fue descartado por ser frágil. Permitir cualquier texto sin catálogo se conserva solo como opción administrativa avanzada, nunca docente, y requiere declarar capacidades antes de publicarlo.

## Decisión 3: credenciales personales normalizadas

**Decisión**: Guardar una credencial cifrada por docente y proveedor, con estado de prueba y sin endpoint personalizado editable por el docente.

**Razón**: Aísla docentes, facilita sustituir/eliminar una clave y permite múltiples proveedores. Reutiliza el cifrado Fernet existente.

**Alternativas consideradas**: Añadir una columna por proveedor a `profesor_ai_configs` fue descartado por requerir migraciones por cada integración. Guardar un JSON cifrado completo fue descartado por dificultar actualizaciones y auditoría selectiva.

## Decisión 4: configuración global como red de seguridad

**Decisión**: La ruta personal tiene precedencia solo si está autorizada, activa, probada y compatible. El fallback institucional requiere consentimiento del docente y permiso global.

**Razón**: Evita cobros institucionales silenciosos y conserva disponibilidad para docentes que no configuren nada.

**Alternativas consideradas**: Fallback global automático fue descartado por falta de consentimiento. Fallar siempre ante una clave personal inválida fue descartado porque impide una recuperación explícitamente autorizada.

## Decisión 5: instantánea sin secretos en trabajos

**Decisión**: Insertar en `ai_jobs.input_json._ai_config` una instantánea sanitizada al crear el trabajo y reutilizarla en reintentos.

**Razón**: Los cambios posteriores no alteran proveedor/modelo, pero las claves nunca se duplican en la cola ni se devuelven por API.

**Alternativas consideradas**: Resolver al comenzar el worker fue descartado porque una espera en cola cambiaría el resultado. Copiar la clave cifrada al job fue descartado por ampliar la superficie sensible.

## Decisión 6: adopción progresiva con compatibilidad

**Decisión**: Sembrar el catálogo desde los modelos actuales y activar el resolvedor por capacidad, comenzando con generación y presentaciones, después digitalización/visión y finalmente evaluación/verificación.

**Razón**: La calificación funciona y requiere regresión más estricta. El comportamiento institucional seguirá disponible como rollback inmediato.

**Alternativas consideradas**: Sustitución simultánea de todos los routers fue descartada por riesgo operacional y dificultad para aislar fallos.

## Decisión 7: proveedores locales y compatibles

**Decisión**: Solo el administrador registra endpoints. El docente elige entre proveedores/modelos autorizados y aporta la clave cuando aplique.

**Razón**: Una URL arbitraria puede atacar servicios internos; además, `localhost` del docente no es el servidor. Ollama solo aparece disponible cuando el endpoint administrado es alcanzable.

**Alternativas consideradas**: Permitir base URL docente fue descartado por SSRF, conectividad y soporte. La ampliación aprobada incorpora un conector saliente, nunca una URL arbitraria aportada por el navegador.

## Decisión 8: minimización de datos en Ollama local

**Decisión**: La primera versión del conector local solo procesa prompts de Presentaciones. Visión, digitalización, entregas y calificación no ofrecen Ollama local y continúan en proveedores Cloud autorizados.

**Razón**: Una evidencia estudiantil puede contener identidad, escritura y datos académicos. El conector del computador docente no debe recibirlos sin un modelo de consentimiento y gobierno de datos específico. Presentaciones permite validar emparejamiento, leases, reanudación y experiencia local sin ampliar esa superficie sensible.

**Alternativas consideradas**: Habilitar todas las capacidades por tener soporte de visión fue descartado por privacidad. Un consentimiento genérico del docente fue descartado porque no representa al estudiante ni resuelve retención, eliminación y auditoría de la evidencia local.

## Decisión 9: compilación Windows verificable

**Decisión**: El script de empaquetado distingue desarrollo sin firma de distribución firmada. La primera requiere una bandera explícita; la segunda valida clave privada, uso de firma de código, estado Authenticode y SHA-256.

**Razón**: Un ejecutable sin firma puede usarse para pruebas locales, pero no debe presentarse como instalador confiable a docentes.

**Alternativas consideradas**: Firmar con un certificado autofirmado fue descartado porque no establece confianza pública. Descargar PyInstaller automáticamente durante cada build fue descartado para mantener dependencias controladas.
