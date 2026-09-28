# Modelo de datos: Criterios de aprendizaje

## 1. `learning_criterion_sets`

Identidad reutilizable de un propósito evaluativo dentro de una materia.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `materia_id` | UUID | FK obligatoria, indexada |
| `profesor_id` | UUID | FK obligatoria, propietario |
| `titulo` | varchar(180) | obligatorio |
| `descripcion` | text | opcional |
| `estado` | enum | `activo`, `archivado` |
| `current_version_id` | UUID | FK nullable a última versión aprobada |
| `created_at`, `updated_at` | timestamptz | auditoría |

Restricción: solo el propietario o un usuario con permiso institucional explícito puede modificarlo. Archivar no elimina versiones ni aplicaciones.

## 2. `learning_criterion_versions`

Versión editable o aprobada del conjunto.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `set_id` | UUID | FK obligatoria, indexada |
| `version_number` | integer | positivo, único por conjunto |
| `estado` | enum | `borrador`, `procesando`, `requiere_revision`, `aprobada`, `sustituida` |
| `teacher_intent_json` | JSONB | propósito, grado, evidencia, modalidad, prioridades y restricciones |
| `generation_meta_json` | JSONB | proveedor/modelo efectivo, prompt/versiones y advertencias; nunca secretos |
| `coverage_json` | JSONB | referencias por criterio, vacíos y contradicciones |
| `source_fingerprint` | varchar(64) | huella de fuentes+intención para idempotencia |
| `created_by`, `approved_by` | UUID | actores auditables |
| `created_at`, `approved_at` | timestamptz | auditoría |

Restricciones:

- `UNIQUE(set_id, version_number)`.
- Una versión `aprobada` no admite cambios en intención, fuentes o criterios.
- Cambiar una aprobada crea un nuevo borrador con `version_number + 1`.
- La aprobación exige al menos un criterio válido, pesos consistentes y ausencia de bloqueos de cobertura.

## 3. `learning_criteria`

Criterios observables de una versión.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `version_id` | UUID | FK obligatoria con borrado en cascada solo para borradores |
| `stable_key` | varchar(80) | único por versión, usado en snapshots/desglose |
| `orden` | integer | positivo, único por versión |
| `nombre` | varchar(180) | obligatorio |
| `descripcion` | text | conducta/conocimiento observable |
| `evidencia_esperada` | text | qué demuestra logro |
| `peso_porcentaje` | numeric(5,2) | 0–100; suma 100 cuando aplica rúbrica |
| `puntaje_maximo` | numeric(8,2) | no negativo, opcional hasta aplicar |
| `niveles_json` | JSONB | niveles ordenados con descriptor y rango |
| `source_refs_json` | JSONB | fuente/página/fragmento que lo sustenta |
| `official_standard_refs_json` | JSONB | DBA u otros estándares opcionales |
| `created_at`, `updated_at` | timestamptz | auditoría |

No se almacena una respuesta del estudiante en esta tabla. Las valoraciones por respuesta siguen en el desglose de calificación existente y referencian `stable_key` más el snapshot.

## 4. `learning_criterion_sources`

Material privado utilizado para construir una versión.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `version_id` | UUID | FK obligatoria |
| `tipo` | enum | `foto`, `pdf`, `documento`, `texto`, `material_existente`, `estandar_oficial` |
| `orden` | integer | orden de lectura, único por versión |
| `display_name` | varchar(255) | nombre seguro visible |
| `private_file_key` | text | nullable, nunca URL pública |
| `mime_type` | varchar(120) | lista permitida |
| `size_bytes`, `page_count` | integer | límites y visualización |
| `rag_source_id` | UUID | FK nullable a `rag_sources` |
| `reference_json` | JSONB | id de recurso/estándar o texto manual minimizado |
| `extraction_status` | enum | `pendiente`, `procesando`, `lista`, `error`, `eliminada` |
| `content_hash` | varchar(64) | deduplicación dentro de versión |
| `visible_to_student` | boolean | falso por defecto |
| `created_at`, `deleted_at` | timestamptz | auditoría/retención |

Una carga fallida no crea una fuente utilizable. Al eliminar un borrador se limpian archivo y chunks; las fuentes de una versión aplicada siguen la política de retención institucional.

## 5. `learning_criterion_applications`

Vínculo entre una versión aprobada y un consumidor.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `version_id` | UUID | FK obligatoria a versión aprobada |
| `target_type` | enum | `evaluacion`, `recurso` |
| `target_id` | UUID | id del consumidor |
| `snapshot_json` | JSONB | contrato completo e inmutable aplicado |
| `snapshot_hash` | varchar(64) | integridad y backfill idempotente |
| `is_current` | boolean | aplicación seleccionada para nuevas operaciones |
| `applied_by`, `applied_at` | UUID/timestamptz | auditoría |

Restricciones: índice único parcial `(target_type, target_id) WHERE is_current=true`. Cada aplicación es inmutable; reasignar crea una fila nueva y desactiva la anterior. Las calificaciones ya creadas continúan enlazadas a la aplicación anterior.

## 6. `grading_component_criteria`

Relación auditable entre un componente del desglose existente y los criterios que justifican su valoración.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `component_id` | UUID | FK obligatoria a componente de calificación |
| `application_id` | UUID | FK obligatoria a aplicación/snapshot |
| `criterion_stable_key` | varchar(80) | criterio exacto de la versión aplicada |
| `criterion_snapshot_json` | JSONB | nombre, descriptor y procedencia congelados |
| `max_points`, `awarded_points` | numeric(8,2) | parte atribuible, sin duplicar el total del componente |
| `created_at` | timestamptz | auditoría |

Puede haber varios criterios por respuesta, pero la suma atribuida no supera los puntos del componente. La nota continúa siendo calculada por el desglose vigente; esta relación explica, no crea, una segunda fórmula.

## Compatibilidad con entidades actuales

- `dba_catalog`: permanece como catálogo de estándares oficiales.
- `dba_personalizados`: se expone como criterio/estándar heredado y puede importarse a un conjunto sin modificar el original.
- `evaluaciones.criterios`, `dba_ids`, `dba_personalizado_ids`: se siguen poblando mediante el adaptador durante la transición.
- `evaluacion_blueprints.criterios` y `dba`: conservan el snapshot definitivo usado al calificar.
- Desglose de calificaciones: añade `criterion_stable_key`/procedencia dentro del JSON existente antes de considerar una columna nueva.
- Analítica: agrupa por conjunto, versión y `stable_key`; el nombre queda como etiqueta y no como identidad histórica.
- `rag_sources`/`rag_chunks`: se reutilizan para extracción y búsqueda, siempre con ámbito de autorización de la materia/profesor.

## Transiciones

```text
borrador → procesando → borrador
                    ↘ requiere_revision → borrador
borrador → aprobada → sustituida
aprobada ──editar──→ nuevo borrador (versión siguiente)
```

Una versión `procesando` conserva edición bloqueada solo sobre las entradas enviadas; el profesor puede seguir navegando. Un fallo vuelve a `requiere_revision` y permite reintentar con la misma huella sin duplicación.

## Backfill histórico

- Cada `DBAPersonalizado` produce una versión aprobada de origen `legacy_dba_personalizado`, ligada de forma única a su UUID anterior.
- `DBACatalog` se referencia como estándar oficial; no se copia ni modifica.
- Cada evaluación con blueprint produce una aplicación `legacy_snapshot` con hash canónico. Sin blueprint, se usan sus JSON actuales.
- Una nota existente nunca se recalcula. Si no puede demostrarse la versión exacta, se marca `legacy_reconstructed` y sus valores originales siguen siendo autoridad.
- Reejecutar el backfill con la misma entrada produce cero filas o cambios adicionales.
