# Validación: La hoja se endereza y gira sola al tomar la foto

## Prueba del modelo (producción, solo lectura)

Modelo de la ruta de bordes, sobre dos entregas reales de 2 hojas:

- Pedir el ángulo: 3 de 4 aciertos; la foto real habría quedado de cabeza.
- Elegir entre las 4 orientaciones: 16 de 16 aciertos, con la foto girada 0, 90, 180 y 270 grados.

## Pruebas

```
python -m pytest tests/unit/test_evidence_scan_suggestion.py   (backend)
  45 pruebas: pasan (14 nuevas)
  Otras del escáner: los 12 fallos locales son los mismos que en main (dependen de Linux) y pasan en la CI.

npx vitest run src/components/evidence src/modules/materias src/modules/calificaciones src/modules/evaluaciones
  pasan; cuatro archivos ajenos tardaron por carga y pasan solos

npx playwright test e2e/evidence-scan.spec.ts e2e/digitalization-scan.spec.ts e2e/native-camera-capture.spec.ts --project=chromium
  30 pasan
```

## Captura

En 390 px, el preparador abre en la hoja enderezada con el aviso «Hoja enderezada automáticamente…», la pestaña «Ver preparada» marcada y «Usar esta hoja» como acción principal.

## Para activar el giro automático

La ayuda visual está apagada en producción. Para activarla, poner `EVIDENCE_CORNER_ASSISTANCE_ENABLED=true` en el backend, con autorización del usuario. Sin ella, la hoja se endereza con OpenCV, abre en la hoja preparada y el giro sigue siendo manual.
