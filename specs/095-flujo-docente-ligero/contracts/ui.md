# Contratos de interacción

No cambia la API. Evolución de componentes y consumidores con permisos actuales.

- **Materia**: nombre y grado disponibles visibles, información secundaria plegable, navegación existente y rol estudiante conservados.
- **Evaluación**: hasta tres acciones principales válidas; Más opciones permite todas las secundarias apropiadas. Foco/teclado y confirmación de eliminación intactos. Ver notas abre la ruta de revisión vigente; Calificar por foto abre su modo de carga, no otro centro.
- **Boletín**: búsqueda visible, filtros secundarios plegables, indicador de selección activo, limpiar filtros sin borrar una búsqueda no solicitada. Exportación y previsualización del alumno siguen accesibles. Sin datos modifica únicamente presentación, no crea notas cero.
- **Continuar revisión**: solo docente autorizado y contexto validado; clic navega, no confirma, publica, recalifica ni abre cámara. No admite destino arbitrario. Acceso fallido descarta referencia y permite volver a materias.
- **Captura**: total/progreso veraces, alumno sugerido con elección explícita y búsqueda siempre disponible. Nunca reutiliza hojas anteriores. Nombre/evaluación se muestran antes de enviar; solo Enviar a calificar realiza la mutación existente.
- **Mensajes y estados**: Nota sugerida por la IA frente a Nota del estudiante/publicada; Ver notas, Calificar por foto, Pasar lista y Guardar cambios consistentes. Confirmar nota y Publicar conservan significados distintos.
- **Errores/espera**: reintento real, conservación de hojas, cero definitivo solo cuando existe una decisión válida; filtros o menús no ocultan avisos activos que requieren acción.

Compatibilidad: consultas, rutas compartidas, versiones históricas y parámetros de retorno siguen funcionando. El marcador es prescindible y no puede ampliar permisos.
