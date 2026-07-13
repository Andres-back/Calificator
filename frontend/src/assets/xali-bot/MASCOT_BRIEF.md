# MASCOT BRIEF — Xali (Rediseño SVG animable)

> **Fase:** Mascota 2 — Rediseño SVG del cuerpo completo de Xali.
> **Estado:** Documento de especificación. No implementar aún.
> **Tags:** `xali`, `mascot`, `svg`, `redesign`, `future`

---

## 1. Por qué los PNG actuales no sirven para cuerpo completo

Los PNG actuales en `xali-bot/` tienen limitaciones que impiden construir una mascota completa y animable:

| Problema | Impacto |
|---|---|
| **Fondo sólido horneado** | No se puede superponer sobre fondos del tema (claro/oscuro, gradientes). Aparece un recuadro visible |
| **Glow/sombras horneadas** | La iluminación está fija en el PNG. No se puede animar ni adaptar a contexto |
| **Bordes sucios o antialiasing pobre** | Al escalar la imagen se ven bordes dentados o halos blancos |
| **Dificultad para apilar capas** | Brazos, piernas y cabeza están en un solo PNG. No se puede mover un brazo sin mover todo el cuerpo |
| **Tamaño fijo** | Un solo PNG no se adapta bien a usos distintos: hero grande, avatar compacto, empty state |
| **Sin variante oscura** | El PNG claro se ve mal en modo oscuro y viceversa |

**Solución:** SVG modular por capas, sin fondo, sin glow horneado, con variables CSS para color.

---

## 2. Piezas a rediseñar en SVG

Cada pieza debe ser un SVG independiente, sin fondo, con bordes suaves y preparado para animación.

| Pieza | Archivo sugerido | Descripción |
|---|---|---|
| Visor | `visor.svg` | Careta frontal translúcida, estilo robot educativo. Forma de visor sin ojos fijos |
| Ojos | `eyes.svg` | Dos círculos con pupila. Deben poder animarse (parpadeo, dirección de mirada) |
| Boca | `mouth.svg` | Línea curva o forma simple. Debe poder cambiarse para hablar, sonreír, pensar |
| Tronco | `torso.svg` | Cuerpo principal. Debe tener un conector limpio para brazos y cabeza |
| Brazo derecho | `arm-right.svg` | Brazo articulado. Debe poder levantarse para saludar o señalar |
| Brazo izquierdo | `arm-left.svg` | Brazo izquierdo, puede estar en reposo o sujetando un libro/tableta |
| Piernas | `legs.svg` | Base inferior. Pueden ser dos piezas separadas o una sola base estable |
| Pies | `feet.svg` | Apoyo en el suelo. Pueden ser zapatos o base redondeada |
| Check/estado | `check-badge.svg` | Indicador de éxito: puede ser un check dentro de un círculo que aparece sobre la mascota |

---

## 3. Proporciones sugeridas

### Sistema de coordenadas SVG base: `viewBox="0 0 240 320"`

| Parte | Proporción (alto total = 320) | Descripción |
|---|---|---|
| **Cabeza + visor** | ~85px (26%) | Desde y=20 hasta y=105. visor ocupa la mitad superior |
| **Tronco** | ~120px (37%) | Desde y=105 hasta y=225. Cuerpo principal |
| **Brazos** | ~90px (28%) | Desde y=115 hasta y=205. Articulados desde los hombros (y=115) |
| **Piernas** | ~70px (22%) | Desde y=225 hasta y=295. Dos columnas |
| **Pies** | ~25px (8%) | Desde y=295 hasta y=320 |

### Tamaños de uso:

| Contexto | viewBox escalado | px aproximado |
|---|---|---|
| **Hero (Dashboard)** | 240×320 → 180×240px | 180×240 |
| **Empty states** | 240×320 → 120×160px | 120×160 |
| **Avatar compacto (XaliPage actual)** | 240×320 → 48×64px | 48×64 |
| **Burbuja de chat** | Solo cabeza + ojos: ~80×80px | 80×80 |

---

## 4. Estados visuales de Xali

Cada estado implica una combinación de piezas (ojos, boca, brazos, glow de fondo).

| Estado | Ojos | Boca | Brazos | Fondo/Glow | Uso |
|---|---|---|---|---|---|
| **default** | Normales, mirando al frente | Neutra (línea recta) | Relajados | Sin glow | Estado base |
| **estudiante** | Normales, ligeramente curiosos | Semi-sonrisa | Uno levantado | Azul suave transparente | Modo estudiante activo |
| **profesor** | Firmes, seguros | Sonrisa serena | Brazos cruzados o al costado | Violeta suave transparente | Modo copiloto docente activo |
| **pensando** | Mirando arriba a la derecha | Ladeada | Brazo derecho tocando mentón | Glow pulsante suave | IA procesando o en pausa |
| **feliz** | Cerrados (∩) | Sonrisa grande | Brazos abiertos | Glow cálido | Respuesta positiva recibida |
| **éxito** | Brillantes | Sonrisa | Brazos arriba celebrando | Check badge + glow verde | Operación completada |
| **explicando** | Mirando al usuario | Abierta (hablando) | Brazo señalando al contenido | Sin glow extra | Dando instrucciones o guía |
| **advertencia segura** | Un ojo entrecerrado | Neutra o semi-sonrisa | Brazos en "alto" | Glow ámbar suave | Alerta informativa no crítica |
| **celebrando** | Brillantes | Sonrisa grande | Brazos arriba con confeti | Varios checks girando | Logro, materia completa |

> **Nota:** Todos los estados deben ser平滑 (smooth) y no intrusivos. Xali es un asistente educativo, no un personaje de videojuego.

---

## 5. Animaciones futuras

Todas las animaciones deben implementarse con **CSS transitions** o **framer-motion**. Sin GIF, sin JS pesado, sin canvas.

| Animación | Elemento | Técnica | Disparador |
|---|---|---|---|
| **Saludo con mano** | Brazo derecho | Rotación desde el hombro (transform: rotate) | Al cargar Xali por primera vez |
| **Parpadeo de ojos** | Ojos | Scale Y de los párpados (0→1→0) | Cada 3-4 segundos, aleatorio |
| **Pensando con glow** | Fondo + ojos | Opacity pulsante + ojos mirando arriba | IA procesando respuesta |
| **Celebración con check** | Brazos + badge | Brazos arriba + check aparece con scale | Éxito en respuesta o acción |
| **Flotación ligera** | Cuerpo completo | TranslateY suave (±4px) en bucle | Estado idle, suave y sutil |
| **Apuntar a UI** | Brazo derecho | Rotación + translate hacia coordenada | Guía interactiva paso a paso |
| **Transición de estado** | Cuerpo completo | Fade + scale entre estados | Cambio de modo (estudiante ↔ profesor) |
| **Respiración** | Tronco | ScaleY muy sutil (1.0 ↔ 1.02) | Siempre activa en estado idle |

---

## 6. Formato recomendado

| Requisito | Especificación |
|---|---|
| **Formato** | SVG puro, sin base64, sin imágenes embebidas |
| **Organización** | Un SVG por pieza, no un SVG gigante con todo |
| **Colores** | Usar `currentColor` o variables CSS (`--xali-primary`, `--xali-secondary`). No colores fijos |
| **Tema oscuro** | Las variables CSS deben cambiar con `dark:` (Tailwind) o `prefers-color-scheme` |
| **Animación** | CSS `transition` / `keyframes` o `framer-motion` `variants`. No GIF ni JS imperativo |
| **Renderizado** | React componente funcional, no `dangerouslySetInnerHTML`. Preferir import directo de SVG |
| **Peso** | Cada SVG < 2KB. Total del set < 20KB |
| **Accesibilidad** | `role="img"`, `aria-label` descriptivo en cada SVG |

---

## 7. Componentes futuros sugeridos

### `XaliMascot.tsx`
Componente principal que orquesta todas las piezas.

```tsx
interface XaliMascotProps {
  mode: 'estudiante' | 'profesor' | 'default';
  state: 'default' | 'pensando' | 'feliz' | 'exito' | 'explicando' | 'celebrando';
  size: 'hero' | 'empty' | 'compact' | 'chat';
  animate?: boolean;
  className?: string;
}
```

Renderiza: `XaliMascotPart` para cada pieza, en la posición y estado indicados.

### `XaliMascotPart.tsx`
Renderiza una pieza SVG individual con soporte de animación.

```tsx
interface XaliMascotPartProps {
  name: 'visor' | 'eyes' | 'mouth' | 'torso' | 'arm-left' | 'arm-right' | 'legs' | 'feet';
  state?: string;
  animate?: boolean;
  className?: string;
}
```

### `XaliMascotAnimation.tsx`
Utilidad para definir variantes de animación (framer-motion `variants`) para cada estado.

```tsx
export const XALI_VARIANTS = {
  idle: { y: [0, -4, 0], transition: { repeat: Infinity, duration: 3 } },
  wave: { rotate: [0, -20, 0, -20, 0], transition: { duration: 1.2 } },
  celebrate: { scale: [1, 1.08, 1], transition: { duration: 0.6 } },
};
```

---

## 8. Dónde se usaría

| Ubicación | Contexto | Tamaño | Componente |
|---|---|---|---|
| Dashboard estudiante | Hero de bienvenida | hero (180×240) | `XaliMascot mode="estudiante"` |
| Xali estudiante | Chat del estudiante | compact (48×64) | Avatar actual |
| Xali profesor | Chat del profesor | compact (48×64) | Avatar actual |
| Estados vacíos | Sin evaluaciones, sin materias | empty (120×160) | `XaliMascot state="default"` |
| Guías interactivas | Paso a paso "¿Cómo se usa?" | compact (48×64) | `XaliMascot state="explicando"` |
| Mensajes de éxito | Evaluación creada, nota confirmada | chat (80×80) | `XaliMascot state="exito"` |
| Loading/pensando | IA procesando | compact (48×64) | `XaliMascot state="pensando"` |

---

## 9. Qué NO hacer

- ❌ No reemplazar el avatar compacto actual todavía (mantener `xali-circle.png` y `xali-head.png` para la burbuja de chat hasta que la Fase Mascota 2 esté completa y testeada)
- ❌ No meter animaciones pesadas (sin GIF, sin Lottie, sin JSON de animación compleja)
- ❌ No usar PNG con fondos (ninguna pieza debe tener fondo. Todo debe ser transparente)
- ❌ No deformar piezas (mantener proporciones fijas. No estirar brazos para llenar espacio)
- ❌ No mezclar Xali estudiante con lenguaje docente (cada modo tiene su propio texto y personalidad en el prompt, la mascota solo refleja el estado visual)
- ❌ No modificar la lógica de XaliPage ni auth.ts durante esta fase
- ❌ No tocar backend (es puramente frontend visual)

---

## 10. Archivos y estructura final esperada

```
frontend/src/assets/xali-bot/
├── MASCOT_BRIEF.md                  ← Este documento
├── parts/
│   ├── visor.svg
│   ├── eyes.svg
│   ├── mouth.svg
│   ├── torso.svg
│   ├── arm-right.svg
│   ├── arm-left.svg
│   ├── legs.svg
│   └── feet.svg
├── badges/
│   ├── check-badge.svg
│   └── thinking-glow.svg
└── states/
    ├── default.json                 ← Mapeo estado → combinación de piezas
    ├── estudiante.json
    ├── profesor.json
    ├── pensando.json
    ├── feliz.json
    ├── exito.json
    ├── explicando.json
    └── celebrando.json

frontend/src/components/xali/
├── XaliMascot.tsx
├── XaliMascotPart.tsx
└── XaliMascotAnimation.tsx
```

> **Nota:** Esta estructura es la meta final de la Fase Mascota 2. No implementar ahora. Solo documentar para cuando se decida ejecutar.

---

## Fin del brief
