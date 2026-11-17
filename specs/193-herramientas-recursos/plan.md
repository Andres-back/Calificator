# Plan: Recursos de clase con vistas claras y completas en celular

**Spec**: [spec.md](spec.md) | **Issue**: [#407](https://github.com/Andres-back/Calificator/issues/407)

## Decisión

Solo cambia la presentación en el frontend. No cambian el contrato de datos, los permisos ni el backend.

- **Juegos**:
  - `CrucigramaView`: `grid w-full` con `repeat(cols, minmax(1.25rem, 1fr))` y ancho máximo por columnas; las celdas son `aspect-square`. Cada casilla recibe nombre accesible.
  - `SopaLetrasView`: filas `flex w-full` y celdas `flex-1 aspect-square`; el ancho máximo usa una variable por tamaño de pantalla. La lógica de selección no se toca.
  - `MatchingView`: columna central de 28 px en celular, menos relleno, `hyphens-auto` con `lang="es"`.
- **Vistas de contenido** (`ContenidoView`):
  - Taller con encabezado apilado hasta `lg`.
  - Opciones con `optionText`, que quita el prefijo solo si es la letra propia.
  - Etiquetas con `typeLabel`, `difficultyLabel` y `pointsLabel` (nuevo `resourceLabels.ts`).
  - Botones y porcentajes con `whitespace-nowrap`.
  - Ficha con `whitespace-pre-line`.
  - Tarjetas con pista y botones rotulados.
- **Instrucciones**: nuevo `ResourceInstructions`, usado por `DetailPage` y `StudentResourcePage`; no pinta nada si la vista del tipo ya las muestra.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/herramientas/views/CrucigramaView.tsx` | grilla ajustable |
| `frontend/src/modules/herramientas/views/SopaLetrasView.tsx` | grilla ajustable |
| `frontend/src/modules/herramientas/views/MatchingView.tsx` | texto sin partir |
| `frontend/src/modules/herramientas/views/ContenidoView.tsx` | taller, opciones, etiquetas, tarjetas, instrucciones |
| `frontend/src/modules/herramientas/views/resourceLabels.ts` | utilidades de texto (nuevo) |
| `frontend/src/modules/herramientas/DetailPage.tsx`, `StudentResourcePage.tsx` | instrucciones una sola vez |
| `frontend/src/print.css` | selector del crucigrama |
| `frontend/src/modules/herramientas/views/resourceViews193.test.tsx`, `DetailPage.test.tsx` | pruebas |
