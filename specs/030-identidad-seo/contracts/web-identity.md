# Contrato público de identidad y metadatos

## Portada `/`

La respuesta y el documento renderizado deben exponer:

- título de producto y propuesta educativa;
- descripción pública consistente con el contenido visible;
- `canonical` absoluto `https://xcalificator.daimuz.com/`;
- robots indexable;
- Open Graph con `type=website`, URL, título, descripción e imagen absoluta;
- tarjeta social de imagen grande con título, descripción e imagen;
- favicon, icono Apple y manifest accesibles sin autenticación;
- idioma español.

No debe aparecer ningún correo, nombre de cuenta, identificador de materia, nota, token o parámetro de sesión.

## Rutas no indexables

Familias:

- `/login`
- `/registro`
- `/recuperar-contrasena`
- `/restablecer-contrasena`
- `/app` y cualquier descendiente
- páginas de error y rutas desconocidas

Contrato:

- el documento cliente usa `robots=noindex, nofollow`;
- autenticación, recuperación y `/app` reciben `X-Robots-Tag: noindex, nofollow` desde Nginx;
- no declaran canonical ni tarjeta social propia;
- el título identifica la función sin incorporar datos dinámicos;
- una navegación desde la portada elimina metadatos sociales y canonical que ya no correspondan.

## Archivos públicos

| Ruta | Contrato |
|---|---|
| `/favicon.ico` | icono de compatibilidad, cuadrado y válido |
| `/favicon.svg` | favicon vectorial de marca |
| `/favicon-48x48.png` | variante raster estable para buscadores |
| `/apple-touch-icon.png` | icono cuadrado para acceso iOS |
| `/icon-192.png` | icono manifest 192×192 |
| `/icon-512.png` | icono manifest 512×512 |
| `/og-xcalificator.png` | tarjeta horizontal pública |
| `/site.webmanifest` | JSON válido con identidad, inicio, alcance, colores e iconos |
| `/robots.txt` | anuncia sitemap y no bloquea la lectura de `noindex` en páginas HTML |
| `/sitemap.xml` | XML válido que contiene solo la portada canónica |

Todos deben devolver `200`, un tipo de contenido coherente y no depender de cookies.

## Catálogo de títulos

Los títulos siguen el formato `<Vista> · XCalificator`. Como mínimo se distinguen:

- Inicio público
- Ingresar
- Crear cuenta
- Recuperar contraseña
- Inicio docente, estudiante o administración sin nombrar a la persona
- Materias
- Evaluaciones
- Recursos
- Calificaciones
- Presentaciones
- Reportes
- Asistente Xali
- Configuración de IA
- Usuarios y roles
- Página no encontrada o acceso restringido

Las rutas dinámicas pueden compartir el título de su familia; no usan títulos obtenidos de API.
