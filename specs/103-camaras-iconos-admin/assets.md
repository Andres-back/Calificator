# Iconos administrativos: procedencia y entrega

Generados el 2026-10-17 con la herramienta integrada de generación de imágenes (no CLI ni API de producción), una llamada por icono. Los PNG originales se conservaron en el directorio de imágenes generadas de Codex; los tres resultados seleccionados se optimizaron a WebP RGBA de 256 × 256 dentro del frontend, manteniendo transparencia real (alfa 0–255), sin borrar ni reemplazar assets existentes.

| Archivo en frontend/public/branding/semantic-icons/ | Tamaño | SHA-256 |
| --- | ---: | --- |
| admin-users.webp | 22 262 bytes | 87c48e6dc285f9eeef0ea1b0e1bb15f9e256c54b94123b8610307fbb733750f6 |
| admin-roles.webp | 17 746 bytes | b56983103cd63144c36813169549aef58c4af6b106539f3b1dbf546ca7e2b8f9 |
| admin-mail.webp | 13 498 bytes | eb6f434cd27ebf2f34c7eb9ab9d858d43839bceb8c6fe64c575134d078938bf8 |

Total: 53 506 bytes, por debajo de 180 KB. Inicio reutiliza dashboard.webp. Las imágenes son decorativas junto a rótulos existentes y tienen fallback vectorial semántico si falla la carga.

## Prompts finales

**Usuarios**: “Use case: stylized-concept. Asset type: single raster UI illustration for XCalificator administration, Usuarios. Primary request: a friendly compact group of three neutral adult account avatars/busts, diverse hair and skin tones, representing user accounts, no children or book. Style: polished colorful educational app illustration, thick deep indigo outlines, vivid purple and cyan with a small yellow accent, softly shaded glossy cartoon finish, simple readable silhouette at 40px. Composition: centered single group fills 80% of square canvas, full object not clipped. Scene/backdrop: genuinely transparent alpha, no background panel. Constraints: no text, no letters, no logo, no watermark, no surrounding white rectangle, no white halo, no floating sparkle confetti, one icon only. Match the existing app's purple/cyan illustrated icon family; not a monochrome line icon.”

**Roles**: “Use case: stylized-concept. Asset type: single raster UI illustration for XCalificator administration, Roles y permisos. Primary request: a rounded purple security shield with cyan checkmark and one gold key diagonally in front, representing roles and access permission. Style: polished colorful educational app illustration, thick deep indigo outlines, softly shaded glossy cartoon finish, vibrant purple, cyan and yellow, matching a coherent illustrated icon family. Composition: centered single compact icon, full object visible and 80% canvas occupancy, bold silhouette legible at 40px. Scene/backdrop: genuinely transparent alpha. Constraints: no text, no letters, no logo, no watermark, no robot, no school building, no surrounding white rectangle or badge background, no white halo, no sparkle confetti, one icon only, not a monochrome line icon.”

**Correo**: “Use case: stylized-concept. Asset type: single raster UI illustration for XCalificator administration, Correo y recuperación. Primary request: a white and cyan envelope outlined in deep indigo, purple folded flap, with a small yellow padlock in front representing account recovery email. Style: polished colorful educational app illustration, thick smooth deep indigo outlines, softly shaded glossy cartoon finish, vibrant purple/cyan/blue with yellow accent, simple coherent illustrated icon family. Composition: centered full single envelope and lock cluster, bold silhouette readable at 40px, 80% square canvas occupancy, not clipped. Scene/backdrop: genuinely transparent alpha. Constraints: no text, no letters, no @ sign, no logo, no watermark, no chat bubble, no robot, no surrounding white rectangular tile or badge, no white halo, no sparkle confetti. One icon only, not monochrome line art.”

## Inspección

Se comprobaron significado, silueta y transparencia del resultado generado y de su integración en capturas locales de navegación/cabeceras, sobre claro/oscuro y tamaños móviles/escritorio. No se usaron datos de alumnos ni claves/proveedores institucionales para generar las imágenes.
