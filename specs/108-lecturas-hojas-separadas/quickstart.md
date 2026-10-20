# Guía de validación prevista

Después de aprobar el plan e implementar:

1. Añadir fixtures sintéticas: cuento breve/largo con/sin imagen, lectura con respuesta corta/justificación, preguntas sin número y recurso sin preguntas.
2. En `backend/`, ejecutar `python -m pytest tests/unit/test_herramientas_pdf_total.py` y el nuevo módulo focalizado de lectura que defina Tasks. Comprobar conservación del input y ausencia de soluciones en HTML alumno.
3. Con las dependencias reales de PDF disponibles, generar muestras mediante `render_material_pdf`; inspeccionar páginas y extraer texto para comprobar orden, salto, continuidad y numeración. Registrar herramienta/entorno y resultados, sin sustituirlo por un mock.
4. En `frontend/`, ejecutar pruebas de `StoryContent` y `ContenidoView`, TypeScript/lint y E2E de recurso/visor en Chromium y WebKit a 360/390/1280 px, claro/oscuro.
5. Comparar tiempos de exportación contra el mismo fixture baseline; verificar cero llamadas IA.
6. Reconciliar tareas y calidad local antes del PR; ejecutar CI remoto sobre el PR antes de cualquier fusión. No desplegar ni afirmar éxito de pruebas todavía no ejecutadas.

## Generación nueva (ampliación aprobada)

7. Ejecutar `python -m pytest tests/unit/test_story_generation_quality.py tests/unit/test_reading_worksheet_layout.py -q`. Comprobar rechazo de repetición/páginas antes de imagen, una corrección máxima, preferencia de moraleja y estado sin imagen.
8. En runtime con WeasyPrint y PyMuPDF ejecutar `tests/unit/test_story_pdf_pages.py`; el host Windows puede omitirlo si no tiene las dependencias nativas, pero esa omisión no reemplaza ejecutar el render real en Docker.
9. Ensayos externos exclusivamente con autorización y datos ficticios: un texto y una imagen `low`, checkpoints antes de cada solicitud, no repetir resultados inciertos ni copiar claves fuera del servidor. Revisar físicamente narración, moraleja, escena y preguntas; registrar límites de la muestra.
10. No incluir la propuesta 098 ajena y no versionada en el PR. Governance se comprueba en snapshot de los archivos del candidato, no cambiando el baseline para incluir trabajo ajeno.
