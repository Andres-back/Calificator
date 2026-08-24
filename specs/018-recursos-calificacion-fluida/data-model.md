# Modelo de datos: Recursos y calificación fluida

## Material generado (existente)

Tabla responsable: materiales_generados.

| Campo | Uso |
|---|---|
| id | Identidad única en biblioteca y materia |
| profesor_id | Autor y límite de administración |
| materia_id | Materia contextual o asignada |
| tipo | Tipo de recurso |
| titulo, contenido_json, archivo_url | Contenido editable y descargable |
| asignacion_tipo | null para borrador, apoyo o actividad |
| publicado_estudiantes | Visibilidad efectiva del recurso |
| fecha_publicacion | Última habilitación visible |
| created_at, updated_at | Orden y auditoría básica |

Invariantes:
- El recurso no se copia al asignarse.
- asignacion_tipo nulo implica borrador visible para el profesor en biblioteca y materia, pero no visible para estudiantes.
- apoyo no tiene evaluación ni entregas.
- actividad exige una Evaluación vinculada.
- un recurso oculto conserva contenido y relaciones.

## Evaluación vinculada (existente)

Tabla responsable: evaluaciones.

| Campo | Uso |
|---|---|
| id | Actividad canónica |
| material_origen_id | Relación única con el recurso |
| materia_id, profesor_id | Deben coincidir con el recurso |
| estado | Borrador, publicada, en calificación, revisión o cerrada |
| recepcion_habilitada | Permite o bloquea nuevas entregas independientemente de visibilidad |
| fecha_inicio, fecha_fin | Ventana de trabajo |
| nota_maxima, modalidad, preguntas, blueprint | Contrato de resolución y calificación |

Invariantes:
- El índice único parcial de material_origen_id impide dos evaluaciones para el mismo recurso.
- Publicar una evaluación vinculada habilita publicado_estudiantes del material.
- Ocultar el material no elimina ni altera notas y entregas.
- Pausar o cerrar recepción no oculta el material.
- El estudiante necesita matrícula, estado visible de evaluación y material publicado.

## Proyección de recurso

MaterialRead y MaterialListItem se amplían de forma aditiva con:

| Campo | Tipo | Fuente |
|---|---|---|
| evaluacion_id | UUID opcional | join por material_origen_id |
| evaluacion_estado | string opcional | Evaluación |
| evaluacion_modalidad | string opcional | Evaluación |
| evaluacion_recepcion_habilitada | boolean opcional | Evaluación |
| asignacion_tipo | apoyo, actividad o null | Material |
| publicado_estudiantes | boolean | Material |

No se persiste una copia de estos estados.

## Estado de asignación

    borrador
      | publicar apoyo
      v
    apoyo oculto <----> apoyo visible
      |
      | convertir, solo sin evaluación existente
      v
    actividad borrador --> actividad visible/recepción abierta
                              |              |
                              | pausar       | cerrar
                              v              v
                         visible/sin recepción
                              |
                              | ocultar/mostrar
                              v
                         oculta/sin cambiar recepción

Cambiar materia:
- borrador: permitido tras autorización;
- apoyo sin historial: permitido con confirmación;
- actividad o apoyo con consumo: requiere conservar relación vigente o crear una decisión explícita posterior, nunca actualización silenciosa.

## Trabajo de IA (existente, contrato JSON ampliado)

Tabla responsable: ai_jobs.

resultado_json añade:

| Campo | Tipo | Descripción |
|---|---|---|
| pipeline_run_id | UUID | Correlación |
| timings_ms | objeto | queue, prepare, extraction, primary, secondary, consolidation, persistence, total |
| strategy | objeto | capacidades usadas, sin prompt ni contenido |
| fallbacks | lista | etapa, candidato anterior y causa técnica normalizada |
| terminal_reason | string | success, review_required, provider_timeout, invalid_evidence u otro catálogo |
| deadline_ms | entero nulo | Campo legacy; permanece nulo porque el tiempo no cancela inferencias |
| slow_after_ms | entero | Umbral informativo para indicar que el proveedor sigue trabajando |

Invariantes:
- Un job terminal no vuelve a running.
- Una respuesta tardía no modifica resultado_json terminal.
- El idempotency key existente o derivado del trabajo evita duplicados.
- Los tiempos nunca incluyen contenido estudiantil.

## Evento de uso IA (existente, semántica normalizada)

Tabla responsable: ai_usage_events.

Cada intento externo genera exactamente un evento lógico con:
- pipeline_run_id y request_id;
- feature y stage canónico: extraction, structure, key_repair, grading_primary, grading_secondary, targeted_recheck o consolidation;
- provider/model, attempt_number, status, started_at/completed_at, latency_ms, image_count y error_code;
- tokens/costo cuando existan.

No se registran prompts, respuestas, imágenes, nombres ni identificadores de estudiante.

## Componente puntuable (existente)

El desglose y sus versiones no cambian de autoridad. La UI edita:

| Campo | Regla |
|---|---|
| componente_id | Debe pertenecer a la versión esperada |
| puntos_obtenidos | 0 a puntos_maximos |
| estado | Catálogo vigente |
| motivo_interno | Obligatorio y no visible al estudiante |
| explicacion_estudiante | Obligatoria, pedagógica y visible según publicación |
| version_esperada | Control optimista; conflicto produce 409 |

Previsualización:
- se calcula en cliente con la fórmula ya recibida;
- no cambia la nota oficial;
- el servidor recalcula y versiona al guardar.

## Sesión de revisión (solo interfaz)

Estado no persistente:
- materiaId, evaluacionId, filtro, selectedId;
- scrollTop de lista y detalle;
- editingComponentId y dirty;
- panel móvil abierto.

Al cerrar/desmontar:
- restaura document.body.style.overflow;
- conserva filtros/posición en memoria de ruta;
- descarta el estado de edición solo mediante decisión explícita.
