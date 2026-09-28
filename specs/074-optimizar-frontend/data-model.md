# Modelo de estado: Optimizar fluidez y organización del frontend

No se crean tablas, endpoints ni entidades persistentes. Los siguientes estados existen solo durante la sesión del navegador.

## Consulta de calificaciones

| Campo | Tipo | Regla |
|---|---|---|
| `searchTerm` | texto local | Se actualiza en cada pulsación y controla el campo visible. |
| `debouncedSearchTerm` | texto estable | Cambia 300 ms después de la última pulsación; forma parte de la clave remota. |
| `previousData` | página en caché | Permanece visible durante la transición; no se presenta como resultado final si la consulta falla. |

**Transición**: vacío → escribiendo → estable/consultando → resultado o error recuperable.

## Seguimiento de proceso

| Estado | Intervalo permitido |
|---|---|
| estable, confirmado, publicado, cerrado, error | ninguno |
| queued, running, recibida con evidencia, procesando | intervalo acotado existente |

**Transición**: el intervalo se detiene inmediatamente al alcanzar un estado terminal.

## Recurso visual responsivo

| Variante | Uso | Restricción |
|---|---|---|
| pequeña | logo e iconos de marca | dimensión cercana al tamaño mostrado; transparencia preservada |
| media | Xali y estados vacíos | carga diferida salvo elemento principal visible |
| amplia | héroes y patrones | calidad suficiente para el ancho de la composición |

Los PNG originales permanecen como fuente; el consumidor usa WebP.

## Navegación de materia

| Campo | Origen | Regla |
|---|---|---|
| ruta | React Router | única fuente de la sección activa |
| pestañas permitidas | permisos actuales | no se muestran ni navegan secciones sin permiso |
| selección móvil | ruta activa | al cambiar, navega al mismo destino de la pestaña de escritorio |

No se replica autorización en estado local.
