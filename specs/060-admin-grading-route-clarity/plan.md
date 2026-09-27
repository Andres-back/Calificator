# Plan: claridad de rutas de IA en calificación

## Solución

Añadir un resumen compacto al inicio de la función «Calificación» en `FunctionsSection.tsx`, compuesto exclusivamente a partir de `stage.effective` recibido del control center. El resumen lista extracción, verificación y arbitraje, y explica la contingencia visual solo cuando exista. Cambiar el texto del estado guardado a «Alternativa si falla esta etapa» para conservar el alcance local del fallback.

## Verificación

Primero añadir una prueba que falle con la UI anterior y represente los tres modelos del despliegue. Luego implementar el resumen, ejecutar Vitest focal, TypeScript, ESLint y build. Comprobar el diff: ningún backend, dato o ruta de IA debe cambiar.

## Despliegue y reversión

Publicar mediante el issue #119, esta rama y PR con CI verde. La reversión consiste en revertir el commit frontend; no hay migración ni cambios persistidos.
