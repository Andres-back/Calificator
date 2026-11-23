# Validación: Mostrar lo que anotó la IA, en la pregunta que nombra

## Pruebas

```
npx vitest run src/modules/calificaciones src/components                 695 pasan
npx playwright test --config=e2e/mock ai-notes missing-in-photos grading-review --project=chromium     51 pasan
tsc --noEmit y eslint de lo tocado                                      sin errores
```

Con `SHOTS_DIR=<carpeta>` la prueba simulada `ai-notes` guarda capturas del resumen y de la pregunta en 390 y 1366 px.

## Antes y después

| Caso | Antes | Después |
| --- | --- | --- |
| Nota «P1: omite el dióxido de carbono» | aviso genérico repetido | «El verificador anotó: «P1: …»» dentro de la pregunta 1 |
| Nota sin pregunta («Suma verificada…») | aviso genérico | aviso general con su texto |
| Pregunta resuelta con el modelo principal (Spec 212) | aviso solo en la lista | «Notas de la IA» dentro de la pregunta |
| El modelo principal pidió revisión | «La segunda revisión de IA encontró algo…» | «El modelo principal pidió que revises esta calificación…» |
| Diagnóstico técnico | aviso genérico | aviso genérico (sin cambio) |
