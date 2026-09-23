# Modelo de datos: Identidad web y metadatos

Esta función no añade persistencia. El modelo es declarativo y vive en archivos estáticos y configuración del frontend.

## `SiteIdentity`

Representa la identidad pública estable del producto.

| Campo | Regla |
|---|---|
| `name` | “XCalificator” |
| `shortName` | Versión breve que conserva reconocimiento de marca |
| `description` | Explica plataforma educativa abierta, IA de apoyo y decisión docente |
| `canonicalOrigin` | `https://xcalificator.daimuz.com` sin parámetros |
| `locale` | Español de Colombia |
| `themeColorLight` | Color con contraste adecuado para interfaz clara |
| `themeColorDark` | Color con contraste adecuado para interfaz oscura |
| `socialImage` | Recurso público horizontal, autoalojado y sin datos de sesión |

## `RouteMetadata`

Describe la cabecera segura de una familia de rutas.

| Campo | Regla |
|---|---|
| `matcher` | Patrón determinista; ignora query y fragmento |
| `title` | Nombre funcional seguido por “XCalificator” |
| `description` | Texto estático; nunca deriva de usuario, materia o evaluación |
| `indexing` | `index` solo para `/`; `noindex` para las demás rutas |
| `canonical` | Solo existe para rutas públicas aprobadas |
| `social` | Completo únicamente para la portada; privado para el resto |

### Precedencia

1. Coincidencia exacta para portada y autenticación.
2. Familias privadas específicas: administración, materias, calificación, recursos, presentaciones y reportes.
3. Familia privada general `/app`.
4. Ruta desconocida o error con `noindex`.

### Invariantes

- Ningún valor incorpora parámetros de URL.
- Ningún valor incorpora datos recibidos por API.
- Toda ruta distinta de `/` es no indexable mientras esta especificación esté vigente.
- Al cambiar de ruta se retiran canonical y datos sociales que ya no correspondan.

## `BrandAsset`

Recurso estático de identidad.

| Campo | Regla |
|---|---|
| `purpose` | favicon, icono Apple, icono manifest o tarjeta social |
| `path` | Dirección pública estable del mismo origen |
| `dimensions` | Cuadrada para iconos; horizontal para tarjeta social |
| `format` | Compatible con el consumidor declarado |
| `background` | Contraste suficiente en claro y oscuro |
| `source` | Derivado de recursos de marca aprobados |

## `CrawlerPolicy`

Contrato conjunto de documento, cabecera HTTP, robots y sitemap.

| Superficie | Meta robots | Cabecera | Sitemap |
|---|---|---|---|
| `/` | indexable | sin restricción | incluida |
| autenticación y recuperación | noindex, nofollow | noindex, nofollow | omitida |
| `/app` y descendientes | noindex, nofollow | noindex, nofollow | omitida |
| errores y rutas desconocidas | noindex, nofollow | noindex cuando el servidor identifica la familia | omitida |
| `/api` y archivos internos | no aplica | respuesta propia | omitida y no anunciada |

## Transiciones

`RouteMetadata` no tiene estado persistido. En cada navegación:

1. Se normaliza la ruta eliminando parámetros y fragmento.
2. Se resuelve una única definición por precedencia.
3. Se actualizan título y meta robots.
4. Se añaden, actualizan o eliminan canonical y metadatos sociales.
5. Se conserva la identidad global y nunca se acumulan etiquetas duplicadas.
