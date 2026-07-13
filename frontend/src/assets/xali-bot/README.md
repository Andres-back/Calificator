# Xali — Guía de identidad de la mascota

## Qué representa

Xali es la mascota IA de XCalificator. Encarna la frase central de la plataforma:
**"La IA sugiere. El docente decide."**

- Para el **estudiante** es un **tutor de aprendizaje**: acompaña, explica y motiva. Nunca resuelve evaluaciones por él.
- Para el **profesor/admin** es un **copiloto pedagógico**: ayuda a planear, evaluar y retroalimentar. Nunca sustituye el criterio docente.

## Assets

| Archivo | Uso |
|---|---|
| `visor-avatar.png` | **Avatar principal** (cara de Xali). Fondo transparente, listo para chips/burbujas. |
| `check-avatar.png` | **Estados de logro/confirmación** (revisión disponible, éxito). Fondo transparente. |
| `visor.png`, `check.png` | Originales de alta resolución **con fondo sólido** — no usar directo en UI; fuente para derivar nuevos recortes. |
| `boca.png`, `ojos.png`, `tronco.png`, `piernas.png`, `pies.png`, `derecho.png`, `izquierdamano.png` | Piezas del cuerpo para una **fase futura**. Auditadas (2026-07-02): **todas tienen fondo gris sólido con glow horneado** — no son apilables por capas CSS sin reprocesado (quitar fondo degradado + halos deja bordes sucios). **El cuerpo completo requiere rediseño/SVG posterior.** No forzar su uso hoy: el avatar compacto (visor) es la identidad oficial. |

Los originales también viven en `E:\tesis\output\bot` (no borrar sin permiso). En código **solo importar** desde `@/assets/xali-bot/` — nunca rutas absolutas.

## Componente

`frontend/src/modules/xali/components/XaliAvatar.tsx`

```tsx
<XaliAvatar size="md" mood="student" />          // tutor (cian/menta)
<XaliAvatar size="sm" mood="teacher" />          // copiloto (índigo/violeta)
<XaliAvatar size="md" mood="success" />          // logro/confirmación (check)
<XaliAvatar size="xs" mood="thinking" />         // pensando (pulso)
<XaliAvatar size="lg" mood="student" animated /> // flotación suave (hero)
```

- **`default`/`student`**: visor. `student` añade tinte cian/menta.
- **`teacher`**: visor con tinte índigo/violeta.
- **`success`**: check. Solo para logro/confirmación (post-entrega disponible, nota confirmada).
- **`thinking`**: visor con pulso (loading del chat).

## Tamaños recomendados

- `xs` (32px): burbujas de chat.
- `sm` (36px): cabeceras de card/chat.
- `md` (44px): cards, mini-cards, accesos rápidos.
- `lg` (64px): hero del chat vacío.
- `xl` (96px): pantallas de bienvenida/empty states grandes (usar con moderación).

## Reglas

1. **No deformar**: siempre `object-contain`; nunca estirar ni recortar con `object-cover`.
2. **No usar fondos pesados**: el avatar va sobre chips suaves (blanco, tintes al 10–15%), no sobre gradientes saturados de página.
3. **No usar el check como avatar principal**: el check es un estado (logro/confirmación), no la cara de Xali en conversación ni en estados vacíos o pendientes.
4. **No mezclar roles**: Xali `student` nunca acompaña mensajes/sugerencias docentes, y viceversa.
5. **No usar rutas absolutas**: siempre `import x from '@/assets/xali-bot/...'` (Vite resuelve y versiona el asset).
6. **No saturar**: la mascota aparece donde aporta claridad (chat de Xali, accesos a Xali, estados de revisión post-entrega). No ponerla en cada card de la app.

## Iconografía de producto

Para iconos de módulos/estados usar `AppIcon` (`frontend/src/components/ui/AppIcon.tsx`), que fija el mapa canónico nombre→Lucide (dashboard, subjects, evaluations, grades, bulletin, xaliStudent, xaliTeacher, tools, presentations, success, warning, error, locked, secure, …). Los tonos de estado (badges) salen de `statusTone` en `components/ui/Badge.tsx`.

## Fase futura (recomendada)

Reconstruir el cuerpo completo como SVG por capas (tronco, brazos, piernas, visor, ojos, boca) para animaciones rive/lottie/framer (saludo, celebración, pensar). Hasta entonces, mantener el avatar compacto.
