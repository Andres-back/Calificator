# Investigación y decisiones — Spec 107

2026-10-20. Inspección local de `08964c9`, sin producción ni inferencias nuevas. Investigación auxiliar delegada por el flujo Plan, solo lectura. No quedan incógnitas técnicas que requieran cambiar el alcance antes de aprobar el plan.

## 1. Resultado autorizado, no última respuesta de IA

**Decisión**: publicación/snapshot con proyección segura; confirmar decisión docente, nota confirmada y ausencia de bloqueos materiales pendientes. Admitir históricos manuales sin entrega/desglose con solo su explicación existente.
**Razón/evidencia**: `calificaciones/models.py` permite `entrega_id=None`; `xali/service.py::_get_confirmed_context_for_student` exige JOIN a Entrega y selecciona última nota. `breakdown_models.py` ya conserva versiones/ajustes y `breakdown_service.py` ofrece `serialize_breakdown(student=True, reveal_key=...)`, `answers_released` y `student_breakdown_is_publishable`.
**Alternativas**: enlazar última nota mezcla versiones; recalificar históricos viola preservación; exportar `resultado_json` entero expone datos innecesarios. Reutilizar identidad/cálculo de desglose, no duplicarlo.

## 2. Contexto de Xali

**Decisión**: reutilizar política postentrega y LLMRouter, extraer constructor seguro testeable basado en proyección autorizada; conversación pública separada del historial autenticado.
**Razón/evidencia**: `chat_about_delivered_evaluation` usa `xali_evaluacion_post_entrega`; `_format_student_evidence` puede incluir `respuesta_esperada`. La política de salida permite explicaciones específicas y no es autorización: respetar `answers_released` al construir contexto. No pasar original, solucionarios ocultos ni JSON crudo al modelo. Tratar preguntas/feedback como datos no confiables, no instrucciones.
**Alternativas**: duplicar proveedor/prompt deriva; suplantar alumno/profesor amplía permisos. El resolver autenticado no garantiza revisión compartida ni vigencia temporal.

## 3. Cinco preguntas/600 segundos

**Decisión**: admisión atómica PostgreSQL por estudiante/evaluación, timestamps/request_id persistentes y ventana móvil; controles globales/IP adicionales independientes.
**Razón/evidencia**: `core/rate_limit.py` usa IP, Redis INCR/EXPIRE y fallback por proceso; no cumple ventana móvil multidispositivo. `RATE_LIMIT_CHAT_SECONDS=10` no acredita cinco/600 en este flujo todavía inexistente.
**Alternativas**: solo UI evadible; fallback local no garantiza multirréplica; quota por token se reinicia renovándolo. Reutilizar DB evita infraestructura nueva y pérdida de límite al reiniciar.

## 4. Credencial y navegador

**Decisión**: bearer aleatorio en fragmento, hash persistido, cliente dedicado en memoria; no-store/noindex/no-referrer, sin token en reportes de error/analítica. Revisar RouterErrorBoundary, RootMetadataLayout, proxy y service worker si existe.
**Razón/evidencia**: router público/protegido comparte metadatos y CSRF se aplica si hay cookies de auth (`core/csrf.py`). Usar fetch sin cookies y probar con cuenta abierta. Fragmento evita logs HTTP pero no fugas por scripts/copia: requiere exclusión y pruebas explícitas.
**Alternativas**: login/PIN añade barrera no aprobada; ID de estudiante público es adivinable; cookies confunden roles. No prometer identidad del acudiente ni borrar capturas externas.

## 5. Asincronía y fallos

**Decisión**: solicitud durable/despacho pendiente, 202/polling, worker con reclamación única y capacidad aislada de grading; payload broker solo UUID. Resultado externo incierto tras iniciar proveedor termina error, sin reenvío automático.
**Razón/evidencia**: `workers/worker.py` tiene Celery/Redis y acks_late, que puede redespachar. `modules/jobs/service.py` ofrece patrones de creación, despacho y claim/lease, pero no cualquier tipo nuevo está soportado automáticamente. La llamada externa no puede garantizarse exactamente una vez tras pérdida de respuesta sin idempotencia del proveedor; evitar duplicar gasto silencioso.
**Alternativas**: POST síncrono bloquea y facilita reintentos ambiguos; tarea solo en broker pierde consistencia de cuota. No copiar política de reintento indiscriminada de otros procesos.

## 6. Impresión y trabajo previo

**Decisión**: capacidad mínima de hoja docente en este módulo; coordinar #206 al validarla sin editar/copiar propuesta 098 no fusionada.
**Razón/evidencia**: #206 sigue abierto al consultarlo. Este checkout no tiene hoja de retroalimentación recortable terminada. `RosterCredentials.tsx` ofrece portal privado/afterprint; `index.css` y `print.css` requieren aislamiento para no reducir texto ni truncar fichas largas.
**Alternativas**: reutilizar carga de claves expone datos innecesarios; Word/PDF nuevos amplían alcance. `break-inside: avoid` no soluciona por sí solo una ficha mayor que una página: necesita continuación identificada.

## 7. Modelos y evidencia pendiente

**Decisión**: mantener defaults, comparar por etapa y referencia docente, consistencia determinista y cinco dimensiones de `impacto_tesis/schemas.py::FeedbackQualityPayload`. No autoevaluación LLM como prueba de calidad ni umbral ficticio de publicación.
**Razón/evidencia**: mediciones previas de una actividad sugieren DeepSeek rápido y Luna candidato revisor, no superioridad general. Corpus de 20 actividades con referencia independiente sigue pendiente; comparar error por pregunta, suma, feedback y tiempo humano.
**Alternativas**: cambiar defaults ahora arriesga demo; acuerdo de dos modelos no sustituye corrección docente. No contratar/activar otro modelo desde este plan.

## Dependencias resueltas y puertas posteriores

APIs aditivas sin cambiar firmas actuales. PostgreSQL, Alembic, Celery/Redis, impresión de navegador y herramientas de prueba ya existen. Registrar modelos en `db/base.py` y respetar `db/schema_ownership.py`; elegir revisión Alembic tras comprobar heads reales, sin número prefijado que colisione con Spec 101. Selección final de modelo y aceptación docente/física son validaciones posteriores, no resultados que se puedan inventar en investigación.
