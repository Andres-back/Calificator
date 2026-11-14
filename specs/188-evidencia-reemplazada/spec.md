# Especificación: Tras cambiar la evidencia o recalificar, las respuestas son de la hoja nueva

**Rama**: `codex/188-evidencia-reemplazada` | **Creada**: 2026-11-14 | **Estado**: Aprobada e implementada | **Issue**: [#396](https://github.com/Andres-back/Calificator/issues/396)

**Entrada**: el usuario reportó que, después de corregir la evidencia de una entrega, la reemplazó y borró la anterior, seguían saliendo respuestas de la hoja anterior.

## Evidencia (producción, solo lectura)

| Hora (UTC, 13-nov) | Hecho |
| --- | --- |
| 21:36 | Calificación original (versión 1, automática). |
| 22:12 | La docente ajusta la pregunta 1 (versión 2, origen «docente»). |
| 22:17 | Cambia la evidencia por otra foto; el trabajo de calificación termina con éxito. |
| 22:34 | Recalificación en lote; el trabajo termina con éxito. |
| 22:53–22:55 | Ajustes docentes (versiones 3–5) sobre las respuestas de la hoja anterior. |

Ninguno de los dos trabajos creó un desglose: todas las versiones citan la corrida original. La lectura nueva sí quedó en la entrega.

## Causa

`create_automatic_breakdown` no reemplaza un desglose activo de origen distinto de «automatico». Protege decisiones docentes, pero también las conserva cuando el docente pidió recalificar o cambiar la evidencia.

## Escenarios de usuario y pruebas

### Historia 1 - La evidencia nueva manda (Prioridad: P1)

**Aceptación**:
1. **Dada** una calificación con ajustes docentes, **cuando** el docente cambia la evidencia o recalifica, **entonces** el resultado nuevo reemplaza el desglose y los ajustes anteriores quedan en el historial.
2. **Dada** una corrida que nadie pidió después del ajuste, **entonces** el desglose docente se conserva.

### Casos límite

- Una nota publicada o revisada se conserva como antes; recalificar ya la reabre y exige confirmación.

## Requisitos

### Requisitos funcionales

- **FR-001**: Si después del desglose docente activo existe una revisión «recalificar» o «cambiar_evidencia», el resultado automático DEBE reemplazarlo, y el anterior DEBE quedar inactivo en el historial.
- **FR-002**: Sin esa revisión posterior, el desglose docente DEBE conservarse.

## Criterios de éxito

- **SC-001**: Tras cambiar la evidencia, las respuestas mostradas son las de la hoja nueva.
- **SC-002**: Las pruebas existentes de calificación y desglose siguen pasando.
