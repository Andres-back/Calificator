# Plan: Revisión automática de reglas WCAG con axe

**Spec**: [spec.md](spec.md) | **Issue**: [#443](https://github.com/Andres-back/Calificator/issues/443)

## Decisión

- **Dependencias de desarrollo**: `@axe-core/playwright` 4.14.0 (15 oct 2026) y `axe-core` 4.14.0, con versión exacta. Se evitó `axe-core` 4.14.1 porque tenía 4 días de publicado.
- **Prueba** `frontend/e2e/accessibility/wcag-axe.a11y.spec.ts`: cinco pantallas con la API simulada del entorno de pruebas, dos temas y dos anchos (20 casos). El reporte de violaciones nombra la regla, el elemento y el motivo; con `AXE_REPORT=1` se imprime en JSON.
- **Correcciones**:
  - `calificaciones/ReviewNavigation.tsx`: sin `aria-label`; la descripción lleva `id` y `aria-hidden`, y el botón la anuncia con `aria-describedby`. El nombre sigue siendo el título, así que las pruebas existentes no cambian.
  - `components/layout/Topbar.tsx`: las iniciales se dibujan con `content: attr(data-initials)`. axe cuenta el texto visible aunque tenga `aria-hidden`, y el contenido generado por CSS no entra en esa cuenta. El nombre del botón no cambia.
  - `calificaciones/CalificacionesWorkspace.tsx`: `role="region"` en «Vista de la revisión».

La prueba corre en CI con la suite de accesibilidad (Spec 210).

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `frontend/package.json`, `frontend/package-lock.json` | dependencias de desarrollo |
| `frontend/e2e/accessibility/wcag-axe.a11y.spec.ts` | prueba nueva |
| `frontend/src/modules/calificaciones/ReviewNavigation.tsx` | nombre y descripción |
| `frontend/src/components/layout/Topbar.tsx` | iniciales decorativas |
| `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` | rol de región |

## Costo

Cerca de 1,5 minutos más en la suite de accesibilidad (20 análisis con axe).

## Riesgo

Bajo. Cambios de atributos de accesibilidad sin cambio visual; los nombres accesibles que usan las pruebas se conservan.
