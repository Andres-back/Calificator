# Validación: Avisar cuando el recorte de la hoja deja fuera parte de la foto

## Pruebas

```
npx vitest run src/components/evidence          139 pasan (10 nuevas)
tsc --noEmit y eslint de lo tocado              sin errores
```

## Recorrido en el navegador

Con el arnés de e2e (`e2e/fixtures/scanHarness.tsx`, `mount()`), una foto sintética de cuaderno que llena la imagen y el ajuste preciso de esquinas:

| Ancho | Antes de recortar | Tras recortar a una franja | Aceptar visible | Desborde |
| --- | --- | --- | --- | --- |
| 390 px | sin aviso | aviso | sí | 0 |
| 1280 px | sin aviso | aviso | sí | 0 |

## Hallazgo previo

Las fotos originales de producción cuyo recorte guardado era una franja, pasadas por el detector automático (antes y después de un cambio que se descartó), devolvieron la foto completa: el recorte fue manual. Por eso la mejora es un aviso al recortar y no un cambio del detector.
