# Especificación: Calificaciones, visión, PQRS y boletín

**Rama**: codex/008-calificaciones | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #9

## Escenarios de usuario y pruebas

### Evolución 133: recalificación con lectura administrada

[133-lectura-recalificacion-configurable](../133-lectura-recalificacion-configurable/spec.md), hotfix #279: la extracción de evidencias usa únicamente el principal y respaldo capturados desde Administración, con límites por hoja. Una lectura incompleta no se convierte en nota. Si no hay resultado nuevo, el docente autorizado puede consultar la última nota histórica como referencia privada; no se restaura, confirma, publica ni exporta como nota vigente.

### Evolución 102: captura explícita

[102-camara-visor-completo](../102-camara-visor-completo/spec.md), issue #212, añade cámara visible con confirmación y recuperación por archivos. Capturar no califica; se conservan identidad de entrega, límites, calidad, orden, envío explícito, evidencias y permisos del docente/estudiante.

### Historia 1 - Flujo principal (Prioridad: P1)
Como profesor o estudiante, necesito calificar, revisar, publicar, consultar y reclamar notas trazables para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en estado visible, conserva datos esperados y no concede permisos ajenos.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor no autorizado, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contradicciones.

### Casos límite
- Una entrega faltante admite nota cero manual sin evidencia y una apelación no altera nota por sí sola
- Una dependencia lenta deja estado recuperable y no duplica operaciones.
- Sesión vencida o rol incorrecto se rechazan consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible solo para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: Se DEBEN conservar estas entidades: Calificacion, CalificacionEstado, CalificacionIncidencia, SalonSesion, Historial.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **Calificacion**: identidad, estado y relaciones definidos por el dominio.
- **CalificacionEstado**: identidad, estado y relaciones definidos por el dominio.
- **CalificacionIncidencia**: identidad, estado y relaciones definidos por el dominio.
- **SalonSesion**: identidad, estado y relaciones definidos por el dominio.
- **Historial**: identidad, estado y relaciones definidos por el dominio.

## Criterios de éxito
- **SC-001**: El 100 % de módulos, rutas y tablas declarados aparece en el índice.
- **SC-002**: Recorridos P1 se verifican sin acceso cruzado.
- **SC-003**: Cada requisito tiene tarea o evidencia.
- **SC-004**: No quedan marcadores pendientes, contradicciones críticas ni secretos.

## Supuestos
- Registra comportamiento vigente; no introduce cambios funcionales.
- Inconsistencias se convierten en issues separados.
- Se conservan arquitectura y contratos públicos.
## Inventario técnico

- [Ver superficies, permisos y cobertura de este dominio](./inventory.md).

## Extensión vigente: calificación explicable

La especificación [016-calificacion-explicable](../016-calificacion-explicable/spec.md) amplía este dominio con componentes versionados por pregunta o rúbrica, fórmula reproducible, ajustes docentes auditables, redacción de claves por rol y PQRS vinculadas a una versión. La adopción inicial es controlada y no sustituye silenciosamente la nota del flujo histórico.

## Evolución 018: revisión fluida y tiempos observables

- La revisión docente muestra cada respuesta, referencia, explicación verificable, puntaje obtenido/máximo y fórmula final dentro de un único desglose versionado.
- El ajuste se realiza dentro de la tarjeta activa, previsualiza la nueva nota y exige motivo interno y explicación pedagógica antes de guardar.
- Cambiar de respuesta o abandonar el detalle con datos sin guardar exige confirmación; un conflicto de versión no sobrescribe cambios de otra sesión.
- En móvil existe un único propietario de desplazamiento, altura dinámica, áreas seguras y objetivos táctiles de al menos 44 px para volver, cerrar y crear incidencias.
- La extracción visual se ejecuta una vez con el modelo configurable. Cuando el evaluador Flash y el verificador Flash admiten visión, ambos reciben además la evidencia original para contrastar de manera independiente la extracción estructurada. El modelo Pro solo arbitra discrepancia, confianza baja, ambigüedad o fallo. Si visión encontró respuestas legibles pero ambos agentes declaran ausencia total, la nota cero se bloquea y pasa a revisión docente. Una demora mantiene el job activo; solo un fallo real de transporte o respuesta inválida termina en revisión docente y nunca en publicación automática.
- Los tiempos técnicos son diagnósticos aditivos y no alteran la fórmula, la autoridad docente ni la única calificación vigente.
- La regresión de veinte componentes, Chromium, WebKit, accesibilidad y modo claro/oscuro se conserva en la especificación 018.

## Evolución 032: recuperación y autoridad docente implementadas bajo banderas

[032 Calificación e impacto docente](../032-calificacion-impacto-docente/spec.md) añade checkpoints compatibles, escritor vigente por lease, protección frente a resultados tardíos y estados grupales sin cambiar la única nota oficial. Los desgloses y tiempos de estudio son aditivos: nunca publican ni sustituyen una decisión docente. La activación gradual permanece apagada por defecto.

## Evolución 033: centro unificado

La [evolución 075](../075-revision-docente-compacta/spec.md) organiza el mismo centro con resumen móvil y detalle progresivo, entrada desde la evaluación y retorno contextual. No cambia endpoints, estados, permisos ni registros de calificación; mantiene bloqueo de borradores y cero publicaciones por abrir secciones.

[033 Centro de calificación](../033-centro-calificacion/spec.md) reúne carga, revisión y publicación en `/app/calificaciones`. La proyección docente `GET /evaluaciones/{id}/revision` incluye toda la matrícula, nota nullable, versión/cobertura y contadores exhaustivos. Realiza seis consultas agrupadas (cinco sin permiso de PQRS), sin archivos, respuestas ni inferencias al consultar. La política de intento vigente se conserva.

La lista distingue cero real, sin entrega, procesamiento, error y nota publicada. Los filtros son independientes de la paginación; la búsqueda limita filas, no cambia los contadores del examen. Un cursor que deja de pertenecer al filtro responde 409 para reiniciar la lista explícitamente.

Carga, nota manual, reemplazo, ajuste, confirmación y publicación conservan sus endpoints y permisos. Los resultados grupales mantienen seleccionados solo los fallos. Se retiran tres páginas React sin consumidores, no sus APIs de salón/boletín. No se modifica fórmula, configuración de IA ni base de datos.

## Evolución 087: claridad del detalle docente

[087-calificacion-clara](../087-calificacion-clara/spec.md) conserva el flujo y los registros anteriores. El detalle prioriza nota vigente y estado, con cálculo/criterios, evidencia, respuestas y retroalimentación progresivos. Distingue avisos generales de respuestas sin alertas individuales; sus acciones abren el detalle pertinente y los códigos originales permanecen bajo demanda. Un aviso histórico no reabre ni despublica la nota. La confianza informada no prueba coincidencia de evaluadores ni exactitud. La revisión de lectura no recalifica ni publica; ajustes, versiones, permisos y protección de borradores se conservan.

## Evolución 088: espacio de revisión amplio

[088-revision-amplia](../088-revision-amplia/spec.md) aprovecha el ancho disponible exclusivamente en revisión docente. Desde 1280 px muestra lista legible de 320–360 px y detalle con desplazamientos independientes, búsqueda accesible e identidad del alumno visible. Por debajo mantiene lista o detalle, con bloqueo del fondo y retorno contextual. Contexto y acciones comparten una cabecera compacta; los filtros usan un selector sin desplazamiento horizontal. Carga, publicación, temporizador, resultados grupales y selectores abiertos conservan desplazamiento accesible. Sin cambios de permisos, APIs, notas, modelos o datos: consultar nunca confirma, publica ni recalifica. Borradores y conflictos de versión continúan protegidos.

## Evolución 094: revisión docente sencilla

[094-revision-docente-simple](../094-revision-docente-simple/spec.md) refina 087/088: avisos activos con acciones directas y avisos del análisis inicial en historial cerrado por defecto, después de evidencia, respuestas y retroalimentación. Sustituye la exposición bajo demanda de códigos técnicos prevista en 087 por mensajes humanos contextuales; conserva íntegros los motivos originales en los datos y trazas. Una decisión docente no equivale a resolución individual de cada aviso ni la ausencia de avisos demuestra exactitud. La explicación distingue puntos, escala y decisión docente sin sustituir la nota vigente. En móvil la identidad deja de fijarse encima del contenido; escritorio mantiene lista y detalle. Se conservan cálculo, permisos, protección de borradores, evidencia, rutas y registros.

## Evolución 095: continuar y registrar con claridad

[095-flujo-docente-ligero](../095-flujo-docente-ligero/spec.md) mantiene la presentación 094 y ofrece continuación de una consulta válida, con cuenta/materia/evaluación/alumno verificados antes de enlazar y regreso al grupo si la identidad anterior ya no está disponible. El boletín prioriza búsqueda/mosaico y conserva indicadores de filtros activos, previsualización y exportación. La captura muestra alumnos únicos del grupo con registro, no notas terminadas; propone un siguiente elegible que se elige explícitamente, sin heredar hojas, abrir cámara ni enviar por selección. Mantiene cálculos, historial, elegibilidad, reintentos, protección de borradores y permisos; no altera ningún registro al navegar.

## Evolución 099: revisión enfocada por secciones

[099-revision-docente-enfocada](../099-revision-docente-enfocada/spec.md) reemplaza la acumulación de avisos de portada por un resumen priorizado y detalle íntegro a petición. Conserva nota sugerida/confirmada y diferencia frente al cálculo, sin atribuir una decisión docente no registrada. Respuestas, Evidencia, Retroalimentación e Historial tienen accesos directos; celular muestra un contenido principal y mantiene identidad visible, refinando la decisión visual de 094. Escritorio amplio permite comparar foto y respuestas. Reclamos existentes tienen acceso contextual, los resueltos permanecen consultables y carga/error no equivalen a ausencia; sin registros se conserva el alta en opciones. Borradores y permisos siguen protegidos; al escribir en móvil la barra inferior cede espacio. Sin cambios en valores, fórmulas, modelos, contratos ni registros académicos.

## Evolución 105: seguimiento discreto

La captura compartida evoluciona en [127-camara-nativa-movil](../127-camara-nativa-movil/spec.md), issue #268: cámara nativa móvil sin visor web previo; PC conserva selector. Cancelación, reemplazo y resultados tardíos se aíslan por apertura y época de entrega, sin modificar notas, evidencia guardada o contratos de recalificación.

[105-materia-movil-cola](../105-materia-movil-cola/spec.md) inicia el monitor compacto con cantidad/estado y Ver progreso; puede minimizarse sin retirar, cancelar, reenviar ni detener trabajos. Funciona embebido y en otras páginas sin superponer captura. Conserva incidencias, resultados y reintentos; pendientes locales se aíslan por cuenta y recuperación tardía no se aplica a otra sesión. El almacenamiento legado permanece intacto, pero sus nombres sin propietario no se muestran como autorizados; pendientes activos se recuperan desde servidor. No modifica notas ni evidencias.

## Evolución 100: retroalimentación legible y precisión visible

La evolución [101 — contexto visual conservado](../101-digitalizacion-visual-completa/spec.md), issue #211, fija una revisión antes de iniciar una entrega/encolar, separa estímulos de evidencia del alumno y entrega el contexto al principal/verificador habilitado. Reintentos, particiones y desgloses conservan esa revisión; faltar material requiere revisión, no cero ni publicación automática. Detalle, corrección manual y reportes usan el máximo/clave originales, mientras permisos y liberación de respuestas siguen vigentes. No se recalculan notas antiguas ni se adjudican figuras nuevas a entregas legacy.

[100-feedback-demo-movil](../100-feedback-demo-movil/spec.md) muestra feedback íntegro como texto, con Editar al inicio y editor creciente, guardado actual y descarte confirmado solo del mensaje. Conserva avisos provisionales sin reescribirlos. Identifica el cálculo incompleto como provisional e informa preguntas/criterios sin puntaje, diferenciando null de cero y propuesta de IA de decisión confirmada. El formato de edición quita ceros redundantes, preserva decimales significativos y máximo real sin marcar cambios por abrir. Sin alterar cálculos, APIs, notas, evidencias, versiones ni permisos.

## Evolución 129: entrega de retroalimentaciones

[129-retroalimentacion-flujo-claro](../129-retroalimentacion-flujo-claro/spec.md), issue #272, reorganiza únicamente la interacción docente: lista compacta, selección estable y acciones accesibles; preparación y copia en un panel, detalle individual común e impresión vigente. Compartir no confirma/publica notas, no cambia evidencia ni reinicia vigencias/cuotas. Mantiene fuente vigente, permisos y decisiones explícitas.

El hotfix [#283](https://github.com/Andres-back/Calificator/issues/283) repara ese recorrido para notas publicadas con detalle pendiente: permite revisar/aprobar expresamente el resumen desde el propio panel, antes de crear/copiar por separado. Preserva restricciones del servidor, avisos, notas y evidencia; no autoriza a divulgar un desglose sin revisar ni reactiva enlaces. Resultados en la guía de validación de Spec129; no implica despliegue.

## Coordinación documental 130

[Spec130](../130-digitalizacion-secciones/spec.md), issue #274, amplía este contrato bajo aprobación registrada. Contexto educativo conservado para los tres evaluadores. El reparto opcional se compila a máximos por pregunta antes de guardar; no cambia la fórmula, los modelos ni notas históricas. El estado de pruebas y las limitaciones están en su guía de validación; no supone activación en producción.

## Evolución 128: exportación explícita y de solo lectura

[128-materias-notas-reutilizacion](../128-materias-notas-reutilizacion/spec.md), issue #270, separa el modelo de exportación del seguimiento. Mantiene política backend de intento vigente y solo_lectura: no genera ceros por vencimiento, confirma ni publica. CSV final usa decisión docente; provisional es elección explícita con estado. Conteos/vista previa evitan el éxito de un archivo sin notas finales; proceso/fallo/ausencia no se confunden con cero. Materias archivadas conservan consulta/exportación y resultados de trabajos ya admitidos; la copia editorial no incluye calificaciones.

## Coordinación 131: evidencia docente revisable

Incorpora preparación opcional de evidencia docente, originales privados, misma página canónica para todos los roles, colores semánticos y acercamiento por pregunta. No modifica fórmulas, modelos, decisiones ni permisos de publicación. Contratos y validación se registran en [Spec131](../131-escaneo-evidencias/spec.md), [plan](../131-escaneo-evidencias/plan.md) y [tareas](../131-escaneo-evidencias/tasks.md), issue #276. Esta coordinación no certifica cierre, CI, teléfonos físicos ni activación productiva.
## Evolución 134: decisión docente directa y prioridad visual

[134-revision-visual-nota-directa](../134-revision-visual-nota-directa/spec.md), issue #281, amplía el ajuste existente de forma compatible: nota final deseada, comentario opcional, actor, versión e idempotencia; una transacción conserva evidencias, puntos y propuesta original, registra el ajuste y suspende enlaces afectados. Editar una publicada deja ajustada y exige publicación separada, con advertencia previa. Los colores de revisión no representan acierto ni modifican notas. Sin nuevas inferencias, proveedores o migraciones; validación local y CI antes de fusión/despliegue autorizado.

## Coordinación 137: notas anteriores y reparto confirmado

[137-puntajes-reparto-seguro](../137-puntajes-reparto-seguro/spec.md), issue292, conserva todas las notas al guardar máximos. Propone cambios proporcionales al logro anterior, excluye decisiones manuales, pendientes y casos ambiguos con varios intentos, y revalida la selección confirmada. Cada cambio crea desglose/ajuste/historial y contexto de pesos nuevo sin tocar imágenes ni valoraciones originales; la pantalla explica sus equivalencias. Se conservan estados, sin publicación automática. Los enlaces afectados se pausan por la política vigente; la advertencia está en la vista previa. Recibo por actor/UUID evita duplicados y permite recuperar una respuesta perdida.
