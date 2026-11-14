# Plan: Secciones de la materia visibles en celular sin deslizar

**Spec**: [spec.md](spec.md) | **Issue**: [#402](https://github.com/Andres-back/Calificator/issues/402)

## Decisión

- `MateriaDetailPage.tsx`: el `nav` «Secciones de la materia» pasa a `grid` con `grid-cols-3` (más de cuatro secciones) o `grid-cols-2`; desde `sm` vuelve a `flex` con desplazamiento horizontal.
- Los enlaces se apilan (ícono arriba, nombre debajo, `min-h-16`) en celular y vuelven a la fila desde `sm`.
- Solo cambian clases; los destinos y la lógica por rol no se tocan.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/materias/MateriaDetailPage.tsx` | cuadrícula en celular |
| `frontend/src/modules/materias/MateriaDetailPage.test.tsx` | pruebas del nuevo diseño |
