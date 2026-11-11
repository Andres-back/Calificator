# Especificación: Acciones dentro de su contenedor y encabezados consistentes

**Rama**: `codex/168-organizacion-visual` | **Creada**: 2026-11-11 | **Estado**: Aprobada | **Issue**: [#353](https://github.com/Andres-back/Calificator/issues/353)

**Entrada**: el usuario pidió dejar el frontend organizado en todas las vistas, sin elementos amontonados ni descuidados.

## Evidencia

Recorrido de la aplicación local el 2026-11-11 con un docente de prueba, a 1440 px y a 375 px.

| Pantalla | Qué se ve |
| --- | --- |
| Detalle de la materia | «Editar materia» y «Eliminar de mis materias» quedan sueltos entre el encabezado y las pestañas. En el teléfono ocupan dos filas completas. |
| Panel de estudiantes | El título comparte fila con el conteo y cuatro botones. En escritorio «Estudiantes» se parte en dos líneas. En el teléfono los botones se apilan en cuatro filas de ancho distinto y la lista queda fuera de la primera pantalla. |
| Lista de materias | Las dos acciones de cada materia cuelgan debajo de la tarjeta, fuera de ella. |
| Reportes | El encabezado se repite en dos tarjetas seguidas. |
| Asistencia | Tres botones de ancho distinto, alineados a la derecha y apilados en el teléfono, antes de «Tomar asistencia». |
| Criterios de aprendizaje | En el teléfono, dos botones de ancho distinto apilados bajo el título. |
| Inicio del estudiante | En el teléfono, la imagen de Xali tapa parte del botón «Ir a mis materias». |
| Mis materias del estudiante | Una segunda tarjeta de bienvenida, con la imagen de Xali sobre un recuadro blanco, empuja la lista fuera de la primera pantalla del teléfono. |

Recursos y Pendientes usan un título compacto por decisión de specs anteriores (095 y 104), para que el contenido aparezca antes. Se conservan así.

## Escenarios de usuario y pruebas

### Historia 1 - Las acciones de la materia están en su sitio (Prioridad: P1)

Como docente, quiero ver las acciones de una materia dentro de su tarjeta o de su encabezado, para encontrar el contenido sin desplazarme entre botones sueltos.

**Aceptación**:
1. **Dado** el detalle de una materia que puedo administrar, **cuando** se carga, **entonces** «Editar materia» y «Eliminar de mis materias» están dentro del encabezado, en una sola fila en el teléfono.
2. **Dada** la lista de materias, **cuando** se carga, **entonces** las acciones de cada materia están dentro de su tarjeta y no dentro del enlace que la abre.
3. **Dado** el panel de estudiantes, **cuando** se carga, **entonces** el título y el conteo ocupan una fila, y las cuatro acciones forman una cuadrícula de dos columnas en el teléfono.
4. **Dado** un docente sin permiso para editar la materia, **cuando** abre las mismas pantallas, **entonces** no aparece ninguna acción ni un espacio vacío en su lugar.

### Historia 2 - Nada repetido ni encima de otra cosa (Prioridad: P2)

Como docente o estudiante, quiero que cada pantalla muestre una sola vez su encabezado y que ninguna imagen tape un botón, para llegar al contenido sin distracciones.

**Aceptación**:
1. **Dada** la pantalla de Reportes, **cuando** se carga, **entonces** muestra un solo encabezado.
2. **Dada** la pestaña Asistencia, **cuando** se carga, **entonces** sus tres acciones están dentro de la tarjeta «Tomar asistencia», en cuadrícula en el teléfono.
3. **Dado** el inicio del estudiante en un teléfono, **cuando** se carga, **entonces** ninguna imagen se superpone a los botones.
4. **Dada** la lista «Mis materias» del estudiante en un teléfono, **cuando** se carga, **entonces** la primera materia se ve sin desplazarse.

### Casos límite

- Ningún botón cambia de nombre, de permiso ni de comportamiento.
- Las vistas del estudiante no cambian en el primer PR; el segundo solo toca su inicio y su lista de materias.
- Las pantallas de evaluaciones y de calificación se ordenan al final, cuando se fusionen las correcciones en curso sobre ellas.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las acciones de una materia DEBEN mostrarse dentro de su encabezado en el detalle y dentro de su tarjeta en la lista, agrupadas con un nombre accesible.
- **FR-002**: Las acciones de estudiantes DEBEN mostrarse en un grupo propio debajo del título, en dos columnas en el teléfono.
- **FR-003**: El cambio NO DEBE alterar nombres, permisos ni comportamiento de ninguna acción.
- **FR-004**: Reportes DEBE mostrar un único encabezado.
- **FR-005**: Las acciones de Asistencia DEBEN mostrarse dentro de la tarjeta «Tomar asistencia», y las de Criterios de aprendizaje en una fila de dos columnas en el teléfono; ambos grupos con un nombre accesible.
- **FR-006**: En el teléfono, ninguna imagen decorativa DEBE superponerse a un botón del inicio del estudiante, y la bienvenida de «Mis materias» NO DEBE aparecer antes de la lista.

## Criterios de éxito

- **SC-001**: A 375 px, el primer estudiante de la lista se ve sin desplazarse en el detalle de la materia.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.
