# Especificación: La prueba del aviso de evaluación asignada no depende de la velocidad del runner

**Rama**: `codex/169-prueba-aviso-asignada` | **Creada**: 2026-11-11 | **Estado**: Implementada como hotfix; falta que el usuario registre `spec-approved` | **Issue**: [#357](https://github.com/Andres-back/Calificator/issues/357)

**Entrada**: la prueba de Vitest «warns clearly when editing an already assigned evaluation without filling the screen» falló en la CI de `main` el 2026-11-10 y en el primer intento de los PR #352 y #354 el 2026-11-11. Ninguno de esos cambios toca el aviso. Al fallar, los trabajos E2E del frontend se omiten y el PR queda en rojo.

## Escenarios de usuario y pruebas

### Historia 1 - La CI no falla por una animación (Prioridad: P1)

Como quien revisa un PR, quiero que la prueba del aviso de evaluación asignada pase o falle por el comportamiento del aviso, para que un runner lento no deje en rojo cambios que no lo tocan.

**Prueba independiente**: la prueba espera a que el texto del aviso sea visible en vez de comprobarlo una sola vez.

### Casos límite

- Si el aviso nunca llega a ser visible, la prueba sigue fallando al agotar la espera.
- El resto de comprobaciones de la prueba no cambia: el aviso empieza cerrado, se abre al pulsarlo y el botón «Agregar pregunta» sigue presente.

## Requisitos

### Requisitos funcionales

- **FR-001**: La prueba DEBE esperar la visibilidad del texto del aviso después de abrirlo.
- **FR-002**: La prueba DEBE seguir fallando si el texto no llega a ser visible.
- **FR-003**: El código del producto NO DEBE cambiar.

### Entidades clave

- Ninguna. Solo cambia una prueba.

## Criterios de éxito

- **SC-001**: La prueba pasa en la CI del PR sin repetir el trabajo.
- **SC-002**: La prueba de regresión del aviso conserva todas sus comprobaciones.
