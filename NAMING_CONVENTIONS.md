# XCalificator — Convención de nombres

## Regla general

| Capa | Idioma | Estilo |
|------|--------|--------|
| Columna BD | español | `snake_case` |
| Modelo SQLAlchemy | español | `snake_case` para atributos, `PascalCase` para clase |
| Schema Pydantic | español | clase `PascalCase`, campos `snake_case` |
| Parámetro de ruta (path param) | español | `snake_case` con nombre completo |
| Query param / body field | español | `snake_case` |
| Variable frontend (JS/TS) | español | `camelCase` |
| Nombre de función Python | español | `snake_case` |

> **Excepción técnica**: términos sin traducción natural o que forman parte de estándares externos se mantienen en inglés: `id`, `created_at`, `updated_at`, `email`, `password_hash`, `feedback`, `rol`, `status/estado` (se prefiere español).

---

## Entidades y sus nombres por capa

### Usuario

| BD (`users`) | Modelo (`User`) | Schema (`UsuarioRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | `{usuario_id}` | `usuarioId` |
| `nombre` | `nombre` | `nombre` | — | `nombre` |
| `email` | `email` | `email` | — | `email` |
| `password_hash` | `password_hash` | — (nunca expuesto) | — | — |
| `rol` | `rol` | `rol` | — | `rol` |
| `estado` | `estado` | `estado` | — | `estado` |
| `created_at` | `created_at` | `created_at` | — | `createdAt` |
| `updated_at` | `updated_at` | `updated_at` | — | `updatedAt` |

### Materia

| BD (`materias`) | Modelo (`Materia`) | Schema (`MateriaRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | `{materia_id}` | `materiaId` |
| `profesor_id` | `profesor_id` | `profesor_id` | — | `profesorId` |
| `nombre` | `nombre` | `nombre` | — | `nombre` |
| `area` | `area` | `area` | — | `area` |
| `grado` | `grado` | `grado` | — | `grado` |
| `descripcion` | `descripcion` | `descripcion` | — | `descripcion` |
| `codigo_matricula` | `codigo_matricula` | `codigo_matricula` | — | `codigoMatricula` |
| `codigo_activo` | `codigo_activo` | `codigo_activo` | — | `codigoActivo` |
| `requiere_aprobacion` | `requiere_aprobacion` | `requiere_aprobacion` | — | `requiereAprobacion` |
| `estado` | `estado` | `estado` | — | `estado` |

### Matrícula

| BD (`matriculas`) | Modelo (`Matricula`) | Schema (`MatriculaRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | `{matricula_id}` | `matriculaId` |
| `materia_id` | `materia_id` | `materia_id` | — | `materiaId` |
| `estudiante_id` | `estudiante_id` | `estudiante_id` | — | `estudianteId` |
| `estado` | `estado` | `estado` | — | `estado` |
| `fecha_matricula` | `fecha_matricula` | `fecha_matricula` | — | `fechaMatricula` |

### Evaluación

| BD (`evaluaciones`) | Modelo (`Evaluacion`) | Schema (`EvaluacionRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | `{evaluacion_id}` | `evaluacionId` |
| `materia_id` | `materia_id` | `materia_id` | — | `materiaId` |
| `profesor_id` | `profesor_id` | `profesor_id` | — | `profesorId` |
| `nombre` | `nombre` | `nombre` | — | `nombre` |
| `descripcion` | `descripcion` | `descripcion` | — | `descripcion` |
| `tipo_origen` | `tipo_origen` | `tipo_origen` | — | `tipoOrigen` |
| `nota_maxima` | `nota_maxima` | `nota_maxima` | — | `notaMaxima` |
| `estado` | `estado` | `estado` | — | `estado` |
| `fecha_publicacion` | `fecha_publicacion` | `fecha_publicacion` | — | `fechaPublicacion` |
| `dba_ids` | `dba_ids` | `dba_ids` | — | `dbaIds` |
| `metas_profesor` | `metas_profesor` | `metas_profesor` | — | `metasProfesor` |
| `criterios` | `criterios` | `criterios` | — | `criterios` |
| `preguntas` | `preguntas` | `preguntas` | — | `preguntas` |
| `respuestas_esperadas` | `respuestas_esperadas` | `respuestas_esperadas` | — | `respuestasEsperadas` |

### Blueprint de Evaluación

| BD (`evaluacion_blueprints`) | Modelo (`EvaluacionBlueprint`) | Schema (`EvaluacionBlueprintRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | — | `id` |
| `evaluacion_id` | `evaluacion_id` | `evaluacion_id` | — | `evaluacionId` |
| `nivel_contexto` | `nivel_contexto` | `nivel_contexto` | — | `nivelContexto` |
| `dba` | `dba` | `dba` | — | `dba` |
| `metas` | `metas` | `metas` | — | `metas` |
| `criterios` | `criterios` | `criterios` | — | `criterios` |
| `preguntas` | `preguntas` | `preguntas` | — | `preguntas` |
| `respuestas_esperadas` | `respuestas_esperadas` | `respuestas_esperadas` | — | `respuestasEsperadas` |
| `errores_comunes` | `errores_comunes` | `errores_comunes` | — | `erroresComunes` |
| `contexto_rag` | `contexto_rag` | `contexto_rag` | — | `contextoRag` |
| `reglas_feedback` | `reglas_feedback` | `reglas_feedback` | — | `reglasFeedback` |

### Entrega

| BD (`entregas`) | Modelo (`Entrega`) | Schema (`EntregaRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | `{entrega_id}` | `entregaId` |
| `evaluacion_id` | `evaluacion_id` | `evaluacion_id` | — | `evaluacionId` |
| `estudiante_id` | `estudiante_id` | `estudiante_id` | — | `estudianteId` |
| `materia_id` | `materia_id` | `materia_id` | — | `materiaId` |
| `tipo` | `tipo` | `tipo` | — | `tipo` |
| `respuesta_texto` | `respuesta_texto` | `respuesta_texto` | — | `respuestaTexto` |
| `archivo_url` | `archivo_url` | `archivo_url` | — | `archivoUrl` |
| `visual_text_json` | `visual_text_json` | — | — | — |
| `estado` | `estado` | `estado` | — | `estado` |

### Calificación

| BD (`calificaciones`) | Modelo (`Calificacion`) | Schema (`CalificacionRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | `{calificacion_id}` | `calificacionId` |
| `evaluacion_id` | `evaluacion_id` | `evaluacion_id` | — | `evaluacionId` |
| `entrega_id` | `entrega_id` | `entrega_id` | — | `entregaId` |
| `estudiante_id` | `estudiante_id` | `estudiante_id` | — | `estudianteId` |
| `materia_id` | `materia_id` | `materia_id` | — | `materiaId` |
| `profesor_id` | `profesor_id` | — | — | `profesorId` |
| `nota_sugerida` | `nota_sugerida` | `nota_sugerida` | — | `notaSugerida` |
| `nota_confirmada` | `nota_confirmada` | `nota_confirmada` | — | `notaConfirmada` |
| `confianza` | `confianza` | `confianza` | — | `confianza` |
| `feedback` | `feedback` | `feedback` | — | `feedback` |
| `resultado_json` | `resultado_json` | `resultado_json` | — | `resultadoJson` |
| `revisado_por_docente` | `revisado_por_docente` | `revisado_por_docente` | — | `revisadoPorDocente` |
| `estado` | `estado` | `estado` | — | `estado` |

### RAG Source / Chunk

| BD | Modelo | Schema | Endpoint | Frontend |
|---|---|---|---|---|
| `rag_sources.id` | `RagSource.id` | `RagSourceRead.id` | `{source_id}` | `sourceId` |
| `rag_sources.materia_id` | `materia_id` | `materia_id` | — | `materiaId` |
| `rag_sources.tipo` | `tipo` | `tipo` | — | `tipo` |
| `rag_sources.titulo` | `titulo` | `titulo` | — | `titulo` |
| `rag_chunks.source_id` | `source_id` | `source_id` | — | `sourceId` |
| `rag_chunks.chunk_index` | `chunk_index` | `chunk_index` | — | `chunkIndex` |
| `rag_chunks.texto` | `texto` | `texto` | — | `texto` |
| `rag_chunks.metadata_json` | `metadata_json` | — | — | — |

### Material Generado / Presentación

| BD (`materiales_generados`) | Modelo (`MaterialGenerado`) | Schema | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | — | `id` |
| `materia_id` | `materia_id` | `materia_id` | — | `materiaId` |
| `profesor_id` | `profesor_id` | `profesor_id` | — | `profesorId` |
| `tipo` | `tipo` | `tipo` | — | `tipo` |
| `titulo` | `titulo` | `titulo` | — | `titulo` |
| `contenido_json` | `contenido_json` | `contenido_json` | — | `contenidoJson` |

| BD (`presentaciones`) | Modelo (`Presentacion`) | Schema (`PresentacionRead`) | Endpoint | Frontend |
|---|---|---|---|---|
| `id` | `id` | `id` | `{presentacion_id}` | `presentacionId` |
| `materia_id` | `materia_id` | `materia_id` | — | `materiaId` |
| `profesor_id` | `profesor_id` | `profesor_id` | — | `profesorId` |
| `titulo` | `titulo` | `titulo` | — | `titulo` |
| `estado` | `estado` | `estado` | — | `estado` |
| `slides_json` | `slides_json` | — | — | — |
| `pptx_url` | `pptx_url` | `pptx_url` | — | `pptxUrl` |
| `pdf_url` | `pdf_url` | `pdf_url` | — | `pdfUrl` |

---

## Endpoints — referencia completa

### Auth `/api/auth`
| Método | Ruta | Body / Params | Respuesta |
|--------|------|---------------|-----------|
| POST | `/login` | `{ email, password }` | `AuthResponse` |
| POST | `/register` | `RegisterRequest` | `AuthResponse` |
| POST | `/refresh` | cookie `refresh_token` | `AuthResponse` |
| POST | `/logout` | — | 204 |
| GET | `/me` | — | `AuthResponse` |

### Usuarios `/api`
| Método | Ruta | Body / Params | Respuesta |
|--------|------|---------------|-----------|
| GET | `/users/me` | — | `UserRead` |
| PATCH | `/users/me` | `UserSelfUpdate` | `UserRead` |
| GET | `/admin/users` | — | `UserRead[]` |
| POST | `/admin/users` | `UserCreate` | `UserRead` |
| PATCH | `/admin/users/{usuario_id}` | `UserUpdate` | `UserRead` |
| DELETE | `/admin/users/{usuario_id}` | — | 204 |

### Materias `/api/materias`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `` | `MateriaRead` |
| GET | `` | `MateriaRead[]` |
| GET | `/{materia_id}` | `MateriaRead` |
| PATCH | `/{materia_id}` | `MateriaRead` |
| POST | `/{materia_id}/regenerar-codigo` | `MateriaRead` |
| GET | `/{materia_id}/estudiantes` | `MateriaStudentsRead` |

### Matrículas `/api/matriculas`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `/unirse` | `MatriculaRead` |
| GET | `/mis-materias` | `MisMateriasRead` |
| PATCH | `/{matricula_id}/estado` | `MatriculaRead` |

### DBA `/api/dba`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `` | `DBARead[]` |
| POST | `/importar` | `DBARead[]` |

### Evaluaciones `/api`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `/evaluaciones` | `EvaluacionRead` |
| POST | `/evaluaciones/externa/digitalizar` | `EvaluacionRead` |
| POST | `/evaluaciones/sorpresa` | `EvaluacionRead` |
| GET | `/materias/{materia_id}/evaluaciones` | `EvaluacionRead[]` |
| GET | `/evaluaciones/{evaluacion_id}` | `EvaluacionRead` |
| PATCH | `/evaluaciones/{evaluacion_id}` | `EvaluacionRead` |
| POST | `/evaluaciones/{evaluacion_id}/crear-blueprint` | `EvaluacionBlueprintRead` |
| POST | `/evaluaciones/{evaluacion_id}/publicar` | `EvaluacionEstadoRead` |
| POST | `/evaluaciones/{evaluacion_id}/cerrar` | `EvaluacionEstadoRead` |
| PATCH | `/evaluaciones/{evaluacion_id}/validar-estructura` | `EvaluacionRead` |

### Calificaciones `/api`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `/calificaciones/foto` | `CalificacionRead` |
| PATCH | `/calificaciones/{calificacion_id}/confirmar` | `CalificacionRead` |
| PATCH | `/calificaciones/{calificacion_id}/ajustar` | `CalificacionRead` |
| GET | `/evaluaciones/{evaluacion_id}/calificaciones` | `CalificacionRead[]` |
| GET | `/estudiantes/{estudiante_id}/boletin` | `BoletinItem[]` |
| POST | `/calificaciones/modo-salon/iniciar` | `SalonSesionRead` |
| POST | `/calificaciones/modo-salon/{sesion_id}/foto` | `CalificacionRead` |

### Herramientas `/api/herramientas`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `/sopa-letras` | `MaterialRead` |
| POST | `/crucigrama` | `MaterialRead` |
| POST | `/cuento` | `MaterialRead` |
| POST | `/guia` | `MaterialRead` |
| POST | `/taller` | `MaterialRead` |
| POST | `/examen` | `MaterialRead` |
| POST | `/rubrica` | `MaterialRead` |
| POST | `/plan-refuerzo` | `MaterialRead` |

### Presentaciones `/api/presentaciones`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `` | `PresentacionRead` |
| GET | `` | `PresentacionRead[]` |
| GET | `/{presentacion_id}` | `PresentacionRead` |
| GET | `/{presentacion_id}/estado` | `PresentacionEstadoRead` |

### Imágenes `/api/imagenes`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `/generar` | `ImagenGeneradaRead` |

### RAG `/api/rag`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `/sources` | `RagSourceRead` |
| POST | `/ingest` | `{ chunks_creados }` |
| POST | `/search` | `RagChunkRead[]` |
| GET | `/sources` | `RagSourceRead[]` |
| DELETE | `/sources/{source_id}` | 204 |

### Xali `/api/xali`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| POST | `/chat` | `XaliRespuesta` |
| GET | `/history` | `MensajeChat[]` |
| DELETE | `/history` | 204 |

### Reportes `/api/reportes`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/materia/{materia_id}` | Reporte materia |
| GET | `/estudiante/{estudiante_id}` | Reporte estudiante |
| GET | `/profesor/resumen` | Resumen profesor |

### Jobs `/api/jobs`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/{job_id}` | `JobRead` |
| GET | `/{job_id}/estado` | `JobEstadoRead` |
| POST | `/{job_id}/cancelar` | 204 |

### Impacto Tesis `/api/impacto`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/tiempo-ahorrado` | métricas |
| GET | `/kappa` | Cohen's Kappa |
| POST | `/encuestas` | — |
| GET | `/likert` | — |
| GET | `/cualitativo` | — |

### Admin IA `/api/admin`
| Método | Ruta | Respuesta |
|--------|------|-----------|
| GET | `/admin/ai-config` | `GlobalAIConfigRead` |
| PATCH | `/admin/ai-config` | — |
| PATCH | `/profesor/ai-config` | — |
| GET | `/admin/ai-usage` | `UsageStatsRead` |

---

## Nombres de clases Pydantic (schemas)

| Clase | Uso |
|-------|-----|
| `EvaluacionCreate` | Crear evaluación |
| `EvaluacionUpdate` | Actualizar evaluación |
| `EvaluacionRead` | Leer evaluación |
| `EvaluacionBlueprintRead` | Leer blueprint |
| `EvaluacionEstadoRead` | Respuesta de estado (publicar/cerrar) |
| `EvaluacionEstructuraValidacion` | Validar estructura |
| `EvaluacionSorpresaCreate` | Crear evaluación sorpresa |
| `DigitalizarEvaluacionExternaRequest` | Digitalizar evaluación externa |
| `EntregaCreate` / `EntregaRead` | Entregas |
| `CalificacionRead` | Calificación |
| `ConfirmarNota` / `AjustarNota` | Acciones sobre calificación |
| `SalonSesionCreate` / `SalonSesionRead` | Modo Salón |
| `BoletinItem` | Ítem de boletín |

---

## Enums (valores de BD)

| Enum Python | Valores BD |
|-------------|------------|
| `UserRole` | `admin`, `profesor`, `estudiante` |
| `UserEstado` | `activo`, `inactivo`, `suspendido` |
| `MateriaEstado` | `activa`, `archivada` |
| `MatriculaEstado` | `pendiente`, `activo`, `inactivo` |
| `EvaluacionEstado` | `borrador`, `publicada`, `en_calificacion`, `pendiente_revision`, `cerrada` |
| `EvaluacionTipoOrigen` | `nativa`, `externa_digitalizada`, `sorpresa` |
| `BlueprintNivelContexto` | `completo`, `reconstruido`, `minimo` |
| `EntregaTipo` | `online`, `foto`, `pdf`, `captura` |
| `EntregaEstado` | `pendiente`, `recibida`, `calificada`, `revisada`, `requiere_reintento` |
| `CalificacionEstado` | `sugerida`, `confirmada`, `ajustada`, `requiere_revision` |
| `RagTipo` | `dba`, `contenido_clase`, `guia`, `presentacion`, `criterio`, `rubrica`, `evaluacion`, `respuesta_esperada`, `feedback`, `error_comun` |
| `MaterialTipo` | `presentacion`, `guia`, `taller`, `examen`, `rubrica`, `sopa_letras`, `crucigrama`, `cuento`, `para_colorear`, `emparejar`, `unir_columnas`, `plan_refuerzo`, `informe_estudiante`, `informe_acudiente` |
| `PresentacionEstado` | `queued`, `running`, `success`, `failed` |
| `JobEstado` | `queued`, `running`, `success`, `failed`, `cancelled` |
| `LLMProvider` | `open_code`, `groq`, `ollama`, `template` |
| `ImageProvider` | `openai`, `cloudflare`, `html_svg` |

---

## Reglas para el frontend (TypeScript/JavaScript)

```typescript
// Todos los campos del backend son snake_case → convertir a camelCase en el frontend
// Usar una función de transformación global o axios interceptor

// Ejemplo de tipo para CalificacionRead:
interface Calificacion {
  id: string;
  evaluacionId: string;
  estudianteId: string;       // ← era student_id, ahora consistente
  materiaId: string;
  notaSugerida: number | null;
  notaConfirmada: number | null;
  confianza: number | null;
  feedback: string | null;
  revisadoPorDocente: boolean;
  estado: 'sugerida' | 'confirmada' | 'ajustada' | 'requiere_revision';
  createdAt: string;
  updatedAt: string;
}

// Ejemplo de tipo para EvaluacionRead:
interface Evaluacion {
  id: string;
  materiaId: string;
  profesorId: string;
  nombre: string;
  descripcion: string | null;
  tipoOrigen: 'nativa' | 'externa_digitalizada' | 'sorpresa';
  notaMaxima: number;
  estado: 'borrador' | 'publicada' | 'en_calificacion' | 'pendiente_revision' | 'cerrada';
  fechaPublicacion: string | null;
  dbaIds: string[];
  metasProfesor: string[];
  criterios: Criterio[];
  preguntas: Pregunta[];
  respuestasEsperadas: RespuestaEsperada[];
  blueprint: EvaluacionBlueprint | null;
  createdAt: string;
  updatedAt: string;
}
```
