# Plan: Estado legible, carga por tarjeta y confirmación al publicar o cerrar evaluaciones

**Spec**: [spec.md](spec.md) | **Issue**: [#308](https://github.com/Andres-back/Calificator/issues/308) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

- `frontend/src/modules/materias/MateriaEvaluaciones.tsx` renderizaba `{evaluation.estado}` con tono `success` salvo `cerrada`. Ya existían `ESTADO_LABEL` (privado en `EvaluacionesPage.tsx`) y `statusTone` (`components/ui/Badge.tsx`).
- Ambas páginas usan una sola instancia de `useMutation` por acción para todas las tarjetas y pasaban `loading={mutation.isPending}`, así que la carga se reflejaba en todas.
- Publicar, Cerrar entregas y Cerrar llamaban a `mutate` directamente desde el botón.

## Decisión

- Mover `ESTADO_LABEL` a `frontend/src/modules/evaluaciones/evaluationStatus.ts` (evita exportar constantes desde un archivo de componentes) y usarlo con `statusTone` en la tarjeta de la materia.
- Limitar la carga a la tarjeta comparando `mutation.variables === evaluation.id`.
- Un estado local `confirmAction` (`publish` | `pause` en la materia, `publish` | `close` en la página general) abre un `ConfirmDialog`; la mutación lo cierra en `onSettled`. El diálogo se renderiza al final, por el contrato de apilamiento de `Modal` (Spec 144).

Descartado: un diálogo por tarjeta (multiplica modales en el DOM) y extraer un hook común (el hotfix debe ser mínimo).

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/evaluaciones/evaluationStatus.ts` | Nuevo: `ESTADO_LABEL`. |
| `frontend/src/modules/evaluaciones/EvaluacionesPage.tsx` | Importa `ESTADO_LABEL`; confirmación de Publicar/Cerrar; carga por tarjeta. |
| `frontend/src/modules/materias/MateriaEvaluaciones.tsx` | Etiqueta y tono del estado; confirmación de Publicar/Cerrar entregas; carga por tarjeta. |
| `frontend/src/modules/materias/MateriaEvaluaciones.test.tsx` | Regresiones 146 y ajuste de la prueba existente de cerrar entregas (ahora confirma). |
| `frontend/src/modules/evaluaciones/EvaluacionesPage.test.tsx` | Nuevo: regresiones 146 de la página general. |

Propietario: dominio de evaluaciones (frontend). Sin backend, migraciones, contratos ni datos.

## Verificación

Regresiones en RED con el código anterior y GREEN con la corrección; suite frontend completa, `lint`, `typecheck` y E2E de evaluaciones.
