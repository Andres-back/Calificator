# Investigación 099

Fecha 2026-10-14. Inspección local y capturas aportadas; sin datos académicos modificados ni pruebas de calificación.

## Resumen y explicación

- Decisión: separar sugerencia, cálculo y decisión registrada en el modelo de presentación.
- Motivo: `GradeNoteExplanation` en `CalificacionesWorkspace.tsx` muestra «Consulta el historial para conocer la decisión del docente» siempre que nota y fórmula difieren, sin exigir decisión docente. Las capturas muestran este texto en una entrega Por revisar.
- Alternativas: no esconder uno de los valores ni elegir automáticamente 2,48 o 2,52. Examinar UI no prueba la corrección académica.

## Avisos

- Decisión: priorizar uno en resumen y conservar los restantes en detalle, con CTA contextual.
- Motivo: `ReviewTriagePanel.tsx` deduplica mensajes conocidos pero renderiza todos los avisos generales con explicación y botón, además de contadores y respuestas afectadas. Esa acumulación ocupa la pantalla móvil.
- Alternativas: no eliminar avisos del modelo ni limitar arbitrariamente a uno sin acceso a los otros; no usar «sin avisos» como sinónimo de correcto.

## Secciones y cambios pendientes

- Decisión: reutilizar paneles, guardas y enlaces; un contenido principal en celular. Preservar estado de editores en transiciones.
- Motivo: workspace ya contiene `changeDetailView`, parámetros pregunta/hoja, refs y editores con protecciones; feedback e historial son bloques independientes que deben integrarse sin pérdidas.
- Alternativas: no duplicar páginas, servicios o navegación principal ni cerrar formularios automáticamente.

## Reclamos

- Decisión: conservar consulta/crear/resolver, acceso contextual para registros existentes y alta desde opciones; error visible y reintentable.
- Motivo: `IncidenciasSection` tiene estados de carga/error y abre contenido si hay abiertos/error. No se debe confundir cero abiertos con ausencia de registros resueltos.
- Alternativas: no ocultar errores como lista vacía ni quitar acceso al alta para simplificar.

## Conclusión

Contratos locales suficientes; no nuevas tecnologías ni incógnitas que requieran investigación delegada. Compatibilidad visual/teclado y conservación de estado se acreditarán tras implementación con pruebas focalizadas; no se declaran resueltas por el diseño.
