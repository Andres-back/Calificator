# Contrato HTTP propuesto

Prefijo canónico: `/api`. Todos los endpoints exigen sesión y permisos de backend. Los nombres finales se mantienen en español para ser coherentes con el dominio existente.

## Conjuntos y versiones

### `GET /materias/{materia_id}/criterios-aprendizaje`

Lista paginada con estado, última versión aprobada, cantidad de fuentes y usos. Profesor: solo sus materias autorizadas. Estudiante: `403`.

### `POST /materias/{materia_id}/criterios-aprendizaje`

```json
{
  "titulo": "Comprensión de fracciones equivalentes",
  "descripcion": "Criterios para el taller del capítulo 3",
  "intencion_docente": {
    "que_evaluar": "Representación y justificación de equivalencias",
    "como_evaluar": "Procedimiento y respuesta final",
    "grado": "5",
    "tipo_evidencia": "taller_en_papel",
    "prioridades": ["procedimiento", "argumentacion"]
  }
}
```

Crea conjunto y versión 1 en borrador. `201`; un `Idempotency-Key` repetido devuelve el mismo resultado.

### `GET /criterios-aprendizaje/{set_id}`

Devuelve conjunto, versión de trabajo, versión aprobada y usos. Un profesor ajeno recibe `404` para no revelar existencia.

### `POST /criterios-aprendizaje/{set_id}/versiones`

Crea el siguiente borrador copiando una versión aprobada. Conflicto `409` si ya existe un borrador activo.

### `PATCH /criterios-aprendizaje/versiones/{version_id}`

Actualiza título/intención o la colección ordenada de criterios. Solo estado `borrador` o `requiere_revision`; `409` si está aprobada/procesando. Valida nombres, niveles, puntajes y suma de pesos.

### `POST /criterios-aprendizaje/versiones/{version_id}/aprobar`

Aprueba explícitamente. Rechaza con `422` y bloqueos estructurados si no hay criterios, pesos inválidos, fuentes aún procesándose o cobertura asistida insuficiente no reconocida por el docente.

### `POST /criterios-aprendizaje/{set_id}/archivar`

Oculta el conjunto de nuevas selecciones. No elimina aplicaciones, snapshots ni notas.

## Fuentes

### `POST /criterios-aprendizaje/versiones/{version_id}/fuentes/archivo`

Multipart repetido `archivo`: hasta 10 imágenes ordenadas o un PDF/documento admitido, sin mezcla inválida. Reutiliza límites comunes y almacenamiento privado. La respuesta `201` lista hojas/fuentes registradas; la operación es atómica.

### `POST /criterios-aprendizaje/versiones/{version_id}/fuentes/texto`

Registra texto o instrucciones manuales con límite explícito. El contenido no aparece en logs.

### `POST /criterios-aprendizaje/versiones/{version_id}/fuentes/referencia`

Vincula un material existente o estándar oficial autorizado por id, sin duplicarlo.

### `DELETE /criterios-aprendizaje/fuentes/{source_id}`

Solo en borrador. Limpia archivo privado/chunks de manera recuperable y auditable; si falla la limpieza, no confirma eliminación silenciosamente.

### `GET /criterios-aprendizaje/fuentes/{source_id}`

Devuelve metadatos y estado de extracción al propietario autorizado. El contenido se transmite desde almacenamiento privado con autorización renovada en cada solicitud; no se entrega una URL pública permanente. Estudiante y profesor ajeno reciben `404` sin metadatos.

## Propuesta asistida

### `POST /criterios-aprendizaje/versiones/{version_id}/proponer`

```json
{
  "regenerar": false,
  "reconocer_advertencias": []
}
```

Devuelve `202` con `job_id`, `version_id` y estado. La idempotencia usa versión, huella de fuentes, intención y versión del prompt. No crea otro job activo para la misma huella.

El job produce criterios propuestos, niveles, pesos y `source_refs`; nunca aprueba ni aplica automáticamente. Estado y reintento se consultan mediante los contratos existentes de `/jobs`.

## Aplicación

### Evaluaciones

Los payloads actuales de crear/actualizar evaluación aceptan opcionalmente:

```json
{
  "criterios_aprendizaje_version_id": "uuid"
}
```

El backend exige versión aprobada, misma materia y acceso del profesor; escribe `learning_criterion_applications`, `evaluaciones.criterios` y el blueprint/snapshot vigente. Los payloads sin el campo mantienen comportamiento actual.

### Recursos

Crear, editar o asignar recurso acepta el mismo campo opcional. El recurso conserva snapshot y solo expone al estudiante fuentes con `visible_to_student=true` que hayan sido asignadas.

## Compatibilidad

- `GET /materias/{id}/dba` y CRUD de `dba-personalizados` permanecen durante la transición.
- La UI canónica consume los endpoints nuevos y presenta los resultados DBA como “Estándares oficiales”.
- No se cambia el contrato de lectura de evaluaciones/calificaciones en la primera fase; se añaden campos opcionales.
- Todo error usa el formato normalizado existente, con código estable, mensaje comprensible y detalles de campo sin contenido sensible.
