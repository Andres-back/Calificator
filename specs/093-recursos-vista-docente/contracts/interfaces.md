# Contratos 093

## Recursos y conversión

Mantener rutas existentes `/api/herramientas/*`, lectura/edición de material y `POST /api/herramientas/{material_id}/convertir-evaluacion`. No modificar contratos de calificación ni añadir endpoints.

La propuesta de criterios usa contenido JSON y metadatos compatibles ([modelo](../data-model.md)). El editor existente muestra criterios, niveles y mensajes de corrección al docente. Un recurso nuevo con propuesta inválida no se anuncia como listo para evaluar; la corrección se limita a criterios y no modifica preguntas o soluciones. El material de apoyo no exige rúbrica.

Antes de convertir: comprobar propiedad, materia y criterios. Un conflicto o propuesta inválida devuelve error accionable 422 antes de crear evaluación, con indicación del criterio/campo a corregir; no una excepción 500. Mantener 404/409 y permisos actuales. La respuesta válida conserva contrato de evaluación y flujo de revisión/publicación. Si ya hay vínculo, devolverlo sin nueva escritura ni validación retrospectiva.

La proyección para estudiantes conserva criterios públicos sin soluciones ni diagnósticos internos. No introducir respuestas de referencia en `descripcion`, `evidencia` o `regla_puntuacion`. El alumno no adquiere acceso al editor ni al solucionario.

## Bandeja docente

- Carga/error: mantener mensajes y reintento; no afirmar «sin reclamos».
- Éxito, cero elementos y cero contador: no renderizar sección ni contador de reclamos.
- Elementos o contador positivo: mostrar sección y acceso existente. Contador positivo con lista vacía: indicar que no se pudo mostrar el detalle y ofrecer recarga, no afirmar ausencia.
- Solo notas pendientes: lista aprovecha ancho disponible. Reclamos nuevos reaparecen tras actualización normal.

## Asistencia docente

- Escritorio: nombre identificable, cuatro estados con texto, guardado y acceso a observación en fila compacta; adaptarse al ancho real del contenido, no solo al viewport.
- Celular: reflujo sin scroll horizontal, controles de 44×44 px o mayores, sin resumen fijo que tape filas.
- Observación: desplegar a demanda, indicador si existe; colapsar sin borrar texto ni interrumpir guardado. No usar ocultación/unmount como nueva operación de persistencia.
- Conservar búsqueda por nombre/correo, fecha, selección, marcado masivo, importación, reporte, reintento y bloqueo de navegación ante cambios pendientes.
- Ningún cambio de API de asistencia, frecuencia, estados o permisos.

## Invariantes de aceptación

Igualdad de preguntas/claves/grillas y suma de puntajes antes/después para fixtures de los 16 tipos; ningún cambio en notas existentes. Nota objetiva correcta conserva puntaje. Falta de reclamos no oculta errores ni revisiones. Guardado de asistencia conserva orden/versión y borradores bajo búsqueda, recarga, cierre de observación y fallo parcial.
