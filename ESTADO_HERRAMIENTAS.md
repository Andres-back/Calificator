# Estado de herramientas XCalificator

Fecha: 2026-06-30

## Resumen

Se corrigieron y probaron herramientas educativas, asignacion a materias, cuento con imagen, herramienta de dibujo para colorear, crucigrama online/impreso, Xali y Presenton.

## Usuario y datos de prueba

- Profesor de prueba: `profesor.13acd9b751@example.com`
- Materia de prueba: `Smoke Ciencias Primaria`
- Materia ID: `bcd70bc1-9965-46f9-9e82-46c92c056c51`
- La password del usuario de prueba no se repite en este archivo para no dejar credenciales en texto plano.

## Presentacion de prueba

- Presentacion ID: `c02c0ed2-552d-48cd-a58c-29fcaf3432b1`
- Titulo: `Presentacion de prueba XCalificator Presenton`
- Estado final: `success`
- PPTX: `/api/presentaciones/c02c0ed2-552d-48cd-a58c-29fcaf3432b1/archivo/pptx`
- PDF: `/api/presentaciones/c02c0ed2-552d-48cd-a58c-29fcaf3432b1/archivo/pdf`
- Editor seguro: `POST /api/presentaciones/{id}/editor-url` respondio `200`.

## Cambios implementados

- Los recursos generados ahora pueden enviarse con `materia_id` desde el frontend.
- Backend valida que la materia exista y pertenezca al profesor antes de guardar el material.
- Listado y detalle de materiales devuelven `materia_id` y `materia_nombre`.
- El frontend muestra la materia en tarjetas y detalle del material.
- El cuento ahora genera y guarda una imagen en `contenido_json.imagen`.
- El cuento tiene vista y PDF mejorados con imagen, panel de lectura, moraleja y preguntas.
- Nueva herramienta `Para colorear`:
  - Endpoint: `POST /api/herramientas/para-colorear`
  - Frontend: aparece en crear material.
  - PDF: imprime imagen grande en blanco y negro.
- `Unir columnas` y `Emparejar` siguen compartiendo motor de pares, pero la UI diferencia su uso.
- Crucigrama online:
  - Al escribir avanza a la siguiente celda.
  - Flechas del teclado cambian direccion y navegan celdas.
  - Backspace puede volver a la celda anterior.
- Crucigrama PDF:
  - Grilla con estilo mas cercano al online.
  - Celdas separadas, bordes suaves y bloques vacios transparentes.
- Xali:
  - Se corrigio columna real `student_id` en `chat_messages`.
  - Se corrigieron filtros SQL de materia para asyncpg.
  - Se corrigio RAG para usar `CAST(:materia_id AS uuid)` y filtros dinamicos.
  - Frontend de Xali ahora permite seleccionar materia.

## Generaciones realizadas

- Cuento:
  - ID: `aa43ad6c-5a62-440a-8975-a058cbd8e110`
  - Materia: `Smoke Ciencias Primaria`
  - Imagen: si
  - Proveedor imagen: `cloudflare`
  - PDF: `200`, tamano aproximado `144678` bytes

- Para colorear:
  - ID: `b38a2d22-1add-4142-afd3-a6da201b53aa`
  - Materia: `Smoke Ciencias Primaria`
  - Imagen: si
  - Proveedor imagen: `cloudflare`
  - PDF: `200`, tamano aproximado `212237` bytes

## Pruebas ejecutadas

- Frontend: `npm run build` OK.
- Backend sintaxis: `python -m py_compile` OK en archivos modificados.
- Backend tests:
  - `tests/unit/test_presentaciones_router.py`
  - `tests/integration/test_api_contract.py`
  - Resultado: `5 passed`.
- Smoke real con API:
  - Login profesor: `200`
  - Materias: `200`
  - Presentacion crear: `201`
  - Presentacion estado: `success`
  - Presentacion exportar PDF: `200`
  - Cuento crear: `201`
  - Cuento PDF: `200`
  - Para colorear crear: `201`
  - Para colorear PDF: `200`
  - Xali chat con materia: `200`
  - Xali history con materia: `200`

## Observaciones de configuracion

- Las claves se leen desde `.env` mediante `backend/app/core/config.py`.
- `OPENAI_API_KEY` no esta configurada; por eso las imagenes usaron Cloudflare.
- `CLOUDFLARE_API_TOKEN` y `CLOUDFLARE_ACCOUNT_ID` estan configuradas y funcionaron para imagenes.
- `OPEN_CODE_API_KEY` esta configurada, pero el proveedor respondio `401 Unauthorized`; Groq respondio correctamente y se uso como fallback. Conviene revisar/rotar esa clave en `.env`.

## Archivos modificados principales

- `backend/app/modules/herramientas/service.py`
- `backend/app/modules/herramientas/router.py`
- `backend/app/modules/herramientas/generators/cuento.py`
- `backend/app/modules/herramientas/generators/para_colorear.py`
- `backend/app/modules/herramientas/pdf_render.py`
- `backend/app/modules/xali/service.py`
- `backend/app/modules/rag/retrieval_service.py`
- `frontend/src/types/api.ts`
- `frontend/src/modules/herramientas/meta.ts`
- `frontend/src/modules/herramientas/forms/base.tsx`
- `frontend/src/modules/herramientas/forms/tools.tsx`
- `frontend/src/modules/herramientas/forms/index.ts`
- `frontend/src/modules/herramientas/views/ContenidoView.tsx`
- `frontend/src/modules/herramientas/views/CrucigramaView.tsx`
- `frontend/src/modules/herramientas/ListPage.tsx`
- `frontend/src/modules/herramientas/DetailPage.tsx`
- `frontend/src/modules/xali/api.ts`
- `frontend/src/modules/xali/XaliPage.tsx`

## Actualizacion presentaciones tipo Gamma

Fecha: 2026-06-30

### Estado actual

- XCalificator es ahora el generador principal de presentaciones: crea `slides_json`, imagenes y archivos descargables.
- `local_export.py` genera PPTX y PDF como camino principal, no como ultimo fallback.
- Presenton queda como editor opcional bajo demanda:
  - No genera el contenido pedagogico.
  - No exporta el archivo principal que descarga el usuario.
  - Solo se crea una copia editable cuando el profesor abre `editor-url`.
- El frontend muestra el boton `Editor` para presentaciones listas aunque aun no exista `presenton_id`; el backend lo crea en ese momento.
- Las imagenes de presentaciones se fuerzan a proveedor premium/OpenAI desde el backend para mantener consistencia visual.
- Presenton ya no recibe `OPENAI_API_KEY` ni configuracion LLM desde `docker-compose.yml`.

### Limpieza realizada

- Eliminado `backend/app/modules/presentaciones/presenton_client.py`, compatibilidad antigua sin imports internos.
- Eliminadas rutas internas no usadas en `presenton_service.py`:
  - `generate_presentation`
  - `export_existing_presentation`
  - `fetch_presenton_file`
  - `_resolve_shared_presenton_file`
- Eliminadas variables backend no usadas:
  - `PRESENTON_API_URL`
  - `PRESENTON_LLM_TIMEOUT`
- Eliminadas variables LLM de Presenton en `.env.example`.
- `docker-compose.yml` ya no inyecta `.env` completo al contenedor `presenton`.
- Presenton conserva solo credenciales/configuracion necesarias para editor seguro.

### Calidad visual

- La portada usa siempre el titulo completo de la presentacion como H1.
- El ajuste de texto ya no acepta layouts que pierdan palabras relevantes.
- Las imagenes en panel se muestran con fondo suavizado y la imagen completa centrada para evitar recortes agresivos.
- La densidad de imagenes por defecto en presentaciones ahora es `alta` en backend y frontend.
- El proveedor sigue forzado a premium/OpenAI desde backend, aunque el payload antiguo envie `economico` o `mixto`.
- Se genero y reviso visualmente una portada de prueba:
  - `tmp/presentaciones/gamma_sample_cover_final.png`
- Archivos de muestra:
  - `tmp/presentaciones/gamma_sample.pdf`
  - `tmp/presentaciones/gamma_sample.pptx`

### Pruebas ejecutadas

- Backend:
  - `docker compose exec backend pytest tests/unit/test_presentaciones_router.py`
  - Resultado actual: `9 passed`
  - Cubre regresion de portada sin perdida de palabras y export local sin `presenton_id`.
- Integracion:
  - `docker compose exec backend pytest tests/integration/test_api_contract.py`
  - Resultado actual: `1 passed`
- Backend compilacion:
  - `docker compose exec backend python -m compileall app/modules/presentaciones app/core`
  - Resultado: OK
- Frontend:
  - `npm run build`
  - Resultado: OK
- Seguridad de entorno Presenton:
  - `OPENAI_API_KEY_SET False`
  - `DISABLE_IMAGE_GENERATION true`
- Runtime:
  - `docker compose build backend worker`
  - `docker compose up -d backend worker`
  - Schema cargado en backend: `densidad_imagenes = alta`
