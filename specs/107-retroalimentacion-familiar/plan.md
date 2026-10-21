# Plan: devolución por estudiante, enlace temporal y validación de modelos

**Rama**: `codex/107-retroalimentacion-familiar` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](./spec.md) | **Issue**: [#223](https://github.com/Andres-back/Calificator/issues/223)

**Estado**: aprobado por el usuario el 2026-10-20 («aprove» en respuesta al plan); etiqueta `plan-approved` registrada en #223. Implementación local iniciada tras revisión autorizada de requisitos; ver tareas y validación. Sin activación de modelos ni despliegue. Base inspeccionada: `08964c9` de este worktree. No se absorbe Spec 101 ni código no fusionado de otros worktrees.

## Resumen

Precisión de presentación autorizada al retomar el 2026-10-21: la lista privada de una evaluación muestra también los borradores existentes y el motivo por el que todavía no se pueden entregar. Se conserva una lista blanca docente separada de la proyección pública; mostrar un borrador no lo habilita para imprimir, generar enlace, publicar o recalificar. La recomendación debe proceder de la evidencia y criterios del flujo de valoración existente, no de inferencias nuevas al abrir esta lista.

El docente revisa un resultado, prepara su devolución y elige imprimir fichas o compartir enlaces individuales. El destinatario abre su enlace sin cuenta: primero nota y explicación, después retroalimentación y Xali. Duración predeterminada: 72 horas, configurable de 1 a 30 días, con desactivación, reactivación y renovación explícitas.

El acceso se autoriza por estudiante/evaluación y revisión concreta, no por apellidos o familia. Una cuota persistente admite cinco preguntas en los últimos 600 segundos entre todos sus enlaces/dispositivos. Compartir no recalifica, cambia publicaciones existentes ni amplía permisos de plataforma.

Mantener modelos vigentes mientras se completa la comparación con referencia docente. DeepSeek principal y Luna revisor son una candidatura, no una migración de producción aprobada. La impresión mínima de #206 se incluye aquí sin copiar/modificar la propuesta 098 ajena.

El 2026-10-21 el usuario aprobó separar la ejecución experimental al issue #236 y mantener los modelos actuales. Se conservan harness/contrato y las condiciones de calidad, pero la tarea de esta entrega es registrar la separación sin inventar resultados. La comparación humana sigue pendiente de la tesis, no es una aceptación ya obtenida ni una autorización para activar modelos o refinamiento pagado.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 del contenedor; TypeScript 5.6 y React 18.3 del frontend.
**Dependencias**: FastAPI, SQLAlchemy 2 async, Alembic, PostgreSQL, Celery/Redis, LLMRouter; React Router, TanStack Query y componentes/estilos existentes. Sin nueva dependencia de proveedor.
**Persistencia**: tablas aditivas de publicación, acceso, cuota y solicitud/respuesta; notas/desgloses siguen siendo fuente académica, snapshots son proyecciones autorizadas, no calificaciones nuevas.
**Pruebas**: pytest/pytest-asyncio con PostgreSQL aislado, Vitest/Testing Library, Playwright Chromium/WebKit, CI y contenedores existentes. Inferencias simuladas por defecto; comparación pagada solo con autorización específica y evidencias minimizadas.

Verificación de navegador mediante Playwright CLI (flujo autorizado por la skill de esta sesión), con fixtures temporales sintéticos y capturas; regresiones persistentes de selección, estados, privacidad y controles en Vitest y contratos API con PostgreSQL. No se promete un archivo `feedback-sharing.spec.ts` que no existe ni prueba física de equipos. El CI general/contextual existente se conserva completo; no se añade un segundo sistema de automatización.
**Plataforma objetivo**: navegador desde 360 px, iPhone/Android y escritorio, ambos temas. Emulación no equivale a prueba física.
**Rendimiento y escala**: 30 fichas por escenario de impresión; cinco preguntas/600 s por estudiante/evaluación con admisión atómica. Objetivo de validación local: lectura/aceptación de chat p95 < 1 s sin proveedor bajo 30 consultas concurrentes sintéticas precargadas; informar hardware/carga y resultado real, no prometer SLA de inferencia. Chat en segundo plano con capacidad aislada de la cola prioritaria de calificación.

## Verificación de la constitución

| Principio | Comprobación antes y después del diseño |
|---|---|
| I. Roles | Gestión/impresión con identidad docente, permiso y propiedad de materia; rutas públicas separadas con credencial de alcance mínimo. Sin omitir controles existentes. |
| II. Integridad | Confirmación y revisión docente como puerta; snapshot seguro, huella de contenido y suspensión al cambiar. Históricos sin entrega/desglose no se recalifican. |
| III. Asincronía | Solicitud durable, idempotencia y despacho recuperable con Celery; lectura independiente. No repetir a ciegas inferencias de resultado incierto. |
| IV. Datos | Alembic aditivo sin backfill de notas; upgrade con registros previos, rollback de app sin borrar datos y bandera de apagado. |
| V. Accesibilidad | 360/390/1440 px, objetivos táctiles 44 px, teclado y textos sencillos; impresión sin truncado. |
| VI. IA y secretos | LLMRouter y contexto permitido; token fuera de URLs HTTP/logs/analítica. Sin cambio de claves ni defaults de modelos. |
| VII. Gobernanza | Spec y plan aprobados/etiquetados. Checklist, Tasks y Analyze antes de implementar; corpus/revisión docente no se inventan. |
| VIII. Entrega | PR y cuatro controles verdes, fusión/despliegue con autorización propia; sin push directo ni cambios manuales del VPS. |

Resultado del diseño: sin excepción constitucional. La adopción inicial de Spec Kit ya ocurrió; se añaden contratos dedicados sin modificar firmas/semántica de APIs existentes. Son decisiones de diseño, no comprobaciones de implementación ejecutadas.

## Estructura del proyecto

Existentes a integrar: `backend/app/modules/calificaciones/` (selección vigente, confirmación, ajustes y desglose), `backend/app/modules/xali/service.py` (política, no consulta/contexto crudo), `backend/app/services/llm_router.py`, `backend/app/workers/worker.py`, `backend/app/db/base.py`, `backend/app/api.py`; frontend de calificaciones, router, rutas y tratamiento de metadatos/errores/caché. Revisar `frontend/nginx.conf` y `nginx/templates/default.conf.template` sin relajar CSP global.

Adiciones definidas en el diseño y ahora implementadas localmente (ver evidencia y límites en `validation.md`; no equivale a despliegue):

- `backend/app/modules/feedback_sharing/`: modelos, schemas, autorización/proyección, cuota y routers docente/público.
- `backend/app/workers/tasks_feedback_chat.py`, migración en `backend/alembic/versions/` y pruebas focalizadas en `backend/tests/`.
- `frontend/src/modules/feedback_sharing/`: diálogo docente, entrega individual, vista pública, chat y fichas; componentes pequeños sin ampliar de nuevo el workspace monolítico.
- Fixtures sintéticas, pruebas mock/E2E e informe comparativo sin evidencias personales en Git.

## Decisiones y complejidad

1. **Publicación independiente**: snapshot inmutable de campos permitidos, versión de desglose opcional, huella y política de soluciones. Crear/reautorizar bloquea la misma fuente que las ediciones. Cada lectura/respuesta revalida vigencia, permiso, matrícula, resultado vigente y huella. Suspender en transacción desde los escritores conocidos; la huella evita depender solo de haberlos encontrado todos. Ver [modelo](./data-model.md).
2. **Credencial sin login**: 32 bytes aleatorios, solo hash persistido. URL `/devolucion#<credencial>`; fragmento usado en cabecera por cliente dedicado sin JWT/interceptores ni cookies (`credentials: omit`). Sin localStorage, analítica, ubicación completa en errores, previews ni caché/PWA. Token transferible: no verifica parentesco. Revisar CSRF con sesión de profesor abierta sin introducir bypass global.
3. **Cupo durable**: PostgreSQL, fila única estudiante/evaluación y bloqueo corto de admisión; contar timestamps en `(ahora-600s, ahora]`. Más demostrable ante reinicios que el limitador IP/ventana fija con fallback local. Sin lock durante IA. Broker no es la fuente de cuota. Fallo de persistencia impide nuevas inferencias; lectura sigue solo si puede validarse autorización.
4. **Chat recuperable**: request_id idempotente, 202 y polling; cuota, trabajo y despacho pendiente en una transacción. Worker reclama una vez, usa LLMRouter y revalida al guardar/servir. Si se pierde el resultado después de iniciar proveedor: error explicable, no reejecución automática de gasto incierto. Reintentos de despacho previos son seguros. Cola `feedback` dedicada con consumo acotado y sin competir con grading; comprobar Compose/worker antes de habilitar.
5. **Impresión docente**: proyección autorizada, preview y `window.print`, Carta/A4, marcas de corte y continuación identificada. Reutilizar patrón de portal/limpieza de `RosterCredentials`, no usuarios/claves. Aislar de overrides agresivos de `print.css`. No insertar lista de enlaces utilizables por cualquiera ni añadir generadores PDF/Word innecesarios.
6. **Entrega explícita**: lotes de hasta 100 IDs explícitos, todos mediante lotes; fallos por elemento. Credencial solo al crear/renovar. Si se pierde la respuesta: mostrar acceso creado sin token y ofrecer renovación confirmada; no falso éxito ni duplicar por reintento.
7. **Entrega gradual**: bandera deshabilitada, migración aditiva, backend compatible primero y UI después. Apagar cierra esta superficie sin bloquear calificación/auth, conserva auditoría. Modelos solo tras comparación docente y autorización administrativa separada.

## Secuencia de entrega y verificación

### Precisión de implementación de FR-004 (2026-10-20)

Usuario autorizó una llamada adicional selectiva a OpenCode si resulta necesaria para la utilidad de la devolución. Se incorpora dentro del trabajo de coherencia T010/T011, no como sustitución de la comparación humana T014. Reglas puras en `calificaciones/feedback_usefulness.py` detectan fórmulas vacías conocidas y falta de explicación/acción por componente, sin asignar puntuaciones de calidad ni certificar semántica. El consenso no prefiere un elogio vacío solo por mayor confianza. La preview docente informa señales y la puerta nueva de compartir pide corregir texto inequívocamente genérico, sin escribir registros anteriores.

Reescritura opcional en `calificaciones/feedback_refinement.py`, desde el proceso asíncrono existente de nuevas valoraciones, con `FEEDBACK_REFINEMENT_ENABLED=false` por defecto. Solo ruta secundaria ya resuelta de OpenCode y su configuración/credencial vigente; si ese proveedor no está seleccionado no se fuerza otro. Una petición, sin reintentos automáticos, 900 tokens de salida y límite exterior de 20 s. Usa lista blanca de observaciones/explicaciones y puntajes, nunca originales, referencias ocultas, datos de cuenta ni una búsqueda nueva sobre alumnos. No hay llamada si falta evidencia utilizable o el texto no presenta señales. Es un borrador, no una evaluación humana del feedback.

Salida estricta de texto/claves: rechazar campos de notas, referencias a preguntas desconocidas, elogio global incompatible y boilerplate reconocido. No cambiar componentes ni cálculo. Conservar texto previo y trazabilidad separada; fallo/timeout mantiene original. Si hay borrador aceptado, exigir decisión docente antes de publicar; el guard de desglose posterior sigue siendo autoridad. Registrar consumo como `feedback_refinement` y tiempo total real; no prometer mejora semántica o latencia sin corpus/inferencia real. No habilitar en producción con este cambio local.

1. Tras aprobar el plan: Checklist, tareas trazables FR-001..027/SC-001..010 y Analyze.
2. Proyección/autorización y migración con regresión de datos previos; suspensión en caminos de cambio de nota/desglose.
3. Gestión docente y lectura pública mínima; probar aislamiento antes de habilitar chat.
4. Cupo, idempotencia, despacho/worker, chat restringido y pruebas de concurrencia/reloj/cierre durante inferencia.
5. UI móvil/docente y fichas, texto largo, teclado y errores parciales.
6. Harness de comparación/calidad; al menos 20 actividades con referencia independiente y medición por etapa. Si falta validación humana queda abierta; no marcarla terminada ni activar defaults basándose en una hoja.
7. CI: Backend quality and tests; Frontend quality, build and E2E; Container builds; Spec governance. PR con evidencia y autorización propia para fusión/despliegue, sin cambios manuales anticipados.

Artefactos: [research.md](./research.md), [data-model.md](./data-model.md), [contratos](./contracts/http-and-ui.md) y [validación](./quickstart.md). Sin hooks before_plan/after_plan configurados. Plan terminó en diseño; tras su aprobación se añaden [tareas](./tasks.md) y [lista de revisión](./checklists/entrega-individual.md), sin confundirlos con implementación.
