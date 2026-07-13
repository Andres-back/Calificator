# XCalificator — Glosario de Variables y Endpoints

> **Convención:** BD y Python usan `snake_case` · Frontend usa `camelCase`
> Todos los `id` son `UUID v4`. Fechas en ISO 8601 UTC.

---

## 0. Sistema de Roles y Permisos

### Roles disponibles

| Rol | Valor BD | Descripción |
|---|---|---|
| Administrador | `admin` | Acceso total. Gestiona usuarios, configuración IA, estadísticas globales. |
| Profesor | `profesor` | Crea y gestiona sus materias, evaluaciones, herramientas y calificaciones. |
| Estudiante | `estudiante` | Se matricula en materias, entrega actividades, consulta sus notas, usa Xali. |

---

### Cómo funciona en el backend

El sistema vive en `app/core/permissions.py` y tiene 4 funciones:

```python
# 1. Extrae el usuario del JWT (cookie httpOnly o header Bearer)
#    Lanza 401 si no hay token o el usuario está inactivo
get_current_user(request, authorization, db) → User

# 2. Verificación inline — lanza 403 si el rol no está permitido
#    Uso: dentro del cuerpo del endpoint
require_role(current_user, [UserRole.PROFESOR, UserRole.ADMIN])

# 3. FastAPI Dependency factory — lanza 403 automáticamente
#    Uso: en el parámetro Depends() del endpoint
require_roles(UserRole.ADMIN)

# 4. Verifica si el usuario actual es dueño del recurso O es admin
can_manage_profesor_resource(current_user, profesor_id) → bool

# 5. Verifica que un estudiante esté matriculado en una materia
is_student_enrolled(db, materia_id, estudiante_id) → bool
```

---

### Matriz de permisos por endpoint

#### 🔐 Auth

| Endpoint | Admin | Profesor | Estudiante | Sin sesión |
|---|:---:|:---:|:---:|:---:|
| `POST /auth/login` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/register` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/refresh` | ✅ | ✅ | ✅ | ✅ |
| `POST /auth/logout` | ✅ | ✅ | ✅ | ❌ |
| `GET /auth/me` | ✅ | ✅ | ✅ | ❌ |

#### 👤 Usuarios

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `GET /users/me` | ✅ | ✅ | ✅ |
| `PATCH /users/me` | ✅ | ✅ | ✅ |
| `GET /admin/users` | ✅ | ❌ | ❌ |
| `POST /admin/users` | ✅ | ❌ | ❌ |
| `PATCH /admin/users/{usuario_id}` | ✅ | ❌ | ❌ |
| `DELETE /admin/users/{usuario_id}` | ✅ | ❌ | ❌ |

#### 📚 Materias

| Endpoint | Admin | Profesor | Estudiante | Nota |
|---|:---:|:---:|:---:|---|
| `POST /materias` | ✅ | ✅ | ❌ | |
| `GET /materias` | ✅ | ✅ | ✅ | Profesor ve las suyas; estudiante las matriculadas |
| `GET /materias/{materia_id}` | ✅ | ✅ | ✅ | |
| `PATCH /materias/{materia_id}` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |
| `POST /materias/{materia_id}/regenerar-codigo` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |
| `GET /materias/{materia_id}/estudiantes` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |

#### 🎓 Matrículas

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `POST /matriculas/unirse` | ❌ | ❌ | ✅ |
| `GET /matriculas/mis-materias` | ❌ | ❌ | ✅ |
| `PATCH /matriculas/{matricula_id}/estado` | ✅ | ✅¹ | ❌ |

> ¹ Profesor solo puede aprobar/rechazar matrículas de sus propias materias.

#### 📋 DBA

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `GET /dba` | ✅ | ✅ | ✅ |
| `POST /dba/importar` | ✅ | ❌ | ❌ |

#### 📝 Evaluaciones

| Endpoint | Admin | Profesor | Estudiante | Nota |
|---|:---:|:---:|:---:|---|
| `POST /evaluaciones` | ✅ | ✅ | ❌ | |
| `POST /evaluaciones/externa/digitalizar` | ✅ | ✅ | ❌ | |
| `POST /evaluaciones/sorpresa` | ✅ | ✅ | ❌ | |
| `GET /materias/{materia_id}/evaluaciones` | ✅ | ✅ | ✅¹ | ¹ Solo las publicadas |
| `GET /evaluaciones/{evaluacion_id}` | ✅ | ✅ | ✅¹ | ¹ Solo si está matriculado |
| `PATCH /evaluaciones/{evaluacion_id}` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |
| `POST /evaluaciones/{evaluacion_id}/crear-blueprint` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |
| `POST /evaluaciones/{evaluacion_id}/publicar` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |
| `POST /evaluaciones/{evaluacion_id}/cerrar` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |
| `PATCH /evaluaciones/{evaluacion_id}/validar-estructura` | ✅ | ✅¹ | ❌ | ¹ Solo si es dueño |

#### ✅ Calificaciones

| Endpoint | Admin | Profesor | Estudiante | Nota |
|---|:---:|:---:|:---:|---|
| `POST /calificaciones/foto` | ✅ | ✅ | ❌ | |
| `PATCH /calificaciones/{calificacion_id}/confirmar` | ✅ | ✅ | ❌ | Principio: IA sugiere, docente confirma |
| `PATCH /calificaciones/{calificacion_id}/ajustar` | ✅ | ✅ | ❌ | |
| `GET /evaluaciones/{evaluacion_id}/calificaciones` | ✅ | ✅ | ❌ | |
| `GET /estudiantes/{estudiante_id}/boletin` | ✅ | ✅ | ✅¹ | ¹ Solo su propio boletín |
| `POST /calificaciones/modo-salon/iniciar` | ✅ | ✅ | ❌ | |
| `POST /calificaciones/modo-salon/{sesion_id}/foto` | ✅ | ✅ | ❌ | |

#### 🛠️ Herramientas

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `POST /herramientas/*` (todos) | ✅ | ✅ | ❌ |

#### 🖥️ Presentaciones

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `POST /presentaciones` | ✅ | ✅ | ❌ |
| `GET /presentaciones` | ✅ | ✅¹ | ❌ |
| `GET /presentaciones/{presentacion_id}` | ✅ | ✅¹ | ❌ |
| `GET /presentaciones/{presentacion_id}/estado` | ✅ | ✅¹ | ❌ |

> ¹ Solo las propias.

#### 🖼️ Imágenes

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `POST /imagenes/generar` | ✅ | ✅ | ❌ |

#### 🧠 RAG

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `POST /rag/sources` | ✅ | ✅ | ❌ |
| `POST /rag/ingest` | ✅ | ✅ | ❌ |
| `POST /rag/search` | ✅ | ✅ | ✅ |
| `GET /rag/sources` | ✅ | ✅ | ✅ |
| `DELETE /rag/sources/{source_id}` | ✅ | ✅¹ | ❌ |

> ¹ Solo los propios (verificación por `materia_id` del profesor).

#### 💬 Xali

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `POST /xali/chat` | ❌ | ❌ | ✅ |
| `GET /xali/history` | ❌ | ❌ | ✅¹ |
| `DELETE /xali/history` | ❌ | ❌ | ✅¹ |

> ¹ Solo su propio historial (se filtra por `current_user.id`).

#### 📊 Reportes

| Endpoint | Admin | Profesor | Estudiante | Nota |
|---|:---:|:---:|:---:|---|
| `GET /reportes/materia/{materia_id}` | ✅ | ✅¹ | ❌ | ¹ Solo sus materias |
| `GET /reportes/estudiante/{estudiante_id}` | ✅ | ✅ | ✅¹ | ¹ Solo el propio |
| `GET /reportes/profesor/resumen` | ✅ | ✅¹ | ❌ | ¹ Solo sus datos |
| `POST /reportes/export/pdf` | ✅ | ✅¹ | ❌ | ¹ Solo sus materias |

#### ⚙️ Jobs

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `GET /jobs/{job_id}` | ✅ | ✅¹ | ✅¹ |
| `GET /jobs/{job_id}/estado` | ✅ | ✅¹ | ✅¹ |
| `POST /jobs/{job_id}/cancelar` | ✅ | ✅¹ | ❌ |

> ¹ Solo jobs generados por el propio usuario.

#### 📐 Impacto Tesis

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `GET /impacto/kappa` | ✅ | ✅ | ❌ |
| `GET /impacto/tiempo-ahorrado` | ✅ | ✅ | ❌ |
| `POST /impacto/encuestas` | ✅ | ✅ | ✅ |
| `GET /impacto/likert` | ✅ | ✅ | ❌ |
| `GET /impacto/cualitativo` | ✅ | ✅ | ❌ |

#### 🔧 Admin IA

| Endpoint | Admin | Profesor | Estudiante |
|---|:---:|:---:|:---:|
| `GET /admin/ai-config` | ✅ | ❌ | ❌ |
| `PATCH /admin/ai-config` | ✅ | ❌ | ❌ |
| `PATCH /profesor/ai-config` | ✅ | ✅¹ | ❌ |
| `GET /admin/ai-usage` | ✅ | ❌ | ❌ |

> ¹ Solo su propia configuración.

---

### Cómo el frontend debe interpretar los roles

```typescript
type UserRole = 'admin' | 'profesor' | 'estudiante'

// Helpers de guardia
const esAdmin     = (rol: UserRole) => rol === 'admin'
const esProfesor  = (rol: UserRole) => rol === 'profesor' || rol === 'admin'
const esEstudiante = (rol: UserRole) => rol === 'estudiante'

// Ejemplo: mostrar botón "Calificar" solo a profesores/admin
{esProfesor(usuario.rol) && <BotonCalificar />}

// Ejemplo: mostrar boletín solo al propio estudiante o a profesores
{(esProfesor(usuario.rol) || usuario.id === estudianteId) && <Boletin />}
```

### Flujo de autenticación

```
Login → POST /auth/login → recibe cookie httpOnly (access_token + refresh_token)
                         → recibe { user: { id, nombre, email, rol, estado } }

Requests → cookie enviada automáticamente por el browser
         → backend decodifica JWT → extrae user_id → carga User de BD

Token expirado → POST /auth/refresh → nueva cookie
               → si refresh también expiró → redirect a login

Logout → POST /auth/logout → limpia cookies
```

---

## 1. Variables por entidad

### 🧑 Usuario (`users`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `nombre` | `nombre` | `nombre` | `string` | Nombre completo |
| `email` | `email` | `email` | `string` | Único, índice |
| `password_hash` | `password_hash` | — | `string` | Nunca expuesto en API |
| `rol` | `rol` | `rol` | `enum` | `admin` · `profesor` · `estudiante` |
| `estado` | `estado` | `estado` | `enum` | `activo` · `inactivo` · `suspendido` |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `updated_at` | `updated_at` | `updatedAt` | `datetime` | |

**Schemas:** `UserCreate` · `UserUpdate` · `UserSelfUpdate` · `UserRead`

---

### 📚 Materia (`materias`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `profesor_id` | `profesor_id` | `profesorId` | `UUID` | FK → users |
| `nombre` | `nombre` | `nombre` | `string` | max 180 |
| `area` | `area` | `area` | `string?` | Ej: "Matemáticas" |
| `grado` | `grado` | `grado` | `string?` | Ej: "5°" |
| `descripcion` | `descripcion` | `descripcion` | `string?` | |
| `codigo_matricula` | `codigo_matricula` | `codigoMatricula` | `string` | Único, para unirse |
| `codigo_activo` | `codigo_activo` | `codigoActivo` | `boolean` | |
| `requiere_aprobacion` | `requiere_aprobacion` | `requiereAprobacion` | `boolean` | |
| `estado` | `estado` | `estado` | `enum` | `activa` · `archivada` |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `updated_at` | `updated_at` | `updatedAt` | `datetime` | |

**Schemas:** `MateriaCreate` · `MateriaUpdate` · `MateriaRead` · `MateriaStudentsRead`

---

### 🎓 Matrícula (`matriculas`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `materia_id` | `materia_id` | `materiaId` | `UUID` | FK → materias |
| `estudiante_id` | `estudiante_id` | `estudianteId` | `UUID` | FK → users |
| `estado` | `estado` | `estado` | `enum` | `pendiente` · `activo` · `inactivo` |
| `fecha_matricula` | `fecha_matricula` | `fechaMatricula` | `datetime` | |
| `created_at` | `created_at` | `createdAt` | `datetime` | |

**Schemas:** `MatriculaJoinRequest` · `MatriculaEstadoUpdate` · `MatriculaRead` · `MisMateriasRead`

---

### 📋 DBA — Derechos Básicos de Aprendizaje (`dba_catalog`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `area` | `area` | `area` | `string` | max 100 |
| `grado` | `grado` | `grado` | `string` | max 30 |
| `codigo` | `codigo` | `codigo` | `string?` | Ej: "MA-5-01" |
| `descripcion` | `descripcion` | `descripcion` | `string` | Texto del DBA |
| `fuente` | `fuente` | `fuente` | `string?` | MEN, editorial, etc. |
| `activo` | `activo` | `activo` | `boolean` | |
| `created_at` | `created_at` | `createdAt` | `datetime` | |

**Schemas:** `DBACreate` · `DBARead` · `DBAImportRequest`

---

### 📝 Evaluación (`evaluaciones`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `materia_id` | `materia_id` | `materiaId` | `UUID` | FK → materias |
| `profesor_id` | `profesor_id` | `profesorId` | `UUID` | FK → users |
| `nombre` | `nombre` | `nombre` | `string` | max 220 |
| `descripcion` | `descripcion` | `descripcion` | `string?` | |
| `tipo_origen` | `tipo_origen` | `tipoOrigen` | `enum` | `nativa` · `externa_digitalizada` · `sorpresa` |
| `nota_maxima` | `nota_maxima` | `notaMaxima` | `decimal` | Default `5.0` |
| `estado` | `estado` | `estado` | `enum` | `borrador` · `publicada` · `en_calificacion` · `pendiente_revision` · `cerrada` |
| `fecha_publicacion` | `fecha_publicacion` | `fechaPublicacion` | `datetime?` | |
| `dba_ids` | `dba_ids` | `dbaIds` | `UUID[]` | Referencias a dba_catalog |
| `metas_profesor` | `metas_profesor` | `metasProfesor` | `string[]` | |
| `criterios` | `criterios` | `criterios` | `object[]` | Ver estructura abajo |
| `preguntas` | `preguntas` | `preguntas` | `object[]` | |
| `respuestas_esperadas` | `respuestas_esperadas` | `respuestasEsperadas` | `object[]` | |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `updated_at` | `updated_at` | `updatedAt` | `datetime` | |

**Schemas:** `EvaluacionCreate` · `EvaluacionUpdate` · `EvaluacionRead` · `EvaluacionSorpresaCreate` · `DigitalizarEvaluacionExternaRequest` · `EvaluacionEstructuraValidacion` · `EvaluacionEstadoRead`

---

### 🗺️ Blueprint de Evaluación (`evaluacion_blueprints`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `evaluacion_id` | `evaluacion_id` | `evaluacionId` | `UUID` | FK → evaluaciones (único) |
| `nivel_contexto` | `nivel_contexto` | `nivelContexto` | `enum` | `completo` · `reconstruido` · `minimo` |
| `dba` | `dba` | `dba` | `object[]` | DBAs enriquecidos |
| `metas` | `metas` | `metas` | `string[]` | |
| `criterios` | `criterios` | `criterios` | `object[]` | |
| `preguntas` | `preguntas` | `preguntas` | `object[]` | |
| `respuestas_esperadas` | `respuestas_esperadas` | `respuestasEsperadas` | `object[]` | |
| `errores_comunes` | `errores_comunes` | `erroresComunes` | `string[]` | |
| `contexto_rag` | `contexto_rag` | `contextoRag` | `object[]` | Chunks recuperados |
| `reglas_feedback` | `reglas_feedback` | `reglasFeedback` | `object` | |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `updated_at` | `updated_at` | `updatedAt` | `datetime` | |

**Schema:** `EvaluacionBlueprintRead`

---

### 📤 Entrega (`entregas`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `evaluacion_id` | `evaluacion_id` | `evaluacionId` | `UUID` | FK → evaluaciones |
| `estudiante_id` | `estudiante_id` | `estudianteId` | `UUID` | FK → users |
| `materia_id` | `materia_id` | `materiaId` | `UUID` | FK → materias |
| `tipo` | `tipo` | `tipo` | `enum` | `online` · `foto` · `pdf` · `captura` |
| `respuesta_texto` | `respuesta_texto` | `respuestaTexto` | `string?` | Para entregas online |
| `archivo_url` | `archivo_url` | `archivoUrl` | `string?` | Ruta del archivo subido |
| `visual_text_json` | `visual_text_json` | — | `object` | Resultado de Vision (interno) |
| `estado` | `estado` | `estado` | `enum` | `pendiente` · `recibida` · `calificada` · `revisada` · `requiere_reintento` |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `updated_at` | `updated_at` | `updatedAt` | `datetime` | |

**Schemas:** `EntregaCreate` · `EntregaRead`

---

### ✅ Calificación (`calificaciones`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `evaluacion_id` | `evaluacion_id` | `evaluacionId` | `UUID` | FK → evaluaciones |
| `entrega_id` | `entrega_id` | `entregaId` | `UUID?` | FK → entregas |
| `estudiante_id` | `estudiante_id` | `estudianteId` | `UUID` | FK → users |
| `materia_id` | `materia_id` | `materiaId` | `UUID` | FK → materias |
| `profesor_id` | `profesor_id` | `profesorId` | `UUID` | FK → users (quien califica) |
| `nota_sugerida` | `nota_sugerida` | `notaSugerida` | `decimal?` | Propuesta por la IA |
| `nota_confirmada` | `nota_confirmada` | `notaConfirmada` | `decimal?` | Validada por docente |
| `confianza` | `confianza` | `confianza` | `decimal?` | 0.0 – 1.0 |
| `feedback` | `feedback` | `feedback` | `string?` | Para el estudiante |
| `resultado_json` | `resultado_json` | `resultadoJson` | `object` | Output completo del LLM |
| `revisado_por_docente` | `revisado_por_docente` | `revisadoPorDocente` | `boolean` | |
| `estado` | `estado` | `estado` | `enum` | `sugerida` · `confirmada` · `ajustada` · `requiere_revision` |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `updated_at` | `updated_at` | `updatedAt` | `datetime` | |

**Schemas:** `CalificacionRead` · `ConfirmarNota` · `AjustarNota` · `GradingResult` · `BoletinItem`

**Campos internos de `GradingResult`** (no guardados directamente):

| Campo | Tipo | Descripción |
|---|---|---|
| `nota_sugerida` | `decimal` | |
| `nota_maxima` | `decimal` | |
| `confianza` | `float` 0–1 | Nivel de certeza del modelo |
| `criterios` | `object[]` | `{nombre, puntaje, maximo, observacion}` |
| `feedback_estudiante` | `string` | Texto para mostrar al estudiante |
| `alertas` | `string[]` | Advertencias para el docente |
| `requiere_revision_docente` | `boolean` | Siempre `true` por principio |
| `raw_model_output` | `object` | JSON crudo del LLM |

---

### 🧠 RAG Source / Chunk (`rag_sources`, `rag_chunks`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `rag_sources.id` | `id` | `id` | `UUID` | PK |
| `rag_sources.materia_id` | `materia_id` | `materiaId` | `UUID?` | |
| `rag_sources.tipo` | `tipo` | `tipo` | `enum` | Ver RagTipo abajo |
| `rag_sources.titulo` | `titulo` | `titulo` | `string` | |
| `rag_sources.contenido` | `contenido` | — | `text` | Texto crudo (interno) |
| `rag_sources.created_at` | `created_at` | `createdAt` | `datetime` | |
| `rag_chunks.id` | `id` | `id` | `UUID` | PK |
| `rag_chunks.source_id` | `source_id` | `sourceId` | `UUID` | FK → rag_sources |
| `rag_chunks.chunk_index` | `chunk_index` | `chunkIndex` | `int` | Orden dentro del source |
| `rag_chunks.texto` | `chunk_text` | `chunkText` | `string` | Fragmento |
| `rag_chunks.metadata_json` | `metadata_json` | — | `object` | Interno |
| `rag_chunks.embedding_vec` | — | — | `vector(1536)` | HNSW, pgvector |

**Schemas:** `RagSourceCreate` · `RagSourceRead` · `RagIngestRequest` · `RagSearchRequest` · `RagChunkRead`

---

### 🖥️ Presentación (`presentaciones`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `materia_id` | `materia_id` | `materiaId` | `UUID?` | |
| `profesor_id` | `profesor_id` | `profesorId` | `UUID` | |
| `titulo` | `titulo` | `titulo` | `string` | |
| `slides_json` | `slides_json` | — | `object` | Estructura normalizada (interno) |
| `estado` | `estado` | `estado` | `enum` | `queued` · `running` · `success` · `failed` |
| `pptx_url` | `pptx_url` | `pptxUrl` | `string?` | URL de descarga .pptx |
| `pdf_url` | `pdf_url` | `pdfUrl` | `string?` | URL de descarga .pdf |
| `error` | `error` | `error` | `string?` | Mensaje de error si falla |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `updated_at` | `updated_at` | `updatedAt` | `datetime` | |

**Schemas:** `PresentacionCreate` · `PresentacionRead` · `PresentacionEstadoRead`

---

### 🛠️ Material Generado (herramientas)

**Request base `HerramientaBaseRequest`:**

| Campo | Tipo | Descripción |
|---|---|---|
| `materia_id` | `UUID?` | |
| `titulo` | `string` | |
| `grado` | `string?` | |
| `area` | `string?` | |
| `tema` | `string` | Tema principal |
| `instrucciones_adicionales` | `string?` | |

**Campos extra por tipo:**

| Tipo herramienta | Schema request | Campos adicionales |
|---|---|---|
| Sopa de letras | `SopaLetrasRequest` | `palabras_clave[]`, `tamanio_grilla` |
| Crucigrama | `CrucigramaRequest` | `cantidad_preguntas` |
| Cuento | `CuentoRequest` | `personajes[]` |
| Guía | `GuiaRequest` | `objetivos[]`, `cantidad_actividades` |
| Taller | `TallerRequest` | `dba_ids[]`, `cantidad_puntos` |
| Examen | `ExamenRequest` | `dba_ids[]`, `cantidad_preguntas`, `tipos_pregunta[]` |
| Rúbrica | `RubricaRequest` | `criterios[]`, `escala[]` |
| Plan de refuerzo | `PlanRefuerzoRequest` | `student_name`, `dificultades[]`, `calificacion_actual` |

**`MaterialRead`:**

| Campo | Frontend | Tipo |
|---|---|---|
| `id` | `id` | `UUID` |
| `tipo` | `tipo` | `string` |
| `titulo` | `titulo` | `string` |
| `contenido_json` | `contenidoJson` | `object` |
| `archivo_url` | `archivoUrl` | `string?` |
| `created_at` | `createdAt` | `datetime` |

---

### 💬 Xali (chat pedagógico)

| Campo schema | Frontend | Tipo | Notas |
|---|---|---|---|
| `materia_id` | `materiaId` | `UUID?` | |
| `mensaje` | `mensaje` | `string` | Pregunta del estudiante |
| `respuesta` | `respuesta` | `string` | Respuesta de Xali |
| `role` | `role` | `string` | `user` · `assistant` |
| `created_at` | `createdAt` | `datetime` | |

**Schemas:** `XaliMessage` · `XaliResponse` · `ChatMessageRead`

---

### ⚙️ Jobs (`ai_jobs`)

| Variable BD | Python / Schema | Frontend | Tipo | Notas |
|---|---|---|---|---|
| `id` | `id` | `id` | `UUID` | PK |
| `tipo` | `tipo` | `tipo` | `enum` | `presentacion` · `imagen` · `calificacion_lote` · `rag_ingest` · `reporte_export` |
| `estado` | `estado` | `estado` | `enum` | `queued` · `running` · `success` · `failed` · `cancelled` |
| `progreso` | `progreso` | `progreso` | `int` | 0–100 |
| `resultado_json` | `resultado_json` | `resultadoJson` | `object` | |
| `error` | `error` | `error` | `string?` | |
| `created_at` | `created_at` | `createdAt` | `datetime` | |
| `started_at` | `started_at` | `startedAt` | `datetime?` | |
| `finished_at` | `finished_at` | `finishedAt` | `datetime?` | |

**Schemas:** `JobRead` · `JobEstadoRead`

---

### 🖼️ Imagen generada

| Campo | Frontend | Tipo | Notas |
|---|---|---|---|
| `prompt` | `prompt` | `string` | Descripción de la imagen |
| `image_type` | `imageType` | `string` | `simple` · `para_colorear` · `portada_premium` · `diagrama` · etc. |
| `size` | `size` | `string` | `1024x1024` (default) |
| `url` | `url` | `string?` | URL resultado |
| `b64_data` | `b64Data` | `string?` | Base64 si aplica |
| `provider` | `provider` | `string` | `openai` · `cloudflare` · `html_svg` |
| `is_placeholder` | `isPlaceholder` | `boolean` | |

**Schemas:** `ImageGenerationRequest` · `ImageGenerationResponse`

---

### 🔧 Config IA (admin)

| Campo | Descripción |
|---|---|
| `openai_key` | API key OpenAI |
| `cloudflare_token` | Token Cloudflare Workers AI |
| `cloudflare_account_id` | Account ID Cloudflare |
| `groq_key` | API key Groq |
| `open_code_key` | API key OpenCode |
| `modelo_llm_default` | Modelo LLM por defecto global |
| `modelo_llm_preferido` | Modelo preferido del profesor |
| `total_calls` | Total llamadas IA |
| `total_tokens_input` | Tokens de entrada acumulados |
| `total_tokens_output` | Tokens de salida acumulados |
| `total_cost` | Costo estimado USD |

---

## 2. Endpoints completos

> **Base URL:** `https://<dominio>/api`
> **Auth:** cookie httpOnly `access_token` o header `Authorization: Bearer <token>`

### 🔐 Auth — `/api/auth`

| Método | Ruta | Body | Respuesta | Auth |
|---|---|---|---|---|
| `POST` | `/auth/login` | `{ email, password }` | `AuthResponse` | No |
| `POST` | `/auth/register` | `UserCreate + password` | `AuthResponse` | No |
| `POST` | `/auth/refresh` | cookie `refresh_token` | `AuthResponse` | No |
| `POST` | `/auth/logout` | — | `204` | Sí |
| `GET` | `/auth/me` | — | `AuthResponse` | Sí |

---

### 👤 Usuarios — `/api`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `GET` | `/users/me` | — | `UserRead` | Todos |
| `PATCH` | `/users/me` | `UserSelfUpdate` | `UserRead` | Todos |
| `GET` | `/admin/users` | — | `UserRead[]` | Admin |
| `POST` | `/admin/users` | `UserCreate` | `UserRead` | Admin |
| `PATCH` | `/admin/users/{usuario_id}` | `UserUpdate` | `UserRead` | Admin |
| `DELETE` | `/admin/users/{usuario_id}` | — | `204` | Admin |

---

### 📚 Materias — `/api/materias`

| Método | Ruta | Body / Query | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/materias` | `MateriaCreate` | `MateriaRead` | Profesor, Admin |
| `GET` | `/materias` | — | `MateriaRead[]` | Todos |
| `GET` | `/materias/{materia_id}` | — | `MateriaRead` | Todos |
| `PATCH` | `/materias/{materia_id}` | `MateriaUpdate` | `MateriaRead` | Profesor, Admin |
| `POST` | `/materias/{materia_id}/regenerar-codigo` | — | `MateriaRead` | Profesor, Admin |
| `GET` | `/materias/{materia_id}/estudiantes` | — | `MateriaStudentsRead` | Profesor, Admin |

---

### 🎓 Matrículas — `/api/matriculas`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/matriculas/unirse` | `{ codigo_matricula }` | `MatriculaRead` | Estudiante |
| `GET` | `/matriculas/mis-materias` | — | `MisMateriasRead` | Estudiante |
| `PATCH` | `/matriculas/{matricula_id}/estado` | `{ estado }` | `MatriculaRead` | Profesor, Admin |

---

### 📋 DBA — `/api/dba`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `GET` | `/dba` | `?area=&grado=` | `DBARead[]` | Todos |
| `POST` | `/dba/importar` | `{ items: DBACreate[] }` | `DBARead[]` | Admin |

---

### 📝 Evaluaciones — `/api`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/evaluaciones` | `EvaluacionCreate` | `EvaluacionRead` | Profesor, Admin |
| `POST` | `/evaluaciones/externa/digitalizar` | `DigitalizarEvaluacionExternaRequest` | `EvaluacionRead` | Profesor, Admin |
| `POST` | `/evaluaciones/sorpresa` | `EvaluacionSorpresaCreate` | `EvaluacionRead` | Profesor, Admin |
| `GET` | `/materias/{materia_id}/evaluaciones` | — | `EvaluacionRead[]` | Todos |
| `GET` | `/evaluaciones/{evaluacion_id}` | — | `EvaluacionRead` | Todos |
| `PATCH` | `/evaluaciones/{evaluacion_id}` | `EvaluacionUpdate` | `EvaluacionRead` | Profesor, Admin |
| `POST` | `/evaluaciones/{evaluacion_id}/crear-blueprint` | — | `EvaluacionBlueprintRead` | Profesor, Admin |
| `POST` | `/evaluaciones/{evaluacion_id}/publicar` | — | `EvaluacionEstadoRead` | Profesor, Admin |
| `POST` | `/evaluaciones/{evaluacion_id}/cerrar` | — | `EvaluacionEstadoRead` | Profesor, Admin |
| `PATCH` | `/evaluaciones/{evaluacion_id}/validar-estructura` | `EvaluacionEstructuraValidacion` | `EvaluacionRead` | Profesor, Admin |

---

### ✅ Calificaciones — `/api`

| Método | Ruta | Body (form-data) | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/calificaciones/foto` | `evaluacion_id`, `estudiante_id`, `foto` (file) | `CalificacionRead` | Profesor, Admin |
| `PATCH` | `/calificaciones/{calificacion_id}/confirmar` | `{ nota_confirmada }` | `CalificacionRead` | Profesor, Admin |
| `PATCH` | `/calificaciones/{calificacion_id}/ajustar` | `{ nota_confirmada, feedback? }` | `CalificacionRead` | Profesor, Admin |
| `GET` | `/evaluaciones/{evaluacion_id}/calificaciones` | — | `CalificacionRead[]` | Profesor, Admin |
| `GET` | `/estudiantes/{estudiante_id}/boletin` | `?materia_id=` | `BoletinItem[]` | Todos¹ |
| `POST` | `/calificaciones/modo-salon/iniciar` | `{ evaluacion_id }` | `SalonSesionRead` | Profesor, Admin |
| `POST` | `/calificaciones/modo-salon/{sesion_id}/foto` | `estudiante_id`, `foto` (file) | `CalificacionRead` | Profesor, Admin |

> ¹ Estudiante solo puede ver su propio boletín.

---

### 🛠️ Herramientas — `/api/herramientas`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/herramientas/sopa-letras` | `SopaLetrasRequest` | `MaterialRead` | Profesor, Admin |
| `POST` | `/herramientas/crucigrama` | `CrucigramaRequest` | `MaterialRead` | Profesor, Admin |
| `POST` | `/herramientas/cuento` | `CuentoRequest` | `MaterialRead` | Profesor, Admin |
| `POST` | `/herramientas/guia` | `GuiaRequest` | `MaterialRead` | Profesor, Admin |
| `POST` | `/herramientas/taller` | `TallerRequest` | `MaterialRead` | Profesor, Admin |
| `POST` | `/herramientas/examen` | `ExamenRequest` | `MaterialRead` | Profesor, Admin |
| `POST` | `/herramientas/rubrica` | `RubricaRequest` | `MaterialRead` | Profesor, Admin |
| `POST` | `/herramientas/plan-refuerzo` | `PlanRefuerzoRequest` | `MaterialRead` | Profesor, Admin |

---

### 🖥️ Presentaciones — `/api/presentaciones`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/presentaciones` | `PresentacionCreate` | `PresentacionRead` | Profesor, Admin |
| `GET` | `/presentaciones` | — | `PresentacionRead[]` | Profesor, Admin |
| `GET` | `/presentaciones/{presentacion_id}` | — | `PresentacionRead` | Profesor, Admin |
| `GET` | `/presentaciones/{presentacion_id}/estado` | — | `PresentacionEstadoRead` | Profesor, Admin |

---

### 🖼️ Imágenes — `/api/imagenes`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/imagenes/generar` | `ImageGenerationRequest` | `ImageGenerationResponse` | Profesor, Admin |

---

### 🧠 RAG — `/api/rag`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/rag/sources` | `RagSourceCreate` | `RagSourceRead` | Profesor, Admin |
| `POST` | `/rag/ingest` | `{ source_id }` | `{ chunks_creados }` | Profesor, Admin |
| `POST` | `/rag/search` | `RagSearchRequest` | `RagChunkRead[]` | Todos |
| `GET` | `/rag/sources` | `?materia_id=&tipo=` | `RagSourceRead[]` | Todos |
| `DELETE` | `/rag/sources/{source_id}` | — | `204` | Profesor, Admin |

---

### 💬 Xali — `/api/xali`

| Método | Ruta | Body / Query | Respuesta | Roles |
|---|---|---|---|---|
| `POST` | `/xali/chat` | `{ materia_id?, mensaje }` | `{ respuesta, materia_id }` | Estudiante |
| `GET` | `/xali/history` | `?materia_id=` | `ChatMessageRead[]` | Estudiante |
| `DELETE` | `/xali/history` | `?materia_id=` | `204` | Estudiante |

---

### 📊 Reportes — `/api/reportes`

| Método | Ruta | Query | Respuesta | Roles |
|---|---|---|---|---|
| `GET` | `/reportes/materia/{materia_id}` | — | Reporte materia | Profesor, Admin |
| `GET` | `/reportes/estudiante/{estudiante_id}` | `?materia_id=` | Reporte estudiante | Todos¹ |
| `GET` | `/reportes/profesor/resumen` | — | Resumen profesor | Profesor, Admin |
| `POST` | `/reportes/export/pdf` | `{ materia_id? }` | PDF binario | Profesor, Admin |

> ¹ Estudiante solo puede ver su propio reporte.

---

### ⚙️ Jobs — `/api/jobs`

| Método | Ruta | Respuesta | Roles |
|---|---|---|---|
| `GET` | `/jobs/{job_id}` | `JobRead` | Todos |
| `GET` | `/jobs/{job_id}/estado` | `JobEstadoRead` | Todos |
| `POST` | `/jobs/{job_id}/cancelar` | `204` | Todos |

---

### 📐 Impacto Tesis — `/api/impacto`

| Método | Ruta | Respuesta | Notas |
|---|---|---|---|
| `GET` | `/impacto/kappa` | `{ kappa, interpretacion, n }` | Cohen's Kappa IA vs docente |
| `GET` | `/impacto/tiempo-ahorrado` | `{ minutos_totales, por_calificacion }` | Estimado de tiempo |
| `POST` | `/impacto/encuestas` | — | Registrar respuesta Likert |
| `GET` | `/impacto/likert` | `{ promedio, n }` | Resultados encuesta |
| `GET` | `/impacto/cualitativo` | `{ comentarios[] }` | Respuestas abiertas |

---

### 🔧 Admin IA — `/api/admin`

| Método | Ruta | Body | Respuesta | Roles |
|---|---|---|---|---|
| `GET` | `/admin/ai-config` | — | `GlobalAIConfigRead` | Admin |
| `PATCH` | `/admin/ai-config` | `GlobalAIConfigUpdate` | — | Admin |
| `PATCH` | `/profesor/ai-config` | `ProfesorAIConfigUpdate` | — | Profesor, Admin |
| `GET` | `/admin/ai-usage` | `?dias=30` | `UsageStatsRead` | Admin |

---

## 3. Enums — valores válidos

| Enum | Valores |
|---|---|
| `UserRole` | `admin` · `profesor` · `estudiante` |
| `UserEstado` | `activo` · `inactivo` · `suspendido` |
| `MateriaEstado` | `activa` · `archivada` |
| `MatriculaEstado` | `pendiente` · `activo` · `inactivo` |
| `EvaluacionEstado` | `borrador` · `publicada` · `en_calificacion` · `pendiente_revision` · `cerrada` |
| `EvaluacionTipoOrigen` | `nativa` · `externa_digitalizada` · `sorpresa` |
| `BlueprintNivelContexto` | `completo` · `reconstruido` · `minimo` |
| `EntregaTipo` | `online` · `foto` · `pdf` · `captura` |
| `EntregaEstado` | `pendiente` · `recibida` · `calificada` · `revisada` · `requiere_reintento` |
| `CalificacionEstado` | `sugerida` · `confirmada` · `ajustada` · `requiere_revision` |
| `RagTipo` | `dba` · `contenido_clase` · `guia` · `presentacion` · `criterio` · `rubrica` · `evaluacion` · `respuesta_esperada` · `feedback` · `error_comun` |
| `MaterialTipo` | `presentacion` · `guia` · `taller` · `examen` · `rubrica` · `sopa_letras` · `crucigrama` · `cuento` · `para_colorear` · `emparejar` · `unir_columnas` · `plan_refuerzo` · `informe_estudiante` · `informe_acudiente` |
| `PresentacionEstado` | `queued` · `running` · `success` · `failed` |
| `JobEstado` | `queued` · `running` · `success` · `failed` · `cancelled` |
| `LLMProvider` | `open_code` · `groq` · `ollama` · `template` |
| `ImageProvider` | `openai` · `cloudflare` · `html_svg` |

---

## 4. Path params — referencia rápida

| Param | Entidad | Ejemplo |
|---|---|---|
| `{usuario_id}` | User | `/admin/users/{usuario_id}` |
| `{materia_id}` | Materia | `/materias/{materia_id}` |
| `{matricula_id}` | Matricula | `/matriculas/{matricula_id}/estado` |
| `{evaluacion_id}` | Evaluacion | `/evaluaciones/{evaluacion_id}` |
| `{calificacion_id}` | Calificacion | `/calificaciones/{calificacion_id}/confirmar` |
| `{estudiante_id}` | User (rol estudiante) | `/estudiantes/{estudiante_id}/boletin` |
| `{presentacion_id}` | Presentacion | `/presentaciones/{presentacion_id}` |
| `{sesion_id}` | Sesión Modo Salón (string hex) | `/calificaciones/modo-salon/{sesion_id}/foto` |
| `{source_id}` | RagSource | `/rag/sources/{source_id}` |
| `{job_id}` | AIJob | `/jobs/{job_id}` |
