# Validación: La nota del dibujo no impide reconocer la opción marcada

## Pruebas

```
python -m pytest backend/tests/unit/test_objective_drawing_note.py -q
  27 passed

python -m pytest backend/tests/unit -q
  13 failed, 2163 passed, 7 skipped
```

Antes de la corrección fallaban 9 de las pruebas nuevas. Las 13 que fallan son las de siempre en Windows (`test_evidence_scan*` y `test_pdf_service`) y corren en CI. La corrida completa es anterior a los dos últimos ajustes (letras "V" y "F", y letra sola); después de ellos se repitieron las 7 suites del calificador: 120 pasan.

## Repetición sobre datos reales, solo lectura (2026-11-10)

Se exportaron las comparaciones guardadas de las 155 calificaciones de los últimos 60 días que traen la nota del dibujo, y se repitió la comparación corregida en local. No se escribió nada en producción.

| Antes → después | Respuestas |
| --- | --- |
| Incorrecta → correcta | 831 (743 de opción múltiple, 88 de verdadero o falso) |
| Incorrecta → incorrecta | 466 |
| Correcta → correcta | 97 |
| Incorrecta → sin registrar | 12 |
| Correcta → incorrecta o sin registrar | 0 |

Las 12 sin registrar son dos marcas, o la letra sola de una opción de verdadero o falso. La letra sola la resuelve el código con las opciones de la pregunta, pero el dato guardado no las trae, así que aquí no se pudo repetir.

De las 831, el desglose guardado tiene 692 correctas por los calificadores, 113 pendientes, 14 incorrectas, 4 sin evaluar y 1 corregida por su docente. Las 7 restantes no tienen un componente con ese número.

## Después de desplegar

1. Calificar una entrega por foto con preguntas de opción múltiple: las opciones bien marcadas salen como correctas, con origen "objetivo".
2. Las calificaciones anteriores no cambian hasta que se decida cómo corregirlas.
