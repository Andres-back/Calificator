# Investigación 093

Fecha: 2026-10-10. Inspección de código, sin cambios funcionales ni pruebas en producción.

## Criterios y puntuación

**Decisión**: separar la política de criterios de la extracción de preguntas y reutilizarla en propuestas nuevas y conversión.

**Evidencia**: `backend/app/modules/herramientas/evaluation_adapter.py` construye el respaldo con `descripcion = question["enunciado"][:240]`. `_rubric_criteria` solo lee el contenido, descarta atributos y puede convertir pesos inválidos en un peso por defecto. El fallo afecta a todos los tipos del adaptador, no solo crucigramas.

**Motivo**: logro, evidencia y regla de puntuación explican qué se evalúa; repetir la pregunta no lo explica. Validar finitud, positividad y coherencia antes de normalizar evita ocultar errores.

**Alternativas**: rechazada una segunda llamada obligatoria de IA o regenerar todo el material por un criterio inválido. El crucigrama construye su grilla en Python y puede descartar campos adicionales del generador; conservarlos no debe cambiar esa grilla. Usar reglas deterministas por familia cuando no hay criterios explícitos y revisión docente para la pertinencia pedagógica.

**Restricción**: `calificaciones/breakdown_policy.py` prioriza componentes por pregunta cuando existen; `calificaciones/agents.py` envía criterios como guía separada. No hay hoy relación explícita criterio/pregunta. Añadir referencias compatibles sin sustituir componentes, claves o suma de puntajes; nunca doble puntuación ni penalización nueva.

## Fuente docente y borradores

**Decisión**: recuperar `input_json.criterios_rubrica` y el respaldo persistido `_xcalificator.criterios_rubrica`; distinguirlos de criterios estructurados editados y de `RubricaRequest.criterios`.

**Evidencia**: `herramientas/service.py` adjunta la intención docente al prompt y la persiste, pero `convertir_a_evaluacion` consulta `input_json` solo para referencias curriculares. Taller ya genera `criterio_logro` y `criterios_revision`. `MaterialContentEditor.tsx` permite editar criterios/niveles en contenido JSON.

**Motivo**: no perder la intención del docente en la conversión. Una propuesta puede completar evidencia/regla sin reemplazar criterios ni introducir exigencias ajenas. Conflictos y criterios incompletos requieren corrección explícita.

**Alternativas**: rechazados formularios nuevos obligatorios para todos los recursos, reemplazo silencioso de rúbricas o validación retroactiva al consultar una evaluación vinculada. El retorno temprano y la transacción actuales preservan idempotencia.

**Límite**: una comprobación estructural o de texto duplicado no demuestra automáticamente corrección pedagógica ni detecta toda filtración semántica. No generar descripciones con respuestas correctas; conservar el filtro estudiante y revisión docente.

## Reclamos y asistencia

**Decisión**: mostrar reclamos con elementos o contador positivo; ocultarlos únicamente tras carga correcta sin ninguno. Ajustar a una columna cuando solo hay revisiones de notas.

**Evidencia**: `TeacherInbox.tsx` renderiza ambas listas y contadores cero; una lista vacía puede coexistir con contador positivo. Ya existe recuperación para errores.

**Alternativas**: no ocultar toda la bandeja ni interpretar error/carga como cero. Mantener actualización de React Query sin consultas nuevas.

**Decisión**: compactar presentación de `MateriaAsistencia.tsx`, con observaciones desplegables y controles visibles de cuatro estados.

**Evidencia**: cada tarjeta muestra campo de observación y bloques de estado siempre, aumentando altura. `useAttendanceAutosave.ts` mantiene revisiones por alumno, debounce de observación, lotes serializados, reintentos y protección de navegación.

**Alternativas**: no cambiar la cola, no guardar al cerrar detalles como mecanismo nuevo, no reducir controles por debajo de 44 px ni usar panel fijo. Mantener el input controlado al colapsar para no perder borradores; fecha y filtrado no deben cambiar identidad de filas.

## Incertidumbres resueltas

No se requieren tablas, proveedores, endpoints nuevos ni cambios en el algoritmo de calificación. Se mantienen librerías existentes. La calidad pedagógica requiere validación humana; la conservación de datos y la distribución se verificarán con regresiones y pruebas visuales focalizadas antes del CI completo.
