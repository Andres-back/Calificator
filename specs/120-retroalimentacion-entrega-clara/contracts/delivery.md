# Contrato de devolución

## Vista privada docente

`POST /evaluaciones/{id}/devoluciones/previsualizar` conserva el contrato actual y añade preparación: seleccionable, estado, motivo/acción y candidato revisable con huella de fuente. Nunca expone candidatos a visitantes públicos. Una selección pendiente puede mantenerse marcada, pero no se trata como `elegible` para emisión.

Nueva ruta docente de aprobación dentro de `/evaluaciones/{id}/devoluciones/`: recibe calificación, huella de fuente esperada, mensaje revisado, alcance y request_id. Requiere `grading.publish`, propiedad de materia/evaluación y nota oficial vigente. Responde con previsualización elegible y nueva huella para impresión/emisión; 409 si la fuente cambió, 422 si el mensaje o alcance no es válido y 403 para actor no autorizado. Una petición repetida equivalente no crea nuevas revisiones.

Antes de autorizar se muestra la nota oficial, el mensaje completo y «Solo nota y retroalimentación» o «Incluye detalle por pregunta revisado». Un candidato provisional no se aprueba sin corregir su mensaje. No se elimina el prefijo por una operación automática del sistema.

## Entrega

Las rutas existentes de fichas y emisión consumen solo selecciones listas/huellas actualizadas. En lote mixto: mostrar pendientes y ofrecer explícitamente continuar solo con listos; el usuario puede cancelar sin emitir nada. Éxitos/fallos parciales se mantienen visibles e idempotentes.

La nueva revisión autoriza impresión sin crear un enlace. La creación o reactivación de un enlace sigue exigiendo autorización de vigencia y evidencia. El resumen no amplía permisos de Xali ni el cupo de cinco preguntas en 600 segundos.

## Presentación

Misma función de secciones y texto en lista, revisión, familia e impresión: aciertos/qué mejorar/siguiente paso solo cuando hay marcadores fiables; resto en «Retroalimentación». Nada se interpreta como HTML. Contenido íntegro y continuaciones identificadas, sin truncar o compactar caracteres para esconder texto.

## Compatibilidad

Resultados elegibles con el contrato anterior siguen entregándose. Peticiones antiguas no autorizan resúmenes pendientes: la vía nueva requiere acción explícita. Ninguna consulta crea una revisión por defecto.
