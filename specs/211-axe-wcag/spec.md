# Especificación: Revisión automática de reglas WCAG con axe

**Rama**: `codex/211-axe-wcag` | **Creada**: 2026-11-20 | **Estado**: Aprobada e implementada | **Issue**: [#443](https://github.com/Andres-back/Calificator/issues/443)

**Entrada**: en la revisión de usabilidad y accesibilidad se propuso añadir revisión automática de reglas WCAG (axe) en las pantallas principales; el usuario respondió «adelante» y autorizó instalar `@axe-core/playwright`.

## Hallazgo inicial

La primera pasada de axe (WCAG 2.0, 2.1 y 2.2, niveles A y AA) en cinco pantallas, en claro y oscuro, en 390 y 1366 px, encontró:

| Regla | Dónde | Causa |
| --- | --- | --- |
| `label-content-name-mismatch` (2.5.3) | botón de cuenta en todas las pantallas con sesión | la etiqueta «Abrir menú de cuenta de …» no contenía las iniciales visibles |
| `label-content-name-mismatch` (2.5.3) | tarjetas «Respuestas y puntajes», «Evidencia», «Retroalimentación», «Historial» | la etiqueta era solo el título, pero la tarjeta muestra también la descripción |
| `aria-prohibited-attr` (4.1.2) | contenedor «Vista de la revisión» | `aria-label` en un `div` sin rol |
| `color-contrast` (1.4.3) | inicio del docente en oscuro | falso positivo: se medía en plena transición de colores al cambiar de tema |

## Escenarios de usuario y pruebas

### Historia 1 - Un problema WCAG nuevo no llega a main (Prioridad: P1)

**Aceptación**:
1. **Dadas** las pantallas principales, **cuando** corre la suite de accesibilidad, **entonces** axe no encuentra violaciones WCAG A ni AA, en claro y oscuro, en celular y computador.
2. **Dado** un cambio que introduce una violación, **entonces** la prueba falla y nombra la regla, el elemento y la pantalla.

## Requisitos

### Requisitos funcionales

- **FR-001**: Una prueba DEBE analizar con axe (etiquetas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22a`, `wcag22aa`) el inicio de sesión, el inicio del docente, una materia, la revisión de una calificación y la retroalimentación del estudiante, en claro y oscuro, en 390 y 1366 px.
- **FR-002**: El tema DEBE fijarse antes de cargar la pantalla, con movimiento reducido, para no medir colores en transición.
- **FR-003**: Las tarjetas de revisión DEBEN tomar su nombre del título visible y anunciar la descripción con `aria-describedby`, sin cambiar su nombre accesible.
- **FR-004**: Las iniciales del botón de cuenta DEBEN ser un avatar decorativo (contenido generado por CSS, oculto al lector de pantalla), sin cambiar el nombre accesible del botón.
- **FR-005**: El contenedor «Vista de la revisión» DEBE tener `role="region"`.
- **FR-006**: `@axe-core/playwright` y `axe-core` DEBEN instalarse como dependencias de desarrollo con versión exacta (4.14.0).

## Criterios de éxito

- **SC-001**: La suite de accesibilidad pasa completa (36 pruebas: 16 previas y 20 de axe).
- **SC-002**: Las pruebas de interfaz de componentes y calificaciones siguen pasando.
