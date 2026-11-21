# Especificación: Criterio de accesibilidad y usabilidad

**Rama**: `codex/209-criterio-accesibilidad` | **Creada**: 2026-11-20 | **Estado**: Aprobada e implementada | **Issue**: [#439](https://github.com/Andres-back/Calificator/issues/439)

**Entrada**: el usuario pidió revisar los criterios de usabilidad y accesibilidad y cómo se manejan. Ante la recomendación de fijar el criterio por escrito, correr la suite de accesibilidad en CI y añadir revisión automática WCAG, respondió «adelante».

## Hallazgo

- El principio V de la constitución pide accesibilidad, pero no fija un estándar ni criterios comprobables.
- Ninguna spec ni la tesis citan WCAG.
- Los criterios para docentes mayores (táctil, lenguaje llano, avisos con siguiente paso) se aplican caso a caso.

## Escenarios de usuario y pruebas

### Historia 1 - Un criterio común (Prioridad: P1)

**Aceptación**:
1. **Dada** una spec que cambia pantallas, **cuando** se valida, **entonces** existe una guía con criterios comprobables y su forma de verificación.
2. **Dada** la constitución, **entonces** declara WCAG 2.2 nivel AA y enlaza la guía.

## Requisitos

### Requisitos funcionales

- **FR-001**: El principio V DEBE adoptar WCAG 2.2 nivel AA para las pantallas de docentes y estudiantes, con objetivos táctiles de 44 × 44 px y avisos con causa y siguiente paso, y exigir que las verificaciones automáticas corran en CI.
- **FR-002**: La constitución DEBE pasar a la versión 1.1.0 (ampliación material de un principio), con su informe de impacto y fecha de enmienda.
- **FR-003**: `docs/accesibilidad-usabilidad.md` DEBE listar criterios comprobables agrupados en perceptible, operable, comprensible y robusto, cada uno con su referencia WCAG y su forma de verificación.
- **FR-004**: La guía DEBE incluir los criterios propios de usabilidad para docentes mayores, cómo se mide la usabilidad y lo que todavía no se cubre.
- **FR-005**: La guía de Spec Kit DEBE pedir el recorrido de accesibilidad y usabilidad en las specs que cambien pantallas.

## Criterios de éxito

- **SC-001**: Las specs 210 (CI de accesibilidad) y 211 (revisión automática WCAG) se apoyan en esta guía.
- **SC-002**: La gobernanza de specs sigue pasando.
