# Plan: centro de retroalimentaciones de flujo claro

**Rama**: `codex/129-retroalimentacion-flujo-claro` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](./spec.md) | **Issue**: [#272](https://github.com/Andres-back/Calificator/issues/272)

**Estado**: especificación y plan aprobados el 2026-10-26 mediante «Aprueb», incluyendo revisión de calidad y continuación si está completa. Implementación local autorizada; no implica fusión ni producción.

## Resumen

Reorganizar el frontend docente alrededor de una lista compacta, un único punto de acciones siempre accesible y un panel que reúna preparación y copia de enlaces. En escritorio, lista y detalle comparten el espacio; en celular, vistas completas dentro del mismo marco, sin cadenas de ventanas ni barras inferiores superpuestas. Reutilizar contratos y reglas existentes sin cambios backend, migraciones ni IA.

La mejora es de interacción y composición: no se entrega una decoración separada del producto ni se vuelve a crear un centro distinto para la vista individual.

## Contexto técnico

**Lenguajes/versiones**: TypeScript, React 18, Vite y estilos Tailwind vigentes; servicios FastAPI existentes como dependencia sin modificaciones previstas.
**Dependencias**: módulos feedback_sharing, componentes UI, formato de notas, autenticación/autorización y useMobileFormViewport. Sin librerías, modelos, imágenes generadas o endpoints nuevos.
**Persistencia**: selección/vista/progreso/URLs preparados en memoria del contexto autorizado. Recuperación de operación incierta con manifiesto mínimo de IDs/fingerprints/opciones/request_id en sessionStorage acotado por actor/evaluación y caducidad; nunca URLs, tokens, nombres, notas, mensajes o evidencias. El contenido académico y credenciales continúan en el servidor actual.
**Pruebas**: Vitest/Testing Library, Playwright Chromium/WebKit y regresiones de contratos backend existentes; datos sintéticos. Base de diagnóstico actual: 23/23 pruebas de cuatro archivos aprobadas, no prueba del diseño nuevo.
**Plataforma objetivo**: 360/390/768/1440 px, claro/oscuro, texto ampliado y viewport reducido/teclado simulado. No afirmar prueba física de iPhone/Android por emulación.
**Rendimiento y escala**: muestra de 40 estudiantes y 105 para comprobar paginación/lotes. Mantener límites existentes: preview/emisión/copia/impresión de 100 y publicación académica de 25. No pedir enlaces de todos por cada fila ni al desplazarse; no emitir, publicar o imprimir al seleccionar/filtrar/abrir detalle.

## Verificación de la constitución

- **Roles (I)**: conservar grading.read, grading.grade y grading.publish según operación; guardas del servidor siguen siendo autoridad. UI retira estado y resultados tardíos si cambia cuenta, contexto o permiso.
- **Integridad (II)**: copiar/compartir/imprimir no aprueba ni publica notas. Reutilizar revisión y lote docente actuales, preservar ajustes, avisos, evidencia y editor sucio. No alterar condiciones de elegibilidad para reducir clics.
- **Asincronía (III)**: selección capturada, manifiesto inmutable por intención, mismos IDs en reintento y resultado por estudiante. Incertidumbre no se vuelve éxito; no cambiar request_id para resolver una respuesta perdida.
- **Evolución segura (IV)**: sin esquema o contrato nuevos; no borrar enlaces existentes ni dejar componentes/exports muertos al reorganizar. Inventario y especificaciones responsables se actualizarán después de aprobar, sin debilitar controles.
- **Accesibilidad (V)**: un marco con cabecera, contenido desplazable y pie de acciones; objetivos de 44 px, foco visible/restaurado, aria-live, estado textual y teclado/zonas seguras. Sin contenido del fondo visible a través del panel de trabajo.
- **Datos/IA (VI)**: sin lectura de alumnos reales, llamadas IA o cambios de proveedores. URLs solo en memoria autorizada y texto de copia; no logs, telemetría, almacenamiento de navegador, URL de la página ni capturas de CI con datos reales.
- **Gobernanza (VII/VIII)**: issue #272 y Spec129 antes de código. Después de aprobación: Checklist, Tasks, Analyze, Implement, Converge, PR y CI. Sin fusión/despliegue implícitos ni push a main.

Revisión posterior al diseño: sin excepciones constitucionales ni necesidad de ampliar backend. La limitación real de solicitudes nuevas concurrentes se declara, no se disimula con un cambio visual.

## Estructura del proyecto

- `frontend/src/modules/feedback_sharing/ShareFeedbackDialog.tsx`: orquestación común, vistas lista/detalle/compartir/impresión, con un marco de desplazamiento acotado.
- `FeedbackWorkspace.tsx`, `FeedbackToolsButton.tsx`: entradas comunes; disponibilidad y contexto por identidad estable, sin reiniciar por una renovación normal del mismo usuario.
- Componentes acotados propuestos en el mismo módulo: `FeedbackStudentList.tsx`, `FeedbackSelectionBar.tsx`, `FeedbackSharePanel.tsx` y modelo/controlador de preparación/recuperación, con sus `.test`.
- `FeedbackLinkActions.tsx`, `IndividualLinks.tsx`, `FeedbackAccessList.tsx`: reutilizar/refactorizar la lógica de copia/resultado/ciclo de vida en contexto; retirar renders grupales duplicados, no duplicar servicios ni conservar exports sin consumidores.
- `FeedbackDeliveryReview.tsx`, `FeedbackBatchPublish.tsx`: conservar contratos y operaciones, adaptar únicamente su ubicación, navegación y presentación.
- `FeedbackPrintSheet.tsx`: usar la preparación existente y conservar retorno/contexto; no rediseñar fichas, motivos o paginación.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: coordinación mínima de barras y foco para el modo integrado, sin tocar cálculo, evidencia, reproceso o publicación.
- `frontend/e2e/feedback-workspace-responsive.spec.ts` propuesto, pruebas existentes `feedback-delivery*.spec.ts` y configuración efectiva de Playwright/CI; incluir Chromium/WebKit para los nuevos casos, no confiarlos a un grep que los excluya.
- Dominios/specs responsables después de aprobar: 008-calificaciones, 107-retroalimentacion-familiar, 120-retroalimentacion-entrega-clara, 122-retroalimentacion-lote-visual y 126-retroalimentacion-unificada-chat; índice/inventario/baseline según superficies afectadas. No editar contratos ajenos para hacer pasar una prueba.

## Decisiones y complejidad

### 1. Un marco, una lista y acciones estables

En grupo: cabecera breve de evaluación y conteos; búsqueda/filtro; lista compacta; pie de selección con Compartir e Imprimir. En desktop desde xl (1280 px), lista/detalle adyacentes; en móvil/tablet estrecho una vista a la vez con Volver. El pie queda fuera del contenido desplazable del centro; no usar fixed global dentro de varios overlays.

En acceso individual integrado, no crear una segunda lista de estudiantes ni otra barra global: acciones locales accesibles y coordinación explícita con el pie de calificación. No ocultar el botón docente de confirmar/publicar sin una alternativa equivalente ni modificar su lógica.

Seleccionar listos se limita al filtro activo y lo dice; el contador incluye el total y los ocultos por filtro. Detalle abierto es independiente de estar seleccionado. Cerrar detalle/compartir/impresión devuelve contexto, foco y selección; un editor sin guardar conserva sus protecciones.

### 2. Preparar no es emitir; copiar no es renovar

Al abrir Compartir, congelar el conjunto para esa preparación y reconciliar preview/listado de accesos actuales. Mostrar listos, pendientes y estado de acceso; las opciones de tres días/evidencia oculta se aplican solo a faltantes nuevos, no a enlaces activos existentes.

- Activo recuperable: obtener URL con copia autorizada, sin emitir; copy_available es indicio, no garantía, por lo que el resultado del servidor prevalece.
- Sin acceso guardado y elegible: pedir confirmación Crear enlaces faltantes y emitir solo esos IDs/fingerprints.
- Cerrado/vencido/suspendido/histórico no recuperable: llevar a opciones vigentes con confirmación; no llamar a emitir como sustituto automático.
- Varios accesos existentes: no crear más automáticamente; mostrar los disponibles, identificados por estado/vigencia, y permitir elegir sin retirar otros.

La emisión no es upsert: una solicitud nueva puede crear otro enlace. Nunca llamar a emitir para comprobar si ya existe ni usar el recibo `/lotes/{request_id}`, que pertenece a publicación académica y no a emisión.

### 3. Resultado y copia en el mismo panel

El panel conserva solicitud, opciones, destinatarios y progreso; al terminar muestra cantidad y resultados individuales en su propio cuerpo y Copiar N enlaces en el mismo pie. No añadir otra lista de enlaces al final del grupo. Si solo parte está confirmada, indicar exactamente N de M y exigir elección explícita del subconjunto, sin decir que todos se copiaron.

Separar recuperación asíncrona de URLs y el gesto de copiar: el botón copia desde el resultado ya preparado en memoria. Solo notificar éxito después de la confirmación del portapapeles. Si el navegador deniega, conservar texto seleccionable con copia manual; sin automatizar envíos a WhatsApp/correos ni poner URLs en parámetros.

La fila con enlace ofrece el mismo flujo individual, sin otra implementación. Reactivar/reemplazar sigue siendo una acción diferenciada con versión esperada, advertencia y resultado actual.

### 4. Recuperación sin confundir fallos y sin datos nuevos

Manifiesto mínimo por intención: actor/evaluación, IDs seleccionados, selecciones faltantes con fingerprint, opciones, UUID de solicitud y lotes inmutables. Acordar estado por ítem (existente por recuperar, nuevo sin enviar, confirmado, fallo conocido, respuesta incierta) y validar que respuestas no omiten/duplican/devuelven IDs ajenos.

Mantener el manifiesto para recuperar reintentos tras recarga, con TTL de una hora desde la preparación, aislado por actor/evaluación y eliminado en logout/cambio de cuenta/permiso. Tras caducar, no repetir escrituras desde ese manifiesto: consultar estado actual y pedir una nueva decisión. No guardar allí URLs ni resultados académicos. Reintentar una emisión confirmada devuelve ID sin token: recuperar su URL por copia de ese ID.

Un doble clic o reintento de la misma operación no cambia el UUID/payload ni reenvía lotes confirmados. Cerrar durante solicitud incierta no permite iniciar ciegamente otra. Las protecciones de cierre se explican sin bloquear lectura del resto cuando no hay cambios o solicitud en curso.

No hay garantía backend de exclusión global entre dos pestañas que crean solicitudes nuevas independientes. Se conserva ese contrato: este cambio no promete resolverlo. Si se exige unicidad global, se presentará otra ampliación antes de implementarla.

### 5. Secuencia de entrega y validación

Después de la aprobación del plan y revisión de requisitos: pruebas RED de selección/manifest/modelo, componentes y contratos; barra/lista y detalle comunes; panel de preparación/copia y recuperación; adaptación móvil/integración; pruebas de navegadores y conservación. No ampliar el primer incremento a diseño de chat, generación de motivos o cambios de rúbrica.

Validar cuarenta estudiantes comenzando a mitad/final de lista, mezcla activo/faltante/cerrado/pendiente, estados parciales y 105 para lotes. Capturas de ambos temas, accesibilidad/foco, teclado/viewport y últimos controles visibles. Ejecutar TypeScript/lint/Vitest/build/auditorías, E2E y backend aplicables, inventario/gobernanza y Converge antes de PR.

La preparación de este diseño no acredita que esté implementado, probado en dispositivos físicos ni desplegado.

## Hotfix #283: revisión dentro del panel de compartir

Autorización actual «resuelve y continua» (2026-10-29), dentro del recorrido ya aprobado. Reutilizar FeedbackDeliveryReview como vista interna de FeedbackSharePanel, sin desmontar este último: preservar selección capturada, días, evidencia y URLs preparadas únicamente en memoria. Ofrecerla solo con revision_docente vigente y permiso actual de publicar, sin sustituir la comprobación del servidor. Mantener la solicitud incierta inmutable: no permitir cambiar su intención mediante otra aprobación durante la recuperación.

Una aprobación exitosa actualiza el preview recibido del servidor, la clasificación de ese destinatario y el resumen de la lista padre; no fija elegible=true por cuenta propia. Regresar a crear/copiar sin emitir por aprobar. Guardar mensaje sin aprobar conserva la revisión abierta y explica la decisión pendiente. Cancelar/errores preservan opciones y protecciones de borrador. Enlaces cerrados siguen en sus opciones, nunca se convierten automáticamente en faltantes nuevos. El footer usa texto/estado pendiente cuando hay cero preparados; la nota publicada en la plataforma se distingue de un enlace listo.

Archivos: FeedbackSharePanel.tsx/.test.tsx, ShareFeedbackDialog.tsx/.test.tsx, mensaje informativo de CalificacionesWorkspace.tsx y frontend/e2e/feedback-share-review.spec.ts con inclusión explícita WebKit. Red de pruebas enteramente simulada; regresiones de devolución/selección/copia, tipos/lint/build, inventario, gobernanza y Converge. PR separado del #282, sin fusión/despliegue.

Coordinar explícitamente la finalización del teclado entre el marco y FeedbackWorkspace integrado; el formulario de revisión recibe foco de lectura al abrirse y restaura acciones al aprobar/cancelar. No depender de que Safari emita focusout al retirar un textarea ni modificar el hook móvil compartido. Los errores mantienen el formulario y el borrador abiertos.

El centro integrado comunica si está habilitado para el actor actual y asume su única barra de acciones; al salir o perder acceso libera ese estado. El editor de compatibilidad desactivado conserva las acciones académicas. Al devolver el foco a Crear se muestra mediante desplazamiento nativo dentro de los contenedores, sin exigir al profesor localizar un botón fuera de pantalla; cancelar conserva el contexto de revisión.
