# Modelo de datos propuesto 032

Diseño aditivo; no migraciones ejecutadas. No modifica notas publicadas ni crea datos de estudio desde históricos automáticamente.

## Datos existentes

- Entrega y Calificacion conservan identidad, autoría, evidencia, estado y una nota vigente. CalificacionDesglose/Componente conservan versión, motivos y fórmula.
- ai_jobs mantiene attempt_count, claim_token y lease. Resultado interno añade checkpoint_v1 con páginas/etapas terminadas y sus huellas. JobRead permite solo progreso, errores seguros, tiempos y resumen; no transcripción/checkpoint.
- evidencia académica añade referencias contextuales y primera valoración del intento; la primera sugerencia del trabajo no se reemplaza con reintentos posteriores. Historial identifica todas las versiones.
- Componente conserva explicación actual y añade orientación_mejora opcional; campos históricos quedan ausentes, no inventados. Evidencia_paginas sigue siendo lista de páginas, coordenadas son opcionales y validadas.

## analytics_work_sessions

UUID; actor_id; condicion manual/asistida; fase preparacion/revision/correccion/finalizacion; evaluacion_id; calificacion_id o batch_job_id opcionales; study_id opcional; version; estado active/paused/completed/incomplete; owner_token_hash; timestamps UTC; intervals_json versionado; duracion_confirmada_ms; incertidumbre_ms; origen observado/importado/ajustado; motivo_ajuste; configuración/criterios de contexto.

- Actor se deriva del servidor. Referencias deben pertenecer a su ámbito; una sesión manual puede no tener calificación IA.
- Unicidad parcial: máximo una sesión active por actor. Iniciar otra devuelve conflicto y opción de pausar/traspasar, no suma simultánea.
- Cada operación lleva event_id único y expected_version; un registro versionado de comandos en intervals_json conserva ID, huella de payload y respuesta de cada operación en la misma transacción. Comprobar replay antes de versión; mismo ID y contenido distinto da conflicto. Bloqueo de fila/actor e índice parcial evitan doble sesión. Intervalos no negativos ni solapados, orden secuencial.
- Cliente mide elapsed monotónico; servidor conserva recibo y plausibilidad temporal. Heartbeat cada 15 s; hueco >45 s marca el intervalo dudoso, no borrado ni contado automáticamente. No se pausa por blur ni inactividad de teclado.
- Pausa explícita conserva lectura física; reanudar crea intervalo nuevo. Cierre abrupto conserva prefijo confirmado y resto incompleto. Correcciones manuales añaden revisión con motivo, no reescriben hechos.
- El registro de comandos no se compacta eliminando IDs ni ajustes. Se acota a 10.000 comandos por sesión; antes del límite se cierra y enlaza sucesora de forma transaccional, sin hueco ni doble tiempo. Transición terminal no se reabre: nueva sesión enlazada. Persistir vínculo, historial de ajustes y respuesta idempotente, no solo el último motivo.
- Preparación de lote se registra una vez; informe total no multiplica por estudiantes. Distribución uniforme, si se solicita, se rotula estimación derivada.
- Índices actor/fecha, evaluation, study; restricciones y concurrencia probadas con PostgreSQL.

## impacto_studies

UUID; owner_admin_id; nombre; estado draft/active/closed; synthetic_only por defecto true; version; protocol_json; participants_json (IDs de docentes y seudónimos aleatorios por conjunto); access_grants_json versionado (admin, acciones, autorización, otorgante, vigencia y revocación); import_batches_json (ID, digest, instrumento, actor, resultado y revisión); authorization_reference; retention_policy; created_at/closed_at.

- Solo admin con concesión explícita por conjunto/acción gestiona; participantes explícitos no otorgan acceso a notas ajenas. Crear borrador sintético no autoriza datos reales. Concesiones se comprueban aun para administrador principal; revocaciones conservan historial. Mapas de identidades quedan fuera de exportaciones.
- protocol_json define unidad, materias/grados, condiciones, orden, escala/categorías Kappa, instrumentos/versiones y criterios de inclusión/exclusión.
- Activación real exige todos esos campos, autorización referenciada y política de retención, además de decisión humana. No guarda documentos de identidad ni consentimientos en logs.
- No cambiar protocolo activo sobre datos: cerrar versión y crear nueva, enlazada a su antecesora. Instrumentos y sus esquemas quedan congelados por versión en protocol_json. Seudónimos no derivan del email ni se reutilizan entre conjuntos.
- Importación y su resultado se registran atómicamente con observaciones, bajo bloqueo/versionado del conjunto; mismo import_id/digest devuelve resultado anterior, digest distinto es conflicto. Se limita cada lote a 1.000 filas/5 MiB. Metadatos de importación no incluyen archivos crudos. La representación JSON se justifica para este piloto acotado; no añadir cachés paralelas como fuente de verdad.

## impacto_observations

UUID; study_id; import_batch_id; external_id; revision; supersedes_id opcional; teacher_pseudonym; work_key; response_key opcional; evaluation/grade referencias internas opcionales; condition; observed_at; payload_json validado por tipo timing/grade_comparison/feedback_quality/survey; missing_reason; exclusion_reason; created_by; created_at.

- Único (study_id, external_id, revision); mismo ID/contenido es idempotente, contenido distinto requiere revisión explícita.
- Comparación: suggested_initial, confirmed, independent_reference, scale_max, categories_version, reviewer_saw_ai. Sin referencia independiente no calcular supuesto acuerdo ciego.
- Tiempo: duración y unidad explícitas; sin pareja manual/asistida no calcular ahorro. Fórmula 100*(manual-asistido)/manual; denominador cero → no disponible; negativos se preservan.
- Calidad: instrumento versionado con corrección, especificidad, claridad, utilidad y adecuación; puntuaciones en límites definidos, autor y declaración de cegamiento.
- Encuesta: instrumento, respuestas validadas y recuperación posterior; no aceptar diccionario libre.
- payload no permite nombres, emails, claves, fotos o texto libre no requerido. Importación por lista permitida y tamaño limitado. Exportación sin identificadores internos que permitan correlación innecesaria.
- Observaciones nunca escriben en Calificacion ni en su historial oficial.

## Migración y ciclo de datos

Tres tablas justificadas por recuperación, autorización y auditoría; ampliar modelos en módulos existentes. Migración aditiva sin backfill de mediciones. Referencias con borrado protegido; sesiones y observaciones no desaparecen por cascada accidental. Retención real aprobada antes de piloto: purga de datos de estudio separada de retención académica, con auditoría de operación sin contenido. Rollback funcional apaga flags, conserva datos; downgrade destructivo fuera del despliegue normal.
