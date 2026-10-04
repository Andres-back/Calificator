# Validación

## Verificación local (2026-10-04)

- 30 regresiones backend aprobadas: URLs institucionales, rechazo de URLs ajenas,
  ámbito docente/contexto sin catálogo, generación con RAG disponible/caído y trazabilidad.
- 23 pruebas frontend aprobadas: selección exacta, búsqueda estable, advertencia,
  rúbrica editable, doble envío protegido, recuperación y edición compatible.
- TypeScript, lint estricto, build y Ruff aprobados.
- 6 E2E de creación aprobados y 1 recorrido móvil de materia/criterios aprobado.
  Los recorridos de 360×800 y 390×844 comprueban contenido >400px, ausencia de
  superposición, scroll al cambiar de paso y guardado con selección explícita.
- Inventario regenerado; 565 superficies, sin nuevas APIs/tablas/dependencias.

## Análisis y convergencia

Siete requisitos con tareas y regresiones; sin contradicciones de contratos o permisos.
La implementación satisface el diseño. La entrega sigue condicionada al CI del PR y
a la prueba posterior de producción, que se documentarán en issue #167.

## Procedimiento de producción

Fusionar únicamente con controles verdes. Confirmar commit de main en el VPS y rebuild
reproducible de servicios aplicación sin tocar volúmenes. Iniciar sesión demo, elegir
una materia propia y criterios existentes, generar tres preguntas de prueba, comprobar
estado borrador, puntajes/respuestas y alineación exacta, sin publicar o asignar.
No sobrescribir notas ni evaluaciones reales. Registrar tiempo/estado en issue #167.
