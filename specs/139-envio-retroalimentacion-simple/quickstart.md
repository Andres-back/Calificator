# Guía y registro de validación

**Estado**: implementación autorizada por «aprobado», issue297; código implementado y comprobado localmente, preparado para PR. No producción, datos reales, credenciales de docentes o llamadas IA. Base de diseño main5e32ceb. Los resultados locales no acreditan CI, fusión ni despliegue.

## Preparación realizada

Lista existente16/16 conservada, Tasks19 y Analyze sin brechas de cobertura en16 requisitos/5 criterios construibles; SC-006 es ensayo posterior. Maqueta previa en frontend/output/spec139-design/propuesta.html, capturas384/1440 claro/oscuro e inspección visual antes del código funcional. Se corrigió ancho de nombres móviles y contraste del indicador oscuro. No se confunden estas capturas con implementación.

npm ci instaló el lockfile sin actualizar versiones. Auditoría de producción al umbral moderate: cuatro avisos low preexistentes KaTeX/transitivas, cero moderate/high/critical en producción; la auditoría general informa además avisos de herramientas de desarrollo, por revisar en el cierre. No se ejecutó audit fix ni se declaran esas vulnerabilidades resueltas.

## Preparación

- Fixtures con treinta estudiantes, distintos estados y enlaces sintéticos que no permiten acceso a datos reales.
- Backend local/base aislada solo para permisos, concurrencia e idempotencia; no restaurar copia productiva para esta prueba.
- Maqueta384/1440 antes de código funcional; distinguir de capturas de implementación.

## Recorridos obligatorios

1. Generar → copiar → volver al grupo → salir de evaluación → reentrar al mismo estudiante → copiar: misma URL completa, accessId, versión de credencial y vencimiento. CTA visible sin abrir opciones.
2. Repetir tras desmontar, recargar, borrar sessionStorage/localStorage, reiniciar sesión y segundo contexto de navegador. Ninguna generación/publicación/reactivación por abrir o copiar.
3. Enlace creado por otro dispositivo: recuperar al consultar. Generaciones simultáneas con solo_si_falta: un único acceso compatible nuevo y sin prolongarlo; conflicto si hay ambigüedad.
4. Lista/recuperación fallida: Reintentar, nunca «No existe» ni Generar por un error. Restablecer conexión y recuperar exactamente el anterior.
5. Antiguo sin copia, copia cifrada inválida, vencido, desactivado, suspendido, múltiples vigentes y fallo del primero: causas y acciones distintas, sin sustitución implícita. No usar una clave real ni provocar rotaciones para simularlo.
6. Suspensión por cambio sintético de contenido: aprobar expresamente con mantener_vencimiento mantiene token, fecha y cuota; vencido/revocado rechazado. Contrato antiguo sin opción y sus recibos siguen funcionando.
7. Fallo parcial/generación incierta: recuperar solicitud original, mantener éxitos/selección y reintentar pendientes sin duplicar.
8. Cambio de actor, pérdida de permisos o evaluación durante la operación: no resultados tardíos; sin acceso a copias ajenas. Perfiles solo lectura no reciben acciones de emisión/copia sin permiso.
9. Copia denegada y compartir cancelado: fallback manual/ningún «Enviado». Mensaje solo nombre, evaluación y enlace; lista privada con destinatarios confirmados.
10. Treinta tarjetas/nombres largos a360/384/390/768/1440, dos temas, texto200 %, teclado, zonas seguras, scroll desde contenido y márgenes. Foco/posición/borradores conservados y acción de copia alcanzable.

## Herramientas de comprobación al implementar

- Frontend: `npm run typecheck`, `npm run lint:strict`, `npm run test:run`, `npm run build`, `npm run audit:actions`, `npm run audit:build`; auditoría con el umbral vigente, sin actualizar dependencias automáticamente.
- Nuevas pruebas en `frontend/e2e/feedback-link-reentry.spec.ts`, suites de retroalimentación y regresiones de Spec138 con Chromium/WebKit; tipos de contextos simulados Android/iPhone no acreditan teléfono físico.
- Backend: ampliar suites existentes de feedback y ejecutar en el entorno de pruebas aislado; simular cifrado/tiempo sin secretos reales. Con y sin opciones, errores y concurrencia bajo bloqueo.
- Inventario: `python scripts/build_system_inventory.py --write` y `--check`; después `python -m pytest tests/spec_governance -q`, validador de PR y CI completo sin exclusiones/bypass.
- Converge y capturas reales384/escritorio antes de pedir fusión. Issue y approvals deben estar enlazados en esa etapa.

Registrar resultados reales y comandos exactos después de ejecutar. No sustituir esas mediciones por este listado de expectativas. Ensayo de tres docentes y meta temporal posterior, sin afirmar calidad pedagógica demostrada.

## Resultados locales registrados

- Backend: 1850/1850 pruebas unitarias completas y 104/104 integraciones `test_feedback*.py`, incluidas las catorce nuevas de guardias, con PostgreSQL aislado. Ruff de app/tests con los selectores de CI aprobado. Entorno Docker local `xcal-spec131-tests:fpdf288`, FastAPI0.139, Pydantic2.10.4, SQLAlchemy2.0.36 y pytest9.1.1. Montaje del worktree en solo lectura; base efímera sin volúmenes productivos ni red externa. La primera colección incompleta por fixtures no montados se corrigió montando el worktree completo; no se excluyeron pruebas.
- Frontend completo: 1376/1376 unidades, sin omitidas, con dos workers. Tras añadir la última regresión de foco, el módulo actualizado pasó202/202, incluidos los casos de consulta, recuperación, permisos, copia manual y canales. TypeScript, lint estricto, compilación y auditoría del build aprobados de nuevo. Son ejecuciones solapadas: no se suman como si fueran pruebas distintas.
- Auditoría de acciones: 674 botones y 125 enlaces con propósito verificable. Dependencias de producción: cuatro avisos low preexistentes KaTeX/transitivas, cero moderate/high/critical al umbral vigente. No se cambiaron versiones ni se ejecutó audit fix.
- Distribución remota E2E: 1002 escenarios enumerados, cuatro particiones263/240/249/250, cero faltantes y cero duplicados. Esta enumeración no es una ejecución de esos1002 escenarios.

Las primeras matrices detectaron recorte con texto200 %, foco al regresar y fixtures antiguos sin vencimiento/copia persistida. Se corrigieron los contenedores responsivos, el retorno de foco y los fixtures para modelar el contrato real; no se modificaron workflows, tiempos máximos ni reintentos para ocultar fallos. Las ejecuciones interrumpidas o diagnósticas no cuentan como aprobadas. La geometría tolera exclusivamente un píxel CSS de redondeo y comprueba todos los ancestros que recortan, objetivos44px y ausencia de desbordamiento.

El diagnóstico de posición midió una matriz de escala1.00131 del diálogo: mezclar esas coordenadas visuales con scrollTop generaba un desfase de7px. Se quitó la escala solo en este panel, sin cambiar Modal global. El foco vuelve después del commit de React, no a un botón de la vista anterior aún montada; la consulta al recuperar foco conserva el control y reconfirma sus metadatos. Las dos regresiones de foco se reprodujeron primero en RED y después pasaron.

El retorno conserva la comprobación anterior de desplazamiento mínimo/restaurable, con el mismo límite de1px, selección y cabecera del mismo estudiante visibles. No se impone una coordenada exacta de la fila al cambiar el viewport o añadir botones. La prueba grupal mantiene selección, ratón, teclado, copia manual, permisos y solicitudes; el texto móvil se amplió de150 % a200 %. La navegación de entrada de los casos nativos usa teclado; creación, edición y copia conservan la cobertura de puntero y el límite anterior de30s.

## Entorno y reproducción

Worktree aislado `E:/tesis/.worktrees/envio-retroalimentacion-simple`, dependencias propias instaladas con npm ci y TEMP/TMP en `E:/tesis/tmp/spec139-runtime`. Servidor único loopback4185 con harness ignorado `frontend/output/spec139-local-vite.config.ts`, caché propia y exclusión del watch de artefactos; no se publica ese harness ni se cambia la configuración de producción. Informes locales ignorados en `E:/tesis/output/spec139-tests/`.

Desde frontend: unidades completas con `node node_modules/vitest/vitest.mjs run`; módulo final con `... run src/modules/feedback_sharing`; scripts typecheck/lint:strict/build/audit:actions/audit:build; `npm audit --audit-level=moderate --omit=dev`; `node scripts/verify-e2e-shards.mjs 4`. Playwright usa `PLAYWRIGHT_TEST_PORT=4185`, dos workers y los proyectos existentes Chromium/WebKit. Registrar abajo los informes finales de cada suite, sin sumar repeticiones del mismo escenario.

No se afirma reproducción del enlace real reportado ni validación física Android/iPhone en esta entrega. SC-006 queda como ensayo humano posterior con tres docentes/treinta destinatarios, antes de afirmar facilidad validada. Treinta días institucionales, extensión, QR y aperturas siguen fuera del alcance aprobado.

## Cierre de E2E y convergencia

Los informes son locales/ignorados. Se contrastaron por proyecto+archivo+título, sin sumar repeticiones como casos nuevos:

| Informe | Resultado de esa ejecución | Interpretación |
| --- | --- | --- |
| reentry-responsive-final.json |143 aprobados/5 fallidos| Primera regresión, incluye impresión y privacidad heredadas; fallos de navegación investigados, no acreditados como verdes. |
| share-context-verified.json |168 aprobados/4 fallidos| Contexto138, revisión136 y aprobación135; los casos fallidos se repitieron tras corregir foco/flujo. |
| reentry-workspace-final.json |80 aprobados/4 fallidos| Los54 casos nuevos de reentrada/estados pasaron; los cuatro fallos restantes eran una precisión adicional de anclaje móvil, retirada al restablecer la comprobación original de posición/restauración, selección y cabecera visibles. No se amplió su tolerancia de1px. |
| group-errors-release.json |32/32 aprobados| Repetición completa del grupo y errores: treinta casos mixtos,105 destinatarios, permisos, foco, texto200 %, copia manual y ambos motores. Sin omitidos ni reintentos configurados. |

Cobertura acumulada:296 escenarios distintos; el último resultado registrado de cada uno es aprobado. No es una ejecución única de296 escenarios ni equivale al CI remoto completo. Los primeros fallos y las ejecuciones interrumpidas permanecen identificados arriba. Las capturas de errores se repitieron situando el botón Reintentar dentro del viewport y comprobándolo; [evidencia visual](visual/README.md) inspeccionada, sin datos reales.

Converge contrastó16FR,5 criterios construibles,22 escenarios de aceptación,7 decisiones y8 principios: cero brechas funcionales, contradicciones o ampliaciones fuera del alcance. No añadió una fase vacía y no cambió tasks.md durante esa comprobación; después Implement cerró los marcadores de las19 tareas. Sin hooks de extensión configurados. El inventario conserva682 superficies. El PR se publica para revisión/CI; la fusión y cualquier despliegue requieren otra autorización.

Cierre documental: inventario vigente y gobernanza completa61/61, sin exclusiones. Capturas inspeccionadas en384/1440 claro/oscuro, texto200 %, resultado parcial y errores con acción visible. Las fuentes y dependencias de producción no se modifican fuera del alcance descrito.

## Corrección de CI del PR298 — 2026-11-01

La ejecución remota41229182698 sobre15b4f2 falló en24 casos de motivos/impresión que todavía suponían selección inicial vacía y en4 casos móviles WebKit de retorno de posición. Backend, calidad/build frontend, contenedores, contexto y gobernanza habían pasado. No se sustituyen esos fallos por la validación local anterior ni se afirma fusión/despliegue.

- Motivos: se comprueba primero la selección automática de30 estudiantes y la impresión habilitada; después se limpia la selección, se conserva el rechazo de impresión vacía y se vuelve a seleccionar. Galería, formatos, contenido, permisos y paginación siguen cubiertos.
- Retorno móvil: una nueva unidad reprodujo en RED que salir de la copia manual dejaba `data-writing=true`. `leaveShare` termina escritura antes de remontar la lista, sin cambiar la restauración por identidad ni los permisos.
- La primera matriz local tras ese arreglo pasó52/54 y aún falló en360px WebKit con−22px; no se dio por verde. La medición mostró fuentes cargadas y ancho constante348px, pero el último grupo de controles del encabezado pasó transitoriamente de92 a44px y volvió a92px al reajustar viewport. Se sustituyó ese flex-wrap por columnas explícitas, manteniendo44px táctiles y texto ampliado. La misma prueba pasó después; no se aumentaron tolerancias, tiempos máximos ni reintentos.
- Se añadió cobertura para volver con el campo manual aún enfocado/viewport reducido, estabilidad del grupo de controles, foco y selección; otra unidad conserva el ancla cuando se acorta contenido anterior. Se retiró toda instrumentación temporal.

Resultados finales locales, sin sumar repeticiones como escenarios distintos:

| Comprobación | Resultado | Límite de interpretación |
| --- | --- | --- |
| Módulo de retroalimentación |204/204 unidades aprobadas| Incluye RED→GREEN de escritura y protección del ancla cuando cambia altura. |
| Frontend completo |1378 aprobadas/1 timeout, de1379| La prueba de edición de rúbrica superó10s durante la ejecución concurrente; no se da esa ejecución por verde. |
| Repetición aislada GenerationWizard |35/35 aprobadas| Mismo código, límite de10s y archivo completo; sin modificar el creador ni omitir pruebas. Último resultado de los1379 casos aprobado, no una ejecución única1379/1379. |
| Matriz final de impresión/navegación |53 aprobadas/1 timeout, de54| Los30 casos de navegación pasaron, incluidos los4 móviles de CI y los2 nuevos. Biblioteca1440 claro WebKit alcanzó60s bajo carga concurrente. |
| Repetición aislada biblioteca1440 claro WebKit |1/1 aprobada en41.6s| Mismos60s, pasos nativos y comprobaciones; informe ci-fix-isolated-print.json. Último resultado de los54 casos aprobado, no una ejecución única54/54. |
| Calidad frontend |Tipos, lint estricto, build, auditoría de acciones/build aprobados|674 botones y125 enlaces; sin cambios de dependencias, workflows, reintentos ni límites. |
| Particiones E2E |1004 escenarios,263/239/252/250|Cero faltantes/duplicados; enumeración, no ejecución completa local. |

Informes ignorados en E:/tesis/output/spec139-tests/ci-fix-{affected,final,isolated-print}.json; los primeros fallos permanecen registrados. Se inspeccionó la captura móvil del retorno con controles de copia visibles. Solo datos sintéticos y emulación; no se acreditan teléfono físico, producción ni cambios de notas/evidencias/modelos. Linux/WebKit se comprobará otra vez mediante el CI íntegro del nuevo commit, sin omitir controles.

Cierre de la corrección: inventario vigente682 superficies, gobernanza completa61/61 y validación de contexto de PR con spec-approved/plan-approved/Closes#297 aprobadas. T020–T022 completas; sin hooks de extensión configurados. La publicación del commit no acredita CI remoto verde ni autoriza fusión/despliegue.

## Segunda corrección de CI del PR298 — 2026-11-02

El CI41388764306 del commitc2052eb no quedó verde: el trabajo general3/4 aprobó247 casos y falló5. Cuatro eran el retorno360/390 claro/oscuro en Linux/WebKit, con−10px frente al mínimo de−1px; el quinto terminó en `page.goto` con `WebKit encountered an internal error`. Los tres controles rojos visibles corresponden a este trabajo primario y sus dos puertas agregadas. Backend, calidad/build frontend (1379/1379 unidades), contenedores, contexto y gobernanza aprobaron ese commit; no se acredita con ello el código de esta segunda corrección.

El trace del quinto caso registra `Network process crashed` antes de abrir la retroalimentación o enviar una operación. No demuestra un fallo de autenticación ni de enlaces; tampoco permite atribuir la caída del proceso a una causa definitiva. Su prueba permanece intacta y se ejecutará con el resto; no se añadieron reintentos ni una excepción de aplicación para ocultarlo.

La primera hipótesis fue una reserva tardía de10px y una posición intermedia guardada. Se ensayó una copia inmutable del estudiante/ancla con ResizeObserver hasta el primer gesto. Esa hipótesis se descartó después de medir el caso real: no es la solución final ni se publican su observador/listeners. La tolerancia de1px permanece intacta.

Una unidad de aquella propuesta reprodujo el desfase simulado190/200px. La versión experimental congelada pasó19/19 unidades de posición,215/215 del módulo y15/15 recorridos de workspace en Chromium, sin resolver todavía Linux. TypeScript, lint estricto, build, auditoría de acciones/build y enumeración1004 escenarios (263/239/252/250; cero ausentes/duplicados) aprobaron. Son comprobaciones solapadas e históricas, no casos adicionales sumables ni acreditación de la solución final.

Un ensayo Windows/WebKit y una ejecución de unidades durante edición/HMR no se dan por aprobados; se conservaron como diagnósticos y se repitieron con las fuentes congeladas. No se modificaron dependencias, workflows, tiempos máximos, reintentos, modelos, notas, evidencias ni producción.

Regresión frontend completa de la propuesta experimental:1390/1390 unidades en200 archivos, cero omitidas/fallidas,301.37s, dos workers (Windows, Node22.14.0/npm10.9.2). Informe local ignorado `E:/tesis/output/spec139-tests/late-layout-all-unit.json`. Se conserva el resultado histórico, pero su helper experimental se retiró al comprobar que no resolvía la causa real.

### Control negativo en Linux

Se preparó una imagen local Debian12, Node22.23.4, npm11.6.1 y Playwright1.61.1/WebKit26.5 (build2311), con el lockfile intacto. Las pruebas se ejecutan sin red, sin volúmenes de producción ni credenciales, raíz de solo lectura y salidas/cachés efímeras. La preparación inicial de esa imagen no es una prueba de aplicación.

El control negativo monta únicamente un adaptador local que reproduce la restauración anterior de una sola ejecución, sin observar cambios tardíos. El caso384px de copia manual pasó con ese adaptador y no se cuenta como reproducción. Después, los cuatro casos360/390 claro/oscuro fallaron exactamente con−10px en la misma comprobación de retorno de CI; no por arranque, permisos o un timeout de servicio. Informe `E:/tesis/output/spec139-tests/linux-baseline-mobile/results.json` (cuatro fallos esperados del control anterior). El adaptador no forma parte del código publicado.

La imagen inicial contiene el helper experimental con SHA256 `7544e017fc28331ffebfcea918a2b00050d39848bb9513a0133cf01fe0f538a1`; el lockfile coincide con SHA256 `5e1730becc47ad8c35b7174cc21893b17edeefba67100d3a5f4ae34ba6c36888`. El primer ensayo ejecutó82 escenarios de los tres archivos feedback-workspace-responsive, feedback-share-review y feedback-link-reentry, incluidos los cuatro móviles y el caso de navegación cuyo proceso WebKit cayó en CI. No confundir el control negativo con una regresión del código final ni Linux emulado con un iPhone físico.

La primera matriz con ese helper no aprobó:77/82 casos pasaron y5 fallaron, sin omitidos/reintentos,549.51s. Los cuatro móviles mantuvieron−10px; la observación de cambios por sí sola todavía no corrige el caso. El quinto esperó el botón de ingreso hasta el cierre de su prueba, antes de enviar `/auth/login`; su trace no acredita un error de enlaces ni registra `Network process crashed`. Informe `E:/tesis/output/spec139-tests/linux-final/results.json`. Se conserva este resultado fallido y se continúa el diagnóstico antes del push; T023/T024 permanecen pendientes.

### Diagnóstico definitivo y solución mínima

La instrumentación de una copia local, nunca publicada, midió NAV206→264 (58px), pero el control siguiente empezaba en262 en vez de272: se solapaba2px en vez de conservar8px. Tras un gesto el navegador incorporaba los10px del riel al flujo y el encabezado pasaba281→291px. Al volver montaba otra vez el encabezado de281px; el anclaje conservaba correctamente el mismo estudiante a552px y por ello calculaba5903 frente a5913 guardados. No había gesto prematuro, corrupción del snapshot ni clamping. Los registros están en linux-diagnostic/; reservar gutter vertical, forzar scroll vertical o separar el flex interno no corrigió este comportamiento.

Se probó un mínimo adaptable de3rem (control2.75rem más padding0.25rem) más los10px del riel: el encabezado quedó291px desde el montaje y al volver, con separación8px y scroll5913 idéntico. Pasaron el caso aislado y los cuatro360/390 claro/oscuro con la restauración original, sin observador. No se suman como casos nuevos. La implementación final comparte `--app-scrollbar-size` con la barra existente, cuyo ancho/alto siguen siendo10px; solo añade el mínimo del filtro. No impone máximo ni altura fija, y el control/padding crecen con el texto ampliado. Se retiraron el helper experimental y sus once unidades; el anclaje y onScroll previos quedan intactos.

La regresión final comprueba separación real de al menos7px (8px con el mismo píxel de redondeo) antes del primer gesto y después de volver, además de todas las comprobaciones anteriores de scroll≥−1, selección, foco y solicitudes. Sobre el código anterior esa nueva comprobación falló en RED con−2px, exactamente el solapamiento medido: linux-flow-red/results.json. No se cambian tiempos máximos ni reintentos.

La validación final monta las fuentes congeladas src/e2e del worktree en solo lectura sobre la imagen QA y ejecuta82 casos con dos workers, sin red, credenciales ni volúmenes de producción. Solo se impide crear nuevos volcados nativos gigantes en este contenedor local mediante core=0; las aserciones, traces y fallos permanecen activos y CI no se modifica. Registrar abajo el resultado de linux-release/results.json y release-all-unit.json antes del push.

### Resultados de las fuentes finales

| Comprobación | Resultado de una ejecución completa | Evidencia local ignorada |
| --- | --- | --- |
| Linux/WebKit, tres archivos de feedback |82/82 aprobadas, cero omitidas/fallidas/flaky,641.18s|linux-release/results.json|
| Chromium, workspace completo |15/15 aprobadas, cero omitidas/fallidas/reintentos|chromium-release.json|
| Unidades frontend completas |1379/1379 en200 archivos, cero omitidas/fallidas,529.02s|release-all-unit.json|
| Calidad final |TypeScript, lint estricto, build, auditorías de acciones/build aprobadas|674 botones y125 enlaces; presupuesto del build conservado|
| Auditoría de dependencias productivas |Umbral moderate aprobado; cuatro avisos low de KaTeX/transitivas preexistentes|Sin audit fix, cambios de versiones ni excepciones|
| Enumeración E2E |1004 escenarios,263/239/252/250, cero ausentes/duplicados|Enumeración, no ejecución local de todo CI|

Los82 casos incluyen los cuatro móviles que fallaban, reentrada/nueva sesión, permisos, errores de consulta/copia, generación parcial,105 destinatarios, ambos temas, teclado y texto200 %. El caso cuya navegación sufrió la caída nativa en CI pasa en esta matriz sin editarlo. Chromium comparte15 recorridos con WebKit: no se suman como casos funcionales nuevos. Las1379 unidades conservan exactamente los casos publicados; las once del observador experimental nunca publicado se retiraron junto con ese experimento, no para omitir un fallo real.

Se inspeccionaron capturas finales384px/escritorio en Chromium, retorno390/1440 en WebKit y texto200 %, con controles accesibles y sin datos reales. La emulación no acredita teléfonos físicos. T023/T024 completadas; la publicación enviará CI íntegro, sin fusión ni despliegue y sin modificar modelos, notas, evidencias, claves o configuración productiva. Los ensayos fallidos anteriores permanecen registrados arriba; los resultados locales no sustituyen los controles remotos.

Cierre: inventario vigente682 superficies, gobernanza completa61/61 en19.05s y contexto de PR con spec-approved/plan-approved/Closes#297 aprobados. La primera invocación de gobernanza en el sandbox de Windows no aprobó (37pasadas,21errores de temporales y3fallos de arranque Git Bash por permisos); se repitió exactamente la misma suite con permisos normales y basetemp nuevo dentro del directorio de pruebas, sin cambiar tests ni controles. Converge contrastó16FR,5SC construibles,22 escenarios de aceptación,7 decisiones y8 principios: cero brechas; tasks.md quedó byte por byte sin cambios durante esa comprobación y no se añadió otra fase. Sin hooks de extensión configurados. Chromium final tardó69.67s y el servidor propio de loopback se cerró al terminar. SC-006 sigue siendo ensayo humano posterior, no una afirmación de facilidad o mejora pedagógica demostrada.
