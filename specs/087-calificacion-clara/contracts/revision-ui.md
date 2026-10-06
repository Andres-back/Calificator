# Contrato de interfaz docente

## Lectura y estado

- Una cabecera con estudiante, evaluación, nota vigente y estado. Publicada/confirmada no se rotulan como pendientes; en procesamiento sin nota se muestra espera, no cero.
- Puntos y nota no son sinónimos: resumen breve, conversión y ajustes disponibles en detalle.
- Avisos generales siempre visibles cuando afectan la revisión pendiente, aunque no haya excepciones individuales. Mensaje sin alertas solo si realmente no hay motivos en el ámbito descrito.
- Históricos: estado actual visible; avisos anteriores conservados como análisis original sin inferir su resolución.

## Mensajes principales y destinos

| Motivo registrado | Mensaje docente | Acción |
|---|---|---|
| Diferencia global/suma | La valoración global de la IA y el cálculo por preguntas no coinciden. Revisa los puntajes antes de confirmar. | Abrir respuestas y puntajes |
| Retroalimentación incompatible | La retroalimentación no coincide con los puntajes. Comprueba las respuestas antes de compartirla. | Abrir respuestas y retroalimentación, sin publicar |
| Evidencia/componentes pendientes | Falta información para completar la revisión. Comprueba la evidencia y las respuestas pendientes. | Evidencia o componente identificado |
| Clave incompleta | Faltan respuestas de referencia. Revisa la clave de las preguntas indicadas. | Referencias registradas en revisión, sin inventar claves |
| Duplicados/cobertura inconsistente | Hay información de preguntas que no coincide con la evaluación. Revisa el desglose completo. | Abrir desglose |
| Motivo desconocido | Hay un aviso que necesita revisión. Comprueba la evaluación antes de confirmar. | Desglose y detalle original |

El texto definitivo se valida con contexto real; no se muestran cifras comparativas o preguntas afectadas si no están registradas. Avisos equivalentes pueden consolidarse, no ocultarse ni convertirse en éxito.

## Navegación progresiva

Controles identificables para evidencia, respuestas y puntajes, criterios disponibles y retroalimentación. Apertura en una acción. Edición inline de la pregunta en máximo dos acciones desde el resumen. Rutas/query actuales de pregunta/hoja/retorno preservadas. Control de apertura expresa `aria-expanded`, relación al panel y foco cuando corresponda; cerrar no pierde un borrador.

## Seguridad e integridad

Sin endpoints nuevos ni cambios de esquema HTTP. Cero llamadas de mutación por consultar o desplegar secciones. Permisos de edición/publicación existentes; soluciones y explicaciones docentes siguen separadas del acceso estudiantil. Un botón de aviso no confirma ni publica por sí mismo.

## Responsive

44×44 px mínimos para controles táctiles; cinco tamaños y dos temas. Un scroll principal y ningún panel fijo alto que cubra contenido. Las pruebas comprueban controles realmente alcanzables, foco y desbordamiento, no solo que exista un botón en DOM.
