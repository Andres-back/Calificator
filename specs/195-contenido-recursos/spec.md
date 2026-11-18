# Especificación: Recursos fieles al tema que pidió el docente

**Rama**: `codex/195-contenido-recursos` | **Creada**: 2026-11-16 | **Estado**: Aprobada e implementada | **Issue**: [#410](https://github.com/Andres-back/Calificator/issues/410)

**Entrada**: el usuario pidió revisar las herramientas de recursos, reparar las que fallan y perfeccionar las buenas. Al revisar el contenido que entrega cada generador se encontraron recursos que no corresponden a lo pedido.

## Evidencia

| Caso | Hecho |
| --- | --- |
| Crucigrama | Con menos de 4 palabras útiles, el código añade palabras fijas del método científico; si no logra armar la grilla, usa solo esas. |
| Relacionar pares | Con menos de 3 parejas, el código añade parejas fijas de estados de la materia. |
| Sopa de letras | Si la IA no entrega palabras, el código usa «TEMA, CLASE, EXAMEN…». |
| Parejas ambiguas | Prueba real: «Invertebrado» y «Sin columna vertebral» como respuestas distintas. |
| Cantidad | Prueba real: se pidieron 8 palabras de crucigrama y salieron 10. |
| Para colorear | Sin imagen, se guarda igual un recurso sin dibujo. |

## Escenarios de usuario y pruebas

### Historia 1 - El recurso trata del tema pedido (Prioridad: P1)

**Aceptación**:
1. **Dado** un crucigrama de historia y una IA que solo entrega 2 palabras, **entonces** no aparece ninguna palabra de otro tema; se reintenta una vez y, si persiste, el docente ve el motivo y no se guarda nada.
2. **Dada** una actividad de relacionar pares con 1 pareja válida, **entonces** ocurre lo mismo.
3. **Dada** una sopa de letras sin palabras del docente y un fallo de la IA, **entonces** el docente ve que puede reintentar.

### Historia 2 - La actividad tiene una sola respuesta correcta (Prioridad: P1)

**Aceptación**:
1. **Dadas** dos parejas con la misma respuesta (o la misma pregunta), **entonces** solo se conserva la primera.
2. **Dada** la instrucción a la IA, **entonces** exige que cada elemento corresponda a uno solo y prohíbe sinónimos y categorías que se solapan.

### Historia 3 - Lo pedido es lo entregado (Prioridad: P2)

**Aceptación**:
1. **Dado** un crucigrama de 5 palabras con 10 candidatas, **entonces** quedan como máximo 5, todas cruzadas.
2. **Dado** un fallo del servicio de imágenes en «Para colorear», **entonces** no se guarda el recurso y el mensaje dice que se puede reintentar.

### Casos límite

- Las palabras que el docente escribe para la sopa de letras siguen bastando, aunque la IA no esté disponible.
- El cuento sin ilustración se sigue guardando: el relato es útil por sí solo.
- Los recursos ya guardados no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: Los generadores de crucigrama, relacionar pares (ambas variantes) y sopa de letras NO DEBEN añadir contenido fijo ajeno a la respuesta de la IA o a las palabras del docente.
- **FR-002**: El control de calidad DEBE rechazar un crucigrama con menos de 4 palabras y una actividad de pares con menos de 3 parejas, para que actúe el reintento existente y su mensaje final.
- **FR-003**: Las parejas que repiten un lado (sin distinguir mayúsculas, tildes ni puntuación final) o cuyos dos lados son iguales DEBEN descartarse.
- **FR-004**: La instrucción de relacionar pares DEBE exigir correspondencia uno a uno y prohibir elementos equivalentes o que se solapen.
- **FR-005**: El crucigrama NO DEBE tener más palabras que las pedidas y DEBE seguir conectado.
- **FR-006**: «Para colorear» sin imagen DEBE responder 503 con un mensaje claro y NO DEBE guardar el recurso.

## Criterios de éxito

- **SC-001**: En pruebas reales con el modelo económico, cuatro actividades de pares de materias distintas salen sin respuestas ambiguas y dos crucigramas salen con la cantidad exacta pedida.
- **SC-002**: Las pruebas existentes de herramientas siguen pasando.
