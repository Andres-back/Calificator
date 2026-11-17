# Plan: PDF imprimibles de recursos claros y listos para el aula

**Spec**: [spec.md](spec.md) | **Issue**: [#406](https://github.com/Andres-back/Calificator/issues/406)

## Decisión

Todo el cambio está en `backend/app/modules/herramientas/pdf_render.py`. No cambian los datos guardados ni la firma `render_material_pdf(material, soluciones=False)`.

- **Nombres**: `TOOL_LABELS` cubre todos los tipos; relacionar pares y el quiz usan su propio encabezado. `_render_examen` recibe `section_label` y `keep_short_cards`; el examen conserva sus valores.
- **Opciones**: `_clean_options` quita «A)», y quita «A.», «A -» o «A:» solo si todas las opciones traen su propia letra en orden.
- **Rúbrica**: `_rubric_levels` ordena por la escala (sin distinguir mayúsculas ni espacios) y deja al final los niveles que no están en ella. Hasta cinco niveles, tabla `rubric` con una columna por nivel; con más, la tabla apilada de antes.
- **Imágenes**: `_render_image_box` devuelve vacío si no hay imagen real. El cuento omite la cuadrícula de dos columnas; Para colorear muestra un aviso.
- **Saltos de página**: clase `keep` (`break-inside: avoid`) en tarjetas de taller, ficha, lectura, semanas del plan, secciones cortas de la guía y preguntas cortas del quiz.
- **Ficha**: `_e_multiline` convierte los saltos de línea en `<br/>` después de escapar; los tipos que contienen «dibuj» usan `drawbox`.
- **Tarjetas**: tabla `fcards` de dos columnas con borde punteado.
- **Sopa de letras**: `_sopa_cell_px` calcula la celda (32 px hasta 15 columnas, mínimo 20 px).
- De paso se corrige que el cuento con imagen se salía del margen derecho.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/herramientas/pdf_render.py` | los nueve requisitos |
| `backend/tests/unit/test_herramientas_pdf_imprimibles.py` | pruebas nuevas sobre el HTML generado |

## Verificación

WeasyPrint no corre en Windows nativo: los PDF se generan dentro del contenedor del entorno de pruebas con el código de la rama montado, se pasan a imagen y se revisan uno por uno.
