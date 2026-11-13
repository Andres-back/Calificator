# Especificación: Ubicar cada pregunta en la hoja con una cuadrícula

**Rama**: `codex/182-ubicar-cuadricula` | **Creada**: 2026-11-13 | **Estado**: Aprobada e implementada | **Issue**: [#384](https://github.com/Andres-back/Calificator/issues/384)

**Entrada**: tras la Spec 180, el usuario mostró una captura de producción en la que el recuadro de la pregunta 13 quedaba en otra parte de la hoja.

## Evidencia

| Observación | Dato |
| --- | --- |
| Zonas guardadas de la hoja 2 (solo lectura en producción) | Las 10 forman una cuadrícula inventada en el borde derecho: x = 0,65 u 0,83, filas cada 0,10, mismo tamaño. |
| Pregunta 13 real | Centro de la hoja (x ≈ 0,33–0,50); su zona apuntaba a x 0,65–0,87. |
| Prueba con Haiku, coordenadas numéricas | De lado: fuera de la hoja. Enderezada: sobre la pregunta vecina. |
| Prueba con Haiku, cuadrícula rotulada de celdas | Preguntas 13 y 16 correctas; las 10 de la hoja correctas en una sola llamada, con la foto de lado. |

## Escenarios de usuario y pruebas

### Historia 1 - El recuadro cae sobre la pregunta (Prioridad: P1)

**Aceptación**:
1. **Dada** una calificación cuyas zonas no se ubicaron con la cuadrícula, **cuando** el docente abre «Respuestas y puntajes», **entonces** las preguntas se ubican automáticamente una vez, sin avisos que interrumpan.
2. **Dada** una zona ubicada con la cuadrícula, **cuando** abro la pregunta, **entonces** el recuadro rodea la pregunta con un margen pequeño, aunque la foto esté de lado.
3. **Dado** un recuadro que no coincide, **cuando** pulso «¿El recuadro no está en la pregunta? Ubicar de nuevo», **entonces** se vuelve a ubicar, hasta dos veces.

### Casos límite

- Si la IA falla, no cambia nada y se puede volver a intentar.
- Si una hoja falla y otra no, se guarda lo encontrado.
- Números de pregunta repetidos no se adivinan.
- Los intentos de la Spec 175 no bloquean la cuadrícula.

## Requisitos

### Requisitos funcionales

- **FR-001**: La ubicación DEBE dibujar una cuadrícula rotulada sobre la misma página que ve el docente y pedir al modelo las celdas de cada pregunta, nunca coordenadas.
- **FR-002**: Las celdas DEBEN convertirse en recuadros válidos; un rectángulo de más de media hoja, una celda inexistente o un número no pedido se descartan.
- **FR-003**: Las zonas DEBEN guardarse en la procedencia del desglose, marcadas con el método, sin cambiar nota, puntajes, estados ni la huella de la devolución.
- **FR-004**: Para el docente, la zona de la cuadrícula DEBE prevalecer sobre la de la lectura; el estudiante no la recibe.
- **FR-005**: El visor DEBE dibujar la zona de la cuadrícula con un margen de 1 % y seguir ampliando las demás como en la Spec 180.
- **FR-006**: La revisión DEBE ubicar automáticamente una vez por calificación y ofrecer ubicar de nuevo, con dos intentos como máximo.

## Criterios de éxito

- **SC-001**: Con la respuesta real del modelo para la hoja de la captura, la pregunta 13 queda en el centro de la hoja (x 0,33–0,50), no en el borde derecho.
- **SC-002**: Las pruebas existentes de la revisión siguen pasando.
