# Contrato propuesto de lote, copia e impresión

Estos contratos son propuestas aditivas; no se consideran implementados ni sustituyen rutas actuales durante la preparación.

## Preparación privada

Extender el preview existente de evaluación para ofrecer por alumno la fuente esperada, valor de aceptación calculado en servidor, nota ya confirmada, estado y mensaje exacto de devolución/alcance. Mostrar en el resumen lo que se autorizará, no un texto distinto creado después de confirmar. Filtrar por evaluación/propiedad/matrícula antes de devolver datos; no aceptar un nombre o nota arbitrarios como autoridad del cliente.

## Aceptar y publicar

`POST /evaluaciones/{evaluation_id}/devoluciones/aceptar-publicar`

- Autenticación docente/administrador y ambos permisos `grading.grade`, `grading.publish`; evaluación y materia autorizadas.
- Petición: `request_id` y 1–25 selecciones únicas con calificación, fuente esperada y decisión exacta de mensaje/alcance proveniente de preview. La nota a aceptar se deriva y contrasta en servidor; esta ruta no sustituye el editor de notas.
- `request_id` repetido con la misma petición: resultado previo; con otra petición: 409. Fuente cambiada: fallo individual 409 sin mutaciones para ese alumno.
- Bloqueo por nota y savepoint por alumno. Aplicar políticas académicas e intentar las etapas como una unidad aislada. No llama LLM, no crea accesos ni cambia vigencia.
- Respuesta: identificador de recibo, totales y resultados por alumno con `published|already_published|failed`, estado efectivo, etapas confirmación/publicación/devolución, huella final disponible y error tipado con acción/reintentabilidad. No devolver stack traces ni errores SQL al docente.
- Un fallo individual no revierte éxitos de otros alumnos, pero ninguna parte de ese alumno queda publicada si su unidad solicitada falla. No devolver un lote exitoso hasta confirmar transacción.
- La interfaz ofrece «Aceptar todas y publicar» o las seleccionadas, resumen y una confirmación global. No se pide aprobar individualmente lo ya incluido y aceptado en la vista previa.

## Recuperación de resultado

`GET /evaluaciones/{evaluation_id}/devoluciones/lotes/{request_id}`

Actor propietario del recibo o administrador autorizado, mismos permisos y comprobación de evaluación. Devuelve solo el resultado mínimo, sin credenciales. Una respuesta perdida no exige ejecutar de nuevo el lote. Si no existe recibo, no afirmar que se publicó; reenvío idempotente o nueva consulta según el estado visible.

## Copia autenticada

`POST /evaluaciones/{evaluation_id}/devoluciones/accesos/copiar`

- Permiso de entrega docente y ownership en cada acceso, 1–100 IDs únicos. En la ficha individual se envía un ID; en «todos» se pagina la selección explícita de accesos activos de la evaluación.
- Bloqueo y revalidación de estado/fuente/vigencia/generación durante recuperación; no imprimir token ni querystring. Mantener headers privados y `Cache-Control: no-store`.
- Devuelve por acceso nombre del estudiante, ID, URL y vigencia únicamente si sigue vigente/autorizado y su copia cifrada es recuperable. Códigos claros: `legacy_unrecoverable`, `expired`, `disabled`, `source_changed`, `unavailable`; no filtrar nombres de registros ajenos.
- Leer/copy no crea, reautoriza, reemplaza ni prolonga enlaces. Auditoría de recuperación registra actor, IDs y cantidad, sin credenciales.
- Históricos sin ciphertext: mantener enlace anterior, ofrecer reemplazo por la operación existente con advertencia y consentimiento explícitos. Una copia fallida no es una renovación.
- Construcción de texto privado: una entrada por estudiante con nombre y URL asociados; no un listado público. Opción de copiar solo los seleccionados y feedback claro de cantidad y excepciones. Fallback de texto seleccionable en memoria; limpiar al cambiar cuenta/evaluación o cerrar.

## Enlace público y Xali

Sin cambios de identidad, sesión ni URL pública `/devolucion#token`. Conserva cinco preguntas cada diez minutos por estudiante/evaluación y duración de uno a treinta días. No hay lectura de tokens cifrados ni listados en rutas públicas. La evidencia solo aparece si el docente la habilita; las soluciones siguen su política actual. Copiar enlaces no modifica las conversaciones.

## Impresión y assets

`FeedbackPrintSheet` recibe las mismas proyecciones autorizadas y una elección local `none|motif_id|mixed`, sin nueva publicación. Galería de veinte PNG locales transparentes. Primera parte con cabecera reservada e ilustración; continuaciones mantienen estudiante, evaluación, nota y motivo consistente sin consumir el cuerpo de texto. Texto ≥12 pt, líneas de corte y área segura A4/Carta. Mismo orden y texto en vista previa, portal privado y PDF.

La decoración es prescindible; un asset que no carga no impide imprimir el texto. No comunicar rendimiento mediante trofeos, caras tristes o colores de castigo. No reducir tipografía para forzar una cantidad fija de fichas por hoja.
