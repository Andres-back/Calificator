# Validación: Editor de respuestas y puntajes claro y fácil de usar

## Pruebas

```
npx vitest run src/modules/calificaciones src/modules/materias
  559 pruebas: pasan (21 del editor)

npx tsc --noEmit -p .  y  eslint de src/modules/calificaciones
  sin errores

npx playwright test --config=e2e/mock e2e/mock/grading-review.mock.spec.ts --project=chromium
  45 pasan (una falló al ocultar «Ver evidencia completa» en PC; se dejó visible como botón)

npx playwright test e2e/explainable-grading.spec.ts --project=chromium
  31 pasan
```

## Capturas (entorno local, 1440 px y 390 px)

- Antes: editor fuera de la vista, cuatro botones recortados, barra inferior tapando el editor en celular.
- Después: el editor queda a la vista con el foco en el estado; los cuatro estados en botones grandes; «Parcial» propone 0,5 de 1; la nota pasa de 3.50 a 3.00 en rojo. Las acciones quedan fijas al pie y la hoja fija al lado en PC.

## Lo que no se comprobó

- La redacción con IA en local: la clave local está vencida y el editor muestra el aviso de error, como se espera.
