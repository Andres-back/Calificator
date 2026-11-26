# Plan: Datos personales fuera del repositorio público y licencia MIT

**Spec**: [spec.md](spec.md) | **Issue**: [#458](https://github.com/Andres-back/Calificator/issues/458)

## Decisión

Datos, documentación y una línea de texto. Sin migraciones.

- `encuesta-docente/settings.json` y `encuesta-docente/versions/*/settings.json`: `contact_emails` pasa al correo institucional y se quita `contact_phone`. `public/app.js` ya muestra la lista de correos sin depender de cuántos haya. En `encuesta-docente/app.py` se quita «Teléfono: …» del texto del consentimiento, en sus dos versiones.
- Especificaciones 063, 112, 113 y 116: el nombre de cada docente se cambia por su área o su caso.
- `LICENSE` (MIT) y una sección «Licencia» en `README.md`.

## Alternativas descartadas

- Leer el contacto de una variable de entorno: el usuario prefirió dejar el correo institucional, que es un contacto adecuado para el consentimiento.
- Reescribir el historial: cambia todos los identificadores, incluido el commit que cita la tesis, y rompe las copias locales. El usuario decidió no hacerlo.

## Riesgos

- Las versiones guardadas de la encuesta ya no muestran el contacto que vieron los participantes de esas versiones. El cambio queda documentado en esta especificación.

## Verificación

Búsqueda en el árbol y pruebas de la encuesta docente. Ver [quickstart.md](quickstart.md).
