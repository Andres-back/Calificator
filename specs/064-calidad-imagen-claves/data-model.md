# Modelo de datos lógico

No se requiere migración.

## Diagnóstico de imagen

- `status`: `good`, `warning` o `unusable`.
- `brightness`: brillo medio normalizado.
- `contrast`: desviación de luminancia normalizada.
- `sharpness`: energía de bordes normalizada.
- `width`, `height`: dimensiones después de EXIF.
- `warnings`: códigos traducibles (`dark`, `overexposed`, `blurry`, `low_resolution`, `low_contrast`).

Se transporta durante la preparación y se convierte en advertencias del job. No contiene texto ni se persiste en una tabla nueva.

## Clave propuesta

Cada entrada de `respuestas_esperadas` conserva `numero` y `respuesta` y podrá incluir:

- `origen`: `resolucion_independiente`, `solucion_impresa` o `verificacion_determinista`.
- `confianza`: valor entre 0 y 1.
- `explicacion`: razón breve de la solución.

Las preguntas sin clave no generan una entrada. Sus números se registran en `reglas_feedback.claves_pendientes`; `clave_completa` será falso.

## Compatibilidad

Los lectores actuales ignoran campos adicionales. Las evaluaciones antiguas no se reescriben. Al editar un borrador, una clave ausente aparece vacía y el editor exige completarla antes de confirmar/publicar.
