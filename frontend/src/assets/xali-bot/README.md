# Xali — Guía de identidad de la mascota

## Qué representa

Xali es la mascota IA de XCalificator. Encarna la frase central de la plataforma:
**"La IA sugiere. El docente decide."**

- Para el **estudiante** es un **tutor de aprendizaje**: acompaña, explica y motiva. Nunca resuelve evaluaciones por él.
- Para el **profesor/admin** es un **copiloto pedagógico**: ayuda a planear, evaluar y retroalimentar. Nunca sustituye el criterio docente.

## Avatar actual (SVG inline)

El avatar de Xali es un **SVG inline** dentro del componente `XaliAvatar.tsx`.
No depende de archivos PNG externos. Cada pieza se renderiza como elementos
SVG nativos (`circle`, `rect`, `line`, `radialGradient`) con colores por mood.

### Modos visuales

| Mood | Colores | Uso |
|---|---|---|
| `student` | Cian/menta | Tutor de aprendizaje |
| `teacher` | Índigo/violeta | Copiloto docente |
| `success` | Verde (check) | Logro/confirmación |
| `thinking` | Índigo con pulso | IA procesando |
| `default` | Índigo neutro | Estado base |
| `happy` | Azul cielo | Respuesta positiva |

### Tamaños

| Size | px | Uso |
|---|---|---|
| `xs` | 32 | Burbujas de chat |
| `sm` | 36 | Cabeceras de card/chat |
| `md` | 44 | Cards, mini-cards |
| `lg` | 64 | Hero del chat vacío |
| `xl` | 96 | Pantallas de bienvenida |

## Fase futura: cuerpo completo SVG

El `MASCOT_BRIEF.md` documenta el plan para un cuerpo completo animable
con piezas SVG separadas (visor, ojos, boca, tronco, brazos, piernas, pies).
Cada pieza sería un archivo SVG independiente sin fondo, preparado para
animación con CSS/framer-motion.

## Componente

`frontend/src/modules/xali/components/XaliAvatar.tsx`

## Reglas

1. **No deformar**: siempre `object-contain`; nunca estirar ni recortar con `object-cover`.
2. **No usar fondos pesados**: el avatar va sobre chips suaves (blanco, tintes al 10–15%).
3. **No usar el check como avatar principal**: el check es un estado (logro/confirmación), no la cara de Xali en conversación.
4. **No mezclar roles**: Xali `student` nunca acompaña mensajes/sugerencias docentes, y viceversa.
5. **No saturar**: la mascota aparece donde aporta claridad (chat de Xali, accesos a Xali, estados de revisión post-entrega). No ponerla en cada card de la app.
