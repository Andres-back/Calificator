# Plan: Revisión docente por excepciones

**Rama**: `codex/050-revision-por-excepciones` | **Fecha**: 2026-09-19 | **Spec**: [spec.md](./spec.md) | **Issue**: #99

## Resumen

Añadir una capa determinista de priorización dentro del detalle de calificación existente. La capa deriva tres niveles —segura, atención y bloqueada— del desglose activo, explica cada señal y permite saltar entre excepciones. No modifica puntajes, estados ni publicación, no añade llamadas de IA y reutiliza la selección de pregunta, evidencia, edición y analítica vigentes.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18, Python 3.11 únicamente para contratos ya existentes.
**Dependencias**: React, Lucide y utilidades UI existentes; sin paquetes nuevos.
**Persistencia**: No se añaden tablas ni campos. La clasificación es derivada y los eventos usan `analytics_eventos`.
**Pruebas**: Vitest/Testing Library focales, TypeScript, ESLint y Playwright E2E aplicable.
**Plataforma objetivo**: Navegadores de escritorio y móvil desde 360×800, modos claro y oscuro.
**Rendimiento y escala**: Clasificación lineal sobre las respuestas de una calificación; primer resumen visible sin peticiones de red adicionales.

## Verificación de la constitución

- Separación de roles: cumple; el panel se integra en el workspace docente existente y no amplía permisos.
- Integridad y trazabilidad: cumple; la clasificación no altera nota y la confirmación final sigue siendo explícita.
- Asincronía e idempotencia: no aplica a la derivación; no se crean trabajos ni efectos persistentes nuevos.
- Datos y secretos: cumple; la analítica registra conteos, nivel y duración, nunca respuestas o imágenes.
- Accesibilidad: cumple mediante botones de 44 px, etiquetas, orden lógico, teclado, diseño 360 px y sin animación obligatoria.
- Gobernanza y pruebas: cumple con issue #99, especificación aprobada, plan, tareas y pruebas focales antes del PR.

## Estructura del proyecto

```text
frontend/src/modules/calificaciones/
├── CalificacionesWorkspace.tsx
├── review-triage/
│   ├── buildReviewTriage.ts
│   ├── buildReviewTriage.test.ts
│   ├── ReviewTriagePanel.tsx
│   └── ReviewTriagePanel.test.tsx
└── components/
    └── GradeBreakdown.tsx

frontend/src/lib/
├── analytics.ts
└── analytics.test.ts

frontend/e2e/mock/
└── grading-review.spec.ts

specs/050-revision-por-excepciones/
```

## Decisiones y complejidad

- La confianza menor a 0,70 es señal de atención, coherente con la interfaz actual, pero no decide la nota.
- `requiere_revision`, estado ilegible/no evaluable o puntaje ausente bloquean la revisión rápida.
- Diferencias entre verificaciones, ausencia de explicación o falta de una verificación asistida generan atención.
- “Incorrecta”, “parcial” o “sin respuesta” describen desempeño y no generan excepción por sí solas.
- El bloqueo global por cobertura incompleta se muestra separado de los conteos por respuesta para no inventar qué componente está afectado.
- Se rechazó persistir un “visto” por pregunta en esta iteración: añadiría fricción, migración y falsa garantía. La evidencia del piloto se obtiene mediante eventos de interacción agregados.
- Se rechazó confirmar o publicar en lote desde este panel: la acción final existente conserva la revisión humana y las validaciones del servidor.

## Verificación posterior al diseño

El diseño no cambia contratos backend ni esquema, no reduce controles de publicación y mantiene disponible el desglose completo. La clasificación es explicable y comprobable con funciones puras; por tanto, no introduce excepciones a la constitución.
