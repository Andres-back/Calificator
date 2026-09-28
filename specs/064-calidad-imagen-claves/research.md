# Investigación y decisiones

## Calidad de imagen

- Se medirán brillo medio, contraste, energía de bordes y resolución útil sobre una miniatura en escala de grises.
- Pillow ya forma parte del backend y permite EXIF, autocontraste, mejora de brillo/contraste y nitidez sin una dependencia pesada nueva.
- Las métricas solo generan advertencias salvo archivo corrupto, dimensiones mínimas inútiles o imagen prácticamente uniforme.
- El cliente usa Canvas únicamente para retroalimentación inmediata; el servidor es la autoridad.

## Preparación

- Se conserva la evidencia original en el flujo de almacenamiento existente.
- Las variantes para visión corrigen EXIF, reducen el lado máximo, compensan oscuridad o bajo contraste de forma moderada y aplican nitidez suave.
- Se mantienen variantes de orientación porque algunos celulares conservan metadatos incorrectos.

## Clave de respuestas

- La extracción visual clasifica texto impreso y respuesta observada; el estructurador recibe solamente el contenido de preguntas.
- Una clave propuesta debe declarar origen y confianza. Si no puede resolverse independientemente, queda pendiente.
- Se rechaza la estrategia anterior de forzar al LLM a completar todas las respuestas: puede consolidar como correcta una respuesta manuscrita equivocada.
- El borrador puede guardarse incompleto; la validación de publicación ya bloquea claves faltantes.

## Referencias

- [MDN capture](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/capture): captura móvil no es uniforme entre navegadores.
- [OpenCV geometric transforms](https://docs.opencv.org/4.12.0/da/d6e/tutorial_py_geometric_transformations.html): referencia para corrección geométrica futura, no obligatoria en este alcance.
- [OpenCV histogram equalization](https://docs.opencv.org/4.12.0/d5/daf/tutorial_py_histogram_equalization.html): fundamento de mejora local de iluminación; se implementa una alternativa conservadora con Pillow.
- [OpenCV Laplacian](https://docs.opencv.org/4.x/d5/db5/tutorial_laplace_operator.html): fundamento de la medida de nitidez basada en bordes.
