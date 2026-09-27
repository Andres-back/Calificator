# Investigación y decisiones

## Personaje y variedad

**Decisión**: reutilizar Xali como SVG modular y combinar expresiones, gestos y accesorios aprobados.  
**Motivo**: 8 × 5 × 3 permite 120 combinaciones con identidad constante y peso pequeño.  
**Alternativas**: cientos de PNG (peso y deriva visual), imágenes en tiempo real (latencia/privacidad), segundo personaje (marca fragmentada).

## Animación

**Decisión**: avance manual con microtransiciones opcionales y versión estática equivalente.  
**Motivo**: el estudiante controla el ritmo; `prefers-reduced-motion` ya existe globalmente.  
**Alternativas**: reproducción automática completa, video, GIF y Lottie; rechazados por accesibilidad y bloqueo.

## Fuente del contenido

**Decisión**: proyectar únicamente el desglose publicado; no pedir otra generación.  
**Motivo**: mantiene la explicación auditable, evita contradicciones y no añade tiempo al pipeline.  
**Alternativas**: nuevo resumen de IA o plantillas que reescriben; rechazados por integridad.

## Integración

**Decisión**: tarjeta embebida antes de `GradeBreakdown` en `ResolverEvaluacionPage`; el detalle actual permanece debajo y enlazable.  
**Motivo**: evita modal/scroll lock y reutiliza la consulta estudiantil existente.  
**Alternativas**: ruta separada o modal obligatorio; añaden navegación y riesgo de bloqueo.

## Medición

**Decisión**: ampliar el contrato analítico de lista blanca con eventos discretos sin contenido.  
**Motivo**: permite medir uso y finalización para la tesis sin guardar respuestas o feedback.  
**Alternativas**: no medir (no valida experiencia) o registrar texto (innecesario y sensible).

## Referencia visual generada

**Decisión**: conservar `assets/xali-pose-sheet-v1.png` solo dentro de la especificación.  
**Motivo**: orienta proporciones y personalidad, pero su fondo y peso no cumplen el recurso productivo. El componente final se redibuja de forma modular.
