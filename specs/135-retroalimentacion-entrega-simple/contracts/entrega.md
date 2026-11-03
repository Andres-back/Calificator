# Contrato de entrega y presentación

Se conservan endpoints, permisos, límites, esquemas y fingerprint de las operaciones existentes. No hay API nueva ni migración.

## Mensaje individual/lote

La candidata individual y la de lote separan solamente el prefijo interno conocido `Retroalimentación provisional: ... Borrador basado en el desglose:` bajo la misma regla conservadora. No mutan `Calificacion.feedback`, evidencia o historial al consultar. Texto desconocido o incertidumbre sustantiva sigue visible/sujeta a validación. Una edición explícita se conserva y no se sustituye por un candidato antiguo.

## Confirmación compuesta

UI congela selección, textos/notas visibles, duración (3 días inicial) y evidencia (oculta inicial). Solo al confirmar puede llamar a `POST .../aceptar-publicar` para pendientes candidatos (tandas25); recuperar con `GET .../lotes/{request_id}` antes de repetir una solicitud incierta. Consultar la proyección vigente antes de emitir; usar únicamente resultados elegibles y huellas actuales en `POST .../accesos` (tandas100). Mantener request_ids de emisión y recibos existentes de `feedbackPreparation`.

No enviar a emisión resultados fallidos/inciertos, ni editar/reaprobar un activo sano por abrir el panel. Un acceso cerrado conserva gestión separada. Después de aprobar/crear, copiar requiere otro gesto y nunca emite/renueva accesos. Fallo parcial informa aprobados, enlaces creados, cerrados y casos pendientes sin presentar uno por otro.

## Lectura/estados

El mensaje presentado conserva todo el texto académico y su contexto de pregunta; los grupos se muestran solo con contenido documentado. Motivo curado≤64px, decorativo, ausente sin bloqueo. Mensajes antiguos sin encabezados siguen íntegros. Impresión mantiene todo el texto autorizado y la opción sin decoración.

Estado operativo y edición son distintos; eventos de fin/cancelación liberan únicamente su propio estado. Cambios de contexto/permisos abortan lectura/efectos tardíos y conservan la recuperación autorizada sin exponer otra cuenta. Un foco/scroll no constituye una edición.

## Evolución compatible: Spec139

[139-envio-retroalimentacion-simple](../../139-envio-retroalimentacion-simple/spec.md) mantiene este contrato de aprobación y añade recuperación visible al reingresar: consultar los accesos guardados y su copia privada autorizada, sin emitir ni cambiar token, vencimiento o cuota. «Generar enlace» exige confirmación; después y al volver se muestra «Copiar enlace». La lista utiliza «Copiar lista de N», privada para reparto individual; el mensaje individual contiene nombre, evaluación y URL, sin nota.

Dos opciones privadas estrictas son compatibles con consumidores anteriores: `solo_si_falta=false` en emisión y `mantener_vencimiento=false` en reactivación. El flujo nuevo usa la primera para reutilizar bajo bloqueo el único activo compatible o devolver conflicto, sin duplicarlo por otra sesión/dispositivo. La segunda solo se envía tras reaprobación expresa de una publicación suspendida con acceso aún activo, vigente y no desactivado; conserva token, fecha y cuota. Sin opción se conservan los recibos/digests y comportamiento anteriores. Vencidos, desactivados, copias antiguas y múltiples requieren decisión separada; consulta fallida nunca significa ausencia. No migración ni cambio de API pública, políticas de duración o chat.
