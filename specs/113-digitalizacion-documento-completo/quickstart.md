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
- Persistencia: contratos PostgreSQL aislados de guardado/edición de lectura y bloqueo de cambios sobre entregas legacy ejecutados en CI. El control Backend quality and tests pasó en la ejecución 39646145919, al igual que Frontend quality and build y Container builds. El E2E contextual pasó; el E2E general seguía en curso al registrar esta comprobación. El PR debe volver a pasar todos los controles sobre su HEAD final.
- Exportación: 37 contratos unitarios aprobados y un skip existente después del ajuste final de paginación Word; Ruff y diff check correctos.

## Revisión visual PDF y Word — 2026-10-21

Tras la autorización humana específica, se copiaron únicamente código y muestras sintéticas a una carpeta temporal del VPS. Se ejecutaron contenedores efímeros, con red deshabilitada, sistema de archivos de solo lectura, límites de recursos y solo la carpeta de QA montada. Sin credenciales, bases de datos, archivos de alumnos ni volúmenes de producción. Word se convirtió con LibreOffice del contenedor de documentos del proyecto porque el runtime local no dispone de conversor; no se usó la aplicación de escritorio del usuario.

| Muestra sintética de 17 preguntas y lectura | Formato anterior | Compacto |
| --- | --- | --- |
| PDF con ABCD cortas/largas, V/F, abiertas, tabla y dibujo | 3 páginas | 3 páginas |
| Word con ese mismo contenido mixto | 3 páginas | 2 páginas |
| PDF con opciones breves | 3 páginas | 2 páginas |
| Word con opciones breves | 3 páginas | 2 páginas |

Las 17 preguntas están presentes en los ocho PDF de comparación. Se revisaron todas las páginas de los resultados compactos mediante PNG: lectura y párrafos completos, figura/tabla legibles, numeración, opciones largas en una columna, opciones breves en dos columnas y espacio de respuesta en abiertas; sin cortes ni solapamientos. El ahorro depende del contenido, no se promete una reducción de páginas para cualquier evaluación.

La inspección detectó una tabla de Word separada de sus opciones por un salto de página. Se corrigió para preguntas breves acotadas y se volvió a renderizar e inspeccionar. Las preguntas/tablas extensas siguen pudiendo continuar en otra hoja. Dos regresiones nuevas comprueban ambos casos. Artefactos sintéticos locales ignorados: `output/pdf/spec113/`; no se incorporan a Git.

## Convergencia

Revisados siete requisitos funcionales, cuatro criterios de éxito, doce escenarios de aceptación, siete decisiones del plan y ocho principios constitucionales. Sin trabajo de implementación adicional respecto al alcance aprobado. Trece tareas completadas; índices e inventario actualizados. Las 49 pruebas locales de gobernanza pasaron y el inventario contiene 596 superficies. No hay migraciones, backfill, cambio de modelos ni regeneración de evaluaciones antiguas. Abrir PR ligado a #233 y exigir nuevamente CI y gobernanza verdes sobre el HEAD final antes de fusionar.

Esta segunda entrega aún no está desplegada. El incidente urgente se resolvió por separado con PR #234: nueve notas sugeridas recuperadas, 13 evidencias y cuatro resultados anteriores conservados; comprobación registrada en el PR sin identidades de alumnos.
