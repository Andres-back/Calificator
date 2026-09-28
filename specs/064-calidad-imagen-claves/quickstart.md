# Verificación rápida

1. Seleccionar una foto clara en digitalización: debe mostrar estado legible y permitir enviar.
2. Seleccionar una foto oscura o desenfocada: debe mostrar advertencia, permitir reemplazar o continuar.
3. Seleccionar una imagen corrupta: el servidor debe rechazarla sin invocar visión.
4. Digitalizar una evaluación respondida con respuestas deliberadamente incorrectas.
5. Confirmar que las preguntas se recuperan, que las respuestas observadas no aparecen como claves y que las claves inciertas quedan vacías.
6. Abrir el borrador: las respuestas pendientes deben ser editables y la publicación debe quedar bloqueada hasta completarlas.
7. Ejecutar las pruebas unitarias específicas y el chequeo TypeScript.

## Reconciliación con `main` (2026-09-28)

- Se conservaron el refuerzo moderado de trazos tenues de `main` y el diagnóstico por hoja de este PR. Una regresión nueva comprueba que la copia JPEG para visión mantiene una línea gris tenue y una marca azul; el autocontraste usa luminancia común para no volver negra la tinta de color.
- «Repetir foto» y «Reemplazar foto» conservan la hoja anterior hasta que se seleccione una nueva. Cancelar la cámara no elimina evidencia; el reemplazo mantiene su posición en el paquete.
- El PDF escaneado usa la misma separación que las fotografías: prioriza `texto_preguntas` y elimina las respuestas del estudiante etiquetadas antes de generar la clave; dos regresiones cubren ambos formatos de salida de visión.
- Después de integrar los cambios recientes de `main`: 33 pruebas backend focales, 22 pruebas frontend focales, TypeScript, ESLint y Ruff verdes. El inventario de 565 superficies y las 8 pruebas de gobernanza están vigentes.
- Playwright CLI con consultas simuladas y evidencia sintética: a 390×844 y 360×800 no hubo desbordamiento horizontal; la advertencia por oscuridad no bloqueó el envío y el reemplazo conservó una sola hoja. Se alcanzó el botón de envío mediante scroll. Las capturas están en `output/playwright/quality-warning-390.png` y `quality-warning-360.png` (artefactos locales, no versionados).
- Falta verificar el CI completo sobre el commit reconciliado y comprobar en un dispositivo móvil físico los tiempos/legibilidad indicados por SC-006 y SC-007. No se modificaron evaluaciones ni notas guardadas.
