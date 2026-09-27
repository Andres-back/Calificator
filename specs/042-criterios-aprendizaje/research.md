# Investigación: Criterios de aprendizaje desde material docente

## Decisión 1 — Criterios como concepto principal; DBA como estándar opcional

- **Decisión**: la navegación y el lenguaje principal serán “Criterios de aprendizaje”. Los DBA existentes aparecerán dentro de “Estándares oficiales” y podrán vincularse opcionalmente.
- **Motivo**: el profesor puede evaluar contenidos provenientes de libros, guías, explicaciones o prácticas que no parten de un DBA concreto. El estándar puede aportar alineación curricular, pero no debe bloquear la creación.
- **Alternativas descartadas**: renombrar físicamente las tablas DBA perdería significado histórico; conservar DBA como puerta obligatoria mantendría la limitación reportada.

## Decisión 2 — Separar identidad reutilizable y versión aprobada

- **Decisión**: un conjunto identifica el propósito pedagógico y contiene versiones. Solo las versiones aprobadas se pueden aplicar; una aprobada nunca se edita.
- **Motivo**: evita que una corrección posterior cambie silenciosamente evaluaciones, recursos o notas ya emitidas.
- **Alternativas descartadas**: un único registro mutable es simple, pero no cumple trazabilidad ni reproducción de la calificación.

## Decisión 3 — Conservar snapshots en consumidores

- **Decisión**: evaluaciones y recursos referencian la versión y conservan una copia del contrato aplicado. `EvaluacionBlueprint.criterios` continúa siendo la fuente congelada del proceso de calificación.
- **Motivo**: el repositorio ya usa blueprints para preservar preguntas, respuestas y reglas; extender este patrón reduce riesgo y permite abrir notas históricas aunque el conjunto sea archivado.
- **Alternativas descartadas**: resolver siempre el criterio vigente rompería reproducibilidad; duplicar un nuevo motor de rúbricas crearía dos verdades.

## Decisión 4 — Reutilizar RAG y almacenamiento privado sin acoplar el dominio

- **Decisión**: cada fuente pertenece a una versión y puede enlazar opcionalmente una fuente RAG. El archivo original se guarda de forma privada y el dominio conserva estado, orden, páginas y procedencia.
- **Motivo**: RAG ya resuelve fragmentación y recuperación contextual, pero no representa por sí solo aprobación, privacidad pedagógica o versionado del criterio.
- **Alternativas descartadas**: almacenar documentos como URLs públicas vulneraría privacidad; incrustar todo el texto en el criterio duplicaría datos sensibles y dificultaría retención.

## Decisión 5 — Extracción y propuesta como un trabajo recuperable

- **Decisión**: carga/registro es transaccional y rápido; extracción OCR/visión y propuesta usan el sistema de jobs/Celery con una clave idempotente por versión y huella de entradas.
- **Motivo**: documentos multipágina y modelos pueden tardar. La navegación debe continuar y un reintento no puede duplicar resultados.
- **Alternativas descartadas**: mantener la petición HTTP abierta empeora la experiencia móvil y hace ambiguos los fallos de red.

## Decisión 6 — Intención docente estructurada antes de pedir una propuesta

- **Decisión**: solicitar tema/propósito, grado, qué se desea observar, tipo de evidencia, modalidad, prioridades y restricciones; todos salvo el contexto mínimo útil pueden editarse.
- **Motivo**: el material explica lo enseñado, pero no determina por sí solo qué pretende valorar el profesor. La combinación limita invenciones y produce criterios utilizables.
- **Alternativas descartadas**: pedir al modelo “genera una rúbrica de este PDF” delega decisiones pedagógicas y reduce transparencia.

## Decisión 7 — Aprobación humana y cobertura visible

- **Decisión**: la propuesta muestra qué fuente respalda cada criterio, advertencias de cobertura y suma de pesos. No se aplica hasta una acción explícita del profesor.
- **Motivo**: la IA propone y el docente decide, conforme a la constitución y al objetivo de calificación asistida.
- **Alternativas descartadas**: publicar automáticamente ahorra un clic, pero expone evaluaciones a criterios incorrectos o incompletos.

## Decisión 8 — Medir trabajo activo, no solo duración de extremo a extremo

- **Decisión**: registrar inicio/fin de edición, cantidad de cambios, tiempo de espera de IA y tiempo hasta aprobación como métricas separadas y minimizadas.
- **Motivo**: la tesis busca saber si disminuye el tiempo que el docente pasa calificando. Una llamada lenta en segundo plano no equivale a trabajo humano.
- **Alternativas descartadas**: medir solo duración total del job confunde rendimiento técnico con eficiencia docente.

## Decisión 9 — Migración progresiva mediante adaptador

- **Decisión**: la versión aprobada se convierte al formato `criterios`/`dba_ids` que ya consumen generación y calificación. Durante la transición se mantienen rutas, permisos y payloads heredados.
- **Motivo**: la funcionalidad actual sirve y tiene datos reales. La sustitución simultánea de dominio, UI y calificación sería innecesariamente riesgosa.
- **Alternativas descartadas**: reescribir todo el flujo impediría comparar regresiones y aumentaría el radio de fallo.

## Decisión 10 — No se requiere aclaración funcional adicional

La aprobación del usuario resolvió los puntos materiales: criterios como lógica principal, fuentes docentes, intención explícita, rúbrica editable, estándares opcionales, preservación histórica y cuidado del flujo vigente. Los detalles restantes son decisiones técnicas reversibles incluidas en este plan.

## Hallazgos del código actual que condicionan la ejecución

- `EvaluacionBlueprint` es actualmente 1:1 y su servicio puede actualizarlo incluso para una evaluación publicada. La aplicación inmutable de criterios debe introducirse antes de habilitar el nuevo contexto en calificación.
- La carga documental DBA devuelve una fuente RAG, pero la UI pierde ese vínculo al aceptar la sugerencia. El nuevo contrato conserva procedencia por fuente/página desde el primer borrador.
- Los endpoints RAG genéricos no ofrecen todavía el aislamiento por propietario necesario para material docente privado. El nuevo módulo aplica autorización antes de consultar contenido y RAG actúa solo como índice derivado.
- El editor de rúbrica ya valida nombres, niveles y suma de pesos; se reutiliza y amplía en lugar de crear otro editor.
- `MultiPageEvidencePicker` ya resuelve cámara, orden, rotación y límites. Se generaliza su núcleo para fuentes docentes sin compartir archivos ni permisos con evidencia estudiantil.
- `GradeBreakdown` ya muestra fórmula, evidencia, puntos y explicación. Se extiende con clave/versión del criterio sin duplicar la fórmula ni recalcular históricos.
