# Verificación del hotfix

Solo datos sintéticos en base temporal. No enviar pruebas a producción.

1. `python -m unittest discover -s encuesta-docente/tests -q`
2. `node --test encuesta-docente/tests/submission.test.mjs`
3. Construir contenedor y ejecutar `tests/container_smoke.py` con red deshabilitada y /data temporal.
4. En Chromium y WebKit: nombre, autorizaciones, preguntas omitidas y firma; comprobar constancia. Repetir con 50 %, 50,5 y texto aproximado, minutos sin método, Otro sin descripción.
5. Comprobar 360 px/escritorio, resumen separado y originales sin cambios. No publicar ni fusionar con controles pendientes o rojos.

## Resultados del 2026-10-21

- Regresión reproducida antes del arreglo: cuatro fallos Python por versión/obligatoriedad/número/dependencia; helper numérico inexistente en Node. Tras el arreglo: 81/81 pruebas Python y 5/5 Node, incluidos 5.0 estricto, piloto, consentimiento, CSRF, firma y originales inmutables.
- WebKit 390×844, Chromium 360×800 y 1366×900: cuatro envíos completos por configuración (12 en total), todas las preguntas omitidas o porcentaje 50 %, 50,5 o texto aproximado; minutos 32,5 sin método. Constancia confirmada, institución null, firma obligatoria y sin desbordamiento horizontal. SQLite temporal local, no muestra de investigación.
- Docker Desktop local no respondió. Se construyó una imagen temporal en el VPS y se ejecutó un contenedor desechable sin red ni volúmenes reales, limitado a 128 MiB y 0,5 CPU. Smoke correcto: recepción, archivo 5.0, parcial flexible, CRUD, permisos, idempotencia e integridad. Ningún servicio de producción desplegado o reiniciado durante esta prueba. Manifest de prueba `sha256:1424caedcfc0885bd0234aa049b48aa3f09158a273b7d9178a3edbfaa3fc82c1`.
- Sintaxis JavaScript e inventario regenerado (596 superficies). La revisión de convergencia contrasta seis FR, tres SC y las tres historias contra código/pruebas; sin trabajo funcional faltante. Sin extensiones de hooks configuradas.
- CI del PR y publicación siguen siendo puertas externas: no se consideran aprobadas por las pruebas locales. No es una preprueba humana ni mide reducción de tiempos docentes.
