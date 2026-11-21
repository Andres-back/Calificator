# Especificación: Correr la suite de accesibilidad en cada PR

**Rama**: `codex/210-accesibilidad-en-ci` | **Creada**: 2026-11-20 | **Estado**: Aprobada e implementada | **Issue**: [#441](https://github.com/Andres-back/Calificator/issues/441)

**Entrada**: en la revisión de usabilidad y accesibilidad se encontró que la suite de accesibilidad no corre en CI. El usuario aprobó corregirlo («adelante»).

## Hallazgo

`frontend/e2e/accessibility` tiene 4 archivos y 16 pruebas: nombres accesibles, tamaño táctil, foco y teclado, diálogos, reflow con zoom al 200 % y modo claro y oscuro de 360 a 1920 px. Pasan en local. Pero la configuración principal de Playwright excluye esa carpeta y ningún trabajo de CI ejecuta `npm run test:a11y`.

## Escenarios de usuario y pruebas

### Historia 1 - Una regresión de accesibilidad no llega a main (Prioridad: P1)

**Aceptación**:
1. **Dado** un PR, **cuando** corre CI, **entonces** se ejecuta la suite de accesibilidad.
2. **Dado** que una prueba de accesibilidad falla, **entonces** se suben los diagnósticos y se cancela la ejecución, como en las demás pruebas.

## Requisitos

### Requisitos funcionales

- **FR-001**: El trabajo de regresiones contextuales DEBE ejecutar `npm run test:a11y -- --reporter=line --max-failures=1` en un paso propio (`id: a11y`), antes de subir los diagnósticos.
- **FR-002**: Un fallo de ese paso DEBE cancelar la ejecución, igual que un fallo de las pruebas contextuales.
- **FR-003**: Una prueba de gobernanza DEBE fallar si el paso desaparece, deja de cortar en el primer fallo o la suite queda vacía.

## Criterios de éxito

- **SC-001**: La CI de este PR ejecuta las 16 pruebas de accesibilidad y pasa.
- **SC-002**: La gobernanza de specs pasa.
