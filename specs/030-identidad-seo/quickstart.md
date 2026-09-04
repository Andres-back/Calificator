# Validación rápida: Identidad web, favicon y SEO

## Prerrequisitos

- Dependencias del frontend instaladas.
- Docker disponible para comprobar las cabeceras Nginx finales.
- Navegador Chromium o Brave; Safari/iPhone para comprobación física cuando esté disponible.

## 1. Verificación estática y unitaria

Desde `frontend/`:

```powershell
npm run typecheck
npm run lint
npm run test:run -- RouteMetadata LandingPage
npm run build
```

Resultados esperados:

- no hay errores de tipos o lint;
- la portada queda indexable y con canonical único;
- autenticación, errores y `/app` quedan no indexables;
- cada navegación reemplaza metadatos sin duplicarlos;
- todos los archivos declarados existen en la construcción.

## 2. Contrato de archivos públicos

Con el frontend servido, comprobar que devuelven `200`:

```text
/favicon.ico
/favicon.svg
/favicon-48x48.png
/apple-touch-icon.png
/icon-192.png
/icon-512.png
/og-xcalificator.png
/site.webmanifest
/robots.txt
/sitemap.xml
```

Validar además:

- iconos cuadrados y sin deformación;
- manifest JSON válido y sin service worker;
- sitemap XML con una sola URL;
- robots anuncia el sitemap y no publica rutas privadas;
- tarjeta social horizontal y legible.

## 3. Navegación de navegador

Comprobar carga directa y navegación sin recargar:

| Ruta | Título esperado | Indexación |
|---|---|---|
| `/` | Inicio o propuesta pública · XCalificator | index |
| `/login` | Ingresar · XCalificator | noindex |
| `/registro` | Crear cuenta · XCalificator | noindex |
| `/recuperar-contrasena` | Recuperar contraseña · XCalificator | noindex |
| `/app` | Inicio · XCalificator | noindex |
| `/app/materias` | Materias · XCalificator | noindex |
| `/app/calificaciones/workspace` | Calificaciones · XCalificator | noindex |
| ruta inexistente | Página no encontrada · XCalificator | noindex |

En cada ruta privada confirmar que no quedan canonical ni Open Graph de la portada y que los metadatos no contienen correo, nombre, nota o identificadores.

## 4. Cabeceras de producción

Construir o iniciar el contenedor frontend y consultar:

```powershell
curl.exe -I http://127.0.0.1/app
curl.exe -I http://127.0.0.1/login
curl.exe -I http://127.0.0.1/
```

Resultados esperados:

- `/app` y `/login` incluyen `X-Robots-Tag: noindex, nofollow`;
- `/` no incluye una cabecera que impida indexación;
- CSP permite todos los recursos de identidad porque son del mismo origen;
- los documentos HTML conservan política de no caché prolongada.

## 5. Comprobación visual

- Abrir la portada en modo claro y oscuro en Brave.
- Verificar favicon a escala normal y con varias pestañas.
- Guardar la página como favorito.
- En iPhone, añadir a pantalla de inicio y comprobar el icono.
- Simular o inspeccionar una tarjeta 1200×630 para confirmar que texto y marca no se cortan.

## 6. Regresión funcional mínima

- Ingresar como profesor, estudiante y administrador.
- Navegar a una vista principal de cada rol.
- Confirmar que autenticación, permisos y contenido no cambiaron.
- Confirmar que no existe registro de service worker nuevo.
