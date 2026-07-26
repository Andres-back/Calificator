# Presenton patches — XCalificator

> **Proyecto de investigación** — Institución Educativa San Agustín, Mocoa, Putumayo  

Patches reversibles montados por `docker-compose.yml`.

## `get_layout_by_name.py`

La imagen `ghcr.io/presenton/presenton:latest` instalada no expone la ruta
Next.js `/api/template` que su FastAPI interno intenta leer. El patch evita
tocar la imagen y resuelve `general`, `modern`, `standard` y `swift` leyendo
los componentes desde `/app/servers/nextjs/app/presentation-templates`.

Para revertirlo, elimina el volumen correspondiente en el servicio `presenton`
de `docker-compose.yml` y reinicia el contenedor.

## Chromium runtime

`presenton.Dockerfile` extiende la imagen oficial de Presenton con el paquete
Debian `chromium`. El runtime de exportacion de Presenton ya pasa
`--no-sandbox` y lee `PUPPETEER_EXECUTABLE_PATH`; este cambio solo provee el
binario que requiere Puppeteer para exportar PPTX/PDF.

## `export_utils.py`

Presenton protege sus endpoints `/api/*` con auth simple. Durante una
exportacion, Puppeteer abre la pagina interna `/pdf-maker` y esa pagina vuelve
a consultar `/api/v1/ppt/presentation/{id}`; sin cookie recibe `401` y el
exportador falla con `Presentation slides not found`.

Este patch genera una cookie de sesion interna usando las credenciales ya
configuradas de Presenton y la pasa solamente al proceso de exportacion. No se
envia al frontend ni reemplaza el login de XCalificator.

Para revertirlo, elimina el volumen correspondiente en `docker-compose.yml` y
reinicia `presenton`.

## `modern/ImageAndDescriptionLayout.tsx`

Patch del layout `modern:image-and-description` para XCalificator. Mantiene el
mismo `layoutId`, pero usa un marco de imagen con `object-contain` y textos
clampados para evitar imagenes cortadas y desbordes al editar/exportar slides
educativas.

Para revertirlo, elimina el volumen correspondiente en `docker-compose.yml` y
reinicia `presenton`.
