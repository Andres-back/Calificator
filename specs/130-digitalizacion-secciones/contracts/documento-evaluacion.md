# Contrato: documento organizado y recuperación revisable

## Contratos existentes extendidos

Rutas de evaluación, digitalización, edición, copia, previsualización y exportación conservan autenticación, propietario, modalidades y resultados actuales. Se añade `estructura_documento` opcional, validada, a creación/lectura/actualización y borrador de impresión. Ausencia significa compatibilidad, no eliminación del documento guardado. Un null explícito no puede borrar contenido estructurado por un guardado incidental de un cliente antiguo.

El payload de actualización no puede cambiar documento sin concurrencia esperada. El servidor verifica referencias contra las preguntas/material de esa misma revisión. Rechaza422 para estructura inválida y409 para base desactualizada o edición histórica incompatible, con mensajes comprensibles y sin rutas internas.

Lectura docente incluye estructura y revisión de cobertura autorizadas. Lectura estudiante incluye solo DTO de nodos públicos revisados de la versión que corresponde. No serializar el agregado, snapshot o resultado del job directamente. El estudiante sigue sin recibir blueprint privado o respuestas esperadas.

## Identidad y extracción

- El OCR vigente conserva bloques educativos y títulos detectados junto con texto/páginas; servidores asignan identidades de inventario en el ámbito del trabajo.
- El estructurador devuelve organización y referencias a alias comprobables del inventario y preguntas; nunca UUID de recursos, estado de seguridad, versiones o propietarios.
- La normalización produce números académicos globales únicos y etiquetas originales visibles. Enunciado/clave se asocian por identidad de origen aunque dos capítulos reinicien número1.
- Toda pregunta debe estar representada una vez. Una sección, lectura, debate o recuadro no agrega componentes calificables.
- Un resultado plano no puede descartar textos detectados. Si falta asociación, conservarlos como pendientes y pedir revisión, sin más llamadas automáticas.

## Recuperación docente desde transcripción disponible

Interfaces implementadas y verificadas con fuentes sintéticas en una base aislada; todavía no activadas en producción:

### `GET /evaluaciones/{id}/recuperacion-documental`

Solo propietario/administrador autorizado, `evaluations.read` y `evaluations.update`, con comprobación de materia y evaluación. Solo lectura. Devuelve estado de disponibilidad, texto educativo de la digitalización asociada, referencias de preguntas, fingerprint y base esperada; no entrega `input_json`, credenciales, rutas ni JSON completo de trabajos.

El servidor determina el trabajo asociado por tipo/evaluación/propietario y verifica coherencia; si hay varias fuentes sin una selección inequívoca, exige escoger una fuente autorizada antes de preparar. Un estudiante, otro docente o un identificador ajeno recibe rechazo sin revelar el contenido. Original ausente se declara; no retornar URL ficticia.

La selección usa `fuente_job_id` opcional en la consulta. La respuesta disponible contiene `source_job_id`, `source_fingerprint`, `texto`, `documento`, `preguntas`, `material_ids` autorizados, `original_disponible`, `mensaje`, `expected_updated_at` y `expected_content_version_id`. El fingerprint incluye la transcripción y el snapshot de origen. Si hay varias fuentes devuelve solo su lista acotada de identificadores/fechas hasta escoger una; si no existe fuente, `disponible=false` y una indicación de subir el original.

### Confirmación de copia recuperada

Extender la admisión durable de copia con intención explícita `recuperacion_documental` y un contrato de propuesta: `request_key`, fecha/versión esperadas, fingerprint de fuente, nombre y documento revisado. La copia normal conserva su contrato y destino distinto; no relajar su guard para admitir cualquier copia en la misma materia.

La recuperación mantiene los enunciados, claves y puntajes de origen; solo organiza y añade el contenido educativo recuperado confirmado. La transcripción educativa completa debe estar conservada o acompañada de exclusiones explícitas revisadas, sin publicación de respuestas manuscritas. Confirmaciones de faltantes no pueden convertir una figura inexistente en recurso listo.

Admisión encola un único trabajo de copia; respuesta usa job/progreso vigentes. No ejecutar IA en esta operación. El servidor revalida permisos, fuente y propuesta antes de persistir; fuente alterada devuelve409. El mismo ID/payload recupera la operación, no crea otra evaluación. Una respuesta incierta no se resuelve cambiando el request_key.

Resultado: nuevo borrador en la misma materia del propietario, con nueva revisión y procedencia de texto. Nunca cambia el original ni copia datos académicos o accesos públicos de estudiantes. Aceptar la propuesta no equivale a publicar; faltantes siguen visibles hasta solucionarse.

Payload de `POST /evaluaciones/{id}/copiar`: mantiene campos de copia128 y añade `recuperacion_documental={source_job_id,source_fingerprint,documento}`. `GET /evaluaciones/{id}/ultima-copia?recuperacion=true` filtra esta intención para no mezclarla con una reutilización normal. Lectura/consulta/finalización de recuperación exigen también `evaluations.update`; el worker revalida usuario activo, propiedad y fingerprint antes de persistir.

## Editor y lectura

Un índice muestra capítulos/subcapítulos y el contenido actual. La pregunta se edita en su formulario existente, dentro de su sección; textos educativos tienen editor propio y pueden permanecer sin preguntas. Botones accesibles permiten mover/reordenar sin arrastrar. Cerrar, filtrar o cambiar de selección no guarda ni descarta automáticamente cambios.

Al guardar, serializar documento, referencias y preguntas conjuntamente. Nunca volver a un payload plano por usar el formulario antiguo o por un autosave de borrador. La vista estudiante presenta contenido y controles de respuesta en el orden documental; las respuestas guardadas se identifican por el contrato académico, no por índice del render o etiqueta local.

## Reparto opcional por sección

Control «Asignar puntaje por sección», apagado inicialmente. Al activarlo, el docente elige presupuestos de grupos completos y no solapados: por ejemplo2+2+1 sobre5. Mostrar total asignado/pendiente y una propuesta de máximo por pregunta, proporcional a sus pesos base. Cambiar un presupuesto no aplica automáticamente los nuevos máximos; exige confirmar la propuesta. Los ajustes internos deben conservar la suma del grupo.

Validar en servidor grupos locales, cobertura exacta de preguntas, suma de presupuestos igual a la nota máxima y valores positivos representables con dos decimales. No sumar un presupuesto de padre además de sus hijos. Contenido no calificable no recibe puntos. Distribución inválida devuelve422 comprensible y conserva la edición local; base cambiada devuelve409 sin sobrescritura.

La confirmación actualiza documento y máximos canónicos en una sola revisión; el cálculo global sigue sumando puntos obtenidos por pregunta, nunca vuelve a ponderar subtotales. El resumen y todos los evaluadores usan los mismos máximos. Copias remapean IDs de presupuestos/pesos; snapshots anteriores permanecen intactos. La recuperación solo organizativa no cambia máximos para activar este modo: se configura explícitamente después en la copia.

Modo desactivado no exige presupuestos ni cambia valores; desactivar uno ya aplicado muestra y confirma el retorno a los valores base. Si cambian escala, pertenencia o preguntas, revisar la propuesta antes de aplicar. No aceptar un payload antiguo sin el campo opcional como orden de borrar una distribución existente.

Contrato cerrado: `puntuacion_secciones={modo:'por_seccion',presupuestos,pesos_base,ajustes?,confirmado}`. `ajustes` vacío utiliza el reparto proporcional; no vacío cubre todas las preguntas y conserva sumas de grupo. Creación/actualización requieren además `confirmar_puntuacion_secciones=true` para aplicar cambios aritméticos. Este campo es transitorio: reabrir una configuración no autoriza modificaciones posteriores silenciosas. El número académico estable desempata los restos; ni etiquetas originales repetidas ni el orden visual son claves de cálculo.

La revisión privada admite exclusiones explícitas `{elemento_id,motivo,confirmado}` de contenido detectado que el docente retira. Una exclusión no confirmada permanece pendiente; un elemento excluido no puede seguir conservado o asociado a un nodo. La confirmación de cobertura no sustituye la revisión de claves y material visual.

## Exportación, versión y contexto

PDF y Word recorren exactamente los mismos nodos públicos, en orden, sin duplicar lectura legacy. Se conservan modos compacta/media/amplia y el formato autorizado. No inventar saltos de página por cada sección ni forzar una lectura larga como bloque indivisible. Evitar encabezados aislados cuando título y primer fragmento caben juntos.

Principal, segundo evaluador, confirmador y ayuda post-entrega reciben contexto educativo desde la revisión fijada; secciones sin nota no entran al cálculo. Payload público/compartido usa allowlist y revisión vigentes, sin claves no liberadas. Las publicaciones antiguas no se regeneran ni invalidan por un campo opcional nuevo; las nuevas incluyen el contexto en su fingerprint cuando exista.

## Fallos y seguridad

Pruebas de permisos positivos/negativos, XSS como texto sin ejecución, inyección documental tratada como datos, fuente cambiada, nodos huérfanos/cíclicos, IDs ajenos, contenido excedido, reintento, resultado incierto y pérdida de almacenamiento. Mantener cero logs de transcripciones, notas, claves, URLs privadas o tokens. Un fallo no elimina originales ni produce una evaluación comunicada como completa.
