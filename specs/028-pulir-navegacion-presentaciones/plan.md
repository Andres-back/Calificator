# Plan: Pulido de navegación y presentaciones

1. Sustituir la imagen RGB lateral por el recurso semántico RGBA y convertir la tarjeta en enlace contextual.
2. Retirar únicamente el CTA docente redundante del topbar.
3. Reforzar el contrato del prompt y su revisión factual.
4. Añadir comparación léxica normalizada para detectar contenido repetido con otras palabras.
5. Hacer explícita la secuencia pedagógica de seis, siete, ocho y más diapositivas.
6. Ejecutar pruebas focalizadas, tipos, lint y build; integrar mediante PR verde.

No hay cambios de datos, API o dependencias. El principal riesgo es rechazar contenido válido; se mitiga limitando la similitud a roles instructivos y exigiendo al menos cinco términos significativos.
