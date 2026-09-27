# Investigación: Identidad web, favicon y SEO técnico

## Decisión 1: una única familia de favicon estable y autoalojada

**Decisión**: Derivar los favicons e iconos de dispositivo de la identidad XCalificator aprobada, con composición cuadrada, URL estable y variantes adecuadas para pestaña, Apple y manifest.

**Rationale**: Google exige un favicon cuadrado y rastreable, recomienda una dimensión superior a 48×48 y aconseja que represente claramente la marca. Una familia coherente evita que la pestaña, los resultados y los accesos guardados muestren símbolos distintos.

**Alternativas consideradas**:
- Mantener la “X” genérica actual: rechazada porque no coincide con la identidad ilustrada usada en la aplicación.
- Servir el icono desde un tercero: rechazado por CSP, disponibilidad y control de caché.

**Fuente**: [Google Search Central: favicon](https://developers.google.com/search/docs/appearance/favicon-in-search).

## Decisión 2: metadatos estáticos para la portada y sincronización por ruta

**Decisión**: Mantener en el HTML inicial los metadatos completos de la única página indexable y añadir una capa de ruta que actualice título, descripción, canonical, robots y datos sociales durante la navegación cliente.

**Rationale**: La portada debe funcionar para rastreadores y generadores de tarjetas que no ejecutan JavaScript. Al mismo tiempo, una aplicación SPA necesita actualizar el título y la política de cada vista sin recargar.

**Alternativas consideradas**:
- Solo cambiar `document.title` dentro de cada página: rechazada por duplicación, omisiones y metadatos inconsistentes.
- Añadir una biblioteca SEO: rechazada porque la matriz es pequeña, determinista y no requiere una dependencia nueva.
- Incorporar renderizado del lado servidor: rechazado por ampliar innecesariamente la arquitectura y el despliegue estable.

## Decisión 3: doble protección de no indexación

**Decisión**: Marcar autenticación, restablecimiento, errores y `/app` con `noindex, nofollow` en la aplicación y mediante `X-Robots-Tag` en Nginx.

**Rationale**: La cabecera protege incluso cuando no se ejecuta JavaScript. Google documenta que `noindex` debe ser visible para el rastreador; por eso `robots.txt` no bloqueará estas páginas antes de que pueda leer la regla.

**Alternativas consideradas**:
- Bloquear `/app` exclusivamente en `robots.txt`: rechazada porque un rastreador bloqueado no puede leer la instrucción `noindex`.
- Confiar solo en meta robots dinámico: rechazada porque algunos clientes no ejecutan la aplicación.
- Depender de autenticación como única barrera SEO: rechazada porque una redirección no expresa por sí sola la intención de indexación.

**Fuente**: [Google Search Central: robots meta y X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag).

## Decisión 4: canonical y sitemap mínimos

**Decisión**: Publicar `https://xcalificator.daimuz.com/` como única URL canónica e incluir únicamente esa dirección en el sitemap.

**Rationale**: El producto tiene una sola superficie pública de adquisición. Login, registro y aplicación no son contenido de búsqueda; una lista mínima reduce duplicidad y evita anunciar rutas sensibles o efímeras.

**Alternativas consideradas**:
- Incluir todas las rutas accesibles sin sesión: rechazada porque autenticación y recuperación son utilidades, no destinos de búsqueda.
- Generar canonical con parámetros actuales: rechazada porque podría conservar tokens, motivos de sesión o identificadores.

**Fuentes**: [Google Search Central: URL canónica](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) y [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Decisión 5: tarjeta social pública y autocontenida

**Decisión**: Publicar una imagen horizontal autoalojada y los campos básicos de Open Graph, junto con la variante de tarjeta grande usada por plataformas compatibles.

**Rationale**: Una vista previa controlada mejora el reconocimiento al invitar docentes y estudiantes. Los campos mínimos de Open Graph son título, tipo, imagen y URL; la descripción aporta contexto sin incluir datos de sesión.

**Alternativas consideradas**:
- Reutilizar un icono cuadrado como tarjeta: rechazada por mala composición y poco contexto en superficies horizontales.
- Generar la imagen al compartir: rechazada por latencia, disponibilidad y complejidad innecesarias.

**Fuente**: [Open Graph Protocol](https://ogp.me/).

## Decisión 6: manifest descriptivo sin PWA fuera de alcance

**Decisión**: Añadir un manifiesto con nombre, nombre corto, descripción, inicio, alcance, colores e iconos, sin service worker ni afirmaciones de funcionamiento sin conexión.

**Rationale**: El manifest permite que navegadores compatibles conozcan nombre e iconos. MDN separa esta declaración de capacidades adicionales como operación sin conexión; el producto actual incluso elimina service workers antiguos.

**Alternativas consideradas**:
- No crear manifest: rechazada porque deja incompleta la identidad en accesos de dispositivo.
- Reactivar service worker: rechazada por estar fuera del alcance y por antecedentes de interceptación y CSP.

**Fuente**: [MDN: Web application manifest](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest).

## Decisión 7: color de navegador como mejora progresiva

**Decisión**: Declarar colores de tema diferenciados mediante preferencia clara/oscura y mantener un color base compatible.

**Rationale**: `theme-color` es una sugerencia al navegador y su soporte no es uniforme; debe mejorar la integración visual sin ser necesaria para usar el sitio.

**Alternativas consideradas**:
- Un solo color brillante: rechazado por contraste deficiente en modo oscuro.
- Cambiar el color únicamente con JavaScript: rechazado porque el HTML puede expresar una alternativa inicial sin bloquear el renderizado.

**Fuente**: [MDN: theme-color](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/theme-color).
