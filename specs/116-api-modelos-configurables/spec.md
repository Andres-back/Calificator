# Especificación: APIs y modelos administrables sin romper la calificación

**Rama**: `codex/116-api-modelos-configurables` | **Creada**: 2026-10-22 | **Estado**: Alcance aprobado por el usuario al pedir completar y entregar en producción | **Issue**: #243

## Escenarios de usuario y pruebas

### Historia 1 - Elegir una API y sus modelos (Prioridad: P1)

El administrador configura una API compatible, consulta sus modelos y decide cuál realiza cada función sin cambiar el código por cada modelo nuevo.

**Razón de prioridad**: guardar una selección que el sistema no puede ejecutar interrumpe el trabajo docente.

**Prueba independiente**: conexión y modelo sintéticos configurados desde administración producen el resultado previsto en un trabajo nuevo sin revelar la clave.

**Aceptación**:
1. Dada una conexión compatible, cuando se guarden URL y clave, entonces el catálogo puede consultarse y las claves nunca vuelven al navegador.
2. Dado un modelo con un formato distinto, cuando se configure su compatibilidad y se pruebe, entonces se conserva la imagen y se usa el modelo elegido; un error identifica el modelo y no se interpreta automáticamente como ausencia de visión.
3. Dado un catálogo incompleto o fallido, cuando se actualice, entonces no se elimina silenciosamente la configuración válida anterior.

### Historia 2 - Calificar con la selección publicada (Prioridad: P1)

El administrador asigna los modelos elegidos tras la comparación local: Luna principal y GLM Flash de respaldo para digitalizar; Luna como evaluador principal, GLM Flash como segundo evaluador y Luna como confirmador en la revisión adicional. Cada etapa conserva su configuración independiente y visible.

**Prueba independiente**: publicar una selección y comprobar un trabajo sintético y la proyección administrativa.

**Aceptación**:
1. Dada la configuración existente, al publicar la selección aprobada, la lectura y estructuración de digitalización usan Luna con respaldo GLM Flash; la valoración principal usa Luna, la verificación GLM Flash y la revisión adicional Luna. Las demás funciones conservan sus modelos y evidencias.
2. Dado un modelo que falla, el trabajo conserva la evidencia, informa el fallo y solo utiliza respaldos explícitos, sin inventar una nota.
3. Dado un cambio publicado, el panel muestra guardado, efectivo y último uso real por separado; no presenta el análisis previo como una ejecución nueva.

### Casos límite

- Protocolo no soportado, falta de metadatos, clave incorrecta, bloqueo regional, cuota, respuesta truncada o rechazo del proveedor.
- Proveedor local sin clave, conexión externa no segura y redirección que podría filtrar una clave.
- Dos administradores publican simultáneamente; trabajos ya admitidos y notas históricas no se reescriben.
- Rutas antiguas no editadas inválidas no deben impedir reparar una función independiente; sí debe validarse toda dependencia modificada.

## Requisitos

- **FR-001**: Solo administradores autorizados pueden crear conexiones de APIs compatibles y modificar sus modelos y rutas; claves cifradas, sin exposición en lecturas, auditoría o historial.
- **FR-002**: Cada modelo puede declarar formato soportado y capacidades, con prueba técnica sintética antes de la activación del perfil nuevo; no prometer compatibilidad con formatos no implementados.
- **FR-003**: El catálogo actualizable conserva selecciones y metadatos manuales; distingue sin comprobar, compatible y retirado. Un fallo o truncamiento del catálogo no retira modelos.
- **FR-004**: Texto, lectura visual y evaluación consumen la misma conexión y perfil publicados, incluidas URL y capacidad visual, sin depender solo del nombre del modelo.
- **FR-005**: La selección principal y respaldo son independientes por función; una salida vacía, truncada o rechazada no se acepta como calificación válida.
- **FR-006**: Publicaciones y pruebas respetan permisos, versiones, recuperación, límites y secretos; cambios de formato o capacidad invalidan su prueba anterior.
- **FR-007**: Las conexiones externas usan destinos seguros sin redirigir credenciales; los servicios locales existentes mantienen su excepción acotada.
- **FR-008**: La selección aprobada el 22-10-2026 usa OpenCode: `digitalizacion.extraccion` y `digitalizacion.estructura` con `gpt-6-luna` principal y `glm-5.3-flash` como respaldo; `calificacion.valoracion` con `gpt-6-luna`, `calificacion.verificacion` con `glm-5.3-flash` y `calificacion.revision_adicional` con `gpt-6-luna`. El respaldo de digitalización se ejecuta solo ante fallo válido del principal, no como segunda llamada obligatoria. El segundo evaluador de calificación mantiene la política actual de verificación; el confirmador mantiene las condiciones actuales de discrepancia o baja confianza, sin añadir una llamada a todas las entregas. No modificar lectura de respuestas del alumno, imágenes, embeddings ni otras funciones. Los modelos elegidos se persisten en configuración administrativa, no en condiciones de negocio por nombre.
- **FR-009**: Guardado, efectivo y observado muestran la función y versión correctas en móvil y escritorio, con errores comprensibles y sin observaciones ficticias.
- **FR-010**: No recalificar ni cambiar notas, evidencias o usuarios históricos; nuevas solicitudes capturan su configuración no secreta y no cambian durante el trabajo.
- **FR-011**: CI y pruebas de regresión deben pasar antes de fusionar; verificar despliegue y una inferencia sintética antes de afirmar producción funcional. Mantener rollback auditable.

### Entidades clave

- **Conexión de API**: identificador, destino, estado y referencia de credencial privada.
- **Perfil de modelo**: modelo, formato de intercambio, capacidades y prueba técnica asociada a su versión.
- **Ruta y snapshot**: función, principal, respaldo, versión y perfil capturado sin secretos.

## Criterios de éxito

- **SC-001**: Administrar y probar un modelo compatible nuevo no requiere un commit por su nombre.
- **SC-002**: El 100 % de escenarios de permisos y preservación de datos mantiene notas/evidencias y no expone claves.
- **SC-003**: Publicar la selección actualiza exclusivamente las cinco rutas de FR-008; guardado y efectivo coinciden y observado conserva el histórico hasta una ejecución real.
- **SC-004**: Pruebas de texto e imagen con los tres formatos soportados entregan resultados normalizados o errores explícitos, nunca una nota inventada.
- **SC-005**: Las funciones de administración afectadas son utilizables a 360 y 1366 px y las regresiones de los proveedores anteriores permanecen verdes.

## Supuestos

- El usuario aprobó el alcance descrito en el chat y solicitó implementarlo y llevarlo a producción el 22 de octubre de 2026. Incluye fusión con CI verde, activación acotada y prueba sintética; no deshabilitar políticas regionales ni usar evidencias reales nuevas.
- Soporte inicial de APIs compatibles con Chat Completions, Responses o Messages, no formatos propietarios arbitrarios. Imágenes y embeddings conservan sus adaptadores.
- No se garantiza que un tercero no cambie su catálogo o disponibilidad. Se reduce el riesgo mediante comprobaciones, respaldos explícitos y errores recuperables; no se promete ausencia absoluta de fallos.
- Spec 115 y los borradores ajenos de Spec 034 quedan fuera; editar notas manualmente y migrar todas las funciones a GLM no forma parte de esta entrega.

## Decisión de modelos tras las pruebas locales — 22-10-2026

El usuario indicó explícitamente: Luna como principal y GLM como respaldo para digitalizar; Luna como principal evaluador, GLM Flash como segundo evaluador y Luna como confirmador. «Confirmador» se corresponde con la revisión adicional/arbitraje ya existente, no con otro modelo que cambie la fórmula de la nota. La consolidación matemática sigue siendo determinista y el docente conserva la decisión final.

La muestra local de nueve llamadas no certifica calidad universal: Luna y GLM renumeraron cuatro preguntas de Marcela y hubo recortes imperfectos; GLM produjo una clave inválida para una pregunta abierta de Amparo; DeepSeek no completó el documento de dos hojas. La publicación exige el soporte de protocolo, pruebas sintéticas y regresiones; registrar esta decisión no significa que ya esté activa en producción. El informe local es evidencia de selección, no un artefacto público ni una nueva autorización para transmitir datos de alumnos.
