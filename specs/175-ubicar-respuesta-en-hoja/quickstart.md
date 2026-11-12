# Validación: Ubicar la respuesta en la hoja al revisar una calificación

## Pruebas

```
python -m pytest backend/tests/unit/test_answer_location.py -q
  15 passed

python -m pytest backend/tests/unit -q -k "not evidence_scan and not pdf_service"
  2070 passed, 7 skipped, 171 deselected

npx vitest run            (frontend completo)
  209 archivos, 1564 pruebas: pasan

npx tsc --noEmit -p .  y  npx eslint src
  sin errores ni avisos
```

Antes de la corrección, `test_answer_location.py` no podía importarse. Las pruebas de backend excluidas son las que no corren en Windows (`test_evidence_scan*` y `test_pdf_service`); corren en la CI.

## Comprobación en el navegador (2026-11-12)

Aplicación local con el backend de esta rama, un docente de prueba y una nota de cinco preguntas con una hoja de muestra. Las zonas de las preguntas 1 y 2 se escribieron a mano en la base local; las de las preguntas 3 y 4 las guardó el servicio nuevo.

| Pantalla | Resultado |
| --- | --- |
| Pregunta con zona, 1440 × 900 px | La hoja se acerca a la zona y la rodea con un recuadro. El marco mide 752 × 468 px; antes, 320 px de alto. |
| «Ver hoja completa» y luego pulsar la respuesta | La ampliación pasa de 100 % a 523 %: la hoja vuelve a la zona. |
| Pregunta sin zona, primer intento ya hecho | Aviso «La IA no encontró esta respuesta la primera vez…» y botón «Ubicar respuestas con IA». |
| Pulsar el botón sin proveedor de visión | 503 y el aviso «La IA no pudo ubicar las respuestas en este momento. No cambió nada…». Nada se guarda. |
| Pregunta sin zona tras dos búsquedas | Solo el aviso de que la IA no la distingue; sin botón. |
| Teléfono, 360 px | La comparación de respuestas mide 103 px, como antes; la respuesta es un botón de 322 × 50 px; no hay desplazamiento horizontal. |
| Modo oscuro, 1440 px | Avisos, botón y recuadro se leen. |

## Guardado contra la base local real

Un script llamó a `locate_answers` con una sesión real y una lectura simulada, construida con los modelos del lector (`VisionExtraction`, `ExtractedAnswer`):

| Comprobación | Resultado |
| --- | --- |
| Contexto enviado a la lectura | Identificadores 1 a 5, ruta `calificacion.extraccion` |
| Resultado | 2 ubicadas, 1 pendiente, intento 2 de 2 |
| Nota (`updated_at`, estado, nota confirmada) | Sin cambios |
| Puntajes de las cinco preguntas | Sin cambios |
| Desglose | Misma versión; las zonas quedan en `procedencia_json.zonas_ubicadas` |
| Emparejamiento | La pregunta 3 por identificador; la 4 por número único |

Con la ruta de IA local, que no tiene modelo de visión, el lector responde `vision_failed_permanent` y el servicio lo convierte en 503.

## Lo que no se comprobó

- **La lectura con IA real**: en local no hay proveedor de visión. No se sabe aún cuántas respuestas ubica ni qué tan ajustado queda el recuadro en hojas antiguas.
- Entregas de varias hojas y entregas con manifiesto de páginas preparadas, más allá de las pruebas unitarias.
- Un teléfono real.
- Las pruebas de extremo a extremo; corren en la CI.

## Después de desplegar

1. Abrir una nota calificada antes del 30 de octubre, entrar a una pregunta y pulsar «Ubicar respuestas con IA». Comprobar cuántas ubica, que el recuadro cae sobre la respuesta y que la nota no cambió.
2. Revisar en el registro de uso de IA la duración y el costo de esa lectura.
3. Repetir con una entrega de dos o más hojas.
