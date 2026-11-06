# Plan: El docente decide 2.9 o 3.0 en pantalla

**Spec**: [spec.md](spec.md) | **Issue**: [#321](https://github.com/Andres-back/Calificator/issues/321)

## Diagnóstico

- **Backend listo:** confirmar, ajustar, "Establecer nota" y los lotes aceptan `redondeo_empate` y rechazan el empate sin decisión (422 al escribir, 409 al publicar). Ajustar con la misma nota y una decisión nueva guarda la decisión y registra el historial (`decision_changed` en `calificaciones/service.py`).
- **Frontend sin la pregunta:** `confirmarNota`, `ajustarNota`, `establecerNotaManual` y sus tipos no conocen la decisión.
- **Presentación:** `formatGradeScore(score, notaMaxima)` deja 2.95 siempre, con o sin decisión.
- **Lista de revisión:** el frontend arma cada fila desde `alumnos` usando `nota`; hay que comprobar si la respuesta trae la decisión.

## Decisión

Funciones puras en `gradePresentation.ts`, con la misma aritmética entera de hoy:

- `tieOptions(score, notaMaxima)` devuelve `null` o `{ abajo: '2.9', arriba: '3.0' }`. Es la única detección del empate en el frontend.
- `formatGradeScore(score, notaMaxima, decision?)`: el tercer parámetro es opcional, de modo que las llamadas actuales no cambian.

Un componente `TieDecisionField`: dos opciones (radio) sin preselección, con las cifras de `tieOptions`. Se usa en el diálogo de confirmar, en `GradeFinalEditor`, en el ajuste rápido y en "Establecer nota". El botón de guardar queda inactivo hasta elegir.

Nota confirmada pendiente: un aviso en el detalle con el mismo campo llama a `ajustarNota(id, notaExacta, undefined, { redondeo_empate })`. No se crea ningún endpoint. "Publicar" no se ofrece hasta decidir, también en la barra móvil.

Descartado:

- Enviar y reaccionar al 422: el mensaje llegaría después de pulsar, y la Spec 147 lo dejó solo como red de seguridad.
- Preseleccionar "arriba": la decisión es del docente, y aprobaría a un estudiante por omisión.
- Reescribir la nota a 2.9 o 3.0: la Spec 147 exige conservar la nota exacta.
- Una "nota presentada" calculada en el backend: duplicaría formatos, como ya se descartó en la Spec 148.

## Alcance técnico

Dos PR pequeños. El primero quita el bloqueo de producción.

| PR | Archivos | Cambio |
| --- | --- | --- |
| 1. Historias 1 y 2 | `gradePresentation.ts`, `components/TieDecisionField.tsx` (nuevo), `calificaciones/api.ts`, `types/api.ts`, `GradeFinalEditor.tsx`, `CalificacionesWorkspace.tsx`, pruebas unitarias y E2E `grade-tie-decision.spec.ts` | La pregunta y el aviso. |
| 2. Historia 3 | Llamadas a `formatGradeScore` con decisión disponible (lista y detalle, `BoletinPage`, `StudentResultCard`, `ResolverEvaluacionPage`, `studentProgress`, retroalimentación, Xali), el campo de la lista si falta en el backend, y pruebas | La cifra decidida en pantalla. |

Propietario: dominio de calificaciones. Sin migraciones.

## Riesgos

- **Pantallas sin la decisión:** algunas llamadas, como `AnalyticsPage`, no reciben la decisión y seguirían mostrando 2.95. El PR 2 las lista en `quickstart.md` en lugar de darlas por cubiertas.
- **Devoluciones ya compartidas:** solo se cambia la presentación. La huella no se toca (Spec 148).
- **Producción:** fusionar despliega solo. Se comprueba antes que no haya trabajos activos.

## Verificación

Regresión primero (RED) y después GREEN: pruebas unitarias de `tieOptions` y `formatGradeScore` en escalas 5, 10, 100 y 4.5, y E2E de confirmar, editar, establecer y decidir una nota pendiente, además de `lint`, `typecheck`, la suite unitaria de frontend, las E2E de revisión y, si cambia el backend, sus pruebas.
