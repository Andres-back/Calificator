# Validación

1. `python -m unittest discover -s encuesta-docente/tests -v`.
2. `node --test encuesta-docente/tests/submission.test.mjs`.
3. Base temporal y credenciales sintéticas: recorrer preguntas, firma, envío, constancia, reintento y reporte privado.
4. Playwright CLI WebKit 360 px y Chromium escritorio: rechazo corregible, confirmación perdida y recepción única, sin desbordamiento.
5. Build Docker y recepción con base temporal; ningún fixture en producción.
6. Tras CI/merge: actualizar solo encuesta-docente, comprobar salud/assets/resumen y huellas históricas.

Preprueba humana pendiente: docentes sin guía, duración y dificultades reales. No sustituirla por automatización ni anunciar 5–7 minutos como comprobados.
