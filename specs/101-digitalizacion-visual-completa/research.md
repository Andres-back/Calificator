# Investigación y decisiones — 101

Fecha: 2026-10-15. Investigación de código local y documentación primaria, sin inferencias de pago ni cambios de datos de producción. Las decisiones resuelven las incógnitas de planificación; su funcionamiento debe probarse al implementar.

## 1. Por qué desaparece contenido

**Evidencia local**: `evaluaciones/digitalize_service.py::extract_evaluation_text` retorna inmediatamente cuando encuentra texto en PDF. En DOCX llama a `dba/document_service.py::extraer_texto_docx`, que solo concatena párrafos. `_normalize_question` no define recursos visuales. El worker cachea texto/avisos y elimina el archivo temporal tras éxito o cancelación.

El archivo de referencia inspeccionado anteriormente contiene cuatro tablas como PNG y un gráfico circular; la primera tabla sirve a tres preguntas. No son tablas nativas de Word, por lo que añadir solamente lectura de `doc.tables` no resuelve el caso. El original sigue intacto y no se incorporará al repositorio.

**Decisión**: nuevo extractor estructurado del dominio de evaluaciones y persistencia privada, sin cambiar globalmente el helper compartido de documentos. Separar original duradero y temporales; cache de manifiesto con versión de esquema/hash. No reutilizar un checkpoint textual antiguo como extracción visual completa.

**Alternativas descartadas**: solo OCR; solo tablas nativas; extraer todas las imágenes sin contexto; conservar una URL pública; pedir a la IA que vuelva a dibujar lo que no se extrajo.

## 2. Figuras vectoriales y Word complejo

**Decisión**: inventariar texto, imágenes y trazos de PDF y conservar render de todas las páginas admitidas. Para Word, combinar el orden y relaciones de OOXML con conversión a PDF mediante LibreOffice en servicio aislado. Esto cubre una clase mayor de objetos que solo las imágenes incrustadas; la comparación con el original continúa siendo necesaria, sin promesa de fidelidad perfecta.

**Fundamento primario**: [PyMuPDF Page](https://pymupdf.readthedocs.io/en/latest/page.html) documenta extracción, dibujos y render de página; [parámetros de LibreOffice](https://help.libreoffice.org/latest/en-GB/text/shared/guide/start_parameters.html) documenta conversión sin interfaz y perfiles independientes. Estas opciones no son una garantía de seguridad ni de fidelidad; el aislamiento y las pruebas del conversor forman parte del trabajo.

**Alternativas descartadas**: conversión externa con envío a terceros; depender del Word del usuario; instalar LibreOffice en todas las imágenes; tratar un objeto no reconocido como decoración prescindible. El conversor no debe ejecutarse en el proceso API ni tener acceso a evidencias guardadas.

## 3. Reutilización en interfaz y documentos

**Evidencia**: `GenerationWizard.tsx` y `generationWizardModel.ts` solo conservan campos conocidos de texto/opciones/puntos/criterios. Guardar podría descartar un campo visual desconocido. `StudentAnswerSheet.tsx` tampoco muestra recursos. El examen en `herramientas/pdf_render.py::_render_examen` no consume sus helpers gráficos; `export_service.py::render_evaluation_docx` rechaza explícitamente preguntas con campos gráficos.

**Decisión**: contrato visual tipado con round-trip y lector común docente/estudiante. Exportadores consumen el mismo contenido versionado; Word inserta tablas y archivos gráficos reales en lugar de quitar el guard y seguir perdiendo contenido. Reutilizar `EvaluationPreviewModal` y `EvaluationPdfViewer` para vista final móvil.

**Alternativas descartadas**: almacenar HTML libre, crear dos fuentes de verdad para PDF/Word, inyectar SVG arbitrario, incorporar un editor de página completo para una función por pregunta.

## 4. Generación que realmente produzca recursos

**Evidencia**: `services/image_router.py::generate_image` resuelve `generacion_imagenes` y permite fallback configurado. Puede devolver placeholder. El endpoint genérico de imágenes registra biblioteca como best-effort, no garantiza adjunto duradero; `tasks_images.py` es un stub, no una generación de fondo terminada.

**Decisión**: invocar el servicio real desde un job persistente de evaluación con configuración capturada. Aceptar solo bytes válidos no-placeholder y almacenarlos privadamente. Tablas/gráficas se proponen como datos validados por el LLM configurado para contenido; se dibujan de forma determinista con tipos limitados y se previsualizan. Para figuras ilustrativas se usa generación de imágenes existente. No hay selección fija de modelo ni nuevos proveedores.

**Alternativas descartadas**: usar un modelo de visión como si generara imágenes, guardar solamente base64 efímero o URL de proveedor, gráficos cuantitativos con números pintados por IA, confirmar una propuesta automáticamente.

## 5. Riesgo de editar el contexto de notas antiguas

**Evidencia**: `service.py::update_evaluation` permite edición estructural publicada y reconstruye el blueprint; `expected_updated_at` evita algunos conflictos, pero no crea una revisión histórica. `tasks_grading.py` llama a `evaluation_to_grading_blueprint` al ejecutar. Los desgloses versionan notas, no la evaluación completa que vio el estudiante.

**Decisión**: revisiones completas e inmutables para el nuevo contenido visual, referencias fijadas antes de encolar y al iniciar la entrega online. Evitar que datos nuevos se apliquen a trabajos o registros anteriores por leer el blueprint actual. En legacy, no inventar snapshots históricos: conservar lector anterior y línea base identificada como estado observado, impedir edición mientras haya trabajos antiguos sin revisión y exigir elección docente para cualquier recalificación antigua que precise versión.

**Alternativas descartadas**: cachear solo recursos sin clave/contexto, fijar revisión al arrancar el worker, backfill masivo, afirmar que un snapshot tomado hoy describe una evaluación pasada. Bloquear toda edición tras entregas y exigir copiar la evaluación es alternativa más simple, pero no satisface la edición versionada propuesta; por eso la preservación debe construirse primero.

## 6. Coste, seguridad y validación

**Decisión**: reutilizar texto determinista donde exista, una lectura visual por página o grupo de páginas dentro del presupuesto, cachear recursos compartidos y evitar lecturas por pregunta. La cobertura se contrasta con muestras humanas, no solo con el inventario que propone el modelo. Se separa la latencia del proveedor de la del proceso.

Recursos sin acceso público, lectura autorizada por evaluación, sin URLs arbitrarias ni acceso a rutas enviadas por clientes. El renderer de documentos usa un entorno efímero y red interna sin salida a Internet; rechaza macros/enlaces externos y limita expansión del ZIP. La función no se activa si no se demuestra esta separación o si faltan exportación, historial o permisos.

No se fija una nueva promesa de 20 segundos: todavía no existe medición de esta ruta. Pruebas rutinarias con dobles de proveedores; inferencia real solo como comprobación explícitamente autorizada y limitada, nunca treinta calificaciones de alumnos para validar presentación.
