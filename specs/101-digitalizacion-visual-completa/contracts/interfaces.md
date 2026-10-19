# Contratos propuestos — 101

Contratos de la función en desarrollo. T009 implementa localmente carga de imagen/dibujo, consulta de recurso, propuesta privada y original. T010–T012 añaden extractor y conversor aislado comprobados; su integración con el job y los consumidores sigue pendiente, al igual que la generación. Prefijos relativos a `/api`; conservar respuestas y endpoints vigentes para evaluaciones sin contenido visual. Validación tipada y autorización siempre en servidor.

## Lectura y edición de evaluación

`GET /evaluaciones/{id}` incorpora opcionalmente `contenido_visual` y referencia de versión. Respuesta docente incluye cobertura y procedencia autorizada; respuesta estudiante solo los estímulos publicables y nunca snapshot completo, original resuelto, propuestas, claves o rutas internas. Los enlaces de recursos requieren sesión y autorización propia.

`PATCH /evaluaciones/{id}` mantiene contrato anterior; si incluye recursos exige `expected_updated_at`, revisión esperada y manifiesto tipado. Solo recursos ready del mismo ámbito y con revisión de publicación. Guarda revisión nueva y cambios juntos; conflicto 409 conserva el borrador del cliente. Cambiar material indispensable marca las claves afectadas para comprobación y aplica la misma validación antes de publicar que una clave pendiente; no elimina ni acepta silenciosamente la anterior.

Los endpoints de creación y validación de estructura aceptan los mismos campos opcionales y validan asociaciones. Un recurso staged de un borrador solo puede asignarse por su propietario a la evaluación de esa materia en la misma operación de guardado.

## Recursos y propuesta

| Operación propuesta | Entrada / resultado | Permiso |
| --- | --- | --- |
| `POST /evaluaciones/recursos` | Multipart: archivo, materia y evaluación o token de borrador propietario, request_key. Devuelve ID privado staged y metadatos, nunca ruta del host. | Crear/editar evaluación en ese ámbito. |
| `GET /evaluaciones/{id}/recursos/{recurso_id}` | Bytes con MIME controlado, `nosniff`, cache privada y validación de asociación/revisión. | Leer la evaluación y esa versión; estudiante solo estímulo publicable permitido. |
| `GET /evaluaciones/recursos/{recurso_id}/propuesta` | Vista previa de recurso staged. | Únicamente propietario/admin autorizado; no estudiante. |
| `POST /evaluaciones/recursos/generar` | Tipo, descripción, datos opcionales, pregunta estable, ámbito, versión esperada e idempotency key. Devuelve 202 con job_id. | Crear/editar en ámbito y uso de generación según configuración efectiva. |
| Consulta/cancelación de job | Reutiliza operaciones autorizadas de jobs; estados y propuesta con IDs privados. | Propietario; sin exponer credenciales ni contenido ajeno. |
| `GET /evaluaciones/{id}/original` | Original privado como descarga segura; vista previa por páginas mediante recursos autorizados. | Propietario/admin; no alumno. |

Validar por bytes PDF/DOCX/JPEG/PNG/WebP según operación; no admitir HTML/SVG activo ni rutas/URLs arbitrarias del cliente. Para recurso gráfico, PDF/DOCX aportado pasa por extracción y selección revisada de un elemento, no se adjunta como imagen ficticia. Límites antes de procesar y nuevamente tras descompresión/render. Cargar un recurso no publica ni guarda toda la evaluación.

Generación usa `generacion_imagenes` existente para ilustraciones y el contrato de contenido configurado para datos de tablas/gráficas; una imagen-placeholder, un JSON inválido o una URL sin bytes persistidos no son éxito. Descarga de resultados remotos solo mediante el adaptador de proveedor aprobado con orígenes restringidos; no permitir redirecciones a direcciones internas ni endpoints arbitrarios.

## Digitalización

`POST /evaluaciones/externa/digitalizar-con-archivo` conserva 202/job actual. Con función activa produce manifiesto versionado, original privado, cobertura y estructura. No cambia el endpoint compartido de extracción de referencias para otros módulos.

Estados de job reutilizan cola/progreso/error y `requires_review` si quedan omisiones críticas o claves pendientes. El resultado docente ofrece «Revisar contenido», conserva borrador y enumera qué páginas/preguntas comprobar. Un trabajo sin cobertura completa no se anuncia como digitalización lista para publicar.

El checkpoint contiene referencias privadas y esquema/hash del manifiesto; los campos internos de extracción no se exponen en la respuesta pública del job. Un checkpoint textual de otro esquema debe invalidarse para la nueva extracción visual, conservando el original.

Checkpoint local T014: `_visual_import_schema=1` queda fijado en la entrada del job; `_visual_checkpoint`, `_visual_structure` y `_visual_structure_key` son privados. El primero incluye esquema/extractor, ámbito, hash/ID del original, inventario y referencias de recursos, cobertura y lecturas por página; no bytes ni rutas. El segundo solo se reutiliza con el hash concordante de texto completo, manifiesto y configuración capturada. El bloqueo del lease y una única transacción enlazan evaluación/revisión/recursos con el resultado terminal. `requires_review` devuelve ID del borrador y cobertura pendiente; su interfaz docente permanece pendiente de T033 y la ruta sigue desactivada por defecto.

## Lector y editor

- Contrato tipado compartido en API, modelo del wizard, serializadores y renderers; editar solo texto no elimina bloques desconocidos admitidos de esa misma versión.
- «Añadir contenido» abre Subir / Crear con IA dentro de la pregunta. En móvil editor progresivo de pantalla útil; teclado, cierre y retorno no ocultan acciones. No instala controles visibles en todas las tarjetas permanentemente.
- Previsualizar, aceptar, reemplazar y quitar son acciones locales hasta guardar. Indicar cambios pendientes y versión; generación terminada no equivale a guardada.
- Imagen ampliable, descripción alternativa y pie; tabla con encabezados y desplazamiento local; gráfica con datos consultables. Un estímulo compartido no se duplica en la impresión pero deja clara su aplicación a varias preguntas.

## PDF y Word

`GET /evaluaciones/{id}/pdf` y `/docx` conservan semántica y permisos de solucionario. Admiten revisión autorizada opcional para consultar el contexto histórico correspondiente. Resolver solo recursos internos verificados; no permitir que WeasyPrint o Word sigan enlaces del documento original.

Construcción común: preguntas + bloques en orden + estímulos compartidos + puntajes. Word genera tablas reales y añade imágenes/representaciones rasterizadas verificadas; PDF incluye las mismas unidades, pies y etiquetas. Una salida con recurso requerido faltante devuelve error comprensible, no archivo incompleto.

## Calificador y verificador

Extender `AgentContext` con colección tipada `evaluation_visuals` separada de la evidencia `image_bytes/image_mime`. Elementos: revisión, recurso, preguntas aplicables, descripción y bytes/MIME internos; no URLs privadas dentro del prompt. Agentes reciben bloques etiquetados «material de la pregunta» frente a «respuesta del estudiante».

Mantener llamadas y proveedores configurados; deduplicar estímulos, incluir todas las asociaciones pertinentes y validar presupuesto antes de invocar. Si un modelo seleccionado carece de visión y el recurso la exige, usar solo fallback de capacidad autorizado; de no existir, revisión explícita. No convertir una omisión por límite en respuesta vacía ni añadir arbitraje redundante.

Fijar revisión antes de encolar, propagarla a particiones y reintentos, e incluirla en fingerprints. Registrar solo IDs, hashes, contadores, latencias y motivos seguros. Pruebas con dobles capturan lo que recibió cada etapa; no basta comprobar que el JSON guarda un ID.

## Compatibilidad y conflictos

- Contenido antiguo sin manifiesto: lectura y exportación anteriores sin cambiar registros.
- Contenido nuevo: todos los consumidores preservan el contrato; no habilitar escritura si alumno, exportadores o workers aún no lo soportan.
- 403/404 según política vigente para acceso no autorizado; 409 para edición concurrente, contexto histórico no fijado o trabajo antiguo activo; 413/422 para tamaño/contenido inválido; fallo de proveedor recuperable en el job.
- Respuestas de error en lenguaje docente: «No pudimos leer esta tabla. Revisa la imagen o reemplázala», sin stacktrace ni códigos técnicos visibles como explicación principal.
