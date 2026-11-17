# Plan: Recursos fieles al tema que pidió el docente

**Spec**: [spec.md](spec.md) | **Issue**: [#410](https://github.com/Andres-back/Calificator/issues/410)

## Decisión

Solo backend. No cambia el contrato de datos ni las vistas.

- **Sin relleno**: se eliminan `_FALLBACK_PALABRAS`, `_FALLBACK_PARES` y las palabras genéricas de la sopa. Con poco contenido, el generador devuelve lo que hay y `normalize_material_content` lo marca como incompleto; `_generate_with_quality` ya reintenta una vez y, si persiste, responde 502 con el motivo.
- **Sopa de letras**: el fallo de la IA al pedir palabras ya no se silencia; sube como 503 «la IA no pudo generar». Las pistas opcionales siguen siendo tolerantes a fallos.
- **Pares**:
  - `unique_pairs` descarta lados repetidos tras normalizar (tildes, mayúsculas, espacios y puntuación final).
  - La instrucción incluye reglas de correspondencia uno a uno.
- **Crucigrama**: `limit_to_requested` rearma con las primeras N palabras ubicadas. El armado es determinista, va de la más larga a la más corta y cada palabra se apoya solo en las anteriores, así que el resultado sigue conectado.
- **Para colorear**: si `generate_image` devuelve la imagen de reserva, `gen_para_colorear` responde 503 antes de registrar o guardar.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `backend/app/modules/herramientas/generators/crucigrama.py` | sin relleno; tope de palabras |
| `backend/app/modules/herramientas/generators/emparejar.py`, `unir_columnas.py` | sin relleno; reglas; `unique_pairs` |
| `backend/app/modules/herramientas/generators/sopa_letras.py` | sin palabras genéricas |
| `backend/app/modules/herramientas/content_quality.py` | mínimos de crucigrama y pares |
| `backend/app/modules/herramientas/service.py` | para colorear sin dibujo no se guarda |
| `backend/tests/unit/test_herramientas_contenido_fiel.py` | pruebas (nuevo) |

## Costo de las pruebas reales

Seis generaciones de texto con el modelo económico de producción: menos de 0,05 USD.
