# Plan: retroalimentación unificada y conversación recuperable

**Rama**: `codex/126-retroalimentacion-unificada-chat` | **Fecha**: 2026-10-24 | **Spec**: [spec.md](./spec.md) | **Issue**: [#266](https://github.com/Andres-back/Calificator/issues/266)

**Estado**: aprobado por el usuario el 2026-10-24 junto con la revisión de requisitos y la decoración del chat. Revisión documental base16/16; seguir lista personalizada, Tasks y Analyze antes de implementar. No autoriza fusión ni despliegue.

## Resumen

Un único espacio de devolución con modos individual/grupo, editor y estado compartidos; recuperación segura del chat por navegador y acceso; respuestas explicativas con marcado restringido. Se reutilizan servicios de entrega, revisión, impresión y enlaces. La persistencia usa las preguntas ya almacenadas, con un ámbito de conversación nuevo; no se crea una tabla paralela ni se exponen conversaciones históricas de lectores desconocidos.

## Contexto técnico

**Lenguajes/versiones**: TypeScript/React18 y Vite actuales; Python3.11, FastAPI/Pydantic2, SQLAlchemy2 y Alembic existentes.
**Dependencias**: React Query, react-markdown10, remark-gfm, remark-math, rehype-katex, Lucide y motivos locales instalados. Sin dependencias nuevas previstas. No usar HTML crudo, contenido remoto generado ni un SDK de IA nuevo.
**Persistencia**: PostgreSQL existente; columna nullable `conversation_digest` e índice de lectura en `FeedbackChatRequest`. El navegador conserva únicamente metadatos opacos versionados. Publicaciones, cuotas, recibos idempotentes y retención actuales se reutilizan.
**Pruebas**: Vitest/Testing Library, Playwright Chromium/WebKit, pytest y PostgreSQL aislado; migración aditiva, permisos, idempotencia, retención, impresión y formato seguro. Fixtures sintéticas y proveedor IA simulado.
**Plataforma objetivo**: web/PWA desde360px, celular con teclado y escritorio, temas claro/oscuro; no prometer validación física por emulación.
**Rendimiento y escala**: treinta estudiantes por muestra, mensajes docentes6000 y respuestas8000 caracteres; historial de veinte filas por página, hasta cincuenta por petición y paginación keyset sin carga ilimitada; caso de25 intercambios. Cero inferencias por recuperar o formatear; mantener una consulta en vuelo y deduplicación por petición.

## Verificación de la constitución

- Separación de roles (I): mantener permisos docentes en servidor; el visitante solo posee acceso a la revisión compartida. Aislar historial, poll y repetición idempotente por conversación, no solo ocultar botones. Casos permitidos y denegados.
- Integridad y trazabilidad (II): unificar presentación no modifica nota, desglose, evidencia ni análisis original. Guardar mensaje y autorizar su entrega conserva huella de fuente, auditoría e invalidación vigentes; no publicar al abrir.
- Asincronía e idempotencia (III): recuperar preguntas aceptadas y pendientes, sin reenvío ni inferencia duplicada. Conservar request_id, incertidumbre, cuotas y revalidación al terminar; operaciones de lote con resultados parciales existentes.
- Evolución segura (IV): migración nullable sin backfill ni borrado; índice nuevo; compatibilidad de clientes anteriores documentada. No asignar filas antiguas a un lector arbitrario. Rollback de aplicación compatible conservando datos aditivos.
- Accesibilidad (V): controles44px, entradas móviles16px, foco, safe-area, estado de espera/error, tabla con scroll local, encabezados y contraste. Pruebas360/390/768/1440 en dos motores y ambos temas.
- Datos, secretos e IA (VI): no almacenar token o contenido en navegador/logs/Git; solo referencia opaca de continuidad. HTTP privado y sin cookies de cuenta, inferencia/ruta/modelos sin cambios, mismo cupo por estudiante/evaluación. Decoración local sin llamadas pagadas.
- Gobernanza y pruebas (VII): issue266 y diseño aprobados el2026-10-24; lista personalizada8/8 y Analyze sin incidencias bloqueantes. Seguir implementación, pruebas, Converge y PR; no marcar trabajo aún no realizado.
- Producción protegida (VIII): no push a main, no bypass de CI, no despliegue manual. Una entrega futura requiere autorización correspondiente y CI completo; verificación posterior con demo sin usar alumnos reales por defecto.

Revisión posterior al diseño: sin excepción constitucional ni incógnita técnica bloqueante. Puerta humana satisfecha el2026-10-24; no incluye fusión/despliegue.

## Estructura del proyecto

- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `components/GradeFeedback.tsx`: sustituir el editor de entrega duplicado por el panel común, mantener navegación y cambios sin guardar; propuesta original en historial sin borrarla.
- `frontend/src/modules/feedback_sharing/{FeedbackToolsButton,ShareFeedbackDialog,FeedbackDeliveryReview,FeedbackMessage}.tsx`: extraer componentes pequeños de espacio común, estado individual/grupo, selección inicial y revisión; conservar impresión, lote, enlaces y controles existentes. El menú abre ese mismo espacio, no otro formulario.
- `frontend/src/modules/feedback_sharing/{PublicFeedbackPage,PublicFeedbackChat}.tsx`, `publicApi.ts`, helper de continuidad y renderer público seguro: identidad opaca, recuperación y marcado permitido. Mantener fetch separado del cliente autenticado.
- `frontend/src/components/ui/RichContent.tsx`: reutilizar normalización/estilos mediante una política pública restrictiva o componente pequeño compartido; no debilitar seguridad global ni cambiar el renderizado de otros consumidores por defecto.
- `backend/app/modules/feedback_sharing/{models,schemas,public_router,chat_service,quota_service,router,service}.py` y helper de conversación: ámbito, migración, historial, poll e idempotencia; contrato docente de guardado de mensaje sin ajustar nota, con huella, auditoría, historial original e invalidación de accesos. `retention.py` no cambia su política; solo ampliar regresiones.
- `backend/alembic/versions/`: migración nueva desde el head real al implementar, nunca editar una migración ya entregada.
- Pruebas unitarias/integración existentes, nuevo historial, E2E de entrega y configuración contextual necesaria para ejecutar126 también en WebKit, sin retirar controles.
- Specs107/120/122: referencias de extensión explícitas al nuevo contrato, especialmente metadatos opacos permitidos frente a credenciales/contenido prohibidos. Inventarios de acciones/líneas actualizados según scripts vigentes, sin modificar CI para aceptar fallos.

## Decisiones y complejidad

1. **Una autoridad para la devolución**: usar la proyección y revisión entregable existentes. Mostrar mensaje autorizado cuando corresponde a la fuente actual; en ausencia de revisión, proponer el borrador con estado pendiente. Conservar la salida original en historial y las acciones de ajuste académico separadas. Editar el mensaje no debe llamar accidentalmente a un ajuste de nota. El panel individual y la lista reutilizan el mismo editor/estado y refrescan las mismas claves de consulta tras guardar.
2. **Un espacio con dos modos**: la pestaña enfoca un estudiante; el menú se llama «Retroalimentación del grupo» y enfoca selección actual o listado sin selección implícita. Mismo panel de revisión, encabezados, estados y acciones; contenedor amplio en escritorio y de pantalla completa en móvil, sin modales anidados. «Copiar enlace» sigue siendo rápido y nunca crea/renueva/publica por sí mismo.
3. **Ámbito por navegador**: el GET autorizado devuelve `conversation_scope`, opaco, no autenticante y derivado del acceso/publicación/generación. Con él se localiza un UUID aleatorio local versionado; se envía como `X-Feedback-Conversation`. Guardar solo scope+UUID, nunca token ni mensajes. Un digest servidor con separación de propósito vincula filas a ese ámbito; el UUID bruto no se registra. El perfil compartido no identifica personas: advertir esta limitación sin afirmar aislamiento entre usuarios del mismo navegador.
4. **Persistencia reutilizada y compatible**: historial paginado por ámbito exacto; filas legacyNULL nunca se enumeran. Conservar poll legacy para filasNULL y clientes sin cabecera; nuevas filas vinculadas exigen la cabecera correcta para lectura y repetición. Mantener la unicidad idempotente existente, rechazando reutilización entre conversaciones/publicaciones antes de devolver contenido. Cursor opaco firmado y ligado al ámbito, límites acotados y respuesta whitelist.
5. **Vigencia prevalece**: capturar acceso/publicación/generación como valores y revalidar después de historial/cuota; si cambian, responder indisponible. La reactivación que sustituye publicación o renovación genera nuevo scope. Los mensajes antiguos no se transfieren y la purga de terminales sigue la retención vigente tras cierre efectivo.
6. **Recuperación sin gasto**: unir páginas y respuestas en vuelo por server request_id, recuperar queued/running con poll, no con POST. Lecturas no despachan trabajos. Ventana5/600s sigue basada en estudiante/evaluación; no incorpora navegador. No ampliar prompt/contexto/modelos de IA para lograr continuidad visual.
7. **Formato seguro, no otra IA**: reutilizar Markdown/math restringidos sin HTML crudo, imágenes, URLs remotas ni SVG ejecutable; tablas solo con scroll local. Normalización conservadora de énfasis con espacios, sin tocar bloques de código/matemáticas ni quitar advertencias o asteriscos sustantivos. Diferenciar pregunta/respuesta con avatar local, burbujas y acentos; destacar explicación/paso/ejemplo únicamente si existen, con iconos locales accesibles. La pregunta del visitante permanece como texto.

Alternativas rechazadas: historial global del token (revela preguntas de otro lector), mensajes en localStorage (contenido sensible persistido), nueva tabla de conversaciones sin necesidad (duplicación), compartir sesiones de cuenta/cookies (mezcla de autoridades), reenviar pendientes para recuperarlos (doble consumo), nueva generación de imágenes automática (coste y alcance), eliminar el menú grupal (pierde funciones), ocultar alertas académicas para embellecer (altera significado).

## Secuencia y validación

1. Aprobación humana de spec/plan y revisión personalizada de ocho puntos: unificación/autoridad; selección y lote; guardado e integridad; historial y aislamiento; vigencia/retención; cuota e idempotencia; formato seguro; responsividad e impresión. Luego Tasks/Analyze, sin anticipar resultados.
2. Backend mínimo aditivo y contratos probados con base aislada, incluidos consumidores anteriores, sin activar acceso masivo ni consultar evidencias reales.
3. Espacio docente común con reutilización de servicios y protección de edición. Pruebas comparativas de ambas entradas, selección de tres, lote mixto, nota0 y permisos.
4. Recuperación cliente y renderer seguro con fixtures; recarga y reapertura de25 mensajes y pendiente, dos navegadores, dos enlaces, revocación y contenido malicioso.
5. Pruebas de impresión/regresión, revisión visual/accesible, CI completo y PR. Converge antes de declararlo terminado. No se ha realizado todavía ninguna de estas pruebas de implementación.

Diseño detallado: [research.md](./research.md), [data-model.md](./data-model.md), [contratos](./contracts/retroalimentacion-chat.md) y [validación](./quickstart.md).
