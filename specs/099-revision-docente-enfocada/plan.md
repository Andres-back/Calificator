# Plan: revisión docente enfocada

**Rama**: `codex/099-revision-docente-enfocada` | **Fecha**: 2026-10-14 | **Spec**: [spec.md](./spec.md) | **Issue**: [#207](https://github.com/Andres-back/Calificator/issues/207)

Estado: alcance/plan aprobados mediante «aprove» el 2026-10-14; revisión asistida de requisitos autorizada. Implementación en curso, sin autorización de fusión/despliegue.

## Resumen

Reorganizar la revisión bajo 008-calificaciones. Resumen compacto de identidad/nota/estado y aviso prioritario; cuatro accesos principales (Respuestas, Evidencia, Retroalimentación, Historial), uno activo en celular. Quejas y reclamos como acceso contextual con contador; alta disponible en opciones. En escritorio mantener roster y comparación evidencia/respuestas cuando quepa. Conservar contratos, permisos, guardado y reglas académicas existentes.

## Contexto técnico

**Lenguajes/versiones**: React 18.3, TypeScript 5.6, CSS/Tailwind existentes.
**Dependencias**: React Router, React Query, componentes UI, Vitest/Testing Library/Playwright actuales. Sin paquetes nuevos.
**Persistencia**: no cambia; sección activa y borradores usan estado/contexto existente, sin datos sensibles en almacenamiento nuevo.
**Pruebas**: unidades de presentación/priorización, interacción de cambios sin guardar, reclamos, enlaces y regresiones mock móvil/escritorio.
**Plataforma objetivo**: Safari/iPhone, Chrome/Android y escritorio, ambos temas, desde 360 px. Emulación no acredita teclado físico.
**Rendimiento y escala**: máximo dos activaciones por sección desde resumen, sin nuevas llamadas IA ni refetch por cada render. Scroll fluido con listas y editores existentes.

## Verificación de la constitución

- Separación de roles: conservar guardas frontend y autorizaciones backend de consulta/edición/publicación/reclamos; no capacidades nuevas.
- Integridad y trazabilidad: conservar valores, fórmulas, decisiones e historial. Mensajes describen discrepancias, no las resuelven cambiando notas.
- Asincronía e idempotencia: cambiar sección no inicia calificación ni mutación; conservar estados y errores recuperables.
- Datos y secretos: fixtures sintéticos, sin copia de nombres/fotos reales de capturas en tests, logs o artefactos.
- Accesibilidad: foco/teclado y objetivos de 44 px; controles en dos columnas adaptables sin carrusel horizontal; barra inferior no tapa editor/teclado.
- Gobernanza y pruebas: plan/lista/tareas/análisis antes de implementar; CI verde y autorización separada para fusión. Fase demo, sin despliegue de propuesta.

Reevaluación tras diseño: cumple por diseño, sin excepciones ni cambios de dominio; no equivale a pruebas ejecutadas.

## Estructura del proyecto

- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: integración del resumen, navegación, historial y reclamos existentes, preservando handlers y guardas.
- `frontend/src/modules/calificaciones/review-triage/`: presentación priorizada, detalle de motivos y destinos reutilizando clasificación existente.
- Componentes/modelo pequeños de presentación dentro del mismo módulo, para no ampliar el workspace monolítico.
- Tests colocados junto al módulo y escenarios de `frontend/e2e/mock/`.
- Documentación de 008 y 099 al implementar; no editar 098 para introducir este alcance.

Sin nuevos endpoints, tablas, servicios ni rutas públicas.

## Decisiones y complejidad

1. Resumen común con una sola nota protagonista y estado; diferencia numérica activa visible como aviso prioritario con valores claramente identificados. Cálculo completo a petición.
2. Navegación accesible por botones con estado seleccionado/panel asociado, reutilizando enlaces de pregunta/hoja. No montar y desmontar editores de modo que se pierdan borradores. Toda transición pasa por protección existente de cambios pendientes.
3. Priorización de aviso: discrepancia activa de nota y bloqueo de revisión primero; luego respuesta identificada y otros motivos. Un CTA principal; motivos restantes consultables sin eliminar información ni afirmar corrección por ausencia de alertas.
4. `GradeNoteExplanation` distingue pendiente, ajuste registrado y diferencia sin explicación. No inferir decisión docente solo porque dos números difieren; conservar tolerancia numérica y fórmula.
5. Historial reúne accesos a timeline, versiones y avisos originales; detalles técnicos avanzados cerrados. Ajustes globales/liberación/publicación/reanálisis conservan permisos, ubicados en opciones claras sin modificar reglas.
6. Reclamos: diferenciar consulta correcta vacía de carga/error y de solo resueltos. Acceso para existentes, contador abiertos; alta desde opciones incluso sin registros. Mantener handlers de crear/resolver y control de formularios pendientes.
7. En celular no imponer comparar dos paneles estrechos; en escritorio comparación cuando haya ancho suficiente, manteniendo contexto y scroll alcanzable. Barra inferior conserva guardado/confirmar/siguiente y cede espacio durante escritura.

Diseño complementario: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/review-ui.md](./contracts/review-ui.md), [quickstart.md](./quickstart.md). Lista UX revisada por autorización explícita; tareas y análisis antes de código.
