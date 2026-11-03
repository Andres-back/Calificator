# Registro de validación — Spec 141

## Estado a 2026-11-02

- Alcance y plan aprobados por el usuario; etiquetas `spec-approved` y `plan-approved` registradas en issue #301.
- Diseño premium definido en `contracts/diseno-premium.md` y maqueta local `design/revision-premium.html`.
- Checklist personalizado `ux-integridad.md`: 8 ítems pendientes del revisor. Se solicitó autorización explícita para asistir en la revisión. No se modificaron sus marcadores.
- Código funcional de frontend/backend: no iniciado por este gate. No hay PR de implementación, CI, fusión o despliegue de Spec 141.
- Ninguna nota, comentario, evidencia real, clave, configuración IA o dato de producción accedido o modificado para esta fase.

## Maqueta sintética, no implementación

Capturada con Chrome mediante Playwright CLI en Windows, tamaños de viewport 384×844 y 1440×1000. Los nombres, notas, comentarios y hoja de ejemplo son ficticios. Los botones de copia/edición no generan accesos ni escriben datos reales. Las esquinas del editor muestran distribución, no un algoritmo implementado.

Archivos locales bajo `output/playwright/` de este worktree:

- `spec141-design-feedback-384-light.png`: jerarquía móvil y acción principal.
- `spec141-design-feedback-384-light-scroll.png`: desplazamiento desde el centro; medición de documento 384 px, viewport 384 px, desplazamiento vertical 121 px, sin desbordamiento horizontal en este estado.
- `spec141-design-feedback-384-dark-scroll.png`: modo oscuro; el clic en Apariencia puede devolver arriba el viewport, no usar el nombre del archivo como prueba de posición de scroll.
- `spec141-design-feedback-1440-light.png` y `spec141-design-feedback-1440-dark.png`: separación lista/detalle en escritorio.
- `spec141-design-answers-384-light.png`: navegador compacto de preguntas y contenido de la respuesta.
- `spec141-design-evidence-384-light.png`: hoja y herramientas contextuales.
- `spec141-design-editor-384-light.png`: distribución de editor a pantalla completa.
- `spec141-design-history-384-light.png`: eventos legibles sin repetir trazas en la pregunta.
- `spec141-design-calculation-384-light.png`: ejemplo de puntos, escala y ajuste.

Se inspeccionaron visualmente las vistas de retroalimentación de escritorio y celular; se recorrieron pestañas y se abrió/canceló el editor. Esto NO prueba el software de producción ni el comportamiento del escáner real.

## Incidencias del entorno

- El navegador de pruebas no pudo arrancar dentro del sandbox de Windows; la ejecución aislada autorizada fuera del sandbox funcionó.
- La navegación `file:` está bloqueada por Playwright CLI; la maqueta se sirvió solo en `127.0.0.1:4196`, desde su carpeta de diseño. No se sirvió el repositorio ni archivos privados.
- La sesión de navegador `spec141-design` y el servidor local se cerraron al terminar.
- No se ejecutaron Docker/WSL ni WebKit para esta maqueta. No se reinstalaron dependencias o navegadores.

## Implementación local — 2026-11-03

- Checklist de requisitos y UX: 16/16 y 8/8. Revisión de UX autorizada en el chat. La revisión anterior queda registrada como estado histórico.
- Caracterización previa: 56 pruebas aprobadas. La ejecución inicial falló por el directorio temporal del sandbox; las corridas nuevas usan TEMP/TMP dentro del espacio de trabajo.
- Retroalimentación individual: lectura con divisores, acciones secundarias en menú, acción principal única y URL visible solo tras un fallo de portapapeles. Se reutiliza el controlador existente; falta terminar la separación interna del flujo individual.
- Cálculo: se muestran puntos, escala, ajuste, redondeo y resultado guardados. Sin inferir subtotales históricos si el desglose no incluye secciones.
- Respuestas: navegación compacta, resumen con causas distintas y trazabilidad en Historial. Evidencia: giro de vista sin escrituras, con región coherente al ampliar.
- Grupo: filas compactas y prioridad visual a generar o copiar según la selección. Falta validar de punta a punta el flujo mixto y el retorno.
- Sin implementación del contrato para recortar/guardar hojas existentes o añadir fotos conservando el paquete. Sigue disponible el flujo anterior de reemplazo completo. No se presenta el giro de vista como edición persistente.
- TypeScript, lint estricto y build pasaron. La regresión de calificaciones y retroalimentación dio 506/506 pruebas unitarias en 63 archivos.
- La corrida E2E Chromium de reentrada/cálculo no llegó a ejecutar pruebas: el servidor de pruebas no quedó escuchando en 127.0.0.1:4197. Se detuvo el intento. No equivale a una validación de navegador ni física.
- No se tocó producción, no se fusionó ni se desplegó.

## Continuación — edición de evidencia

- «Editar hojas» permite ajustar, girar, ordenar, quitar o añadir fotos en un borrador. Cancelar no escribe; guardar exige confirmar la recalificación. El servidor comprueba acceso y versión, conserva las fuentes originales y rechaza referencias ajenas. Los PDF históricos aplanados conservan la opción de reemplazo completo.
- Pasaron 22 pruebas locales de edición, manifiesto, preparación y almacenamiento y 27 pruebas frontend del borrador y su integración. Las cuatro incidencias de recuperación observadas en Windows también se reprodujeron en el código anterior; falta comprobarlas en Linux.
- Chromium con datos simulados: 56 de 58 pruebas pasaron inicialmente; las otras dos, de texto al 200 %, pasaron tras corregir el ancho de «Copiar enlace». El editor se comprobó a 384 y 1440 px: cancelar no envía cambios y reordenar envía referencias, no vuelve a subir los originales.

## Pendiente

Integración con PostgreSQL aislado (motor Docker no disponible), pruebas físicas Android/iPhone y CI. No se fusionó, desplegó ni modificó producción.

## Primera ejecución del PR #302

- En `193fd67`, Backend quality and tests y Container builds pasaron en GitHub. Frontend pasó 1414 de 1415 pruebas; la prueba de Xali encontraba la respuesta antes de terminar la animación. La aserción ahora espera que sea visible, sin alterar la aplicación. Las seis pruebas locales de Xali pasaron.
- Se incorporó Spec 141 al registro de pruebas de gobernanza y se regeneró el inventario. Se mantienen abiertas las tareas sin evidencia, incluidas las comprobaciones físicas. No se modifica la política de gobernanza ni se omiten controles.

## Segunda ejecución del PR #302

- En `12dc69f` pasaron Backend quality and tests, Container builds y Frontend quality and build. GitHub usó PostgreSQL aislado y ejecutó las pruebas de permisos de edición, conservación de originales, replay, recuperación y concurrencia; no se usaron datos reales.
- El E2E contextual falló por una búsqueda de texto que encontró tanto la etiqueta como una frase explicativa. Se ajustó la prueba para verificar la etiqueta exacta, sin cambiar la fórmula ni la interfaz.
- Las diez variantes afectadas pasaron después de la corrección en Chromium local: 360, 390, 768, 1280 y 1440 px, en claro y oscuro. No sustituye las pruebas físicas ni las de otros motores.

## Mosaico de revisión individual

- El mosaico reemplaza la tira de pestañas. Al entrar a una sección se ocultan las otras opciones y el resumen general; «Volver a opciones» restaura el foco. Se conservan los enlaces directos y los borradores de una pregunta al pasar entre Respuestas y Evidencia.
- Chromium con datos ficticios: mosaico de dos columnas y vistas exclusivas a 384 y 1440 px, recorrido de teclado, regreso y ausencia de escrituras al navegar. También pasaron 38 pruebas unitarias del espacio móvil y del editor de hojas.
- Cambio de presentación únicamente: sin modificar endpoints, modelos, notas o evidencias de producción. La prueba física de esta versión y el CI del cambio siguen pendientes.

## Ajuste por respuesta y CSV de una evaluación

- Elegir «Correcta» propone el máximo exacto de la pregunta; «Incorrecta» y «Sin respuesta» proponen cero. «Parcial» deja el puntaje editable. No se guarda ni publica hasta ejecutar la acción correspondiente.
- «Más acciones → Exportar notas CSV» abre el exportador existente con la evaluación en curso. Chromium a 390 y 1440 px verificó una descarga real: nombre y evaluación, cero real y decimales, pendientes vacíos, sin correos ni escrituras. Pasaron también 10 pruebas de permisos y lectura de notas en el backend.
- En el CI publicado `95b872d`, pasaron Backend, contenedores, calidad de frontend y E2E contextual. El E2E general falló en dos recorridos repetidos por tamaños, temas y navegadores: copiar un enlace ya listo con otros pendientes, y abrir la ayuda trasladada a Historial. Gobernanza continúa rechazando tareas pendientes; no se ha modificado su política.
- Se corrigieron ambos recorridos; pasaron 16/16 variantes en Chromium local. Los resultados locales no sustituyen los controles del nuevo commit en GitHub.
- T006 y T026 se verifican con las regresiones existentes de `ShareFeedbackDialog.test.tsx` y la navegación de calificaciones: sin controles grupales en individual, URL protegida, borrador, selección, errores parciales y retorno. T020 se respalda con las pruebas unitarias de edición y la integración de permisos y replay en PostgreSQL. T028 se probó en Chromium a 1440 px con paneles independientes, regreso, filtro y selección conservados.
- T034: el responsable confirmó en el chat que probó esta versión en Android e iPhone físicos: giro, ajuste de esquinas, añadir foto y cancelar sin guardar. Se registra como validación manual reportada, no como ejecución automatizada.
- T007: la superficie individual usa su propia entrada, sin montar selección grupal; reutiliza el controlador y limita las consultas a la calificación abierta. Pasaron 64 pruebas dirigidas, TypeScript y lint del ámbito.
- T010 y T011: Chromium pasó 5/5 recorridos tras la separación, incluidas reentrada y recuperación a 384/1440 px en claro y oscuro, desplazamiento central, protección del borrador, descarte explícito y restauración de foco. Se reutiliza la suite `frontend/e2e/feedback-link-reentry.spec.ts`, que también cubre error y caducidad.
- T005: las pruebas de evidencia a 384 y 1440 px reutilizan fixtures sintéticos de contexto y paquete; ambas verificaron cancelación sin escrituras y confirmación por referencias. Se complementan con las regresiones de sesión, permisos y retorno de contexto.
- T029: pasaron seis recorridos de Chromium para generación, publicación, copia parcial, impresión y retorno, privacidad y chat; 15 pruebas unitarias cubren chat y cuota. La prueba de copia parcial verifica que solo se solicita el acceso listo y que se conserva la posibilidad de generar los pendientes.
- T030 y T033: la aplicación real con API simulada se comprobó en Chromium, Firefox y WebKit a 360/384/412/1440 px, en claro/oscuro, con carga, error, evidencia vacía, controles de 44 px, teclado y vuelta al foco. La suite se guarda en `frontend/e2e/spec141-visual.spec.ts` y las capturas locales de 384/1440 px en `frontend/output/playwright/spec141-visual/`. Se reintentó WebKit escritorio tras ajustar la captura y corregir el retorno del foco al ocultarse el panel; pasaron seis recorridos WebKit de escritorio, incluidos los dos visuales. Desplazamiento central y borrador se comprobaron también en la suite de enlaces.
- T035: Converge contrastó FR-001–FR-021 y SC-001–SC-008 con navegación, cálculo, respuestas, evidencia, entrega individual/grupal y sus pruebas. No quedaron brechas de implementación nuevas para añadir. Se actualizó la prueba unitaria que aún esperaba pestañas simultáneas; pasaron 1419/1419 pruebas frontend, TypeScript, lint y compilación. La validación local no sustituye el CI del commit que se publique.

## Corrección del E2E general

- En GitHub, `10a99ed` pasó Gobernanza, Backend, contenedores, calidad frontend y E2E contextual. El grupo 1 falló en tres pruebas que asumían que los controles de la vista anterior seguían visibles; se ajustaron al mosaico y pasaron las tres pruebas dirigidas en Chromium. El grupo 3 agotó la espera de carga completa en WebKit; el caso dirigido pasó al esperar el documento y verificar luego los controles reales.
- El grupo 4 agotó los 30 minutos tras iniciar 250 de 251 casos, sin un fallo individual reportado. El paso general ahora tiene 35 minutos y el trabajo 40. Se mantienen los cuatro grupos, todos los casos, los diagnósticos y los controles obligatorios, sin tolerar fallos ni omitir pruebas.
