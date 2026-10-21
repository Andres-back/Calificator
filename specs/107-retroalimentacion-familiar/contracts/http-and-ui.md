# Contratos HTTP y UI propuestos — Spec 107

Diseño aditivo, no endpoints implementados. Prefijo API existente `/api`. Fechas ISO-8601 UTC; cliente muestra fecha/hora local y usa `server_now`, no reloj local para autorizar. Nombres/IDs nunca se deducen de apellidos.

## Superficie docente autenticada

Siempre identidad de profesor/admin autorizado, permiso real `grading.read` para consultar y `grading.publish` para autorizar/gestionar devolución, más propiedad/gestión de evaluación/materia. Impresión exige acceso docente y resultados autorizados; alumno/visitante no obtiene el lote. Probar todos los permisos permitidos/denegados, incluso petición directa sin UI.

| Operación propuesta | Entrada | Salida/condiciones |
|---|---|---|
| POST `/evaluaciones/{id}/devoluciones/previsualizar` | IDs explícitos de calificaciones, máximo 100 | Proyección exacta por estudiante, elegible/excluido y causa, versión/fingerprint. Solo lectura; no crea links ni califica. |
| POST `/evaluaciones/{id}/devoluciones/accesos` | request_id del lote, selecciones y fingerprint esperado, duración entera 1..30 días (default 3), evidencia false por defecto | Resultado individual creado/conflicto/excluido/error. Cada creado devuelve metadata y URL con fragmento una vez; no publicar lista al destinatario. Repetición no crea acceso duplicado. |
| GET `/evaluaciones/{id}/devoluciones/accesos` | Cursor/límite docente | Estados efectivos, estudiante propio, revisión, vencimiento y versión; sin token recuperable. |
| POST `/devoluciones/accesos/{id}/desactivar` | expected_version, request_id | Estado/version; repetición segura y auditada, sin cambiar nota. |
| POST `/devoluciones/accesos/{id}/reactivar` | expected_version, request_id, duración, revisión/fingerprint autorizados | Nueva vigencia finita; ante cambio exige previsualizar/autorizar nueva revisión. No recupera token anterior reemplazado ni reinicia cuota. |
| POST `/devoluciones/accesos/{id}/renovar` | expected_version, request_id y confirmación de reemplazo | Nueva generación/URL una vez, anterior inválida; no cambia nota, cuota, vigencia ni reactiva implícitamente. |
| POST `/evaluaciones/{id}/devoluciones/fichas` | IDs explícitos elegibles y fingerprints esperados, máximo 100 | Nombre, actividad, nota/escala y feedback completos para preview docente; sin tokens ni datos de cuentas. Excluidos explícitos. |

Conflictos de revisión/version: 409 con indicación de actualizar y revisar. Petición inválida: 422. Acceso docente no autorizado: 403/404 según política existente, sin datos ajenos. Lote responde 200 con resultados por elemento; no es «todo correcto» si hay fallos. Reintento de emisión/renovación ya aplicado informa `credential_available=false`, nunca entrega otra credencial silenciosamente. Selección «todos» debe recorrer todos los resultados elegibles, no solo la página cargada.

Crear acceso requiere nota confirmada y revisada, feedback explícitamente autorizado y controles de consistencia aplicables. No exige nuevo desglose a históricos manuales ni publica borradores. La vista previa hace visible esa ausencia sin inventar explicación.

## Superficie individual sin cuenta

Página SPA `/devolucion#<credencial>` fuera de RequireAuth/AppShell, metadatos genéricos. Fragmento se conserva solo en contexto en memoria, no se envía a backend en path/query ni a telemetría. Fetch dedicado con `credentials: omit`, cabecera `Authorization: Bearer <credencial>`, sin interceptores Axios de sesión y sin renovación JWT. No aceptar un JWT de plataforma como esta credencial ni al revés. Mismo origen HTTPS; sin CORS abierto, cookies de sesión nuevas ni bypass global de CSRF. No se permite credencial por query como alternativa.

| Operación propuesta | Contrato |
|---|---|
| GET `/public/devolucion` | Solo contenido de la publicación autorizada y accesible, `server_now`, `expires_at`, cupo restante y `retry_after_seconds`; sin IDs navegables de otros estudiantes, claves, logs o notas internas. |
| GET `/public/devolucion/evidencia/{page}` | Solo si se habilitó evidencia propia, página válida y token/revisión vigentes. Proxy privado sin redirigir a upload/URL permanente; no entrega original docente. |
| POST `/public/devolucion/preguntas` | `{request_id: UUID, mensaje: string}` (1..2000 caracteres), sin estudiante/evaluación/rol en payload. 202 con request UUID opaco, status y cupo; el servidor deriva identidad/contexto desde acceso. |
| GET `/public/devolucion/preguntas/{request_id}` | Solo petición del mismo acceso/generación/revisión. queued/running/succeeded/failed; respuesta solo tras revalidar. No consulta ni lista conversaciones ajenas. |

Todos estos endpoints revalidan acceso, permiso del emisor, matrícula, resultado vigente y revisión, incluso al repetir petición o leer respuesta ya completada. GET no gasta pregunta. Mensaje aceptado cuenta una vez antes de despacho, incluso si recibe rechazo pedagógico o fallo de proveedor. Mismo request_id/mensaje devuelve petición existente; ID con contenido distinto da 409. request_id de otro acceso no revela contenido.

Errores públicos sin datos de identidad:

- Sin credencial, inválida, desactivada, vencida, suspendida o permiso retirado: respuesta homogénea 404, «Este enlace no está disponible. Pide a tu profesor que lo revise». No distinguir token existente, alumno o estado en respuesta pública. Estado técnico específico solo docente/auditoría.
- Sexta pregunta: 429, `Retry-After` y `retry_after_seconds`, «Ya usaste tus 5 preguntas. Podrás preguntar de nuevo en …». Sin petición nueva ni llamada LLM. Lectura sigue si el enlace es válido.
- Persistencia/cuota no verificable, cola/proveedor no disponible: 503 o petición failed con texto seguro y lectura independiente. Si aceptación ya fue persistida, conservar request_id para consultar/reintentar despacho sin volver a gastar. Nunca informar «enviada» si no se guardó.
- Expiración/desactivación durante inferencia/poll: no entregar respuesta, ni siquiera si estaba en caché del trabajo. Sin streaming que pueda mostrar contenido después del control final.

Máximo cinco nuevas preguntas aceptadas por `(estudiante_id, evaluacion_id)` en los últimos 600 s: una pregunta a las 10:00:00 libera su lugar a las 10:10:00, no al cambiar de bloque de reloj. Nuevos dispositivos/enlaces/generaciones comparten el contador; estudiantes con igual apellido no lo comparten. Reintentar la misma petición no crea llamada externa duplicada. Proveedor incierto tras iniciar ejecución termina error, sin reenvío automático.

## Protección de contenido y contexto de IA

- Respuestas sensibles y página dedicada: `Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`; metadatos sin nombre/nota. Excluir de caché del service worker si existe.
- No analítica, previews con contenido privado, logs de cabecera/body o error reporter con fragmento. Excluir esta superficie antes de inicializar scripts/telemetría globales, no solo después de renderizar su componente. Probar proxies frontend/exterior y errores de cliente; no basta aplicar cabeceras en FastAPI.
- Renderizar texto seguro/Markdown permitido sin HTML crudo, scripts, URLs remotas de seguimiento ni vínculos que expongan credencial. No introducir `unsafe-inline` para esta función.
- El modelo recibe solo la proyección estudiante-segura: nota/explicación aprobadas, respuestas permitidas, criterios pedagógicos liberables y feedback. No incluir clave oculta «para que no la revele», IDs ajenos, historial profesor, cuentas, instrucciones internas o evidencias no autorizadas.
- Usar capacidad `xali_evaluacion_post_entrega` y resolución de proveedor/política del servidor, sin nuevos defaults ni elección de claves/actor desde navegador. Declarar procedencia/versionado mínimo sin registrar contenido sensible. La configuración efectiva y límites del emisor siguen su política vigente, no se usa el token como una cuenta docente.

## UI de profesor y destinatario

Profesor: «Compartir devolución» → vista previa/selección → vigencia/evidencia opcional → «Crear enlaces». Tres días predeterminados, cuatro acciones principales para un resultado. Copy/share se ejecuta solo por decisión explícita; se advierte «Entrega cada enlace por separado. Quien lo reciba podrá abrirlo mientras esté activo». Lista privada con estados y controles, sin ocupar permanentemente la pantalla de calificación.

Papel: «Imprimir devoluciones» → todos/algunos → preview → imprimir. Fichas con nombre, actividad, nota/escala y devolución completa, sin usuarios/claves/tokens; tipografía legible, marcas de corte y «continuación de …» si hace falta. Probar A4/Carta, saltos y textos largos, no solo tamaño de pantalla.

Destinatario: cabecera compacta de estudiante/actividad/vencimiento, nota y explicación, devolución con logros/mejora/acción cuando existan, Xali desplegable. Nada de panel docente, selector de alumnos, botón publicar/editar nota, reclamos familiares nuevos o identificación por apellido. Mostrar preguntas restantes y espera calculada; teclado no tapa envío y lectura no depende de cargar conversación.

Accesibilidad: 360/390/1440 px, ambos temas, 44×44 px, nombres largos, zoom y teclado. Anunciar estado con accesibilidad sin spinners interminables ni múltiples barras fijas. Cambio de enlace limpia contexto anterior; error/expiración limpia contenido sensible de UI. No prometer borrar información ya copiada.
