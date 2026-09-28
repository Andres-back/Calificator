# Modelo de estado

No se crean entidades persistentes.

## Selección temporal

- `visibleIds`: identificadores que coinciden con la búsqueda actual.
- `selected`: identificadores seleccionados, incluidos los que puedan quedar ocultos por el filtro.
- `allVisibleSelected`: verdadero cuando existe al menos un resultado visible y todos sus identificadores están seleccionados.

## Transiciones

1. “Todos” con selección visible incompleta añade `visibleIds` sin duplicados.
2. “Todos” con selección visible completa elimina únicamente `visibleIds`.
3. Cambiar la búsqueda recalcula `visibleIds` sin alterar `selected`.
4. Confirmar utiliza `selected` mediante el contrato existente.
