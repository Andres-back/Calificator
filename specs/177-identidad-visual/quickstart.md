# Validación: Identidad visual — isotipo legible, iconos ilustrados en la revisión y páginas de error

## Pruebas

```
npx vitest run src/config/brandAssets.test.tsx src/components/ui/EducationalIcon.test.tsx src/modules/calificaciones/ReviewNavigation.test.tsx src/components/layout
  92 pruebas: pasan

npx vitest run            (frontend completo)
  210 archivos, 1580 pruebas: pasan

npx tsc --noEmit -p .  y  npx eslint src
  sin errores ni avisos
```

Antes de añadir las imágenes, `EducationalIcon.test.tsx` y `brandAssets.test.tsx` fallaban porque los archivos no existían.

## Imágenes generadas

Generadas con la CLI de Codex (cuenta de ChatGPT del usuario, modelo `gpt-5.6-luna`), con tres iconos existentes como referencia de estilo. Cada una se revisó sobre fondo claro y oscuro, a tamaño grande y a 56 px.

| Archivo | Tamaño | Peso |
| --- | --- | --- |
| `semantic-icons/review-answers.webp` | 320 × 320 | 19 KB |
| `semantic-icons/review-feedback.webp` | 320 × 320 | 18 KB |
| `semantic-icons/review-history.webp` | 320 × 320 | 24 KB |
| `not-found.webp` | 448 × 448 | 40 KB |
| `forbidden.webp` | 448 × 448 | 32 KB |
| `logo-mark.webp` (del isotipo existente) | 256 × 256 | 7 KB |

Total: 140 KB.

El generador dejó el contorno azul marino con cerca de un 20 % de opacidad: sobre fondo blanco se veía gris. El posproceso local restaura su opacidad; ninguna imagen se retocó a mano.

## Capturas en la aplicación local (2026-11-12)

Chromium sin interfaz, docente de prueba, a 1440 × 900 y 390 × 844 px, en claro y oscuro: 22 capturas.

| Pantalla | Antes | Después |
| --- | --- | --- |
| Menú lateral | Logotipo con texto en 40 px, ilegible | Isotipo con birrete, nítido, en claro y oscuro |
| Resumen de una calificación | Cuatro iconos de línea de 20 px | Cuatro iconos ilustrados de 48 px, del estilo del menú |
| Página no encontrada | Icono de línea sobre cuadro ámbar | Mascota con lupa y hoja en blanco |
| Acceso denegado | Icono de línea sobre cuadro rosa | Mascota junto a un escudo con candado |
| Portada, inicio de sesión | Logotipo encogido | Isotipo |

## Lo que no se comprobó

- Las pruebas de extremo a extremo completas; corren en la CI. En local se ejecutaron las del resumen de la revisión y las de iconos.
- Un teléfono real.
- El registro: usa el mismo cambio de una línea que el inicio de sesión y no se capturó.

## Después de desplegar

Recargar sin caché y comprobar el isotipo del menú, las cuatro opciones al abrir una nota y una dirección inexistente bajo `/app/`.
