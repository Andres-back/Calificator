# Especificación: Estudiantes en mosaico mientras no hay uno seleccionado

**Rama**: `codex/149-revision-mosaico` | **Creada**: 2026-11-05 | **Estado**: Aprobada (`spec-approved`, `plan-approved`) | **Issue**: [#315](https://github.com/Andres-back/Calificator/issues/315)

**Entrada**: pedido del usuario en el chat (2026-11-05) con captura de "Ver notas" de una evaluación: "mientras no se seleccione un estudiante podemos hacer que salgan en mosaico y ocupen la pantalla".

## Escenarios de usuario y pruebas

### Historia 1 - Ver a todo el curso de un vistazo (Prioridad: P1)

Como docente, al abrir las notas de una evaluación quiero ver a los estudiantes como tarjetas en varias columnas que ocupen la pantalla, en lugar de una lista angosta junto a un panel vacío con "Selecciona un estudiante para ver el detalle.".

**Prueba independiente**: en 1440px sin estudiante seleccionado, la lista ocupa todo el ancho, muestra 3 o más columnas y el panel vacío no aparece.

**Aceptación**:
1. **Dado** una evaluación sin estudiante seleccionado, **cuando** la abro en pantalla ancha, **entonces** los estudiantes se muestran en mosaico (varias columnas) a todo el ancho y no aparece el texto "Selecciona un estudiante para ver el detalle.".
2. **Dado** el mosaico, **cuando** elijo un estudiante, **entonces** se abre su detalle como hasta ahora, y "Mostrar estudiantes" vuelve a la lista angosta de una columna.
3. **Dado** el mosaico, **cuando** uso buscar, filtrar por estado, marcar casillas o "Más estudiantes", **entonces** funcionan igual que en la lista.

### Casos límite

- Móvil (menos de 640px): una columna, como hoy.
- "Revisión completada" se sigue mostrando cuando corresponde.
- Mensajes de carga, error, sin matriculados y sin resultados no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: Sin estudiante seleccionado, la lista DEBE ocupar el ancho disponible y mostrar las tarjetas en una cuadrícula adaptable (1 columna en móvil, 2 en tableta, 3 en escritorio y 4 en pantallas muy anchas).
- **FR-002**: Sin estudiante seleccionado y sin "Revisión completada", el panel de detalle vacío NO DEBE mostrarse.
- **FR-003**: Con un estudiante seleccionado, la lista lateral DEBE seguir en una columna.
- **FR-004**: En el mosaico, buscar y filtrar DEBEN quedar en una sola fila desde tableta.
- **FR-005**: DEBE existir una prueba de regresión que falle con el código anterior.

### Entidades clave

Ninguna. Solo frontend; sin cambios de datos ni de contrato.

## Criterios de éxito

- **SC-001**: En 1440px se ven al menos 3 estudiantes por fila sin desplazamiento horizontal.
- **SC-002**: Las pruebas de revisión existentes siguen en verde.
