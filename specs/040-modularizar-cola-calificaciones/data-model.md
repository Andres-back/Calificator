# Modelo de datos: encolado seguro de calificaciones

No se crean tablas, columnas, índices ni migraciones. Este documento registra las entidades e invariantes existentes que la extracción debe preservar.

## Entidades

### Entrega

Representa una única entrega del estudiante para una evaluación.

- Identidad: `entrega.id`.
- Relaciones relevantes: evaluación, materia y estudiante.
- Evidencia: archivo consolidado o respuestas online, con metadatos visuales.
- Estado al encolar: evidencia persistida y disponible para el worker.

### Calificación

Representa la revisión y nota consolidada de una entrega.

- Debe existir como máximo una calificación vigente por entrega.
- Antes de terminar la IA permanece en estado pendiente/procesando, sin publicar una nota ficticia.
- `job_id` enlaza la calificación con el trabajo hijo que procesa la entrega.
- Si se recibe una calificación existente, se actualiza en lugar de agregar otra instancia a la sesión.

### Trabajo padre: `calificacion_lote`

Agrupa uno o más trabajos de entrega y ofrece un resumen observable.

- En el recorrido individual contiene una sola entrega y un solo estudiante.
- Captura la configuración efectiva de IA que heredará el hijo.
- Su estado agregado se calcula a partir de sus hijos.

### Trabajo hijo: `calificacion_entrega`

Representa una ejecución recuperable para una entrega.

- Relacionado con el padre y la entrega.
- Contiene evaluación, entrega, estudiante, modalidad y configuración de IA.
- Es la identidad estable que se publica en Celery y se registra en la calificación.

## Relaciones

```text
Evaluación ──< Entrega ──1 Calificación
                  │              │
                  └──── Trabajo hijo >──── Trabajo padre
```

## Estados del trabajo

```text
queued ──reclamación atómica──> running ──> completed
   │                               └──────> failed/retrying
   └──fallo al publicar──────────> retrying ──republicación──> running
```

Un mensaje duplicado no crea otro trabajo ni otra calificación. Si el hijo ya fue reclamado, la segunda reclamación no ejecuta de nuevo la inferencia.

## Invariantes

1. La evidencia y la calificación pendiente se confirman antes de publicar el trabajo.
2. La calificación referencia exactamente el hijo que será ejecutado o recuperado.
3. Un fallo del broker conserva entrega, evidencia, calificación y trabajo.
4. Reintentar usa la misma identidad lógica; no crea archivos, entregas o calificaciones duplicadas.
5. La configuración de IA capturada por el padre se copia al hijo sin reinterpretarla.
6. Los permisos se comprueban en el router antes de invocar el servicio.
7. La extracción no cambia estados visibles, notas, revisión humana ni publicación al estudiante.

## Validación

- `evaluacion`, `entrega`, `estudiante_id` y `profesor_id` son obligatorios.
- `evidence_metadata` y `calificacion` son opcionales.
- La entrega debe estar preparada y pertenecer al contexto autorizado antes de llamar al servicio.
- El servicio devuelve una `Calificacion` confirmada y refrescada, incluso cuando la publicación queda pendiente de recuperación.
