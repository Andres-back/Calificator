# Modelo de datos: Decoración visual transversal

La funcionalidad no introduce entidades persistentes, relaciones, migraciones ni estados de negocio.

## Conceptos visuales

### Ambientación de aplicación

- **Rol visual**: profesor o estudiante.
- **Tema**: claro u oscuro.
- **Recurso**: ilustración decorativa opcional.
- **Estado de carga**: disponible o ausente; ambos deben mantener la interfaz utilizable.

### Superficie decorada

- **Tipo**: contenedor principal, cabecera, tarjeta o estado vacío.
- **Jerarquía**: contenido y controles siempre por encima de la decoración.
- **Interacción**: ninguna; no recibe foco, eventos ni nombre accesible.

### Registro local de recorrido

- **Identidad**: rol, identificador de guía y versión.
- **Estado**: presentada o pendiente.
- **Persistencia**: `localStorage` tolerante a indisponibilidad; no contiene información académica ni personal.
- **Transición**: pendiente → presentada al abrirse automáticamente; una reapertura manual no cambia datos de negocio.

No existen transiciones de negocio. Cambiar rol, tema o ruta solo selecciona una presentación visual ya derivada del estado actual.
