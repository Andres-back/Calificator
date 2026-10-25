# Guía de validación127

Implementación local autorizada el 2026-10-25. Este registro distingue pruebas sintéticas de cámara física y despliegue. Se usaron únicamente hojas e identidades sintéticas, sin datos de producción ni llamadas a IA.

## Preparación

Aprobación humana de spec/plan y revisión de requisitos recibida el 2026-10-25 («aprove»). Revisión documental 16/16, lista autorizada 8/8, tareas y análisis sin bloqueos. Base: main 0c194705; rama `codex/127-camara-nativa-movil`. Se conservaron cambios ajenos. Véanse [contrato](./contracts/captura.md) y [modelo local](./data-model.md).

## Matriz mínima automatizada

1. Perfiles iPhone, Android e iPad-UA-Mac con touch: pulsación solicita captura nativa, sin montar CameraCapture/getUserMedia. PC Windows/Mac, incluyendo ventana360px, conserva cámara integrada y selección USB.
2. Añadir dos imágenes, repetir la primera y cancelar una segunda repetición: dos hojas, orden conservado, ninguna solicitud de calificación/digitalización/entrega.
3. Cancelar sin archivo/evento, seleccionar el mismo archivo de nuevo y tomar fotos distintas con nombres repetidos: sin bloqueo o duplicación accidental, manteniendo la protección de duplicados reales.
4. Formato no admitido, sobre límite, PDF existente, máximo de hojas o disabled: errores recuperables, paquete previo conservado y ninguna apertura adicional prohibida.
5. Resultado tras A→B, A→B→A, desmontaje/deshabilitación o eliminación del destino: descartado. `hidden→visible→change` vigente: aceptado. Análisis de calidad tardío: no actualiza otra época/contexto.
6. Calificación, reemplazo, digitalización y entrega del alumno conservan sus límites/permisos y envío explícito.
7. Regresión de cámara PC: permisos denegados, cámara ausente/ocupada, USB desconectada, cambio de cámara, rechazo tardío, repetición y tracks apagados.
8. Vistas360/390/768/1440, claro/oscuro y orientación horizontal: controles44px, ampliar hoja utilizable, sin overflow de página. No simular el UI nativo del SO como evidencia física.

## Comandos posteriores a implementar

Desde `frontend/`: `npm run typecheck`, `npm run lint:strict`, suites unitarias `src/components/evidence`, `MateriaCalificar`, `GradeReprocessing`, `DigitalizarEvaluacionModal` y `ResolverEvaluacionPage`, además de build/auditorías vigentes. Seleccionar archivos reales al generar Tasks.

Playwright: actualizar o ampliar `e2e/camera-capture.spec.ts` para separar perfil de dispositivo y ancho; registrar los casos127 también en WebKit y verificar `--list`. Ejecutar casos nuevos y regresiones102/103/113, sin retirar los recorridos desktop ni el fallback. Usar `filechooser` para contrato nativo, nunca fotografías de estudiantes.

Desde la raíz: regenerar/comprobar inventario con `python scripts/build_system_inventory.py --write` y `--check`, ejecutar `python -m pytest tests/spec_governance -q`, y validador de PR. Actualizar índice, referencias responsables y baseline según su propósito, sin relajar controles. CI completo antes de solicitar fusión.

## Comprobación física separada

Registrar dispositivo, versión de OS/navegador y si se abrió desde inicio. En iPhone Safari y Android Chrome: encuadrar una hoja sintética, aceptar, ampliar y leer texto pequeño; repetir/cancelar; tomar dos fotos; girar pantalla y volver desde cámara sin pérdida de hojas. Repetir en iPad-UA-escritorio si está disponible. Si el navegador solo ofrece archivos, documentar alternativa y no afirmar apertura nativa comprobada.

La validación de OS/hardware debe registrarse realmente o quedar pendiente de forma explícita; emulación Chromium/WebKit no la sustituye. No modificar notas/evidencias reales, reiniciar servicios o usar APIs de IA para estas pruebas.

## Validación local realizada

- `npm run test:run -- src/components/evidence src/modules/materias/MateriaCalificar.test.tsx src/modules/calificaciones/components/GradeReprocessing.test.tsx src/modules/evaluaciones/components/DigitalizarEvaluacionModal.test.tsx src/modules/evaluaciones/ResolverEvaluacionPage.test.tsx`: 99 casos aprobados. Cubren captura móvil, cancelación, formatos, límites, reemplazo, protección A→B→A y contratos de cuatro consumidores.
- `npm run typecheck`, `npm run lint:strict`, `npm run build`, `npm run audit:actions` y `npm run audit:build`: aprobados. Auditoría: 572 botones y 121 enlaces. Sin nuevas dependencias o recursos de IA.
- Primera matriz de cámara: 32/32 casos móviles aprobados, ambos temas/orientaciones y 360/390/768/1440. La regresión PC WebKit a 1440 tuvo una incidencia intermitente durante ejecución concurrente; se añadió espera de previsualización tras la segunda captura, sin omitir ninguna aserción. Repetición aislada de las cuatro regresiones PC WebKit, tres veces: 12/12 aprobadas.
- Una ejecución adicional compartió accidentalmente el servidor local con otra suite, que lo cerró al finalizar: `ERR_CONNECTION_REFUSED` en la suite secundaria. No se cuenta como validación aprobada. La ejecución aislada posterior aprobó 68/69 casos: el restante necesitaba esperar al `filechooser`, pues el navegador de pruebas cancela un selector sin escucha y el input ya se limpia al cancelar. Se adaptó el test al contrato real sin cambiar el envío.
- Resultado final de navegador: **71 casos distintos aprobados** entre las ejecuciones finales: 32 de captura nativa Chromium/WebKit, 10 de webcam/permiso/ocultamiento y 29 de revisión de calificaciones/paquetes. Los 41 casos finales de cámara y paquete pasaron juntos; los dos casos nuevos de ocultamiento se repitieron y aprobaron al corregir una aserción que suponía una sola apertura en vez de las dos de StrictMode. Los otros 28 casos de revisión habían pasado en la ejecución aislada. No se suman repeticiones como casos nuevos.
- El hardware sintético controla explícitamente `visibilityState` para no confundir otra ventana de pruebas con abandono del usuario. Hay pruebas de `hidden→visible` que conservan captura nativa y pruebas independientes que apagan todos los streams de webcam sin volver a abrirla. La comparación de llamadas usa el conteo previo al ocultamiento, no un conteo fijo que ignore StrictMode.
- Inspección visual de la previsualización final a 390 px en WebKit/oscuro: hoja completa, cierre accesible y contenido legible. Capturas sintéticas, no cámara del SO. Se espera opacidad final antes de capturar, evitando documentar un fotograma intermedio de animación.
- Inventario regenerado y comprobado: 653 superficies, sin endpoints nuevos.
- Gobernanza: la primera ejecución dentro del sandbox falló por temporales/Git Bash restringidos; con ejecución normal pasaron 57/58 y solo quedó el cierre de tareas 127 aún pendientes. Resultado final tras cierre y Converge: **58/58 aprobadas** y **validador PR aprobado**, sin cambiar reglas ni omitir controles.
- Converge: 26 requisitos/criterios/escenarios, 6 decisiones y 8 principios revisados; cero brechas accionables. Checklist y hooks de las fases revisados: `.specify/extensions.yml` no existe, sin hooks pendientes.

## Límites y estado de entrega

- El cambio únicamente afecta la preparación frontend: cámara nativa como preferencia móvil, webcam de PC conservada y selección aislada por apertura/época. No modifica notas, modelos, evidencias guardadas ni contratos de envío.
- No se ha comprobado la cámara física de iPhone/Android/iPad ni acceso instalado en esos dispositivos. Playwright no demuestra el UI del SO, elección real de lente o calidad física. Esta validación sigue pendiente y no se presentará como realizada.
- Sin fusión ni despliegue autorizado; el PR y su CI se registrarán al publicarlos. No se accedió a producción.
