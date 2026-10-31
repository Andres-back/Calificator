# Decisiones de diseño

## R1. Una vista, contexto explícito

**Decisión**: ruta docente `/app/materias/:materiaId/evaluaciones/:evaluacionId/revision` hermana del layout `MateriaDetailPage`, que monta el workspace compartido. Matcher/constructor central en `reviewRoutes.ts`. Path IDs prevalecen sobre queries; validar pertenencia antes de acciones. Enlaces heredados siguen aceptados sin redirect automático al montar una edición activa.
**Razón**: incrustar el workspace en el Outlet actual anida cabeceras y scrollers. AppShell y Topbar necesitan reconocer ambas rutas para no duplicar monitores.
**Alternativa descartada**: copiar el workspace o depender exclusivamente de navigate(-1).

## R2. Compatibilidad y permisos

**Decisión**: mantener guard staff+grading en revisión, añadiendo subjects.read a la ruta contextual. El constructor solo genera ruta contextual para perfiles con subjects.read; el resto conserva el acceso global. Boletines de estudiante no se eliminan. El retorno `volver` se valida como ahora, limitado al libro de la misma materia.
**Razón**: personalizar permisos no implica acceso a todas las materias; presentar contexto no concede acceso. El backend sigue siendo la autoridad de pertenencia.
**Alternativa descartada**: redirigir todos los perfiles a Materias o conceder permisos automáticamente.

## R3. Pendientes sin inventar información

**Decisión**: reutilizar `getBandejaDocente()` solo con submissions.review, total global y leyenda «Mostrando X de N casos». Agrupar visualmente la muestra por evaluación si es útil, sin contarla como total de la evaluación. Selector autorizado para perfiles sin submissions.review. Sin llamadas N+1 ni endpoint nuevo.
**Razón**: backend service limita a6 pendientes y6 reclamos por consulta. El endpoint exige submissions.review. No existe un total completo por evaluación en ese DTO.
**Alternativa descartada**: prometer33 por revisar por evaluación a partir de6 casos.

## R4. Menos ruido sin menor trazabilidad

**Decisión**: `ReviewHelp` nativo details, cerrado por defecto; fuentes/valoraciones/proceso en `GradeAnalysisDetails` dentro de Historial. Confianza ya está en Historial. Avisos de triage, error, procesamiento y validez se quedan visibles. No modificar mensajes de usuarios ni respuestas de IA guardadas.
**Razón**: las aclaraciones generales se repiten por pregunta; eliminarlas del modelo perdería evidencia. Los colores expresan prioridad, no certeza garantizada ni acierto automático.
**Alternativa descartada**: esconder avisos específicos dentro de ayuda o interpretar verde como nota correcta garantizada.

## R5. Acción única y términos

**Decisión**: Retroalimentación, Nota sugerida, Nota final, Recursos en copy propio de los recorridos afectados, incluidos aria-label. Quitar compartir duplicado dentro de detalle individual y conservar la barra común con imprimir/compartir. No renombrar campos API, rutas históricas ni bibliotecas internas.
**Razón**: hay dos CTA en el mismo ShareFeedbackDialog individual. La URL /devolucion es un contrato que no confunde por sí mismo al usuario.

## R6. Materia móvil y proceso

**Decisión**: reutilizar los enlaces horizontales de materia a todos los anchos, active aria-current, auto-revelación únicamente horizontal y enlaces de44px; quitar Select/imports sin consumidores. Añadir apartados añade/reutiliza/retira y capturas384px a plantillas, sin enmendar constitución ni inventar aprobación visual.
**Razón**: las pestañas ya existen y solo se ocultan bajo md; no hace falta otra biblioteca.

## R7. Riesgo y despliegue

**Decisión**: dos incrementos dentro del mismo alcance: limpieza/celular primero, contexto/pendientes después; sin migraciones ni dependencias nuevas. Fixtures sintéticos, cero llamadas IA. Converge, inventario, permisos, regresiones de puntajes137 y CI íntegro antes de solicitar fusión.
**Razón**: proteger la fase demo y separar comportamiento visual de datos persistidos. Revertir código restaura navegación/copy anterior sin revertir notas ni borrar historial.
