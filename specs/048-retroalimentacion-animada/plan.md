# Plan: retroalimentación animada con Xali

**Rama**: `codex/048-retroalimentacion-animada` | **Fecha**: 2026-09-19 | **Spec**: [spec.md](./spec.md) | **Issue**: [#95](https://github.com/Andres-back/Calificator/issues/95)

**Estado**: Aprobado por el usuario el 2026-09-19. Issue #95 con `spec-approved` y `plan-approved`. Implementación local autorizada; PR y despliegue aún no autorizados.

## Resumen

Incorporar, exclusivamente en la vista estudiantil de una calificación publicada, una historia opcional de máximo cuatro escenas construida desde el desglose ya existente. Xali será un componente modular de ilustración vectorial: expresiones, brazos, accesorios y estados se combinan en el navegador para producir más de cien variantes sin descargar cientos de imágenes. El desglose original permanece inmediatamente disponible y es la fuente única del contenido académico.

## Contexto técnico

**Lenguajes/versiones**: React 18, TypeScript 5.6 y estilos existentes del frontend; Python del backend solo para ampliar el catálogo analítico autorizado.  
**Dependencias**: reutilizar React, Framer Motion y utilidades existentes; no añadir librerías. La preferencia global `prefers-reduced-motion` sigue siendo autoridad.  
**Persistencia**: sin nuevas tablas. Progreso y preferencia de reproducción en almacenamiento local no sensible; eventos mínimos en `analytics_eventos` existente.  
**Pruebas**: Vitest/Testing Library, contrato analítico backend con pytest y Playwright en 360×800, 390×844, tableta y escritorio.  
**Plataforma objetivo**: navegadores móviles y escritorio soportados por el frontend, modos claro y oscuro.  
**Rendimiento y escala**: contenido académico visible sin esperar animación; primer cuadro útil <1 s con desglose cargado; SVG modular y carga diferida; cero solicitudes adicionales a modelos IA.

## Verificación de la constitución

- Separación de roles: se integra solo donde el estudiante ya consulta `mi-desglose`; no crea rutas ni amplía autorización.
- Integridad y trazabilidad: el constructor de escenas es una proyección de solo lectura; nota, fórmula, evidencia, bloqueos y texto original no cambian.
- Asincronía e idempotencia: lo visual no bloquea; telemetría es fire-and-forget y un fallo degrada a tarjeta estática.
- Datos y secretos: recursos sin datos personales; eventos usan referencias canónicas y metadatos enumerados, nunca respuestas o feedback.
- Accesibilidad: controles explícitos, foco visible, lector de pantalla, alternativa estática y reducción de movimiento obligatoria.
- Gobernanza y pruebas: issue #95, spec aprobada; plan requiere aprobación antes de tareas/implementación; PR y CI antes de producción.

No hay violaciones. La lámina raster generada es referencia de diseño, no dependencia productiva ni contenido servido al estudiante.

## Estructura del proyecto

```text
frontend/src/components/xali/
├── XaliMascot.tsx                 # composición vectorial accesible
├── XaliMascot.test.tsx
└── xaliStates.ts                  # catálogo tipado de expresiones/gestos/accesorios

frontend/src/modules/calificaciones/student-feedback/
├── XaliFeedbackStory.tsx          # reproductor y controles
├── XaliFeedbackStory.test.tsx
├── buildFeedbackStory.ts          # selección determinista de escenas
└── buildFeedbackStory.test.ts

frontend/src/modules/evaluaciones/
├── ResolverEvaluacionPage.tsx     # inserción antes de GradeBreakdown publicado
└── ResolverEvaluacionPage.test.tsx

frontend/src/lib/
├── analytics.ts
└── analytics.test.ts

backend/app/modules/analytics/event_policy.py
backend/tests/unit/test_analytics_events.py
frontend/e2e/accessibility/         # recorrido estático/movimiento reducido
frontend/e2e/visual/                # claro/oscuro y resoluciones críticas
```

## Diseño por fases

### Fase 1 — Modelo de historia seguro

- Función pura recibe `GradeBreakdownData` publicado y produce 1–4 escenas.
- Prioridad: contexto; mejor acierto verificable; máximo un aspecto prioritario; siguiente paso. Si no hay datos suficientes, no inventa escena.
- Cada escena conserva `componentId` para abrir el detalle exacto; el texto proviene de `explicacion_estudiante`, `explicacion` u `orientacion_mejora` ya entregados por el contrato.
- Estados pendientes, con `requiere_revision` o bloqueos visibles no reciben celebración automática.

### Fase 2 — Xali modular

- Redibujar cuerpo completo como SVG React semántico, sin base64 ni HTML inseguro.
- Separar cara, brazos, accesorio y badge en grupos con transformaciones limitadas.
- Catálogo declarativo: al menos 8 expresiones × 5 gestos × 3 accesorios = 120 combinaciones posibles; solo combinaciones pedagógicamente aprobadas se exponen.
- Colores mediante variables de tema. Tamaños `compact`, `story` y `static`; silueta legible y texto alternativo contextual.

### Fase 3 — Reproductor accesible

- Tarjeta embebida, no modal: evita bloqueo de scroll y mantiene visible “Ver detalle completo”.
- Avance manual por defecto. Movimiento breve solo con consentimiento implícito del sistema (`no-preference`) y nunca reproduce sonido.
- Controles anterior/siguiente, pausa/reanudar, omitir y repetir; barra de progreso con texto “Paso N de M”.
- Si hay reducción de movimiento, error visual o recurso no disponible, se representa la misma secuencia como tarjetas estáticas.

### Fase 4 — Medición mínima y privada

- Ampliar la política existente con eventos `feedback_story_started`, `feedback_story_controlled`, `feedback_story_detail_opened` y `feedback_story_completed` para rol estudiante.
- Referencias requeridas: evaluación y calificación. Metadatos enumerados: `mode` (`animated|static`), `action` (`pause|resume|skip|replay|next|previous`) y `step` numérico cuando aplique.
- Prohibido enviar texto, respuesta, nota, evidencia, nombre, emoción inferida o contenido del feedback.
- Telemetría fire-and-forget: nunca bloquea ni cambia el recorrido. Activación para medición de tesis respetará los controles de estudio ya existentes; la UI funciona sin telemetría.

## Contratos y compatibilidad

- Sin cambios a `/evaluaciones/{id}/mi-desglose` ni a `GradeBreakdownData`.
- No cambia `GradeBreakdown`; la historia se añade antes del desglose y lo enlaza por componente.
- La API analítica existente recibe nuevos tipos sujetos a su política; no hay endpoint ni tabla nueva.
- Evaluaciones históricas sin desglose usan la vista actual y no muestran una historia fabricada.
- No se sustituye aún `XaliAvatar`; el nuevo `XaliMascot` convive hasta validar contraste, tamaño y rendimiento.

## Pruebas y criterios de aceptación

- Unitarias del selector: correcta, parcial, ilegible, sin orientación, más de dos errores, revisión pendiente y desglose histórico.
- Componente: controles, foco, anuncios accesibles, omitir/repetir y enlace al detalle.
- Movimiento reducido: cero reproducción automática y contenido equivalente.
- Contrato analítico: rol estudiante admitido solo para eventos nuevos; rechazo de rol/campos/referencias no permitidos y claves sensibles.
- Regresión: nota, fórmula, desglose, reclamo, evidencia y navegación existentes permanecen operables.
- Visual/E2E: 360×800, 390×844, 768×1024 y escritorio; claro/oscuro; sin desbordamiento ni scroll bloqueado.
- Rendimiento: medir primer cuadro, peso del chunk y ausencia de nuevas solicitudes IA; la lámina de referencia no se incluye en el bundle.

## Despliegue y recuperación

1. Entregar detrás de una bandera visual apagada por defecto o habilitación controlada del piloto.
2. Validar con datos sintéticos y luego prueba guiada autorizada.
3. Observar errores y controles usados sin inspeccionar contenido académico.
4. Desactivar la bandera ante regresión; el desglose textual continúa funcionando sin migración ni limpieza de datos.

## Decisiones y complejidad

- Se rechazan cientos de PNG: aumentan peso, inconsistencias y mantenimiento.
- Se rechaza generación visual por estudiante: introduce demora, costo, privacidad e imprevisibilidad.
- Se rechaza video/GIF/Lottie: no aporta personalización semántica y dificulta reducción de movimiento.
- Se elige una composición SVG controlada porque produce variedad real con pocos recursos, conserva identidad y permite temas/accesibilidad.
- La historia no resume con otro LLM: usa exclusivamente datos ya publicados para preservar integridad y velocidad.

## Verificación posterior al diseño

Los contratos mantienen la autorización existente, no crean persistencia académica, no añaden IA y preservan la salida textual. La ampliación analítica es mínima, validada por lista blanca y separada de la operación principal. El plan cumple la constitución; requiere aprobación humana antes de generar tareas o implementar.
