# Validación: Spec 156

Entorno local: Windows 11 y Python 3.13. Las llamadas reales se hicieron en local, sin base de datos y sin tocar producción, con `gpt-6-luna` (el modelo de producción) y un tope automático por corrida. Las hojas son copias anonimizadas de 3 evaluaciones reales. No se guardan en el repositorio.

## PR 1: lectura completa

### Pruebas primero (RED)

| Prueba | Resultado antes del cambio |
| --- | --- |
| `pytest tests/unit/test_reading_completeness.py` | ❌ error de colección: el módulo no existía |

### Después de la corrección (GREEN)

| Comando | Resultado |
| --- | --- |
| `pytest test_reading_completeness test_evaluation_digitalization test_document_digitalization test_digitalization_queue test_visual_digitalization_worker` | ✅ 85 |
| `build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ inventario vigente y 67 pruebas |
| `pytest tests/unit` completo | 2056 aprobadas y 13 fallidas; las mismas 13 fallan en `main` en Windows (escaneo de evidencias, enlaces y versión de fpdf) |

### Con el modelo real

| Prueba | Resultado |
| --- | --- |
| Experimento inicial, 20 llamadas | La hoja del cuento quedó como "La liebre y la tortuga (lectura)"; en otra corrida, como un resumen entre paréntesis |
| Primera versión del detector | No reconoció el resumen entre paréntesis y dio un falso positivo con "responde las preguntas 1 a 10" |
| Detector final sobre las 8 transcripciones reales guardadas | ✅ marca las 2 incompletas y ninguna de las 6 completas |
| Relectura con el prompt literal de la hoja del cuento, 1 llamada | ✅ cuento completo, sin volver a marcarse; 29,8 s |
| Tres hojas con lectura completa | ✅ ninguna llamada adicional en juguetes ni cuento; el clima tuvo un falso positivo que el detector final ya no produce |

Llamadas reales en total para este PR: 20 del experimento, 3, 5 y 1. Costo aproximado de lista: 0,05 USD.

### Límites

- El modelo no siempre falla igual: la misma hoja salió completa en una corrida y resumida en otra. La relectura cubre el fallo cuando ocurre, pero no se midió su frecuencia.
- El umbral de 40 palabras de prosa puede no detectar una lectura muy corta que se resumió. En ese caso, el borrador queda como antes.

## PR 2: hojas pendientes y avance por hoja

### Pruebas primero (RED)

| Prueba | Resultado antes del cambio |
| --- | --- |
| Pruebas nuevas de hojas faltantes y numeración en `test_reading_completeness.py` | ❌ 5 fallas, incluida la regresión "PÁGINA 1" del PR 1 |

Las pruebas del aviso por hoja, del worker y del monitor se escribieron junto con su código: no se registró una ejecución en rojo.

### Después de la corrección (GREEN)

| Comando | Resultado |
| --- | --- |
| `pytest` de lectura completa, digitalización, cola, worker visual y extractor de visión | ✅ 134 |
| `vitest src/modules/evaluaciones`, `tsc` y `eslint` de los archivos cambiados | ✅ 241, sin errores |
| `build_system_inventory.py --write` y `pytest tests/spec_governance` | ✅ inventario vigente y 67 pruebas |

### Con el modelo real

| Prueba | Resultado |
| --- | --- |
| Evaluación del clima, 2 hojas, 3 llamadas | ✅ esta vez no se perdió ninguna hoja; avance "1 de 2" y "2 de 2"; 58,7 s |
| Hoja 2 perdida a propósito, solo la hoja 1 devuelta en la primera lectura; 1 llamada | ✅ la hoja 2 se relee sola en 25,4 s, queda numerada como hoja 2 con su lectura y las preguntas 11 a 20; los avisos genéricos se reemplazan por "Se volvió a leer la hoja 2" |

### Límites

- La pérdida real de la hoja 2 del experimento inicial no se repitió: la recuperación se comprobó forzando la pérdida.
- Si la relectura también falla, el borrador nombra la hoja, pero el profesor no puede releerla desde ese borrador: debe digitalizar de nuevo esa hoja.
