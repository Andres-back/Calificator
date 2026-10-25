# Validación prevista y estado real

## Estado actual

Alcance/plan aprobados y revisión autorizada completada el2026-10-24: base16/16 y personalizada8/8. Primera parte implementada localmente: visor, editor enfocado y propuestas de material. Composición persistente de impresión sigue pendiente. No hay migración aplicada, llamadas pagadas, PR ni certificación CI remota para esta función. Producción permanece intacta.

Cuenta demo usada únicamente para abrir visor/editor y capturar estado anterior, sin escribir campos ni guardar. A1440×1000 una hoja del visor mide1348×1744px; a390×844 mide330×427px. No se inspeccionaron evaluaciones o evidencias de alumnos reales. Esta sesión Chromium redimensionada no certifica teclado físico de iPhone/Android.

## Puertas antes de implementar

1. Aprobación de alcance/plan y revisión de la [lista de ocho requisitos](checklists/edicion-impresion.md): completadas.
2. Tasks generadas y Analyze de solo lectura:15/15 FR con cobertura, treinta tareas, sin conflictos constitucionales ni hallazgos bloqueantes. Ignoradores de Git, Docker y ESLint comprobados; sin extensiones/hook aplicables.
3. Parámetros de imágenes contrastados con documentación oficial y SDK local; pruebas solo sintéticas. Ningún test pagado sin autorización adicional.

## Primera parte: resultados locales

- Visor: página completa por defecto en escritorio, ancho en celular, tamaño100%, ampliación/reducción y conservación del punto de lectura. Se mantienen cola serial, ventana de hasta tres páginas activas y límite de cuatro millones de píxeles por canvas.
- Editor: una pregunta visible, selector directo, lista lateral de escritorio y anterior/siguiente. Se comprueban treinta preguntas, navegación primera/última, conservación de borrador, errores de guardado y confirmación antes de descartar. Lectura/rúbrica siguen disponibles después de la pregunta; no se oculta el campo activo al escribir.
- Material: vista ampliable sin aceptar/generar otra imagen; biblioteca existente y tabla/gráfica siguen accesibles desde el borrador. Propuesta opcional de figura aislada, propósito y trazos de blanco y negro, transparencia solicitada mediante PNG y comprobada con alpha real. La preferencia monocroma de esta parte guía la generación, no convierte aún todo el PDF: eso pertenece a la fase de impresión pendiente.
- La nueva generación de figura no usa fallback ni reintentos del SDK. El trabajo nuevo persiste un marcador antes de la llamada: si queda incierto y no hay recurso guardado, la recuperación informa y no vuelve a generar automáticamente. Las propuestas ya guardadas se recuperan sin gastar. No se han usado APIs reales para estas pruebas.
- `npx vitest run src/modules/evaluaciones --reporter=dot`:139 pruebas/17 archivos pasaron, incluida la regresión de descarte explícito sin escritura y la protección del campo activo de lectura.
- `npx playwright test e2e/evaluation-preview.spec.ts e2e/evaluation-ai-wizard.spec.ts e2e/motif-editors.spec.ts --project=chromium --project=webkit --workers=2 --reporter=line`:80/80 pasaron. Celular/computador, claro/oscuro, permiso de estudiante, PDF/Word existentes, treinta preguntas y revisión/guardado de motivos. No equivale a probar dispositivos físicos.
- Revisión de capturas detectó el límite96vw heredado y la transparencia del modal en celular: se añadió ancho completo móvil, superficie opaca y botón Preparar sin partir palabras. La medición espera el final de la animación, no un tiempo fijo. Capturas posteriores de editor360/1440 y visor de página completa inspeccionadas localmente; no se reutilizan como prueba de nuevos PDF/Word aún no construidos.
- Backend visual:169 pasaron y1 omitida en la batería unitaria existente; generación/digitalización/exportación/lectura:94 pasaron y1 omitida. Las omisiones existentes se conservan y no se presentan como pruebas verdes ejecutadas.
- Nueva protección durable: prueba PostgreSQL real1/1 pasó con `SPEC101_TEST_DATABASE_URL` apuntando a un contenedor temporal local exclusivo, sin datos reales. Verificó recuperación en otra sesión y conservación de otro trabajo. Contenedor temporal detenido y eliminado, sin tocar `xcal-treisy-lab-db` u otros contenedores del usuario.
- TypeScript, ESLint de archivos modificados, Ruff F401/F821/F822/F823/F841 y build frontend pasaron. El build mantiene avisos de tamaño de chunks existentes; no se cambiaron umbrales ni auditorías.
- Los primeros tests nuevos fallaron ante funciones aún ausentes (escala/selector/cierre); las expectativas de la nueva interfaz se actualizaron conservando las comprobaciones de treinta preguntas y sus datos. Los bloqueos EPERM del entorno Windows se resolvieron ejecutando pruebas locales fuera de ese aislamiento, no omitiéndolas.

Pendiente antes de cerrar la función: configuración de impresión, migración/versiones, meta de hojas, derivados monocromos completos, render de nuevos PDF/Word, regresiones finales, Converge y PR/CI. No se debe fusionar esta rama como función terminada mientras falten esas tareas.

## Pruebas de aceptación previstas

- **Visor/editor**: Chromium y WebKit a360/390/768/1440/1920, claro/oscuro, teclado/foco/safe-area, veinte preguntas, lectura larga, opciones extensas y figura. Escalas y cancelación mantienen ancla y borrador; guardar/cancelar/conflicto no duplican escrituras.
- **Impresión**: fixtures mixtas con ABCD/VF/corta/larga/dibujo, lectura compartida, tablas, figura apaisada/vertical y color significativo. Revisar cada página renderizada de PDF y Word, continuidad, rótulos, espacios, orden y soluciones privadas. Medir hojas reales y caso imposible con tope de cuatro candidatos; comparar vista y archivo final.
- **Persistencia**: migración con datos legacy; nulos conservan salida anterior; presentación sola no crea primera versión académica ni bloquea recalificación. Evaluación versionada crea copia de presentación sin invalidar claves; versiones históricas exportan su propia configuración. Guardado simultáneo devuelve409; operación idéntica no duplica revisión.
- **Integridad**: comparar antes/después preguntas, opciones, criterios, soluciones, notas, entregas y evidencia. Simular recalificación con proveedores falsos, sin datos ni llamadas reales. Impresión no cambia identidades, orden o pesos.
- **Materiales**: biblioteca sin IA, transparencia comprobada frente a fondo blanco, ruta sin capacidad, rechazo de hoja completa como supuesta figura aislada, derivados sin cambiar original. Las tablas/gráficos conservan datos; color significativo no desaparece en silencio.
- **Permisos/errores**: propietario/admin permitido; otro docente, estudiante y anónimo denegados en lectura privada, escritura, preparación, progreso y descarga. Fallo/expiración/cancelación conserva borrador y no filtra archivos o soluciones; caché no cruza usuarios.
- **Regresión**: tests existentes de generación, digitalización, lectura, contenido visual, exportación, calificación y motivos; typecheck/lint/Vitest/pytest, E2E general/contextual, auditorías, builds de contenedores y gobernanza requeridos.

## Entrega segura

PR enlazado a262, controles actuales completos en verde y autorización de merge/despliegue. Revisar migración antes de activar interfaz dependiente. Verificar despliegue y cuenta demo en computador/celular; no usar contenido real, cambiar proveedores ni prometer paginación de Word idéntica. Mantener Spec124 y demás cambios ajenos fuera de esta rama.
