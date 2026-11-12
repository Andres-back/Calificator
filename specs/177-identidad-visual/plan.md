# Plan: Identidad visual — isotipo legible, iconos ilustrados en la revisión y páginas de error

**Spec**: [spec.md](spec.md) | **Issue**: [#374](https://github.com/Andres-back/Calificator/issues/374)

## Diagnóstico

- `Sidebar`, `LandingPage`, `LoginPage` y `RegisterPage` cargan `/branding/logo-full.webp` (192 × 192 px, con el nombre escrito) en cuadros de 40 a 64 px.
- `public/branding/logo-icon.png` es el isotipo, de 1024 px, y ninguna pantalla lo usa.
- `ReviewNavigation` usa cuatro iconos de `lucide-react`.
- `EducationalIcon` sirve 48 ilustraciones WebP con respaldo de línea; «Evidencia» ya tiene la suya (`grade-evidence`).
- `NotFoundPage` y `ForbiddenPage` usan un icono de línea.

## Decisión

Solo frontend, sin cambios de distribución ni de textos.

**Imágenes nuevas.** Se generan con la CLI de Codex (cuenta de ChatGPT del usuario, modelo `gpt-5.6-luna`), dando como referencia tres iconos existentes para igualar el estilo. Cinco imágenes:

| Archivo | Uso |
| --- | --- |
| `semantic-icons/review-answers.webp` | Respuestas y puntajes |
| `semantic-icons/review-feedback.webp` | Retroalimentación |
| `semantic-icons/review-history.webp` | Historial |
| `not-found.webp` | Página no encontrada |
| `forbidden.webp` | Acceso denegado |

**Posproceso local.** El recorte de fondo del generador deja translúcidos los tonos oscuros (el contorno queda con un 20 % de opacidad). Un script restaura la opacidad con una rampa corta, recorta al contenido, centra en un cuadrado y exporta WebP a 320 px. Cada imagen se revisa a la vista sobre fondo claro y oscuro, y a 56 px.

**Isotipo.** `logo-mark.webp`, 256 px, a partir de `logo-icon.png`. Conserva su fondo blanco, como el logotipo actual, dentro del mismo cuadro redondeado.

**Código.**

- `EducationalIcon`: tres nombres nuevos con su archivo y su respaldo (`exam`, `reading`, `learning-guide`).
- `ReviewNavigation`: las cuatro opciones usan `EducationalIcon` a 44 px (48 px desde 640 px).
- Páginas de error: `<img>` decorativa de 176 px (224 px desde 640 px).
- Las cuatro pantallas con logotipo apuntan a `logo-mark.webp`. `logo-full.webp` se conserva para metadatos y enlaces externos.

Descartado:

- **Regenerar los iconos existentes**: ya son coherentes; el riesgo es romper esa coherencia.
- **Ilustraciones grandes en listas y paneles**: añaden peso y ruido donde el docente trabaja; la petición anterior del usuario fue quitar ruido.
- **Hacer transparente el isotipo**: sobre fondo oscuro el azul marino del isotipo pierde contraste.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/public/branding/semantic-icons/review-*.webp`, `not-found.webp`, `forbidden.webp`, `logo-mark.webp` | imágenes nuevas |
| `frontend/src/components/ui/EducationalIcon.tsx` | tres nombres |
| `frontend/src/modules/calificaciones/ReviewNavigation.tsx` | iconos ilustrados |
| `frontend/src/pages/NotFoundPage.tsx`, `ForbiddenPage.tsx` | ilustración |
| `frontend/src/components/layout/Sidebar.tsx`, `modules/auth/LandingPage.tsx`, `LoginPage.tsx`, `RegisterPage.tsx` | isotipo |

## Riesgos

- **Estilo**: una imagen generada puede desentonar. Se revisa cada una y se regenera la que no encaje.
- **Peso**: se limita a 60 KB por imagen.
- **Pruebas de extremo a extremo** que miden las tarjetas de la revisión o comparan iconos: se confirman en la CI.
- **Derechos**: las imágenes se generan con la cuenta del usuario y no reproducen marcas ni personajes de terceros; la mascota es la del producto.
