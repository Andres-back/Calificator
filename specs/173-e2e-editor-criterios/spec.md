# Especificación: La prueba E2E del editor de criterios no mide durante la animación

**Rama**: `codex/173-e2e-editor-criterios` | **Creada**: 2026-11-11 | **Estado**: Aprobada (hotfix) e implementada | **Issue**: [#366](https://github.com/Andres-back/Calificator/issues/366)

**Entrada**: la prueba E2E «106 criterios mantiene cabecera y acciones dentro del editor» falló en `main` y, el 2026-11-11, en el fragmento 3/4 del PR #352, que no toca recursos. El error fue `expect(received).toBeGreaterThanOrEqual(expected)` al comparar la posición de la cabecera con la del diálogo.

## Escenarios de usuario y pruebas

### Historia 1 - La CI no falla por una animación (Prioridad: P1)

Como quien revisa un PR, quiero que la prueba del editor de criterios compare posiciones ya estables, para que un fallo signifique que la cabecera o los botones quedaron fuera del editor.

**Prueba independiente**: la medición de cabecera y botones se repite hasta cumplirse, y cada intento lee el diálogo y sus elementos juntos.

### Casos límite

- Si la cabecera o un botón quedan de verdad fuera del editor, la prueba sigue fallando al agotar la espera.
- El tamaño táctil de los botones y la ausencia de escrituras se siguen comprobando.

## Requisitos

### Requisitos funcionales

- **FR-001**: La prueba DEBE repetir la medición de posiciones hasta que la cabecera y los botones queden dentro del editor.
- **FR-002**: La prueba DEBE seguir fallando si esa condición no se cumple dentro de la espera.
- **FR-003**: El código del producto NO DEBE cambiar.

### Entidades clave

- Ninguna. Solo cambia una prueba E2E.

## Criterios de éxito

- **SC-001**: La prueba pasa en la CI del PR sin repetir el trabajo.
- **SC-002**: La prueba conserva todas sus comprobaciones.
