# Plan: rutas legales realmente públicas

**Rama**: `codex/068-rutas-legales-publicas` | **Fecha**: 2026-09-24 | **Spec**: [spec.md](./spec.md) | **Issue**: [#141](https://github.com/Andres-back/Calificator/issues/141)

## Solución

1. Registrar las cinco rutas legales en la lista pública del bootstrap.
2. Convertir la prueba de login público en una regresión parametrizada que incluya los documentos legales.
3. Ejecutar pruebas focalizadas, tipos, lint y verificación real sin sesión.

## Seguridad y compatibilidad

La corrección solo evita una consulta de sesión en páginas cuyo contenido ya es público. No cambia el router protegido, `RequireAuth`, permisos, cookies, contratos backend ni persistencia.

## Despliegue

Hotfix mediante PR y CI. Tras desplegar, se abre cada ruta desde un contexto de navegador nuevo y se confirma que no cambia a `/login`.
