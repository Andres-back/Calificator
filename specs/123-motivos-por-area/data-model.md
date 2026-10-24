# Datos y estados: biblioteca de motivos

## Colección curada

- `id`: identificador estable; `general` más diez áreas de la especificación.
- `label`: nombre visible en español.
- `aliases`: asociaciones explícitas normalizadas para sugerir área, nunca escritura sobre una materia.
- `ordered_motif_ids`: lista estable; veinte generales o exactamente treinta nuevos por área.

El orden y los IDs de una versión publicada no cambian silenciosamente: la mezcla de fichas debe ser reproducible. Una materia no incorpora relación obligatoria nueva con esta colección.

## Motivo curado

- `id`, `collection_id`, `label`, `description`: identidad estable y descripción temática.
- `source`: procedencia y referencia del registro de creación; sin datos personales ni claves.
- `full_asset`, `thumbnail_asset`: referencias internas de paquete, no datos aceptados del cliente.
- `sha256`, dimensiones, formato y tamaño de cada derivado.
- `catalog_version`: versión revisable del conjunto.

Validación: ID único; pertenencia única; archivo real existente; firma de formato correcta; transparencia alfa real; dimensiones y presupuestos del plan; ningún duplicado exacto. La revisión humana visual complementa hashes para evitar duplicados semánticos. Nuevos motivos sin texto, marcas, cuadros blancos o señales de desempeño.

Los veinte IDs existentes conservan sus valores y rutas. Cualquier copia para empaquetado del servidor debe coincidir por hash con su archivo original, sin contarla como motivo nuevo.

## Selección de impresión

Estado de presentación de la sesión: colección, modo `none | fixed | mixed` y motivo concreto cuando sea fijo. No cambia la calificación ni la devolución guardadas. Mezcla determinada por ID del destinatario y orden estable de la colección, sin interpretar nombre, género, nota o conducta. Las continuaciones conservan el mismo resultado.

## Presentación de recurso

Almacenada dentro del JSON existente como espacio reservado `_presentacion`:

```json
{"version": 1, "decoracion": {"motif_id": "matematicas-001", "placement": "header"}}
```

IDs ilustrativos: la lista definitiva pertenecerá al manifiesto revisado. El contrato de edición recibe `decoracion`, no una ruta/URL ni un reemplazo libre de `_presentacion`.

- Propiedad omitida: conservar presentación guardada.
- `decoracion: null`: quitar solo la decoración.
- Objeto válido: reemplazar solo la decoración, verificando ID y posición admitida.
- JSON legado sin `_presentacion`: sin decoración, contenido intacto.
- Motivo desconocido en datos legados: omitir imagen con fallback textual; no borrar contenido académico.
- En nuevas escrituras, ID desconocido: rechazar sin cambio parcial.

Una edición decorativa usa combinación atómica del estado vigente bajo la protección transaccional aplicable; no sobrescribe el contenido leído previamente por el cliente. Las ediciones académicas no pueden introducir o borrar esta presentación por el campo genérico. No hay reconstrucción de preguntas/criterios ni sincronización de actividades vinculadas. Conservar la política actual de edición y visibilidad de recursos publicados.

## Imagen de pregunta

No se crea otra entidad. La biblioteca proporciona los bytes iniciales para el recurso visual existente, con `recurso_id`, descripción, origen y revisión. Su bloque se incorpora en `EvaluacionContenidoVersion` solo con guardado explícito y control de versión. Las notas e instantáneas previas mantienen su versión original.

Estados: selección local → archivo preparado → vista previa cargada → confirmación docente → borrador aceptado → guardado versionado. Cancelar antes del guardado no modifica la evaluación vigente. Archivos preparados abandonados mantienen la retención/limpieza existente; no se inventa otro mecanismo de borrado.

## Invariantes

No tabla nueva ni migración. Ningún dato del estudiante forma parte del catálogo. Ningún cambio en credenciales, claves de enlace, cuotas del chat, roles, modelos, evidencias originales, nota vigente o historial por abrir/elegir decoración. Añadir explícitamente una imagen a una pregunta sí produce una nueva versión autorizada, no una modificación retroactiva de entregas.
