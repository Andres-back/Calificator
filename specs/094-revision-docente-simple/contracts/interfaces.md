# Contrato de presentación docente

Los contratos públicos, rutas y campos no cambian. Este contrato define la presentación sobre los datos existentes.

| Contexto | Texto orientativo | Acción |
| --- | --- | --- |
| Pendiente: suma discrepante | La nota propuesta por la IA no coincide con la suma de los puntos por pregunta. | Revisar puntajes por pregunta |
| Confirmada/publicada: discrepancia inicial | En el análisis inicial, la IA propuso una nota distinta a la suma por preguntas. La nota mostrada ya tiene una decisión docente. | Ver puntajes por pregunta |
| Procesando | Seguimos analizando la entrega. La nota todavía no es definitiva. | Consultar evidencia o volver a la lista |
| Motivo desconocido pendiente | Hay información que debes comprobar antes de confirmar la nota. | Revisar respuestas y evidencia |
| Sin señales individuales | Respuestas sin avisos de revisión. | No equivale a «respuestas correctas» |

Las frases definitivas pueden ajustarse en implementación conservando estas reglas. El historial no declara cada alerta resuelta; pendientes conservan prioridades/barreras y destinos actuales. Nunca reproducir motivos internos crudos en listas ni detalles desplegados.

## Distribución

Orden: identidad/contexto breve → nota y explicación → evidencia → respuestas y puntajes → retroalimentación; historial original secundario. Evidencia y puntajes son accesibles mediante controles explícitos. Las acciones de guardado, confirmación y publicación permanecen diferenciadas y protegidas por permisos.

Móvil mantiene retorno a lista, safe areas, scroll hasta último control y borradores. Escritorio mantiene búsqueda, filtros y nombres legibles con lista/detalle. No exigir desplazamiento horizontal para filtros.

## Conservación

Handlers actuales de selección, cambio de página, edición y guardado; IDs de componentes y parámetros de navegación no cambian. Sin cambios a APIs, clasificación de alertas, cálculo, almacenamiento, polling o modelos. Datos originales permanecen disponibles a trazabilidad existente, no como texto técnico docente.
