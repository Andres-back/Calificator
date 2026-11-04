# Plan: Confirmar la reducción de acceso por encima del editor de usuarios

**Spec**: [spec.md](spec.md) | **Issue**: [#306](https://github.com/Andres-back/Calificator/issues/306) | **Tipo**: hotfix (no requiere `plan-approved`)

## Diagnóstico

- `frontend/src/components/ui/Modal.tsx` no usa portal. Cada diálogo es `fixed inset-0 z-50`, y el diálogo "superior" para el foco y Escape es el último `[role="dialog"][aria-modal="true"]` del DOM (`dialogs.item(dialogs.length - 1)`). Con el mismo `z-index`, el último del DOM también es el que se ve encima.
- `frontend/src/modules/admin/AdminUsersPage.tsx` renderizaba el `ConfirmDialog` de reducción de acceso **antes** del `Modal` editor. `submitEditor()` abre la confirmación sin cerrar el editor, así que la confirmación quedaba debajo.
- Las pruebas existentes comprobaban `toBeVisible()`, que jsdom no evalúa contra el apilamiento.

## Decisión

Reubicar el `ConfirmDialog` de reducción de acceso después del `Modal` editor, con un comentario que explique por qué. Es el cambio mínimo, ya que respeta el contrato vigente de `Modal`.

Alternativas descartadas en este hotfix:
- Cerrar el editor al confirmar: se perdería lo escrito si el administrador cancela.
- Portal y pila global en `Modal`: afecta a todas las pantallas y requiere su propia especificación (hallazgo M14).

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/src/modules/admin/AdminUsersPage.tsx` | Reubica el `ConfirmDialog` después del `Modal` editor. |
| `frontend/src/modules/admin/AdminUsersPage.test.tsx` | Regresión jsdom: diálogo superior, foco, Escape, conservación del valor y aplicación. |
| `frontend/e2e/admin-authorization.spec.ts` | Regresión en navegador real con `elementFromPoint` a 384 px y 1440 px, claro y oscuro; genera las capturas. |

Propietario: dominio 029 (usuarios, roles y permisos modulares). Sin backend, migraciones, contratos ni datos.

## Verificación

Unitarias de admin, `typecheck`, `lint`, E2E del archivo de autorización y suite frontend completa. La prueba E2E debe fallar con el código anterior.
