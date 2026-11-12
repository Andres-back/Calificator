# Validación: Evidencia a pantalla, recalificar en lote y asistencia en mosaico

## Pruebas

```
python -m pytest backend/tests/unit/test_batch_regrade.py backend/tests/unit/test_resource_generation_unavailable.py -q
  14 passed

python -m pytest backend/tests/unit -q -k "not evidence_scan and not pdf_service"
  2055 passed, 7 skipped, 171 deselected

npx vitest run            (frontend completo)
  208 archivos, 1556 pruebas: pasan

npx tsc --noEmit -p .  y  npx eslint src
  sin errores ni avisos
```

Antes de la corrección, `test_batch_regrade.py` no podía importarse y `test_provider_failure_becomes_a_retryable_503` fallaba. Las pruebas de backend excluidas son las que no corren en Windows (`test_evidence_scan*` y `test_pdf_service`); corren en la CI.

## Comprobación en el navegador (2026-11-12)

Aplicación local con el backend de esta rama, un docente de prueba y tres estudiantes.

| Pantalla | Resultado |
| --- | --- |
| Evidencia, 1900 × 900 px | El marco de la hoja mide unos 690 px de alto; antes, 405 px. La hoja se lee sin ampliar. |
| Recalificar seleccionados, 1600 px | El botón aparece en la barra de selección. El diálogo explica duración y que la lectura puede cambiar. Con dos notas ya decididas, la respuesta es 202 y cada una muestra «Ya revisaste esta nota…». |
| Asistencia, 1280 px | Dos columnas; cada tarjeta mide 469 × 122 px y cada botón 106 × 44 px. Ocho estudiantes ocupan 524 px. |
| Asistencia, 1600 px | Tres columnas. |
| Menú del docente | Sin «Presentaciones». |
| Lista de revisión, 1440 px | «Sin entrega» con punto gris y «Ajustada» con punto verde. La ruta de navegación ocupa una línea. |

Un defecto apareció en esta comprobación y se corrigió: tras el primer rechazo, el lote perdía al usuario cargado y la segunda entrega fallaba con un error interno. Lo cubre `test_reloads_the_teacher_after_each_rollback`.

## Recursos

Recorrido por API contra el backend local, con un recurso existente:

| Paso | Respuesta |
| --- | --- |
| Catálogo, lista, detalle, recursos de la materia | 200 |
| Duplicar | 201 |
| Asignar como apoyo, cambiar visibilidad, retirar apoyo | 200 |
| Convertir en evaluación | 201, queda en borrador |
| Borrar la copia | 204 |
| Generar un crucigrama con la IA apagada | 500 antes de la corrección; la prueba unitaria fija el 503 |

En el navegador, el crucigrama se abre y el diálogo «Descargar» ofrece PDF para estudiantes, solucionario y PDF para imprimir.

## Lo que no se comprobó

- El lote con entregas que sí se recalifican: en local no hay IA ni worker de calificación. La reapertura es la misma función de la acción individual.
- La generación de recursos con IA real y el contenido de los PDF: en local no hay proveedor de IA.
- Teléfono real y modo oscuro.
- Las pruebas de extremo a extremo; corren en la CI.

## Después de desplegar

1. Abrir una evaluación con notas «Requiere revisión», elegir «Más acciones › Recalificar no revisadas» con una sola entrega y comparar el resultado con el historial.
2. Generar un recurso de cada tipo e imprimir uno.
