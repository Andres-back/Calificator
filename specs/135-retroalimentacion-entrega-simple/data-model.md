# Estado y datos reutilizados

Sin nuevas entidades persistentes ni migraciones.

- `FeedbackPreview`: fuente vigente, candidata de revisión individual, candidata de lote, estado entregable y motivos. La candidata contiene el texto entregable normalizado conservadoramente; el borrador docente puede conservar el análisis original para inspección.
- `FeedbackDeliveryReview`/`FeedbackPublication`: decisión explícita y snapshot actuales, con huella de fuente. Aprobar un resumen conserva `respuestas=[]` cuando el desglose no es entregable.
- `FeedbackDeliveryBatch`: solicitud y resultados por estudiante; idempotencia de aprobar/publicar existente.
- `FeedbackAccess`: acceso actual con versión, huella, vigencia y estado; copiar conserva sus propiedades.
- Preparación compuesta del cliente: selección/opciones congeladas, etapa `confirmación/aprobación/consulta/emisión/recuperación/resultado`, recibos y request_ids. Identidad ligada a cuenta/evaluación; persistir solo metadatos de recuperación permitidos, nunca URLs, tokens, fotos o mensajes privados en caché no autorizada.
- Presentación del mensaje: secciones derivadas de etiquetas explícitas y referencias de pregunta; no crea contenido ni datos académicos.

Invariantes: una respuesta incierta no equivale a fallo ni habilita otra intención; una aprobación parcial no equivale a enlace creado; enlace creado no equivale a copiado; ocupación no equivale a edición sin guardar.
