# Plan: boletín docente en mosaico

**Rama**: `codex/092-boletin-mosaico` | **Fecha**: 2026-10-08 | **Spec**: [spec.md](./spec.md) | **Issue**: [#194](https://github.com/Andres-back/Calificator/issues/194)

**Estado**: alcance y plan aprobados el 2026-10-08; lista revisada con autorización (8/8). Implementado y validado localmente; fusión y producción pendientes de autorización separada y CI verde.

## Resumen

Reemplazar ambas presentaciones docentes del boletín por un mosaico único. Tocar una ficha abre el diálogo existente de la aplicación con todas las evaluaciones no borrador del alumno en esa materia, aunque el mosaico esté filtrado. Conservar búsqueda, filtros, seguimiento plegado y exportación, sin modificar registros académicos ni la vista estudiante.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18, según `frontend/package.json`.
**Dependencias**: React Router 7, TanStack Query 5, Tailwind 3 y componentes UI existentes; ninguna nueva.
**Persistencia**: ninguna nueva. Selección temporal del estudiante, sin migraciones ni escrituras académicas.
**Pruebas**: Vitest/Testing Library, matriz Playwright Chromium/WebKit focalizada, TypeScript/lint/build y regresiones aplicables de permisos/solo lectura en backend. CI completo antes del merge.
**Plataforma objetivo**: Android, iPhone y escritorio; claro/oscuro; 360, 390, 768 y 1280 píxeles.
**Rendimiento y escala**: 30 alumnos sintéticos; previsualización con datos cargados en menos de un segundo. Consultas por evaluación necesaria, no por ficha; refresco de cinco segundos solo donde exista procesamiento.

## Verificación de la constitución

- Separación de roles: mantener `canManageMateria` para bifurcar docente/estudiante, exigir `grading.read` para resultados y exportación; backend conserva propiedad/permisos. Selección invalidada por materia, usuario, permiso o pérdida de matrícula.
- Integridad y trazabilidad: `listCalificaciones(id, { readOnly: true })` impide reconciliaciones en la consulta; preservar notas, escalas, precisión, cero real, estados y fórmulas.
- Asincronía e idempotencia: lectura cacheada con carga/error/reintento explícitos; no trabajos nuevos ni resultados ausentes inferidos de una consulta incompleta.
- Datos y secretos: sin cambios de esquema, credenciales, fotos o registros. Solo pruebas sintéticas.
- Accesibilidad: diálogo compartido con nombre, Escape, confinamiento/retorno de foco, viewport dinámico y scroll; controles de 44 píxeles y nombres sin truncar.
- Gobernanza y pruebas: issue #194 y rama existente, alcance y plan aprobados; Checklist/Tasks/Analyze preceden Implement. La lista personalizada requiere revisión autorizada. Merge/despliegue requieren autorización separada y CI verde.

**Gates antes y después del diseño**: cumple, sin excepciones. Aprobación humana de alcance/plan registrada; revisar checklist antes de implementar.

## Estructura del proyecto

```text
frontend/src/modules/materias/
  MateriaBoletin.tsx                 # mosaico, filtros, consultas y selección
  MateriaBoletin.test.tsx            # interacción, datos y permisos
  StudentGradebookPreview.tsx        # nueva presentación de solo lectura
  gradebookModel.ts                  # reutilizar, sin cambiar fórmulas
  GradebookExport.tsx                # conservar formato y comportamiento
frontend/src/components/ui/Modal.tsx # reutilizar, sin rediseño global
frontend/e2e/p2-responsive.spec.ts   # ampliar suite contextual existente
frontend/playwright.config.ts       # incluir caso 092 en selección WebKit
specs/092-boletin-mosaico/           # diseño y evidencia
specs/README.md                     # evolución del propietario 008
```

## Decisiones y complejidad

### Mosaico compacto y detalle progresivo

- Cabecera «Boletines», búsqueda, filtro por evaluación y exportación; seguimiento plegado, no resumen fijo que tape la pantalla.
- Dos columnas a 360 píxeles, tres intermedias y cuatro en escritorio, ajustadas al espacio disponible. Sin altura rígida ni nombres truncados; reducir columnas si la validación muestra pérdida de legibilidad.
- Ficha-botón: iniciales, nombre completo, identificador para distinguir homónimos y resumen breve de resultados. Con evaluación filtrada, mostrar su nota/estado; sin ella, conteo de decisiones/pendientes. No desplegar todo el feedback en cada ficha.
- `StudentGradebookPreview` recibe alumno, materia, resultados y estado de lectura; no consulta ni muta servicios por sí mismo. Diálogo «Boletín de [nombre]», filas compactas de evaluación/nota/escala/estado y enlace «Ver explicación» a `gradingHref` existente.
- Todas las evaluaciones no borrador en la previsualización; el filtro del mosaico no reduce el boletín. Estado vacío si no hay evaluaciones, pero no ocultar alumnos del mosaico.
- Mantener el mosaico montado al abrir, preservar búsqueda/filtros/scroll y recuperar foco al cerrar. Un contenedor de scroll en el diálogo, cierre accesible, sin apilar exportación y previsualización.
- El enlace de explicación conserva `volver` con filtros actuales. No añadir ruta nueva ni exigir persistir el diálogo tras navegar a otra página.

### Consultas y seguridad de contexto

- Registrar consultas estables por evaluación; habilitar el subconjunto del filtro y, mientras la previsualización esté abierta y autorizada, las necesarias para todas las evaluaciones de la materia. Reutilizar datos cargados, sin lecturas por alumno.
- Usar siempre `listCalificaciones(id, { readOnly: true })`. Clave sugerida: `['calificaciones', evaluation.id, 'solo-lectura', materia.id, user.id]`; conserva invalidaciones por prefijo y no colisiona con la consulta corta del workspace, que puede reconciliar vencimientos.
- Construir mosaico con `visibleEvaluations`; previsualización con `trackedEvaluations` y solo el alumno seleccionado. Selección por identidad `{materiaId, userId, studentId}`, no copia obsoleta de su fila.
- Carga/error de las evaluaciones adicionales pertenece al diálogo y no desmonta el mosaico. Un mapa incompleto no representa ausencia: solo una respuesta exitosa vacía significa «Sin calificación».
- Guardar selección y verificar ámbito/permiso durante render, además de limpiarla en efectos: no mostrar datos del contexto anterior al cambiar usuario, materia o matrícula. Sin lectura, no consultar ni inventar estados de notas.
- Reintentar lecturas fallidas necesarias, no trabajos de IA; datos vigentes actualizan el resultado abierto. Refrescar procesamiento únicamente en consultas habilitadas.

### Estados y precisión

- Reutilizar `buildFollowUpRows`, `latestGrade`, `hasTeacherDecision` e `isGradeProcessing`; conservar porcentajes, orden por prioridad y fórmulas.
- Reutilizar `formatGradeScore` existente: conserva las dos cifras decimales disponibles en las columnas `Numeric(6, 2)` de notas y escala; evitar el `toFixed(1)` actual que oculta `4.67`. No cambiar los valores ni el CSV.
- Estado publicado distinto de decisión aún sin publicar; sugerencia marcada como no definitiva, ausencia/procesamiento sin cero. No emitir escrituras al consultar.

### Validación proporcional y entrega

- Ampliar tests existentes de boletín: 30 alumnos/homónimos, búsqueda/filtros, cero/centésimas/escalas, todas las notas en el diálogo, errores parciales/reintento, modo solo lectura y cambio de contexto/permisos. Mantener regresiones de estudiante, modelo y exportación.
- Una matriz focalizada Chromium/WebKit: móvil/escritorio, claro/oscuro, último resultado accesible, foco, cierre y scroll del documento/`main`. Solo datos sintéticos.
- TypeScript, lint y build al cierre; repetir únicamente pruebas afectadas por correcciones. Documentar evidencia, Converge y PR con CI completo antes del merge.

## Artefactos de diseño

- [Investigación y alternativas](research.md).
- [Modelo de lectura](data-model.md).
- [Contrato de interfaz](contracts/boletin-ui.md).
- [Guía de validación](quickstart.md).

Sin incertidumbres críticas pendientes. Evidencia real de implementación y verificaciones en [quickstart.md](quickstart.md).
