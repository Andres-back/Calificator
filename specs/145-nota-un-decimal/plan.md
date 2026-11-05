# Plan: Nota con un decimal y redondeo consistente en todas las vistas

**Rama**: `codex/145-nota-un-decimal` | **Fecha**: 2026-11-04 | **Spec**: [spec.md](./spec.md) | **Issue**: [#310](https://github.com/Andres-back/Calificator/issues/310)

## Resumen

Una sola función de presentación, `formatGradeScore(score, notaMaxima?)` en `frontend/src/modules/calificaciones/gradePresentation.ts`, pasa a mostrar un decimal con redondeo exacto de la mitad hacia arriba y conserva dos decimales solo en el empate del umbral. Todas las vistas de nota final la usan en lugar de `toFixed(1)` o de la versión anterior de dos decimales. Xali recibe la nota máxima, un campo nuevo y opcional en su respuesta, para poder detectar el empate.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5 / React 18 (frontend); Python 3.11 / FastAPI y Pydantic (un campo opcional en Xali).
**Dependencias**: ninguna nueva.
**Persistencia**: sin cambios. Las notas siguen guardándose con dos decimales.
**Pruebas**: Vitest (unitarias de la función y de cada vista afectada); pytest para el campo de Xali.
**Plataforma objetivo**: web, móvil y escritorio.
**Rendimiento y escala**: aritmética entera O(1) por nota.

## Algoritmo

1. `centésimas = Math.round(Number(score) * 100)`. La nota llega con dos decimales como mucho, así que este paso es exacto y elimina el error binario: 1.15 da 115, no 114.99….
2. `décimas = Math.floor((centésimas + 5) / 10)`, que redondea la mitad hacia arriba. Las notas no son negativas.
3. Empate, solo si se conoce `notaMaxima`:
   - `máximaCent = round(notaMaxima × 100)`;
   - umbral en décimas `= floor((máximaCent × 6 + 50) / 100)`, que es el 60 % llevado a un decimal con la misma regla;
   - hay empate si `centésimas === umbral × 10 − 5`.
4. Con empate se devuelve `(centésimas / 100).toFixed(2)`; sin empate, `(décimas / 10).toFixed(1)`.

Verificación de los casos de la spec:

| Valor | Máxima | Resultado |
| --- | --- | --- |
| 2.95 | 5 | 2.95 (empate) |
| 2.95 | 10 | 3.0 |
| 5.95 | 10 | 5.95 (empate) |
| 2.65 | 4.5 | 2.65 (empate) |
| 1.15 | — | 1.2 |
| 8.05 | — | 8.1 |

## Verificación de la constitución

- **Separación de roles:** cumple. Docente y estudiante ven la misma cifra y no cambian los permisos.
- **Integridad y trazabilidad:** cumple. Solo cambia la presentación; el valor guardado, el desglose y el historial no se tocan, y las vistas de auditoría conservan dos decimales.
- **Asincronía e idempotencia:** no aplica.
- **Datos y secretos:** cumple. Sin datos reales; la nota máxima de Xali ya pertenece al estudiante que consulta.
- **Accesibilidad:** cumple. Solo cambia el texto de la cifra.
- **Gobernanza y pruebas:** cumple. Pruebas en RED antes y en GREEN después, inventario y `tasks.md`.

## Estructura del proyecto

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/calificaciones/gradePresentation.ts` | `formatGradeScore(score, notaMaxima?)` con el algoritmo. |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | Nota principal, nota máxima, lista de estudiantes y confirmación pasan `notaMaxima`. No se tocan la comparación de calificadores A/B ni el texto de la fórmula (FR-005). |
| `frontend/src/modules/calificaciones/BoletinPage.tsx`, `StudentResultCard.tsx` | Reemplazan `toFixed(1)`. |
| `frontend/src/modules/evaluaciones/ResolverEvaluacionPage.tsx`, `studentProgress.ts` | Reemplazan `toFixed(1)`. |
| `frontend/src/modules/materias/StudentGradebookPreview.tsx` | Pasa `cell.maximumScore`. |
| `frontend/src/modules/feedback_sharing/{ShareFeedbackDialog,FeedbackStudentList,FeedbackBatchPublish,FeedbackSharePanel}.tsx` | Pasan la nota máxima cuando la tienen. |
| `frontend/src/modules/analytics/AnalyticsPage.tsx` | Nota de cada evaluación del estudiante (`ev.nota / ev.nota_maxima`). |
| `frontend/src/modules/xali/XaliPage.tsx` (y su tipo) | Usa `formatGradeScore` con `nota_maxima`. |
| `backend/app/modules/xali/{schemas,service}.py` | Campo opcional `nota_maxima` en `XaliEvaluacionEntregadaRead`. Es aditivo y no rompe a los clientes actuales. |
| Pruebas | `gradePresentation.test.ts` (tabla de SC-002), ajustes en las pruebas de cada vista que fijaban el formato anterior y una prueba de Xali en backend. |

Fuera de esta spec:
- promedios del curso (`DashboardEstudiante`, promedios de analítica);
- vistas de cálculo y auditoría (`GradeFormula`, `GradeBreakdown`, `GradeBreakdownHistory`, `GradeComponentEditor`, `GradeReprocessing`, `PreviousGradeReference` de la nota anterior);
- validación del rango al escribir una nota (`gradingFlowModel`).

## Decisiones y complejidad

- **Reutilizar `formatGradeScore`** en lugar de crear otra función: ya es la de presentación del docente y así se evita una segunda regla. El parámetro `notaMaxima` es opcional para no obligar a cambiar las vistas que no la conocen.
- **Aritmética en centésimas enteras** en lugar de `toFixed`, que reproduce el error binario (`(1.15).toFixed(1) === "1.1"`), o de `Intl.NumberFormat`, cuyo redondeo depende del motor.
- **Empate con dos decimales** en lugar de elegir 2.9 o 3.0: la decisión es del docente, y su pregunta llega en la spec posterior.
- **Xali con nota máxima en backend:** sin ese dato, un 2.95 se vería 3.0 solo en Xali, lo que incumple FR-003. El cambio es aditivo, de unas 2 líneas.
- **Descartado: unificar también los promedios.** No son una nota de un estudiante y su regla de presentación es otra decisión.

## Reducción y validación visual

- No se añade ningún control ni texto. Se retiran los `toFixed(1)` sueltos de las vistas de nota final y quedan en una sola regla.
- No hay maqueta ni capturas porque no cambia la jerarquía. La evidencia son las pruebas, que comparan el texto exacto (justificado en la spec).
- Se conserva todo lo existente: estados "Calificando" y "—", permisos, borradores y navegación.

## Entregas siguientes (para trazabilidad)

1. **Spec posterior de backend:** regla de redondeo y detección del empate al confirmar, y `tasa_aprobacion` de analítica calculada sobre la nota redondeada.
2. **Spec posterior de frontend:** pregunta al docente (2.9 o 3.0) al confirmar una nota en empate.
