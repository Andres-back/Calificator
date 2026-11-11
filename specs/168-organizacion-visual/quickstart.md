# Validación: Acciones dentro de su contenedor y encabezados consistentes

## PR 1 - Materias

### Pruebas

```
npx vitest run src/modules/materias
  21 archivos, 167 pruebas: pasan

npx tsc --noEmit -p .
  sin errores

npx eslint (los cuatro componentes tocados)
  sin avisos
```

Sin el cambio, las 3 pruebas nuevas fallan y las otras 164 pasan.

### Comprobación en el navegador (2026-11-11)

Aplicación local con un docente de prueba, una materia y tres estudiantes.

| Pantalla | 1440 px | 375 px |
| --- | --- | --- |
| Detalle de la materia | Las dos acciones quedan a la derecha del título, dentro del encabezado | Las dos acciones caben en una fila bajo el título |
| Panel de estudiantes | Título a la izquierda, conteo a la derecha y las cuatro acciones en una fila | Cuadrícula de dos por dos; los tres estudiantes se ven sin desplazarse |
| Lista de materias | Las acciones están en el pie de la tarjeta | No se comprobó |

No se comprobó en un teléfono real, ni el modo oscuro, ni una materia archivada.

## PR 2 - Pantallas restantes de docente y estudiante

### Pruebas

```
npx vitest run src/modules/materias src/modules/reportes src/modules/dashboard
  24 archivos, 199 pruebas: pasan

npx tsc --noEmit -p .
  sin errores

npx eslint src/modules/materias src/modules/reportes src/modules/dashboard
  sin avisos
```

Sin el cambio en `MateriasListPage.tsx`, la prueba nueva falla. Asistencia, Reportes y el inicio del estudiante no tienen una prueba nueva: su cambio es de disposición y se comprobó en el navegador.

### Comprobación en el navegador (2026-11-11)

Aplicación local con un docente y un estudiante de prueba.

| Pantalla | 1440 px | 375 px |
| --- | --- | --- |
| Reportes | Un solo encabezado; las tres cifras quedan justo debajo | No se comprobó |
| Asistencia | Las tres acciones a la derecha del título, dentro de la tarjeta | Dos acciones en una fila y el reporte en la siguiente, dentro de la tarjeta |
| Inicio del estudiante | No se comprobó | Los dos botones se ven completos, sin imagen encima |
| Mis materias del estudiante | La bienvenida sigue visible y su imagen ya no muestra el recuadro blanco | La lista empieza justo debajo de las pestañas |

No se comprobó en un teléfono real ni en modo oscuro.
