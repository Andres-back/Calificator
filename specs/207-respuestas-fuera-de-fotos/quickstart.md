# Validación: Avisar qué respuestas no aparecen en las fotos de la entrega

## Pruebas

```
npx vitest run src/modules/calificaciones                                         393 pasan (6 nuevas)
npx playwright test --config=e2e/mock missing-in-photos --project=chromium         2 pasan (390 px y 1366 px)
tsc --noEmit y eslint de lo tocado                                                sin errores
```

## Caso real que lo motivó (producción, solo lectura)

- Una entrega de «Organización de una planta» con la foto de una sola cara: solo la respuesta 1; las respuestas 2 y 3 estaban al reverso (se transparentaba la tinta). El texto visible bajo la respuesta 1 era la lectura impresa.
- «Sociales»: 13 entregas sin las preguntas 21 a 24, indicadas «al reverso» en la hoja.
- Total: 15 entregas sin decidir en tres evaluaciones.

## Cómo se ve

- Aviso: «Las respuestas de las preguntas 2 y 3 no aparecen en las fotos.» con la indicación de añadir la foto del reverso u otra hoja en «Editar hojas» y el botón «Añadir la foto que falta», que abre la evidencia.
- Pregunta 2: primer motivo «Esta respuesta no aparece en las fotos de la entrega».

## No se probó

Contra la base local: Docker no estaba disponible; el recorrido usa la API simulada del entorno de pruebas.
