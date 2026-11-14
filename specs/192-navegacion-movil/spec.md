# Especificación: Secciones de la materia visibles en celular sin deslizar

**Rama**: `codex/192-navegacion-movil` | **Creada**: 2026-11-14 | **Estado**: Aprobada e implementada | **Issue**: [#402](https://github.com/Andres-back/Calificator/issues/402)

**Entrada**: el usuario pidió revisar que todos los flujos del frontend sean responsivos y adecuados. En el recorrido en 390 px, las secciones de la materia eran una fila deslizable en la que solo se veían dos o tres; el resto quedaba cortado.

## Escenarios de usuario y pruebas

### Historia 1 - Ver todas las secciones de la materia (Prioridad: P1)

**Aceptación**:
1. **Dado** un docente en una materia desde el celular, **entonces** ve sus seis secciones a la vez, en tres columnas, sin deslizar.
2. **Dado** un estudiante en una materia desde el celular, **entonces** ve sus cuatro secciones en dos columnas.
3. **Dada** una tableta o un PC, **entonces** las secciones siguen en una fila, como antes.

### Casos límite

- Un nombre largo («Criterios de aprendizaje») pasa a dos líneas dentro del botón sin desbordar.
- Los destinos y permisos por rol no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: En celular, las secciones de la materia DEBEN mostrarse en una cuadrícula: tres columnas con más de cuatro secciones y dos con cuatro o menos; cada botón con ícono arriba, nombre debajo y al menos 64 px de alto.
- **FR-002**: Desde tableta (`sm`), las secciones DEBEN mantenerse en una fila deslizable.
- **FR-003**: La sección activa DEBE seguir resaltada, y los destinos y permisos por rol NO DEBEN cambiar.

## Criterios de éxito

- **SC-001**: En 390 px, el encabezado de la materia y todas sus secciones caben en la primera pantalla.
- **SC-002**: La página no se desplaza hacia los lados.
