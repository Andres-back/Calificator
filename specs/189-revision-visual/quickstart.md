# Validación: Revisión visual. Datos que engañan y fondos blancos

## Recorrido

`recorrido.cjs` (Playwright) entra como público, docente, estudiante y administrador y abre 45 rutas en 390 px y 1440 px. Toma capturas y mide desborde horizontal, botones menores de 40 px, recortes y errores de consola. Ninguna página desborda. Los 403 de consola son tipografías que el servidor local no sirve por el enlace de `node_modules`; no ocurren en producción.

Tres revisiones visuales independientes de las capturas dieron los hallazgos de la spec y de las siguientes entregas.

## Pruebas

```
python -m pytest tests/unit/test_reportes_resumen_escala.py      1 pasa
npx vitest run (materias, dashboard, reportes, evaluaciones, lib, calificaciones, feedback_sharing)
  1116 pasan
npx playwright test e2e/materia-lifecycle.spec.ts --project=chromium      6 pasan
npx tsc --noEmit  y  eslint de los módulos tocados      sin errores
```

## Capturas después del cambio (390 px)

- Reportes: «0.9 / 5.0», barras horizontales de 0 a 5, encabezados «Notas» y «Promedio».
- Inicio del estudiante con 1.8: «Tu materia», «1.8 / 5.0» en ámbar, «Aún no llega a 3.0…» y «Hay que repasar»; Xali sin cuadro blanco.
- Evaluaciones del estudiante: «Venció el 11 de nov de 2026», «Tu nota: 0.0 / 5.0» en ámbar y «3.5 / 5.0» en verde.
- Asistencia: «Sábado, 14 de noviembre de 2026».
