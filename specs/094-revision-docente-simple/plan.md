# Plan: revisión docente sencilla

**Branch**: `codex/094-revision-docente-simple` | **Date**: 2026-10-11 | **Spec**: [spec.md](./spec.md) | **Issue**: [#198](https://github.com/Andres-back/Calificator/issues/198)

**Estado**: aprobado por el usuario el 2026-10-11; revisión de lista autorizada antes de implementar. No autoriza fusión ni despliegue.

## Summary

Simplificar el detalle de calificaciones existente, no crear otra pantalla. Primero nota y estado vigente; después evidencia, respuestas/puntajes y retroalimentación. Diferenciar avisos activos de historial del análisis inicial, traducir motivos a lenguaje cotidiano y reducir tarjetas anidadas. Comprobar cálculo, ajustes y conservación mediante regresiones focalizadas.

## Technical Context

- TypeScript 5.6, React 18, Tailwind y React Query existentes; Python 3.11 para regresiones backend.
- Vitest/Testing Library y Playwright existentes; Chromium y WebKit para UX móvil.
- PostgreSQL, almacenamiento de evidencia y contratos actuales no cambian; sin migraciones, nuevos endpoints, dependencias, prompts o llamadas de IA.
- Objetivo: navegador Android/iPhone, tablet y escritorio; 360/390/768/1280/1440 px, claro/oscuro.
- Límites: controles de 44 × 44 px, sin scroll horizontal obligatorio, encabezado breve y ningún overlay que tape el último control. Grupo sintético de 30 alumnos y nombres largos.
- No aumentar polling, bloquear navegación ni cargar de nuevo imágenes al abrir avisos.

## Constitution Check

- Roles: mantener permisos actuales de consulta, ajuste, confirmación y publicación; no ofrecer edición a estudiantes/solo lectura.
- Integridad: presentación derivada de datos registrados; no recalcular ni escribir al consultar. Conservar señales, motivos originales, historia y asociación de evidencia. No presumir que los avisos históricos se resolvieron ni que ausencia de avisos significa nota correcta.
- Asincronía: conservar carga/errores/reintentos y presentación pendiente sin cero definitivo; no cambiar workers o reanálisis.
- Datos: sin migración ni uso de registros reales; regresiones con ejemplos sintéticos.
- Accesibilidad: teclado, foco, controles etiquetados, táctiles y contraste claro/oscuro; conservar navegación y protección de borradores.
- Gobernanza: alcance confirmado; aprobación del plan requerida. Checklist, Tasks y Analyze antes del código; Converge y CI antes de PR/merge. Sin bypass ni push directo a main.

Revisión posterior al diseño: sin excepciones. No hay extensiones/hooks configurados. Este plan evoluciona 087/088 y reutiliza propietario 008, sin contratos paralelos.

## Project Structure

- `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts`: mensajes humanos según motivo y contexto, sin cambiar clasificación/prioridad.
- `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx`: panel activo frente a historial neutral; retirar listado técnico visible sin borrar sus fuentes.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: encabezado, cálculo, identidad/lista y secciones progresivas; mantener enlaces, permisos y handlers existentes.
- `frontend/src/modules/calificaciones/components/`: reutilizar desglose/editor/historial actuales; revisar mensajes visibles en el recorrido sin tocar contratos.
- Pruebas actuales del módulo, `frontend/e2e/mock/grading-review.mock.spec.ts` y regresiones backend de desglose/ajuste/autorización.
- `specs/094-revision-docente-simple/`: diseño, checklist y tareas tras aprobación; registrar evolución en índice/inventario correspondiente.

## Secuencia propuesta

1. Centralizar copia de avisos: pendiente en presente con acción, confirmado/publicado en pasado con botón de consulta, proceso sin atribuir decisión docente. Motivo desconocido tiene mensaje general seguro; códigos originales permanecen en datos y trazas existentes, nunca en contenido docente.
2. Retirar detalle técnico expandible y duplicación de cabeceras; usar historial neutral cerrado al abrir una nota decidida. Cambiar «excepciones», «desglose» y «bloqueadas» por expresiones claras en el recorrido de revisión. Mantener prioridades y destinos.
3. Resumen breve con nota/estado y explicación registrada. Diferenciar puntos obtenidos de escala de nota y ajuste explícito; no reemplazar la nota vigente por fórmula. Mantener evidencia, respuestas/puntajes y retroalimentación accesibles con controles directos.
4. Ajustar tamaños, saltos de línea y desplazamiento sobre layout existente: móvil muestra detalle con retorno a lista; escritorio conserva lista legible y detalle. Filtros envuelven o se adaptan sin arrastre horizontal obligatorio. No introducir scroll anidado adicional.
5. Probar estados, motivos desconocidos, ausencia de avisos, navegación a evidencia y puntos, edición/guardado y permisos; ejecutar las regresiones de suma y ajustes existentes. Si revelan fallo ajeno al alcance, documentarlo y pedir decisión; no reparar notas de producción silenciosamente.
6. Validar matriz visual y recorrido completo con datos sintéticos, revisión manual de capturas, typecheck/lint/build y CI. Converge y PR al terminar; aprobación separada para merge.

## Complexity Tracking

Sin excepciones ni infraestructura nueva. Extender los componentes y suites actuales evita duplicar reglas de calificación o navegación. La corrección matemática comprobada no equivale a exactitud universal de la interpretación de IA.

Diseño: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/interfaces.md](./contracts/interfaces.md), [quickstart.md](./quickstart.md).
