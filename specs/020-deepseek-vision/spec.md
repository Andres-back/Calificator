# Especificación: extracción visual robusta con DeepSeek

**Rama**: `codex/020-deepseek-vision`
**Creada**: 2026-08-24
**Estado**: Aprobada por solicitud explícita del usuario
**Issue**: #27

## Escenarios de usuario y pruebas

### Historia 1 - Extracción fiel de evidencia física (Prioridad: P1)

Como docente, necesito que cada respuesta visible en una foto o PDF quede vinculada a su pregunta y página, sin que la IA complete contenido ilegible.

**Prueba independiente**: Una evidencia con respuestas legibles e ilegibles produce un contrato válido; lo ilegible queda nulo y requiere revisión.

**Aceptación**:

1. Una foto válida conserva por respuesta su pregunta, página, legibilidad y confianza.
2. Una respuesta ilegible no se inventa ni se marca automáticamente como incorrecta.
3. Un PDF con una página fallida conserva las páginas válidas y exige revisión.

### Historia 2 - Calificación desacoplada y reproducible (Prioridad: P1)

Como docente, necesito que visión solo extraiga y que la nota use reglas deterministas o semánticas según la pregunta.

**Prueba independiente**: Una respuesta objetiva se compara con la clave sin otra inferencia; una abierta pasa al grader textual con evidencia normalizada.

**Aceptación**:

1. Una pregunta objetiva con clave se califica localmente.
2. Una pregunta abierta legible pasa al grader con evidencia, blueprint y criterios.
3. Una evaluación online mantiene el flujo vigente sin visión.

### Historia 3 - Operación recuperable y observable (Prioridad: P2)

Como mantenedor, necesito límites, reintentos controlados, fallback explícito y tiempos por etapa.

**Prueba independiente**: 429/503 y timeout reciben como máximo un reintento; errores definitivos no se reintentan y todos terminan en estado visible.

**Aceptación**:

1. Un fallo transitorio admite como máximo un reintento con backoff corto.
2. Un fallback registra modelo principal, causa y modelo alterno.
3. Un resultado terminal expone duración segura por etapa sin evidencia ni secretos.

### Casos límite

- JPG, PNG, PDF de una o varias páginas, EXIF, borrosa, vacía, rotada o corrupta.
- Respuesta ausente, ilegible, tachada, corregida o continuada entre páginas.
- JSON inválido, pregunta parcial duplicada y fallo parcial de página.
- Credencial administrativa inválida con credencial de entorno válida.
- Varias entregas simultáneas y concurrencia limitada por página.

## Requisitos

### Requisitos funcionales

- **FR-001**: DeepSeek V4 Flash Vision Exp DEBE ser el extractor principal configurable vía OpenCode Go.
- **FR-002**: Extracción, normalización, grading y feedback DEBEN ser responsabilidades separadas.
- **FR-003**: La salida DEBE validarse con schema estricto para calidad, páginas, respuestas, legibilidad, confianza y revisión.
- **FR-004**: El extractor DEBE transcribir solo lo visible, conservar errores y representar ilegibilidad como nulo revisable.
- **FR-005**: Todas las páginas permitidas DEBEN procesarse conservando resultado y error por página.
- **FR-006**: La preparación DEBE validar MIME/corrupción, corregir orientación y limitar dimensión/compresión sin perder legibilidad.
- **FR-007**: Conexión, lectura, escritura, pool y operación global DEBEN tener límites explícitos.
- **FR-008**: Solo 429, 502, 503, 504 y transporte transitorio admiten un único reintento con backoff.
- **FR-009**: El fallback DEBE ser configurable, limitado y observable.
- **FR-010**: Cada intento DEBE registrar evento seguro con IDs, modelo, proveedor, duración, páginas, tamaño, HTTP, retry y error.
- **FR-011**: Páginas DEBEN poder extraerse con concurrencia limitada y merge ordenado determinista.
- **FR-012**: Preguntas objetivas con clave DEBEN calificarse localmente; solo las semánticas pasan al grader textual.
- **FR-013**: Todo trabajo DEBE terminar extraído, calificado, en revisión, fallo temporal o fallo definitivo.
- **FR-014**: Clientes de una foto, evidencia multihoja y evaluaciones online DEBEN conservar compatibilidad.
- **FR-015**: Configuración y logs NO DEBEN exponer claves, prompts, evidencia ni datos personales innecesarios.
- **FR-016**: Se DEBEN medir tres llamadas directas y una ejecución integral con la misma evidencia segura.

### Entidades clave

- **Extracción visual**: proveedor, modelo, calidad, páginas, respuestas y advertencias.
- **Respuesta extraída**: pregunta, contenido, página, legibilidad, confianza y revisión.
- **Resultado de página**: estado, duración, tamaño y error seguro.
- **Intento de proveedor**: llamada, reintento o fallback observable.
- **Trabajo de calificación**: ciclo asíncrono idempotente con estado terminal.

## Criterios de éxito

- **SC-001**: El 100 % de evidencias válidas de la matriz termina en estado visible.
- **SC-002**: El 100 % de respuestas ilegibles queda nulo y revisable, nunca inventado.
- **SC-003**: El 100 % de páginas se procesa o identifica individualmente como fallida.
- **SC-004**: Tres llamadas directas reportan promedio, mínimo y máximo; el backend desglosa todas las etapas.
- **SC-005**: Backend, frontend, tipos, lint y build permanecen verdes.
- **SC-006**: Respuestas objetivas con clave no generan una segunda inferencia.

## Supuestos

- OpenCode documenta este modelo en `/zen/go/v1/chat/completions`.
- Qwen/MiMo permanecen como adaptadores configurables donde aún sean útiles.
- Los benchmarks usan evidencia sintética sin información estudiantil.
- La solicitud detallada del usuario constituye aprobación humana del alcance y plan.
