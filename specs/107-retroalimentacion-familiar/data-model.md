# Modelo de datos y estados — Spec 107

Contrato de diseño implementado mediante migración aditiva `202610200001`, cuyo padre vigente es `202610150001` tras integrar main. Validado en PostgreSQL sintético; no aplicado por esta entrega a producción. Sin modificar/rellenar notas, evidencias, usuarios o historiales existentes.

## Publicación (`feedback_publications`)

- UUID `id`, `calificacion_id`, `estudiante_id`, `evaluacion_id`, `materia_id`, `authorized_by`; validar consistencia de relaciones contra fuente académica.
- `revision`, `breakdown_id` opcional, `content_fingerprint`, `schema_version`, `authorized_at` UTC con zona.
- `payload_json`: nombre visible, actividad/materia, nota confirmada/escala, explicación docente, componentes permitidos y feedback. Lista blanca: no blueprint, referencias ocultas, prompts, otros alumnos ni JSON crudo.
- `evidence_enabled=false`, referencias de evidencia propia autorizada y política de soluciones; nunca URL permanente a uploads.
- Estado autorizada/suspendida, fecha/motivo permitido. Snapshot inmutable; reautorizar crea revisión nueva.

Huella incluye campos relevantes de nota/desglose/feedback, identidad del resultado vigente y política de liberación; `updated_at` no basta. Histórico manual sin desglose/Entrega admite solo nota y explicación existentes, sin componentes fabricados.

## Acceso (`feedback_accesses`)

- UUID `id`, `publication_id`, `created_by`; fechas UTC y `version` optimista.
- `credential_digest` SHA-256 único de 32 bytes aleatorios; `credential_generation` aumenta al renovar. Sin token crudo persistido.
- `expires_at`, estado activa/desactivada/suspendida y motivo. Vencida se calcula con reloj DB, no depende de cron.
- `creation_request_id` único por emisor/lote/elemento para evitar duplicación por mala conexión.

Acceso exactamente a estudiante/evaluación/revisión vía publicación, sin entidad familiar. Token devuelto una vez al crear/renovar. Respuesta perdida: devolver estado sin token, ofrecer renovación confirmada; idempotencia no recupera secretos no persistidos.

Validez efectiva: bandera habilitada, activo, ahora < expires_at, generación válida, publicación autorizada y huella vigente, emisor aún autorizado, matrícula activa y resultado vigente elegible. Fallo: no devolver contenido.

Transiciones:

- Crear: resultado elegible y revisión autorizada → activa por 72 h o 1..30 días.
- Desactivar → bloqueado sin tocar nota/cuota.
- Vencer: ahora >= expires_at → bloqueado independientemente del estado persistido.
- Reactivar: confirmar alcance y nueva vigencia; si cambió contenido, autorizar nueva publicación. No ampliar alcance ni resucitar token reemplazado; advertir si conserva credencial vigente.
- Renovar: reemplazar digest/generación, invalidar anterior sin extender vigencia/reiniciar cuota; no activa por sí sola un acceso desactivado.
- Cambio de nota/desglose/feedback: suspender en transacción académica. Guardia de huella rechaza también escritores no instrumentados; nueva autorización siempre explícita.

## Cuota (`feedback_chat_quotas`)

- Clave única `(estudiante_id, evaluacion_id)` y UUID; sin familia, apellido, IP o token.
- Crear con inserción segura ante conflicto, bloquear brevemente y dentro de la misma transacción validar acceso/idempotencia, contar aceptaciones en `(DB_now-600s, DB_now]`, admitir si < 5. Tomar el reloj DB después de adquirir el bloqueo, no la hora de inicio de una transacción que pudo esperar; persistir ese mismo instante de aceptación.
- Con cinco: 429 y `Retry-After=ceil(aceptación_más_antigua+600s-DB_now)`, sin nueva pregunta ni llamada al modelo. No crear otra clave al renovar/reactivar.
- Índice de solicitudes por cuota/accepted_at. Conservar timestamps dentro de 600 s aun si se rota/suspende acceso. No fallback local permisivo.

## Petición (`feedback_chat_requests`)

- UUID `id`, `access_id`, `publication_id`, `quota_id`; `credential_generation`, `client_request_id`, `request_fingerprint`, fechas accepted/started/finished y `dispatch_pending`.
- Unicidad acceso/generación/client_request_id. Mismo ID/mensaje recupera estado sin otra cuota/inferencia; ID repetido con otro contenido da conflicto. Revalidar acceso incluso para respuestas ya calculadas.
- Mensaje/respuesta privados, sin logs. Conversación de esa publicación/generación, no historial autenticado ni otros enlaces.
- queued → running → succeeded/failed/closed. Running con resultado externo incierto termina failed, no vuelve automáticamente a queued. Broker solo request UUID, no token/prompt.
- Despacho durable junto a aceptación; redespacho antes de reclamar es seguro. Claim atómico antes del proveedor evita duplicados de worker. Sin transacciones largas durante IA.
- Validar antes de inferir, después y cada poll; si cerró, no servir. Pregunta aceptada cuenta aunque falle proveedor o reciba rechazo pedagógico; lectura/envíos inválidos o bloqueados no gastan cupo.

## Auditoría, migración y carreras

Eventos de crear/suspender/reactivar/renovar/autorizar se escriben en la misma transacción, no solo con auditoría best-effort. Reutilizar tabla actual mediante escritor transaccional: actor/acceso/revisión/acción/fecha/motivo permitido, sin tokens, prompts o conversación en metadatos.

Retención propuesta para este nuevo contenido temporal: purgar mensajes/respuestas 30 días después de expiración o última desactivación, salvo acceso reactivado/vigente; conservar timestamps al menos 600 s. No aplicar borrado a notas/evidencias/historiales previos. Eventos de control sin contenido siguen política institucional vigente. Validar limpieza con reloj controlado, nunca sobre producción en pruebas; no afirmar cumplimiento legal por este diseño.

Alembic aditivo con índices/constraints y modelos registrados; respetar schema ownership. Sin cascadas desde tablas nuevas que borren registros académicos. Upgrade con datos previos conserva hashes/cantidades. Rollback de app/apagado conserva tablas, no downgrade destructivo de demo.

Orden de locks coherente: fuente académica/publicación → acceso → cuota → petición. Mutaciones y workers deben respetarlo, con prueba de carrera edición/emisión. Validación final autoriza el momento de entrega del servidor: no se puede retirar un byte enviado antes de revocarse. Sin streaming LLM, URLs permanentes de evidencia ni cachés que eviten comprobaciones. Edición concurrente → conflicto/revisión requerida, no mezcla de versiones.
