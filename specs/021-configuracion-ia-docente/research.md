# Investigación: configuración de IA global y por docente

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

**Alternativas consideradas**: Permitir base URL docente fue descartado por SSRF, conectividad y soporte. Un agente instalado en el computador queda fuera de esta entrega.
