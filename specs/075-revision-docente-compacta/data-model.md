# Modelo de presentación

## Datos existentes, sin persistencia nueva

- `CalificacionDetalle`: identidad, materia/evaluación, `nota_sugerida`, `nota_confirmada`, `estado`, confianza, feedback, evidencia, timeline y desglose.
- `GradeBreakdownData`: versión vigente, fórmula guardada, cobertura, bloqueos y componentes. La nota visible sigue la política existente de nota efectiva; no se reemplaza por una suma calculada en pantalla.
- `GradeComponentData`: identidad/clave/orden, tipo, título, respuesta observada, referencia y visibilidad, puntos obtenidos nullable, máximo, explicación, mejora, fuentes, valoraciones y hojas.
- `resultado_json.grader_a.criterios`: fuente histórica opcional; tratarla como información guardada no estructurada, con comprobación de datos antes de mostrarla.

## Proyecciones de lectura

### Resumen del alumno

Contexto y nota efectiva se toman de la calificación. Cero válido, pendiente y sin nota no se confunden. Alertas provienen de señales existentes; no se infiere exactitud por confianza ni fallo por puntaje bajo.

### Resumen de criterios

Componentes rubricados guardados → filas título/puntos/máximo. Sin esos componentes → ausencia explícita y resumen de preguntas disponible, sin fabricar vínculos ni pesos. Sin desglose → criterios históricos válidos o ausencia explícita. Un número faltante no se convierte a cero.

Un ajuste docente global no recalcula retroactivamente `grader_a.criterios`: etiquetar esa información como inicial/histórica si procede y no afirmar que representa la valoración vigente ajustada.

### Comparación breve

Estudiante y referencia mantienen etiquetas y texto completo. Respuesta `"0"` es un dato válido. Referencia restringida sigue oculta donde corresponda. No hay cambio de estado o puntaje por renderizar el texto.

## Estado efímero

- Vista móvil: `resumen`, `revision` o `evidencia`; inicial resumen salvo pregunta/enlace/acción que requiera detalle.
- Secciones ampliadas: retroalimentación, fórmula, verificaciones/fuentes, historial y PQRS, identificadas por alumno activo.
- Pregunta y hoja: continúan en los parámetros existentes, manteniendo `materia`, `evaluacion`, `estudiante`, `calificacion`, `filtro`, `pregunta` y `hoja` cuando son válidos.
- Editor: snapshots y estados actuales, sin otro borrador o copia persistida de calificación.

## Transiciones

1. Abrir alumno → resumen y nota real; un enlace a pregunta abre revisión de esa pregunta.
2. Ver respuestas/evidencia → cambia presentación y foco; no mutación ni inferencia.
3. Ajustar → editor actual junto al componente; impedir plegado que lo oculte con cambios o exigir decisión explícita.
4. Guardar con éxito → detalle y resumen usan la versión persistida antes de avanzar; conflicto conserva borrador y mensaje.
5. Refetch de cola → mantiene presentación y selección; no reinicia el editor.
6. Cambiar contexto o volver → aplica los bloqueos de borrador existentes.

No se añaden ni modifican tablas, entidades persistentes, permisos ni estados de negocio.
