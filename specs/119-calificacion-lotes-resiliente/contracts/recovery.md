# Contrato de ejecución y recuperación

- El cliente de valoración/verificación/revisión adicional adquiere capacidad global antes de iniciar un plazo total de 60 segundos. Sus llamadas gestionadas por etapa no añaden reintentos ni fallback ocultos; el rol pendiente repite su selección capturada.
- El controlador guarda cada reserva de intento y cada resultado válido mediante callback awaitable. Un fallo de persistencia o claim perdido impide enviar la siguiente llamada. Dos intentos es un máximo compartido entre reinicios, no dos por reinicio.
- Solo se recuperan fallos transitorios de transporte o HTTP 408/425/429/500/502/503/504. Autenticación, rechazo, salida cortada o estructura inválida quedan para revisión sin un bucle automático.
- La revisión dual no cuenta una recuperación del principal como verificación. El principal válido, original o recuperado, pasa al rol de verificación configurado.
- Respuesta pública compatible: se añaden estado de verificación, etapas pendientes y política efectiva; ningún campo revela checkpoints ni claves. El trabajo terminal requires_review ya existe y se emplea para verificación incompleta.
- Los diagnósticos separan conexión/envío/lectura/plazo total/capacidad y guardan tiempos reales de inicio/fin para estas llamadas. No conservan prompts, respuestas o nombres en logs.
- La navegación docente y permisos permanecen; el aviso comprensible es «Falta completar la segunda revisión. Conservamos la nota propuesta y la evidencia».
