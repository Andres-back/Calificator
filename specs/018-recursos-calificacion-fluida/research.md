# Investigación: Recursos y calificación fluida

## 1. Estado actual del ciclo de recursos

**Decisión**: Reutilizar materiales_generados.materia_id, asignacion_tipo, publicado_estudiantes y fecha_publicacion, junto con la relación única evaluaciones.material_origen_id.

**Rationale**: Las migraciones 202608010001 y 202608090001 ya garantizan una evaluación máxima por material y guardan apoyo/actividad/visibilidad. El backend ya ofrece asignar apoyo, retirar apoyo y convertir a evaluación. Falta hacer visible la decisión tras generar, listar ambos tipos en la materia y sincronizar sus estados.

**Alternativas consideradas**:
- Crear una tabla nueva de asignaciones: duplica el estado actual y exige migración sin valor.
- Copiar el recurso a la materia: rompe identidad, edición e historial.
- Mostrar solo evaluaciones en otra pestaña: mantiene la pérdida de contexto que reportó el usuario.

## 2. Semántica de visibilidad y entregas

**Decisión**: Mantener controles independientes. publicado_estudiantes gobierna si el recurso o actividad vinculada es accesible; recepcion_habilitada y el estado de Evaluación gobiernan nuevas entregas. Publicar una evaluación vinculada sincroniza visibilidad, pero pausar/cerrar recepción no oculta contenido.

**Rationale**: El profesor puede querer dejar instrucciones visibles después de cerrar entregas o preparar una actividad sin mostrarla. La distinción también permite ocultar temporalmente sin borrar evidencias.

**Alternativas consideradas**:
- Usar cerrar como ocultar: impide revisión posterior y mezcla dos intenciones.
- Usar solo estado de Evaluación: no cubre apoyos ni ocultamiento temporal.
- Mantener dos estados sin sincronización: genera contradicciones entre Recursos y Materia.

## 3. Diagnóstico productivo de latencia

**Decisión**: Tratar la demora como problema de proveedor/cascada y no de cola.

**Rationale**: Consulta agregada y de solo lectura del 22 de agosto de 2026:
- espera en cola reciente: 0–3 s;
- calificación activa: 95–578 s;
- digitalización activa: 91–249 s;
- Qwen 3.7 Plus exitoso promedió aproximadamente 69 s;
- MiMo 2.5 exitoso promedió aproximadamente 17 s;
- Qwen 3.6 Plus acumuló fallos de hasta 408 s antes del fallback;
- el flujo de foto ejecuta extracción visual y luego dos evaluadores visuales;
- digitalización ejecuta OCR, estructuración y una reparación adicional si la clave queda incompleta.

La telemetría actual registra la misma llamada multimodal como text y vision en algunos caminos, por lo que también debe normalizarse.

**Alternativas consideradas**:
- Agregar workers: la cola casi nula demuestra que no resuelve este caso.
- Subir todos los timeouts: empeora la experiencia y retiene recursos.
- Usar siempre el modelo más rápido: no garantiza la calidad de las preguntas abiertas.

## 4. Arquitectura rápida de calificación

**Decisión**: Ejecutar una sola extracción visual normalizada; validar objetivos de forma determinística; ejecutar dos evaluadores textuales independientes en paralelo; permitir una reverificación visual dirigida solo para componentes ambiguos.

**Rationale**: Después de extraer respuestas y páginas, la valoración ya no necesita reenviar toda la imagen dos veces. DeepSeek u otro modelo textual configurable puede valorar la estructura mientras Qwen/MiMo permanece en la etapa que realmente requiere visión. Se conservan dos valoraciones comparables y la decisión docente.

**Alternativas consideradas**:
- Tres llamadas visuales completas: es la causa principal del tiempo actual.
- Un solo evaluador: reduce respaldo y viola la intención de transparencia.
- Calcular toda nota localmente: solo cubre preguntas objetivas, no abiertas o rúbricas.

### Refinamiento aprobado el 22 de agosto de 2026

**Decisión**: Mantener `qwen3.7-plus` como extractor visual principal. Tras la extracción, usar un evaluador `deepseek-v4-flash` para el desglose explicable y un verificador Flash con respuesta compacta. `deepseek-v4-pro` deja de ser un segundo evaluador obligatorio y se convierte en árbitro excepcional.

**Rationale**: La ejecución obligatoria del modelo Pro retiene todos los trabajos aunque el primer desglose sea consistente. Verificar componentes y suma requiere menos salida que volver a construir toda la retroalimentación. El arbitraje Pro conserva profundidad cuando aporta valor real sin imponer su latencia al camino normal.

## 5. Presupuestos y fallback

**Decisión corregida**: Proteger conexión, escritura y pool, pero mantener lectura sin deadline cuando OpenCode aceptó la inferencia. Los segundos configurados son umbrales de observación, no canceladores. Solo 5xx, desconexión, respuesta inválida o cancelación humana permiten fallback/reintento.

**Rationale**: Cerrar el socket por tiempo no detiene necesariamente el cómputo remoto y hace irrecuperable su respuesta. El job asíncrono puede esperar sin bloquear la navegación; idempotencia y `acks_late` protegen reinicios.

**Alternativas consideradas**:
- Tres reintentos por modelo: produjo ejecuciones de más de 400 s.
- Cancelar todo si falla el secundario: desperdicia el principal y obliga a repetir visión.
- Aceptar el principal como definitivo: puede publicar una valoración sin contraste.

## 6. Digitalización

**Decisión**: MiMo/Qwen configurable para OCR visual; modelo textual rápido para estructurar; solucionadores locales para respuestas objetivas; reparación únicamente de números faltantes y sin reenviar la imagen completa.

**Rationale**: Estructurar un texto ya extraído no requiere visión. El código local ya puede resolver operaciones y algunas selecciones. Un segundo prompt completo para toda la clave es innecesario cuando faltan pocos elementos.

**Alternativas consideradas**:
- Qwen 3.6 con timeout de 180 s para cada paso: concentra los retrasos observados.
- Generar una clave local genérica: puede producir respuestas pendientes no evaluables.
- Pedir al profesor cada respuesta: contradice el objetivo de digitalización asistida.

## 7. Telemetría segura

**Decisión**: Un ai_usage_event por intento externo con pipeline_run_id, stage canónico, attempt_number, latencia y error_code. ai_jobs.resultado_json incluye timings_ms, strategy, fallbacks y terminal_reason. Nunca guarda contenido.

**Rationale**: Permite saber si el problema es cola, imagen, modelo o persistencia sin consultar evidencia estudiantil. Elimina el doble registro text/vision de una llamada multimodal.

**Alternativas consideradas**:
- Solo duración total: no localiza el cuello.
- Guardar prompts/respuestas para depurar: viola minimización y privacidad.
- Añadir una tabla nueva: innecesario con ledger y JSON existentes.

## 8. Edición contextual y scroll móvil

**Decisión**: GradeBreakdown recibe el componente activo y renderiza GradeComponentEditor dentro de su tarjeta. CalificacionesWorkspace conserva un único estado sucio, previsualización de fórmula y confirmación al cambiar. En móvil hay un solo scroller de detalle con 100dvh, overscroll controlado, safe-area y cleanup centralizado del body lock.

**Rationale**: El problema actual nace porque el editor se monta después de todo el desglose y porque varios contenedores usan overflow-hidden/overflow-y-auto dentro de un panel fixed. Mover el editor y definir un único propietario elimina scroll atrapado.

**Alternativas consideradas**:
- Modal por pregunta: tapa evidencia y teclado móvil.
- Barra de edición fija separada: vuelve a perder contexto.
- Permitir múltiples editores: complica versiones y cambios sin guardar.

## 9. Estrategia de validación

**Decisión**: Fixtures sanitizados de una foto, multihoja y respuesta online; dobles de proveedor con demoras/errores; prueba de equivalencia de componentes y nota; Playwright WebKit/Chromium en cinco tamaños, claro/oscuro y teclado simulado.

**Rationale**: La optimización solo se acepta si mantiene la decisión por componente y diferencia de nota máxima de 0,1, o marca revisión. Las pruebas temporales deben usar relojes controlados y no depender de la API externa en CI.

**Alternativas consideradas**:
- Medir solo manualmente en producción: no es reproducible.
- Llamar proveedores reales en cada CI: costoso e inestable.
- Probar solo captura visual: no detecta gestos atrapados ni body lock.
