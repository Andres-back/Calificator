# Validación: Quiz rápido interactivo con clave de respuestas fiable

## Pruebas

```
npx vitest run src/modules/herramientas     pasan (81; 6 nuevas)
npx tsc --noEmit  y  eslint src/modules/herramientas     sin errores ni avisos
```

## Comprobación en pantalla (390 px, como estudiante)

Quiz real de 8 preguntas generado en local.

| Paso | Resultado |
| --- | --- |
| Antes del cambio, «Ver respuestas» | ninguna de las 8 correctas quedaba marcada |
| Tocar la opción B en 7 preguntas | «Respondidas: 7 de 8»; cada opción mide 48 px de alto |
| «Comprobar respuestas» | «Acertaste 3 de 8»; las 8 correctas marcadas en verde; errores en rojo; la última dice «Sin responder» |
| «Intentar de nuevo» | 0 opciones seleccionadas |
| Desborde lateral y errores de consola | ninguno |
