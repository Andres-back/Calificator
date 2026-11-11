# Plan: Acciones dentro de su contenedor y encabezados consistentes

**Spec**: [spec.md](spec.md) | **Issue**: [#353](https://github.com/Andres-back/Calificator/issues/353)

## Diagnóstico

- `MateriaManagement` dibuja sus dos botones en un bloque propio. `MateriaDetailPage` lo coloca entre el encabezado y las pestañas, y `MateriasListPage` debajo de cada tarjeta.
- En `MateriaVistaGeneral`, el título, el conteo y cuatro botones comparten un contenedor flexible que se parte sin orden.
- Reportes muestra `PageHeader` y, debajo, una tarjeta con el mismo título.
- `MateriaAsistencia` dibuja sus tres acciones en una fila suelta, alineada a la derecha, encima de la tarjeta «Tomar asistencia».
- En `DashboardEstudiante`, la imagen decorativa del héroe se dibuja también por debajo de 640 px, donde no hay espacio reservado para ella.
- En `MateriasListPage`, el estudiante con materias ve una tarjeta de bienvenida entre el encabezado y la lista; su imagen tiene fondo blanco.
- Recursos y Pendientes escriben un título compacto. Las specs 095 y 104 lo decidieron así para que el contenido aparezca antes; no se cambia.

## Decisión

Varios PRs pequeños, solo de frontend. Las acciones siguen visibles: se ordenan, no se esconden en un menú.

**PR 1, materias**:

- `MateriaManagement` acepta clases para su contenedor y para el grupo de botones, y marca el grupo con `role="group"` y el nombre de la materia.
- `MateriaDetailPage` lo dibuja dentro del encabezado: a la derecha en pantallas anchas, en dos columnas debajo del título en el teléfono.
- `MateriasListPage`: la tarjeta pasa a ser el contenedor; el enlace ocupa el cuerpo y las acciones el pie.
- `MateriaVistaGeneral`: título y conteo en una fila; debajo, el grupo «Acciones de estudiantes» en cuadrícula de dos columnas, con la acción principal primero.

**PR 2, pantallas restantes de docente y estudiante**:

- `ReportesPage`: se quita la tarjeta que repite el encabezado.
- `MateriaAsistencia`: las tres acciones pasan a la tarjeta «Tomar asistencia», con la principal primero.
- `DashboardEstudiante`: la imagen decorativa se oculta por debajo de 640 px.
- `MateriasListPage`: la bienvenida del estudiante se oculta por debajo de 640 px y su imagen se funde con el fondo en el tema claro.

**PR 3**: evaluaciones y calificación, cuando se fusionen las correcciones en curso.

Descartado:

- **Reunir las acciones en un menú**: quita botones de la vista, pero los docentes dejan de ver qué pueden hacer y obliga a cambiar las pruebas de extremo a extremo.
- **Rediseñar tarjetas o colores**: el sistema visual ya es consistente; el problema es de organización.

## Alcance técnico del PR 1

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/materias/MateriaManagement.tsx` | clases opcionales y grupo accesible |
| `frontend/src/modules/materias/MateriaDetailPage.tsx` | acciones dentro del encabezado |
| `frontend/src/modules/materias/MateriasListPage.tsx` | acciones en el pie de la tarjeta |
| `frontend/src/modules/materias/MateriaVistaGeneral.tsx` | título, conteo y cuadrícula de acciones |
| pruebas de esos tres componentes | un caso nuevo en cada una |

## Riesgos

- Las pruebas de extremo a extremo que ubican estos botones por posición podrían fallar. Los nombres no cambian; se confirma en la CI.
- «Eliminar de mis materias» y «Registrar manualmente» ocupan dos líneas dentro de su botón a 375 px. Se prefirió eso a acortar el texto.
- La comprobación visual se hizo en un navegador de escritorio a 375 px, no en un teléfono real.
