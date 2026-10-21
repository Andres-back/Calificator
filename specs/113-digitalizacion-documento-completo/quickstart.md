# Validación

Usar muestras sintéticas, no notas ni alumnos reales.

1. Backend: extracción/normalización de lectura, guardado, edición, versiones y permisos. Estudiante recibe lectura sin clave/reglas privadas.
2. Exportar lectura y 17 preguntas mixtas con figura, ABCD cortas/largas, VF y abiertas. Renderizar PDF/Word, revisar páginas y contenido; comparar espacio con formato anterior.
3. Chromium/WebKit desde 360 px: tres fotos, giro, orden, quitar/repetir, envío único y seguimiento. Cámara denegada permite subir archivos.
4. PDF/Word individual compatible. Mezclas, más de diez fotos o 20 MB rechazados sin job parcial ni pérdida de selección válida.
5. Cerrar/cambiar materia durante operación: no aplicar resultado antiguo al nuevo formulario; trabajo aceptado conserva seguimiento.
6. Regresión: notas/evidencias históricas intactas y publicación recuperable de un único job/fuente.

Ejecutar pytest backend, lint/tests/build frontend, Playwright contextual y CI con base aislada/contendores. Registrar resultados reales al terminar; esta guía no afirma ejecución ni despliegue.

## Resultados locales — 2026-10-21

- Backend: 1.154 pruebas unitarias aprobadas, dos skips existentes; Ruff F401/F821/F822/F823/F841 y diff check correctos.
- Frontend: 122 archivos, 793 pruebas aprobadas con dos workers; una prueba adicional posterior de edición de lectura también aprobada. TypeScript, lint estricto y build correctos.
- Navegador: ocho escenarios nuevos aprobados (tres fotos ordenadas/giradas y lector con texto de apoyo; 360/1440 px; Chromium/WebKit). Capturas revisadas de lectura móvil y escritorio: texto íntegro, párrafos y controles visibles. La tabla de apoyo mantiene su desplazamiento horizontal propio en celular.
- Exportación: contratos sintéticos PDF/Word y conservación de figuras aprobados. Pendiente generar/renderizar páginas reales para QA visual; no confundir tests de texto/HTML con comprobación visual.
- Persistencia: añadidos contratos PostgreSQL aislados para guardado/edición de lectura y bloqueo de cambios sobre entregas legacy; no ejecutados localmente porque Docker Desktop no está disponible. Deben pasar en CI antes de la entrega.
- La copia de código de prueba al VPS fue bloqueada por el revisor automático; se solicitó aprobación humana específica. No se realizó esa transferencia ni prueba remota. Contenedor pretendido: sin red, sin secretos ni volúmenes de producción, solo muestra sintética.

Esta segunda entrega aún no está desplegada. El incidente urgente se resolvió por separado con PR #234: nueve notas sugeridas recuperadas, 13 evidencias y cuatro resultados anteriores conservados; comprobación registrada en el PR sin identidades de alumnos.
