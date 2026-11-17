# Validación: Calificar comprensión de lectura con la lectura a la vista de todos los agentes

## Pruebas

```
python -m pytest tests/unit/test_lectura_en_calificacion.py -q      8 pasan
python -m ruff check (archivos tocados)                             sin errores
```

Pruebas de calificación (`-k "grad or calific or breakdown or comparator or verif or feedback or agent or free_answer or photo"`): 694 pasan. Los 7 fallos son los mismos que da `main` en el entorno local de Windows; no hay fallos nuevos.

## Qué cubren las pruebas nuevas

- Con claves 1 y 2 «pendientes» y la 2 confirmada por el docente, al calificador solo le llega la 1.
- Si todas están confirmadas, la lista no se envía.
- La instrucción del calificador y la del verificador contienen la lectura y la regla de remisión al texto.
- Sin consenso y con motivo: «…no tiene consenso verificable… Motivo: La lectura guardada no incluye la parte donde se dice a dónde llegó.»

## Después del despliegue

Nada cambia en las notas guardadas. El efecto se ve al calificar o recalificar. En la evaluación reportada, las preguntas cuya respuesta está en la parte de la lectura que falta seguirán pendientes hasta que el docente complete la lectura o escriba la respuesta esperada; ahora el motivo se verá en pantalla.
