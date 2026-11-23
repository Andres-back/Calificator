# Plan: Preguntas en hoja aparte en el PDF de cuentos y lecturas

**Spec**: [spec.md](spec.md) | **Issue**: [#224](https://github.com/Andres-back/Calificator/issues/224)

## Decisión

Solo `backend/app/modules/herramientas/pdf_render.py`. Sin migraciones, sin frontend y sin IA.

- `_questions_sheet(preguntas, after_reading, student_copy)`: si hay un texto antes, envuelve las preguntas en un bloque `.newpage` (`break-before: page`), y en la copia del estudiante le pone la línea del nombre. Sin texto antes, deja las preguntas donde estaban.
- `_answer_lines(esperada)`: renglones según la extensión de la respuesta esperada. A mano caben unas 35 letras en el ancho de la hoja; se añade un renglón de holgura, con mínimo 2 y máximo 8. Sin respuesta esperada, 3.
- `.aline`: renglón de 8 mm, el alto de un cuaderno de primaria. Los `.line` de 15 px siguen en los demás recursos.
- `_render_cuento_mejorado` y `_render_lectura_comprensiva` usan esas dos funciones. En el cuento hay texto antes si hay párrafos o ilustración real; en la lectura, si hay `texto`.

El tope de 8 renglones mantiene una pregunta dentro de una sola hoja, porque cada pregunta lleva `break-inside: avoid`.

## Qué no se hace

- No se cambia la vista en pantalla: la separación por hojas es un asunto de impresión.
- No se toca `_render_cuento`, que no está registrado en `_RENDERERS`.
- No se cambian los renglones de taller, guía, ficha ni examen. El examen ya tiene su configuración de impresión.
- No se reescribe ningún recurso guardado: el PDF se arma al descargarlo.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/herramientas/pdf_render.py` | hoja de preguntas, renglones y estilos |
| `backend/tests/unit/test_lectura_preguntas_hoja_aparte.py` | pruebas de estructura y de PDF real |
| `backend/tests/unit/test_herramientas_pdf_imprimibles.py` | la prueba del cuento espera tres renglones altos en vez de dos estrechos |

## Validación

Las pruebas de estructura corren en cualquier equipo. Las de PDF real necesitan WeasyPrint: corren en CI y, en local, dentro del contenedor de pruebas. Se revisa además un PDF de cada caso a la vista.

## Riesgo

Bajo. El PDF de cuentos y lecturas pasa a tener al menos una hoja más, que es lo pedido. Un recurso sin texto o sin preguntas no cambia de número de hojas.
