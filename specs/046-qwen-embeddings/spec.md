# Especificación: Qwen Embedding para RAG institucional

**Rama**: `codex/046-qwen-embeddings`
**Fecha**: 2026-09-17
**Estado**: aprobado por el usuario para implementación y producción.
**Issue**: [#92](https://github.com/Andres-back/Calificator/issues/92)

## Escenarios de usuario y pruebas

### Historia 1: recuperar contexto educativo con un modelo multilingüe (P1)

Como profesor quiero que los materiales y criterios de aprendizaje se recuperen por significado en español para que la calificación y Xali puedan usar las fuentes pertinentes.

**Prueba independiente**: indexar un documento educativo, consultar una idea expresada con palabras diferentes y comprobar que el fragmento pertinente aparece con su fuente.

**Escenarios de aceptación**:

1. **Dado** un documento indexado con la ruta Qwen activa, **cuando** se consulta un concepto equivalente en español, **entonces** se recupera el fragmento correcto y se identifica su fuente.
2. **Dado** un documento y una consulta, **cuando** se ejecuta la búsqueda, **entonces** ambos usan el mismo espacio semántico y nunca se comparan vectores incompatibles.

### Historia 2: calificar aunque RAG no esté disponible (P1)

Como profesor quiero que una caída del servicio de embeddings no bloquee la calificación ni produzca una nota artificial.

**Prueba independiente**: detener el servicio de embeddings durante una calificación y verificar que el flujo continúa sin contexto RAG, conserva la revisión humana y registra un diagnóstico sanitizado.

**Escenarios de aceptación**:

1. **Dado** que Qwen no responde, **cuando** se califica una evidencia, **entonces** la valoración continúa con evaluación, rúbrica y evidencia, sin publicar automáticamente por causa del fallo.
2. **Dado** un fallo de proveedor, **cuando** se registra la incidencia, **entonces** no aparecen claves, contenido estudiantil ni mensajes sensibles.

### Historia 3: cambiar la ruta de embeddings de forma controlada (P2)

Como administrador quiero ver y configurar el proveedor y modelo real de embeddings sin mezclar vectores creados por modelos distintos.

**Prueba independiente**: consultar la configuración administrativa, cambiar de proveedor en un entorno controlado y comprobar que el sistema exige reindexar antes de usar el nuevo espacio.

**Escenarios de aceptación**:

1. **Dado** Qwen institucional disponible, **cuando** el administrador consulta la ruta RAG, **entonces** ve el proveedor, modelo, dimensión y estado efectivos.
2. **Dado** un cambio de modelo, **cuando** existen fuentes previas, **entonces** pueden reindexarse conservando sus textos, propietarios y materias.

### Casos límite

- El servicio inicia mientras el modelo todavía se descarga.
- La respuesta contiene una cantidad o dimensión de vectores inesperada.
- El servicio se queda sin memoria o supera el tiempo de respuesta.
- La base contiene vectores antiguos de 1536 dimensiones.
- Qwen está disponible, pero todavía no existen fragmentos indexados con ese espacio.
- El administrador selecciona OpenAI como ruta de emergencia: debe reindexar; no se mezclan espacios por petición.

## Requisitos

### Requisitos funcionales

- **FR-001**: el sistema DEBE ofrecer Qwen3 Embedding 0.6B como ruta institucional principal de embeddings.
- **FR-002**: el servicio de embeddings del VPS DEBE estar aislado, ser persistente, verificable y tener límites que protejan los procesos de calificación.
- **FR-003**: documentos y consultas DEBEN usar exactamente el mismo proveedor, modelo, dimensión y versión del espacio semántico.
- **FR-004**: cada fragmento indexado DEBE registrar proveedor, modelo, dimensión y versión sin guardar secretos.
- **FR-005**: los vectores activos DEBEN tener 1024 dimensiones y validarse antes de persistirse o consultarse.
- **FR-006**: los fragmentos existentes DEBEN poder reindexarse conservando la fuente, texto, materia y propietario.
- **FR-007**: un fallo de embeddings DEBE degradar RAG a no disponible sin impedir la calificación ni fabricar contexto.
- **FR-008**: OpenAI DEBE permanecer disponible como ruta administrativa de emergencia, pero un cambio de espacio DEBE requerir reindexación; no habrá fallback automático entre espacios incompatibles.
- **FR-009**: el panel administrativo DEBE mostrar la ruta Qwen y su modelo como opciones reales, no meramente decorativas.
- **FR-010**: ninguna API key, documento, respuesta de estudiante o cuerpo sensible del proveedor DEBE aparecer en registros o telemetría.
- **FR-011**: la migración DEBE conservar las fuentes RAG y permitir reversión; solo puede invalidar vectores derivados que necesiten reindexación.
- **FR-012**: el despliegue y la carga del modelo DEBEN ser reproducibles sin instalación manual oculta.

### Entidades clave

- **Fuente RAG**: documento original, propietario, materia, tipo y metadatos que deben conservarse durante una reindexación.
- **Fragmento RAG**: parte de una fuente con texto y metadatos del espacio semántico activo.
- **Ruta de embeddings**: selección administrativa de proveedor, modelo, dimensión y versión.
- **Servicio institucional de embeddings**: proceso aislado que sirve el modelo Qwen dentro de la red privada.

## Criterios de éxito

- **SC-001**: una consulta de prueba recupera el fragmento semánticamente pertinente con su fuente en menos de 5 segundos después de calentar el modelo.
- **SC-002**: el 100 % de los vectores persistidos y consultados tiene 1024 dimensiones y metadatos completos del espacio.
- **SC-003**: al detener Qwen, una calificación de regresión termina sin bloqueo y reporta RAG no disponible.
- **SC-004**: una reindexación de prueba conserva el 100 % de las fuentes y textos originales.
- **SC-005**: backend, migraciones, configuración Docker, pruebas y gobierno de especificaciones permanecen verdes antes de producción.

## Supuestos

- El VPS tiene capacidad suficiente para la variante 0.6B, pero no GPU; se prioriza estabilidad sobre una variante mayor.
- Actualmente producción no contiene fragmentos RAG, por lo que la primera migración no pierde contexto indexado.
- OpenAI seguirá siendo seleccionable, pero no se considera un fallback semánticamente compatible sin reindexación.
- La calificación asistida conserva RAG como contexto complementario, nunca como fuente autónoma de puntaje.
