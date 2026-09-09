# Decisiones de diseño 032

**Fecha**: 2026-09-09. Investigación local, sin llamadas pagadas ni pruebas productivas. Los hallazgos no equivalen a benchmarks.

## Recuperación

**Decisión**: unificar estados pendientes en jobs/router.py y tasks_grading.py, con transición transaccional, claim_token y revisión docente bajo bloqueo. Checkpoints de etapas y páginas persisten antes de avanzar.
**Motivo**: el endpoint marca retrying pero _grade_delivery reconoce queued/running; necesita prueba de reproducción con nota existente.
**Alternativas**: borrar la nota para forzar reintento (rechazada); reiniciar lote completo (rechazada). Reintento humano conserva mismo job lógico, nuevo attempt; éxito publicado nunca es candidato.

## Fidelidad y extensión

**Decisión**: extractor recibe preguntas/identificadores sin soluciones, rúbricas resueltas ni referencias dentro de objetos anidados. Evidencia original y transcripción inmutables por intento. Normalizar continuaciones y asociar páginas antes de evaluar.
**Motivo**: vision_extractor._prompt incluye respuestas esperadas; agents.py recorta student_response a 5.000 caracteres en principal/verificador/fallback.
**Alternativas**: aumentar a otro corte fijo (rechazada); resumir libremente (rechazada). Preferir entrada completa dentro del presupuesto real; partición determinista por pregunta si no cabe, siempre con continuidad. Cada partición conserva principal, verificación y arbitraje según política actual; consolidación local una vez. Si una pregunta no cabe, revisión explícita sin omisión.

## Checkpoints y contexto

**Decisión**: extracción por página versionada en datos internos del job; huella de archivo+orden+preprocesado+preguntas sin clave+modelo/configuración de extracción. Valoración depende además de transcripción, blueprint puntuable, fuentes/versiones, prompts y modelos efectivos.
**Motivo**: separar dependencias permite reutilizar lectura si cambia solo rúbrica, pero nunca valoración con criterios anteriores.
**Alternativas**: caché global entre docentes (rechazada). No guardar secretos; autorización académica obligatoria para acceder a checkpoint. Campos privados excluidos por lista permitida en respuestas de jobs.

## RAG y respuestas abiertas

**Decisión**: recuperar después de extracción, por pregunta y criterios, con materia autorizada; guardar source_id, chunk_id, título, huella/versión y fragmento usado en registro académico protegido. Declarar ausencia. No usar la respuesta esperada para corregir transcripción.
**Motivo**: context_builder hoy consulta antes de visión con nombre y primeros 300 caracteres; esto limita pertinencia por respuesta.
**Alternativas**: enviar toda la biblioteca (rechazada). La corrección de contenido del documento fuente no cambia retrospectivamente una nota; fuente retirada deja referencia histórica restringida.
**Calidad**: casos sintéticos con referencia docente; puntajes por componentes, paráfrasis válida, crédito parcial y feedback útil. No hay validación pedagógica solo por JSON correcto.

## Revisión y visor

**Decisión**: reutilizar CalificacionesWorkspace, GradeBreakdown y GradeComponentEditor; lista lateral, evidencia y editor sincronizados, pie de acciones. En móvil alternar evidencia/revisión sin desmontar borrador. Historias/detalles técnicos colapsados.
**Motivo**: la distribución actual separa imagen/guía/desglose y el iframe PDF depende del navegador.
**Alternativas**: otro workspace (rechazada); ancla #page como única solución móvil (rechazada). Renderizar una página solicitada en servidor con dependencia PDF ya existente, bajo autorización y caché de huella; no convertir todo el documento de nuevo en cada clic. Conservar descarga original.

## Medición

**Decisión**: sesiones opt-in con reloj monótono de cliente, confirmaciones periódicas y cambios de estado persistidos; lectura fuera de pantalla no equivale a pausa. Intervalos sin cierre/continuidad comprobable quedan dudosos. Un solo propietario de sesión activa por docente; traspaso explícito entre pestañas/dispositivos.
**Motivo**: analytics evento confirmed carece de calificacion_id; _calculate_review_time lo requiere, suma reaperturas y filtra <10 s/>1 h. impacto_tesis usa constantes y encuestas no persisten.
**Alternativas**: inferir ahorro desde clicks (rechazada); usar tiempo del modelo como trabajo humano (rechazada). Mantener eventos históricos, sin imputar tiempos. Presentar agregados completos/dudosos separados.

## Estudio y autorización

**Decisión**: reports.read para propio ámbito; creación de borrador sintético por ADMIN con admin_settings.manage. Datos de estudio exigen ADMIN, reports.read y concesión por conjunto/acción read/manage/export vigente; ni el administrador principal evita esa comprobación. Docentes incluidos aportan/consultan exclusivamente sus observaciones autorizadas. Sin rol nuevo. La activación real exige autorización y concesiones explícitas, separadas de medición personal opt-in.
**Motivo**: las rutas analytics/impacto deben alinearse con permisos modulares y propiedad, no solo rol.
**Alternativas**: dashboard investigador con acceso institucional implícito (rechazada). Instrumentos externos con incorporación validada evitan construir encuestas completas.
**Pendientes no técnicos**: institución, unidad de 200, muestra, criterios Kappa, consentimiento/retención e instrumento final; bloquean activar el piloto real, no desarrollar y validar con sintéticos.

## Contraste adicional de métricas existentes

**Decisión**: preservar telemetría/estimaciones históricas con etiqueta explícita y añadir resultados observados nullable. Congelar categorías del protocolo y distinguir referencia independiente de confirmación expuesta a IA. Los datos/procedencia esenciales se persisten transaccionalmente.
**Motivo**: analytics/service.py usa constantes y recorta ahorros negativos; event_policy.py y emparejamiento temporal no describen sesiones fiables. analytics/router.py en ai-quality/usage no aplica el filtro docente anunciado. impacto_tesis/router.py confirma encuestas sin persistir; kappa_service.py deriva categorías del máximo observado y devuelve valores numéricos para casos insuficientes/degenerados. Audit_service es best-effort, no sustituto de integridad de observaciones.
**Alternativas**: reinterpretar todos los eventos viejos como mediciones reales (rechazada); considerar confirmar la IA como evaluación independiente (rechazada); otorgar acceso a estudio por reports.read sin ámbito (rechazada). Incorporar pruebas de regresión específicas antes de cambiar consumidores.
