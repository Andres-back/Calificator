# Investigación: consultas docentes simples

## Búsqueda de asistencia

**Decisión**: Filtrar localmente los registros cargados por nombre o correo; conservar posición original y borrador completo independiente.
**Motivo**: `MateriaAsistencia` ya dispone de los datos completos. `attendanceModel` calcula resumen y payload desde el borrador por ID. Reducir ese borrador durante la búsqueda perdería alumnos o habilitaría guardados incompletos.
**Alternativas consideradas**: búsqueda remota (peticiones innecesarias por tecla); filtrar el borrador (riesgo para integridad); reutilizar el selector de carga de evidencia (interacción distinta, búsqueda solo por nombre y límite de 12 opciones).

## Libro de notas por evaluación

**Decisión**: Derivar evaluaciones visibles antes de consultas y `buildFollowUpRows`, usando las claves existentes por evaluación.
**Motivo**: El modelo ya admite cualquier conjunto de evaluaciones, calcula estados y seguimiento y no escribe notas. Filtrar solo tarjetas dejaría prioridades, acciones y cantidades de otras evaluaciones.
**Alternativas consideradas**: página nueva o endpoint adicional (no necesarios); filtrar solo las celdas después de calcular seguimiento global (indicadores inconsistentes).

## Menú lateral

**Decisión**: Ocultar el acceso de calificaciones cuando existan ambos permisos del recorrido contextual; conservar fallback autorizado y rutas.
**Motivo**: `Sidebar` combina menús para roles personalizados. El contrato aprobado en 075 exige no dejarlos sin acceso cuando no pueden consultar evaluaciones. Quitar la ruta o borrar la entrada indiscriminadamente rompería esa compatibilidad.
**Alternativas consideradas**: eliminar ruta (rompe enlaces históricos); retirar acceso para todos los perfiles (deja roles autorizados sin navegación).

## Pruebas y dependencias

**Decisión**: Extender pruebas de modelos, menú y UI existentes con datos sintéticos; no introducir dependencias ni probar servicios de IA.
**Motivo**: Es un cambio de consultas y navegación, no de procesamiento. `frontend/e2e/mock` ejecuta la aplicación sin backend real y `p2-responsive.spec.ts` ya contiene fixtures por rol y comprobaciones de geometría.
**Alternativas consideradas**: validar alterando producción (innecesario); repetir pruebas de inferencia (sin relación con el cambio).

## Resultado ordenado desde la evaluación

**Decisión propuesta**: Reutilizar la lista de `evaluation-review` y `PanelDetalle` en `CalificacionesWorkspace`; el libro seguirá enlazando al mismo resultado. Aplicar el orden nota/explicación, evidencia, comparación y retroalimentación en todos los tamaños.
**Motivo comprobado**: La evaluación ya tiene un enlace contextual y el workspace ya lista nombre, estado y nota con apertura al pulsar la fila. No hace falta otra vista. El detalle, en cambio, abre evidencia y comparación simultáneamente con `xl:block` y suma criterios, alertas y opciones antes de la retroalimentación. Esa apertura rompe la progresividad en escritorio.
**Alternativas consideradas**: agregar otra página de notas (aumenta dispersión); plegar solo en celular (mantiene saturación de escritorio); ocultar alertas junto con explicaciones (riesgo de confirmar casos incompletos).

## Contexto de creación y borradores

**Decisión propuesta**: Presentar `initialMateriaId` como contexto fijo en `GenerationWizard`; no crear nuevos inputs de grado/área. Aislar y validar contexto al recuperar/persistir borradores locales con compatibilidad del formato anterior.
**Motivo comprobado**: `MateriaEvaluaciones` entrega la materia actual al wizard y este ya muestra un nombre fijo cuando hay una sola; no se encontraron inputs de grado/área en ese flujo. Sin embargo, el primer paso se llama «Materia» y pide confirmarla. Además, `loadWizardDraft` carga el borrador por usuario antes de comprobar el contexto, pudiendo restaurar otra materia. `DigitalizarEvaluacionModal` también recibe `materiaId` sin inputs de grado/área.
**Alternativas consideradas**: saltar todos los datos básicos (perdería nombre/modalidad); reasignar silenciosamente un borrador (mezcla preguntas y criterios de materias); borrar el borrador ajeno (pérdida de trabajo); rehacer todo el wizard (riesgo innecesario).

No quedan decisiones técnicas desconocidas ni necesidades de investigación externa. Las dos propuestas nuevas fueron aprobadas mediante «SIGUE» el 2026-09-30; se actualizan tareas/checklist/análisis antes de código.
