# Especificación: Acciones dentro de su contenedor y encabezados consistentes

**Rama**: `codex/168-organizacion-visual` | **Creada**: 2026-11-11 | **Estado**: Borrador | **Issue**: [#353](https://github.com/Andres-back/Calificator/issues/353)

**Entrada**: el usuario pidió dejar el frontend organizado en todas las vistas, sin elementos amontonados ni descuidados.

## Evidencia

Recorrido de la aplicación local el 2026-11-11 con un docente de prueba, a 1440 px y a 375 px.

| Pantalla | Qué se ve |
| --- | --- |
| Detalle de la materia | «Editar materia» y «Eliminar de mis materias» quedan sueltos entre el encabezado y las pestañas. En el teléfono ocupan dos filas completas. |
| Panel de estudiantes | El título comparte fila con el conteo y cuatro botones. En escritorio «Estudiantes» se parte en dos líneas. En el teléfono los botones se apilan en cuatro filas de ancho distinto y la lista queda fuera de la primera pantalla. |
| Lista de materias | Las dos acciones de cada materia cuelgan debajo de la tarjeta, fuera de ella. |
| Recursos, Pendientes, Reportes | Cada una usa un encabezado distinto; Reportes lo repite en dos tarjetas seguidas. |

## Escenarios de usuario y pruebas

### Historia 1 - Las acciones de la materia están en su sitio (Prioridad: P1)

Como docente, quiero ver las acciones de una materia dentro de su tarjeta o de su encabezado, para encontrar el contenido sin desplazarme entre botones sueltos.

**Aceptación**:
1. **Dado** el detalle de una materia que puedo administrar, **cuando** se carga, **entonces** «Editar materia» y «Eliminar de mis materias» están dentro del encabezado, en una sola fila en el teléfono.
2. **Dada** la lista de materias, **cuando** se carga, **entonces** las acciones de cada materia están dentro de su tarjeta y no dentro del enlace que la abre.
3. **Dado** el panel de estudiantes, **cuando** se carga, **entonces** el título y el conteo ocupan una fila, y las cuatro acciones forman una cuadrícula de dos columnas en el teléfono.
4. **Dado** un docente sin permiso para editar la materia, **cuando** abre las mismas pantallas, **entonces** no aparece ninguna acción ni un espacio vacío en su lugar.

### Historia 2 - Los encabezados se parecen entre pantallas (Prioridad: P2)

Como docente, quiero que Recursos, Pendientes y Reportes empiecen igual que Materias y Presentaciones, para reconocer de un vistazo dónde estoy y cuál es la acción principal.

**Aceptación**:
1. **Dada** cualquiera de esas pantallas, **cuando** se carga, **entonces** muestra un solo encabezado, con el mismo componente que Materias.

### Casos límite

- Ningún botón cambia de nombre, de permiso ni de comportamiento.
- Las vistas del estudiante de estas pantallas no cambian en el primer PR.
- Las pantallas de evaluaciones y de calificación se ordenan al final, cuando se fusionen las correcciones en curso sobre ellas.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las acciones de una materia DEBEN mostrarse dentro de su encabezado en el detalle y dentro de su tarjeta en la lista, agrupadas con un nombre accesible.
- **FR-002**: Las acciones de estudiantes DEBEN mostrarse en un grupo propio debajo del título, en dos columnas en el teléfono.
- **FR-003**: El cambio NO DEBE alterar nombres, permisos ni comportamiento de ninguna acción.
- **FR-004**: Recursos, Pendientes y Reportes DEBEN usar un único encabezado con el componente compartido.

## Criterios de éxito

- **SC-001**: A 375 px, el primer estudiante de la lista se ve sin desplazarse en el detalle de la materia.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.
