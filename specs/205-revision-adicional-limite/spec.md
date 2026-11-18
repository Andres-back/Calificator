# Especificación: La revisión adicional de calificación no agota su límite de salida

**Rama**: `codex/205-revision-adicional-limite` | **Creada**: 2026-11-18 | **Estado**: Aprobada e implementada | **Issue**: [#429](https://github.com/Andres-back/Calificator/issues/429)

**Entrada**: al revisar con el usuario que la IA obedezca al panel se encontró que la etapa «revisión adicional» fallaba en producción; el usuario pidió revisarla.

## Hallazgo

En 14 días la etapa falló 60 veces con `output_budget_exhausted` y terminó 10. Las 60 fallas consumieron exactamente 1.024 tokens de salida, el límite fijo de la llamada; las 10 correctas usaron entre 778 y 1.010. La respuesta pide dos textos libres sin extensión máxima.

Al fallar, la nota queda como el promedio de los dos evaluadores, con confianza 0, sin retroalimentación integrada y marcada para revisión del docente.

## Escenarios de usuario y pruebas

### Historia 1 - La discrepancia se resuelve (Prioridad: P1)

**Aceptación**:
1. **Dadas** dos calificaciones que no coinciden, **cuando** se pide la revisión adicional, **entonces** la llamada dispone de 2.048 tokens de salida.
2. **Dada** la instrucción de la revisión adicional, **entonces** indica la extensión máxima del análisis, de la retroalimentación integrada y de la alerta.

### Casos límite

- Calificaciones cercanas: sigue habiendo consenso sin llamada adicional.
- Falta la nota de un evaluador: sigue sin iniciarse la revisión adicional.
- La llamada falla por otra causa: se conserva el promedio marcado para revisión.

## Requisitos

### Requisitos funcionales

- **FR-001**: La revisión adicional DEBE enviarse con un límite de salida de 2.048 tokens.
- **FR-002**: La instrucción DEBE pedir el análisis en máximo 3 frases, la retroalimentación integrada en máximo 4 y la alerta en una.
- **FR-003**: La forma de la respuesta, la regla de consenso y el comportamiento ante fallos NO DEBEN cambiar.

## Criterios de éxito

- **SC-001**: Las pruebas del comparador y del presupuesto de salida siguen pasando.
- **SC-002**: Tras el despliegue, los registros de uso de la etapa dejan de mostrar `output_budget_exhausted` como resultado mayoritario.
