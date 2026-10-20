# Decisiones de diseño

- **Decisión**: reutilizar `pdf_render.py` y vistas actuales. **Razón**: cuento usa hoy `story-grid` de dos columnas y lista sin renglones; lectura usa tres líneas fijas y no inicia cuestionario en página nueva. **Alternativa descartada**: regenerar contenido o cambiar prompts para un problema de presentación.
- **Decisión**: espacio determinista y acotado, basado en metadatos disponibles. **Razón**: cuentos antiguos tienen preguntas de texto simple y lecturas tienen respuesta esperada/justificación. **Alternativa descartada**: llamar IA al exportar, que añade costo y demora.
- **Decisión**: salto de página solo antes de preguntas existentes, bloques de longitud variable. **Razón**: forzar exactamente dos páginas puede ocultar texto. **Alternativa descartada**: reducir letra o fijar altura recortable.
- **Decisión**: renderizar/verificar PDF real además del HTML. **Razón**: comprobar CSS no demuestra paginación correcta. Pruebas usarán datos sintéticos, sin producción. No hay incógnitas técnicas que requieran nuevas dependencias o investigación delegada.

## Ampliación aprobada de generación

- El prompt anterior describía solo «corto/medio/largo» sin límites comprobables y la imagen recibía únicamente dos párrafos, recortados a 900 caracteres. Se usa ahora la historia aceptada completa como contexto visual.
- No regenerar históricos. El gate se aplica únicamente en `_generate_with_quality` para cuento nuevo, antes de la normalización que podría esconder duplicados. Mínimo tres párrafos, 120–230 palabras cortas o hasta 560 para medio/largo; límites de palabras preventivos, no sustituyen la medida real del documento.
- WeasyPrint mide el mismo render, excluye preguntas y reserva 260 px más margen para la ilustración (imagen máxima 220 px más marco). Se ejecuta en `asyncio.to_thread`; una corrección textual máxima si el contenido falla. No reducir tipografía ni truncar texto.
- Preferencia opcional de moraleja: automática/con/sin; el valor por defecto conserva clientes anteriores. La opción automática y las comprobaciones de estructura no certifican la coherencia semántica.
- Ensayo autorizado OpenCode + GPT Image 2 low en un proceso aislado: 202 palabras, sin párrafos duplicados, narración/moraleja en página 1 y preguntas en 2. No modifica rutas efectivas ni persiste materiales académicos. No sustituye pruebas completas de la cola o UI de producción.
