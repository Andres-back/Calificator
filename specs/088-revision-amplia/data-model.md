# Datos y estados de interfaz

Sin tablas, migraciones, nuevos campos API ni persistencia adicional. Se usan las entidades vigentes del dominio de calificaciones.

| Entidad | Datos existentes | Relaciones y reglas |
|---|---|---|
| Contexto | materia, evaluación, modo en URL | Cambiar contexto conserva guards y limpia selección según comportamiento vigente. |
| Lista del examen | estudiante_id, nombre, estado, nota opcional, resumen de revisión, cursores y contadores | Pertenece a evaluación; búsqueda/filtros/paginación continúan consultando el contrato existente. Nota ausente no se convierte en cero. |
| Revisión activa | calificacion_id, estudiante_id, detalle, desglose, evidencia, timeline | Identidad siempre corresponde al detalle cargado; desplazamiento no cambia selección ni datos. |
| Borrador | puntajes, explicación/retroalimentación, edición global, versión | No se guarda, descarta o publica por cambiar tamaño de pantalla. Mantener conflictos y advertencias existentes. |

Estados visuales derivados: lista sola; lista y detalle en escritorio amplio; detalle solo en pantalla estrecha; selección de contexto; carga de entregas; resumen de publicación. Estos no son nuevos estados académicos.

Transiciones: seleccionar alumno abre detalle con la protección vigente; regresar vuelve a la lista; redimensionar reorganiza los mismos datos sin mutaciones; buscar filtra sin cambiar una nota; guardar/confirmar/publicar continúan usando las acciones y permisos vigentes. Carga, error, pendiente, cero real y ausencia de entrega se mantienen distinguibles.
