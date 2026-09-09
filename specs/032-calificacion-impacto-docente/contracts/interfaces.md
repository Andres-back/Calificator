# Contratos implementados 032

Contratos aditivos implementados bajo banderas apagadas por defecto. Prefijos relativos a /api. Las rutas existentes se conservan. JSON usa identificadores internos solo en superficies académicas autorizadas.

## Jobs y calificación

| Interfaz | Cambio | Garantía |
|---|---|---|
| POST /jobs/{job_id}/reintentar (existente) | Unificar estados reintentables con trabajador | Misma identidad lógica; nuevo intento con claim; nunca repetir éxito ni sobrescribir decisión docente |
| GET /jobs/{job_id}/items (existente) | Nombre visible autorizado, etapa y tiempos opcionales por elemento | Paginación actual; lote de 30 no se descarga como 30 evidencias |
| GET /jobs/pendientes (nueva) | Lista paginada propia con activos y pendientes de atención | Registrar antes de ruta UUID; recuperación entre dispositivos, no depende de localStorage |
| GET/PUT /calificaciones/{id}/desglose (existentes) | Orientación de mejora y referencias de evidencia opcionales | Preservar version_esperada, motivos, fórmula e historial |
| GET /calificaciones/{id}/desglose/historial (existente) | Identificar sugerencia inicial y revisiones | No convertir última sugerencia en primera ni exponer historial privado al estudiante |
| GET /calificaciones/entregas/{entrega_id}/evidencia/paginas/{numero} (nueva) | Imagen de una página autorizada | Numeración desde 1; máximo real del archivo hasta 20; render acotado y caché por huella |
| GET /calificaciones/entregas/{entrega_id}/evidencia (existente) | Sin sustituir documento original | PDF completo y descarga siguen disponibles |

JobRead proyecta lista permitida: estado, progreso, error seguro, tiempos de cola/capacidad/extracción/valoración/verificación y resumen. No devolver checkpoint_v1, prompts, transcripción, claves, rutas internas ni fuentes privadas en resultado_json. Los detalles de nota se obtienen por su endpoint autorizado.

Los tiempos ausentes son null, no cero. Duraciones de etapas paralelas no se suman como duración total. Se conserva configuración efectiva por intento sin credenciales. El modelo configurado no se cambia silenciosamente.

El reintento en curso devuelve su identidad y estado, no otro trabajo. Una decisión docente o versión incompatible impide reutilización de valoración; extracción compatible sí puede reutilizarse. Una petición no autorizada nunca revela estado de otro docente.

## Mesa de revisión

- Leer requiere grading.read y ámbito académico. Ajustar requiere grading.grade; publicar grading.publish. Las comprobaciones son del servidor, además de la interfaz.
- Guardar y siguiente invoca el PUT versionado existente; solo avanza tras respuesta exitosa. Un 409 conserva borrador y ofrece recargar/comparar; un fallo de red permite reintentar sin perder edición.
- Guardar, confirmar y publicar son acciones distinguibles. Un ajuste no publica por efecto de navegación.
- Pestañas móviles Evidencia/Revisión conservan pregunta y borrador; selector de hoja incluye indicador y descarga original. Estado ilegible o incompleto no se representa como respuesta incorrecta por defecto.
- El estudiante usa su contrato publicado existente /evaluaciones/{id}/mi-desglose; no recibe sugerencias privadas ni fuentes restringidas. Su propia evidencia mantiene la política vigente.
- La fuente usada guarda identidad/versión y extracto autorizado. La interfaz explica pertinencia o ausencia, no promete trazabilidad si no existe.

## Sesiones de trabajo (nuevas)

- POST /analytics/sesiones-trabajo: condicion, fase, ámbito evaluacion_id/calificacion_id/batch_job_id opcional, event_id y aceptación explícita de medición.
- GET /analytics/sesiones-trabajo: propias, paginadas por fecha/estado; resumen separa confirmado, incompleto y ajustado.
- POST /analytics/sesiones-trabajo/{id}/eventos: event_id, expected_version, owner_token, acción iniciar_intervalo/heartbeat/pausar/reanudar/cambiar_fase/finalizar/ajustar/traspasar, elapsed_ms y motivo cuando corresponda.
- Respuesta: id, version, estado, fase, duracion_confirmada_ms, incertidumbre_ms y resultado de operación. Token de propietario se entrega solo al iniciar/traspasar; nunca en listados.
- Identidad deriva de sesión autenticada; escrituras requieren grading.grade y propiedad. Consulta propia requiere grading.read o reports.read según superficie; ninguno concede acceso a sesiones ajenas.
- Mismo event_id y payload devuelve resultado original; mismo ID distinto payload da 409. Validar replay antes de expected_version. Bloqueo transaccional por actor/sesión evita doble intervalo entre pestañas.
- Cronómetro es opt-in personal, no consentimiento para investigación. Leer papel sin clics no pausa. Traspasar invalida propietario previo. Desconexión no fabrica duración; conserva intervalos confirmados y señala incertidumbre.
- Tiempo humano y espera IA son series diferentes. Preparación compartida se cuenta una vez; cualquier reparto por estudiante se rotula derivado.

## Compatibilidad analítica

POST /analytics/evento conserva clientes existentes y permite calificacion_id en confirmación. Eventos antiguos sin asociación permanecen válidos como telemetría, no se convierten en sesiones observadas.

Los campos históricos estimados no cambian silenciosamente de significado: añadir un bloque tiempos_observados con metodo, cobertura, datos_suficientes, motivo_no_disponible y ahorro_porcentaje nullable. Etiquetar/deprecar estimaciones antiguas y actualizar consumidores juntos. Sin pareja comparable no hay ahorro observado; un resultado negativo se muestra sin recortar.

Corregir el ámbito del endpoint existente /analytics/ai-quality/usage y alinear analytics/impacto con permisos modulares. No usarlo como exportación institucional implícita.

## Estudios e instrumentos (nuevos salvo encuestas)

- GET /impacto/estudios/disponibilidad: solo administrador con reports.read; revela únicamente la bandera efectiva, no conjuntos ni datos.
- POST /impacto/estudios: crear borrador sintético, nunca activar recopilación real.
- GET /impacto/estudios y GET /impacto/estudios/{id}: solo conjuntos autorizados, sin mapa de identidades en listado.
- POST /impacto/estudios/{id}/activar y /cerrar: expected_version, autorización y protocolo completo. Sin requisitos devuelve 422 con faltantes.
- POST /impacto/estudios/{id}/observaciones: lote JSON tipado, máximo 1.000 filas/5 MiB; instrument_version, import_id, digest y filas. Validación completa antes de transacción. Un error rechaza todo con índices/motivos seguros; ninguna fila parcial.
- GET /impacto/estudios/{id}/observaciones: paginación autorizada; un administrador requiere concesión read y un docente participante queda filtrado obligatoriamente a su seudónimo. No concede acceso a evidencia académica por inferencia.
- GET /impacto/estudios/{id}/export: manifiesto/versiones y observaciones minimizadas con exclusiones y faltantes; sin emails, nombres, evidencia o mapa interno.
- POST /impacto/encuestas (existente): mantiene ruta, exige contexto/instrumento autorizado y persistencia real antes de confirmar. Payload histórico sin contexto devuelve validación explícita, no éxito ficticio; adaptar consumidor si existe.

Creación de borrador exige ADMIN y admin_settings.manage. Leer/gestionar/exportar datos exige ADMIN, reports.read y concesión explícita por conjunto y acción (read/manage/export), vigente y revocable; ser administrador principal no evita esta última comprobación. Creador obtiene concesiones solo para su borrador sintético; la activación real registra autorización y concesiones específicas. El docente incluido solo aporta sus observaciones autorizadas y consulta sus datos: no puede listar/exportar el conjunto. Instrumentos y asignaciones son versiones inmutables auditadas.

Importación: mismo import_id/digest devuelve resultado original; distinto contenido requiere nueva revisión explícita. Validar todas las referencias, no permitir asignar observaciones a participantes ajenos. Procedencia y cambios se guardan en la misma transacción, no dependen solo del logger de auditoría best-effort.

Kappa usa categorías fijadas en protocolo, no máximo observado de muestra. Muestra insuficiente o denominador degenerado da no_disponible con motivo, nunca -1/1 como éxito. Diferenciar comparación docente expuesto a IA de referencia independiente. Exportar datos para análisis estadístico externo; no construir un motor estadístico nuevo.

## Errores y compatibilidad

401 sin autenticación; 403 permiso insuficiente; 404 objeto fuera del ámbito o inexistente; 409 versión/propietario/idempotencia incompatibles; 422 validación; 413 tamaño excesivo. Respuesta segura con código estable y acción sugerida; ningún error asigna nota cero.

Campos nuevos opcionales al leer históricos. Las rutas y esquemas nuevos tienen pruebas de contrato y están vinculados a sus especificaciones propietarias. Su existencia técnica no activa captura real ni acredita resultados del piloto.
