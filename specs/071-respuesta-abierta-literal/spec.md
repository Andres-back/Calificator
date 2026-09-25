# Especificación: Reconocer claves literales en respuestas abiertas

**Rama**: `codex/071-respuesta-abierta-literal`

**Creado**: 2026-09-24

**Estado**: Aprobado como hotfix

**Issue**: [#147](https://github.com/Andres-back/Calificator/issues/147)

## Escenario de usuario y pruebas

### Historia 1 - Respuesta correcta con contexto adicional (Prioridad: P1)

Como docente, quiero que una respuesta abierta que comienza con la clave correcta reciba el puntaje completo aunque el estudiante continúe con una explicación pertinente.

**Prueba independiente**: Para una pregunta cuya clave es «Nico», «Nico miró emocionado por la ventana» se valida como correcta; una clave que aparece solo en medio de una negación o en la respuesta de otra pregunta no se valida automáticamente.

**Escenarios de aceptación**:

1. **Dado** que la respuesta abierta es igual a la clave o comienza con la clave completa, **cuando** se valida, **entonces** recibe el puntaje completo objetivo.
2. **Dado** que la clave aparece solo en medio de la respuesta, **cuando** se valida, **entonces** el sistema no la declara correcta automáticamente y conserva la evaluación por los modelos.
3. **Dado** que una respuesta corresponde a otra pregunta, **cuando** se valida en su renglón actual, **entonces** no recibe puntaje por coincidencias de otra clave.

### Casos límite

- La comparación ignora mayúsculas, tildes y puntuación, pero respeta palabras completas normalizadas.
- Una respuesta parcial que no contiene la clave completa al inicio no se promueve.
- No se modifican notas confirmadas, ajustadas o publicadas.

## Requisitos

- **FR-001**: El sistema DEBE aceptar como coincidencia objetiva una respuesta abierta igual a la clave normalizada.
- **FR-002**: El sistema DEBE aceptar contexto adicional únicamente cuando la respuesta normalizada comienza con la clave completa.
- **FR-003**: El sistema NO DEBE aceptar una clave que aparece únicamente en medio de la respuesta.
- **FR-004**: La coincidencia objetiva DEBE integrarse al puntaje mínimo y al consenso existentes sin cambiar la revisión docente.
- **FR-005**: El hotfix NO DEBE modificar calificaciones históricas por sí mismo.

## Criterios de éxito

- **SC-001**: El caso «Nico miró emocionado…» obtiene el punto objetivo de la primera pregunta.
- **SC-002**: Las respuestas intercambiadas o con coincidencia interna no se validan automáticamente.
- **SC-003**: Las pruebas existentes de validación objetiva, consenso y cálculo permanecen verdes.

## Supuestos

- La clave esperada fue definida o generada correctamente al crear la evaluación.
- Una coincidencia que no esté al inicio continúa bajo valoración de los modelos y revisión docente.

