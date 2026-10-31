# Modelo de presentación y estados

Diseño, no migración. Se reutilizan FeedbackAccess, FeedbackPublication y recibos/operaciones existentes.

## Identidad y datos

- Clave de contexto: actor autorizado + evaluación + calificación. Cambiar cualquiera invalida respuestas tardías y limpia URLs privadas.
- Acceso existente: id, calificación, publicación, versión, vencimiento, estado, fingerprint y disponibilidad de copia; el token solo se obtiene en recuperación autorizada.
- URL recuperada: en memoria del contexto con accessId, calificacionId y vencimiento; las credenciales reales nunca van a especificaciones, logs, métricas, almacenamiento local persistente o artefactos de pruebas. Las capturas obligatorias usan exclusivamente enlaces ficticios de fixtures sintéticos.
- Consulta: `loading | loaded | error`. Solo loaded completo autoriza concluir que no existe acceso.
- Recuperación: `idle | loading | ready | unavailable | error`, por acceso. Una pista copy_available no sustituye ready.
- Generación: identidad de solicitud, instantánea y resultados por destinatario de Spec135. Abrir/copiar no inicia esta operación.

## Proyección por destinatario

| Hecho confirmado | Texto | Acción |
| --- | --- | --- |
| Consulta/recuperación pendiente | Buscando su enlace… | Esperar |
| Fallo de consulta | No pudimos consultar su enlace | Reintentar lectura |
| No tiene acceso, contenido apto | Listo para generar | Generar con confirmación |
| No tiene acceso, falta nota o contenido válido | Falta revisar | Revisar en contexto |
| Un acceso vigente autorizado recuperado | Enlace disponible | Copiar enlace |
| Cambio de contenido suspendió publicación vigente | Necesita reenvío | Revisar y aprobar expresamente |
| Venció | Vencido | Gestionar con decisión explícita |
| Desactivado por docente | Desactivado | Gestionar con decisión explícita |
| Antiguo irrecuperable, múltiples o fallo de recuperación | Requiere atención | Reintentar/elegir/reemplazar según causa |

La expiración/desactivación del acceso elegido prevalece sobre cualquier resultado de copia anterior. Una nueva publicación no reactiva otro acceso revocado. Con varios vigentes no se selecciona arbitrariamente: elección en contexto sin emitir un tercero. Carga/error es estado de consulta, no un nuevo estado académico.

## Transiciones invariantes

- Abrir/reabrir → consultar → recuperar → copiar: mismo accessId, token, vencimiento y generación; cero escrituras académicas. La auditoría técnica existente de copia no se interpreta como entrega.
- Ausencia confirmada + confirmar generación → guardia del servidor → emitir faltante o devolver vigente creado concurrentemente; después recuperar/copia.
- Resultado incierto → recuperar misma solicitud/reconciliar servidor → mantener éxitos; no lanzar otra aprobación por perder selección local.
- Suspensión vigente + confirmar nueva autorización con mantener_vencimiento → nueva publicación, misma credencial/fecha/cuota. Se limpia cualquier resultado anterior obsoleto.
- Copiar/compartir cancelado o fallido → no éxito, no «Enviado»; fallback manual conserva el acceso.

La representación no inventa notas, logros, contactos, estados de lectura ni datos de familia. No nuevas tablas ni registro de envío/apertura.
