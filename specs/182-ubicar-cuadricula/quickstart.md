# Validación: Ubicar cada pregunta en la hoja con una cuadrícula

## Prueba con el modelo (producción, solo lectura)

Con `claude-haiku-5-5` sobre la hoja 2 de la captura, desde el contenedor del backend y sin escribir nada:

| Método | Pregunta 13 | Pregunta 16 |
| --- | --- | --- |
| Coordenadas, hoja de lado | fuera de la hoja | sobre el nombre |
| Coordenadas, hoja enderezada | sobre la 14 | sobre la 17 |
| Cuadrícula, hoja de lado | correcta | correcta |
| Cuadrícula, las 10 preguntas en una llamada | las 10 correctas | |

Costo total: unos centavos.

## Pruebas

```
python -m pytest tests/unit/test_answer_grid_locator.py tests/unit/test_answer_location.py   (backend)
  37 pruebas: pasan; 139 relacionadas pasan

npx vitest run src/modules/calificaciones
  371 pruebas: pasan

npx tsc --noEmit -p .  y  eslint de los archivos tocados
  sin errores ni avisos
```

Antes del cambio, el localizador no existía y el servicio guardaba la zona estimada por la lectura.

## Lo que no se comprobó

- **Sonnet**, el modelo de producción, con la cuadrícula: la prueba se hizo con Haiku por el techo de costo. Se comprueba en producción.
- Las pruebas de extremo a extremo; corren en la CI.

## Después de desplegar

Abrir la misma calificación de la captura, «Respuestas y puntajes», pregunta 13: tras unos segundos, el recuadro rodea la pregunta 13.
