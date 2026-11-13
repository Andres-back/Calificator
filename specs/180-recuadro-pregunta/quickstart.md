# Validación: El recuadro de la respuesta abarca la pregunta completa

## Pruebas

```
npx vitest run src/modules/calificaciones/components
  182 pruebas: pasan

npx tsc --noEmit -p .  y  npx eslint src/modules/calificaciones/components
  sin errores ni avisos
```

Antes de la corrección, las pruebas nuevas de `evidenceViewport.test.ts` no podían importar `expandAnswerRegion`, y las del visor medían el recuadro ceñido a la marca.

Incluyen el caso de la captura de producción: una marca de 2,4 % × 5,7 % de la hoja en una foto girada pasa a un recuadro de 10,4 % × 34 %.

## Lo que no se comprobó

- **Una captura con el cambio aplicado**: la captura local se interrumpió y el disco del equipo está casi lleno. Se comprueba en producción.
- Las pruebas de extremo a extremo; corren en la CI.

## Después de desplegar

Abrir la misma pregunta de la captura: el recuadro debe rodear el número, el enunciado y las cuatro opciones.
