# Contrato de interfaz móvil: centro de calificaciones

## Lista de estudiantes

- El buscador acepta escritura continua y expone el estado “Buscando”.
- La lista previa no se vacía durante una consulta.
- Los filtros disponibles son Todos, Por revisar, Alertas, Calificando y Publicadas.
- Cada fila comunica nombre, estado, alertas y nota o indicador de procesamiento.

## Detalle

- El detalle ocupa la ventana móvil completa y tiene un control “Volver a lista”.
- Las pestañas Evidencia y Revisar respuestas permanecen accesibles durante el desplazamiento.
- Las acciones principales dependen de permisos y estado; nunca omiten las comprobaciones vigentes.
- La barra inferior respeta el área segura y no cubre el último contenido.

## Protección de cambios

- Con cambios sin guardar se deshabilitan las acciones que cambian estudiante o contexto.
- Salir de la ruta presenta la confirmación de descarte existente.
- Guardar una respuesta puede continuar a la pregunta o al estudiante siguiente sin publicar automáticamente.

## Compatibilidad

- En escritorio se conserva la vista de lista y detalle en dos columnas.
- No cambia ningún endpoint ni forma de datos.

