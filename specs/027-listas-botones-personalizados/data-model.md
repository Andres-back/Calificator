# Modelo de datos

No se modifican entidades persistentes. La vista deriva dos estados locales:

- `query: string`: texto normalizado para buscar título, materia y tipo.
- `category`: filtro seleccionado entre Todos, Juego, Evaluación y Material.

El resultado visible es una proyección de la respuesta existente de `listMaterials()`.
