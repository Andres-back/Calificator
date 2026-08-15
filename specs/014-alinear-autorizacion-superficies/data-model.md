# Modelo de autorización: especificación 014

No se añaden tablas ni columnas. Este documento describe relaciones existentes que participan en decisiones de acceso y el contrato lógico del evento analítico.

## Actor autenticado

- `id`: identidad efectiva obtenida de la sesión.
- `rol`: `profesor`, `estudiante` o `admin`.
- `estado`: debe permitir autenticación vigente.

La identidad o rol enviados dentro de un cuerpo nunca sustituyen estos valores.

## Ámbito docente

Relación derivada entre el actor profesor y uno de estos objetos:

- Materia: `materia.profesor_id == actor.id`.
- Presentación: `presentacion.profesor_id == actor.id`.
- Material: `material.profesor_id == actor.id`.
- Evaluación: relación validada por la evaluación y su profesor/materia.
- Incidencia: incidencia → calificación → evaluación → ámbito docente.

Un identificador conocido no concede acceso. Administrador se evalúa según las capacidades existentes de cada servicio.

## Asignación estudiantil

Una lectura estudiantil requiere:

1. Matrícula activa del estudiante en la materia.
2. Objeto vinculado a esa materia.
3. Estado visible para estudiante:
   - recurso de apoyo publicado, o actividad en estado estudiantil admitido;
   - presentación marcada como publicada.
4. Saneamiento de soluciones o contenido reservado cuando aplique.

Perder matrícula activa o retirar publicación revoca lecturas futuras.

## Incidencia

Estados relevantes: abierta y resuelta.

Transición permitida:

`abierta --resolver(profesor responsable o admin habilitado)--> resuelta`

La transición conserva `resuelto_por`, `resolved_at`, resolución y relación con calificación. Estudiante puede originar la solicitud de revisión por su recorrido propio, pero no ejecutar esta transición.

## Política de evento analítico

Elemento versionado en código con:

- `tipo`: nombre canónico único.
- `roles`: roles que pueden emitirlo.
- `referencias`: ninguna, evaluación, calificación o ambas.
- `metadata_keys`: claves mínimas admitidas.
- `max_metadata_bytes`: límite posterior a normalización.

No se persiste como tabla administrable.

## Evento analítico validado

- `tipo`: debe existir en el catálogo.
- `actor_id`: siempre derivado de sesión.
- `evaluacion_id`: opcional y autorizada por política y ámbito.
- `calificacion_id`: opcional, autorizada por política y ámbito.
- `metadata_json`: objeto saneado según la política.

### Reglas de coherencia

- Si aparecen evaluación y calificación, la calificación pertenece a esa evaluación.
- Profesor solo referencia evaluaciones bajo su gestión y sus calificaciones.
- Estudiante solo referencia evaluaciones de matrícula activa y calificaciones propias cuando la política lo permita.
- Administrador usa únicamente eventos y referencias que su política admita.
- Un evento inválido no crea fila parcial.

## Override de permiso inventariado

- `surface_id`: superficie exacta y activa.
- `actors`: actores efectivos comprobados.
- `reason`: por qué el análisis automático no es suficiente.
- `issue_url`: issue responsable.
- `evidence`: una o más rutas versionadas de pruebas.

El inventario rechaza overrides duplicados, sin superficie, actores inválidos, issue no HTTPS, evidencia ausente, ruta inexistente o archivo que no sea prueba.
