# Investigación: Flujo docente móvil de calificación

## Decisión 1: Mejorar la vista existente

**Decisión**: Adaptar `CalificacionesWorkspace` con presentaciones responsivas en lugar de crear una ruta o componente funcional paralelo.

**Rationale**: Evita duplicar permisos, mutaciones y reglas de publicación; reduce el riesgo sobre un flujo de calificación que ya funciona.

**Alternativas consideradas**: Una página móvil independiente. Se descartó porque aumentaría el mantenimiento y podría comportarse distinto a escritorio.

## Decisión 2: URL como contexto reanudable

**Decisión**: Conservar en parámetros de URL materia, evaluación, filtro, estudiante, calificación, pregunta y hoja.

**Rationale**: El comportamiento actual ya ofrece enlaces profundos y permite volver al mismo punto sin nueva persistencia.

**Alternativas consideradas**: Guardar el contexto solo en memoria o almacenamiento local. Se descartó por producir estados difíciles de compartir y depurar.

## Decisión 3: Acciones móviles derivadas del estado existente

**Decisión**: Mostrar una barra fija que seleccione confirmar, publicar, guardar o continuar según estado, cambios pendientes y permisos.

**Rationale**: Reduce el desplazamiento sin cambiar qué operaciones están permitidas.

**Alternativas consideradas**: Un único botón que confirmara y publicara automáticamente. Se descartó porque elimina una revisión humana explícita y podría publicar por accidente.

## Decisión 4: Búsqueda estable

**Decisión**: Mantener escritura inmediata, consulta diferida y datos previos visibles; reforzar la presentación móvil sin añadir más solicitudes.

**Rationale**: El código ya dispone de espera de 300 ms, cancelación por señal y datos provisionales; el problema restante es principalmente de jerarquía y persistencia visual.

**Alternativas consideradas**: Filtrado exclusivo en cliente. Se descartó porque la lista es paginada y podría ocultar estudiantes no cargados.

