# Image Router — Guía de decisión

## Cuándo usar OpenAI (gpt-image-1)
- Imágenes para colorear (alta calidad de líneas)
- Portadas premium
- Diagramas educativos complejos
- Imágenes con instrucciones detalladas
- Ilustraciones educativas profesionales

## Cuándo usar Cloudflare (SDXL Lightning)
- Fondos de presentaciones
- Borradores rápidos
- Imágenes simples de apoyo
- Generación en volumen (muchas imágenes)
- Imágenes anatómicas educativas (si OpenAI bloquea)

## HTML/SVG (generación interna)
- Sopas de letras
- Crucigramas
- Mapas simples
- Tablas y esquemas vectoriales

## Reglas de fallback
1. Si OpenAI falla → intentar Cloudflare
2. Si Cloudflare falla → usar placeholder educativo
3. Nunca bloquear el flujo principal por una imagen fallida
4. Nunca enviar `image: undefined` a Presenton
