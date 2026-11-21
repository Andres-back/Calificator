# Plan: Criterio de accesibilidad y usabilidad

**Spec**: [spec.md](spec.md) | **Issue**: [#439](https://github.com/Andres-back/Calificator/issues/439)

## Decisión

Solo documentación de gobierno; no cambia código.

- `.specify/memory/constitution.md`: enmienda del principio V y versión 1.1.0 (MINOR: ampliación material de un principio, según la sección Governance).
- `docs/accesibilidad-usabilidad.md`: guía nueva con los criterios y su verificación.
- `docs/SPEC_KIT.md`: recordatorio del recorrido en specs de interfaz.

## Por qué WCAG 2.2 AA y 44 px

WCAG 2.2 es la versión vigente del estándar del W3C, y el nivel AA es el que se exige habitualmente en servicios públicos y educativos. Para el tamaño táctil, WCAG 2.2 AA pide 24 px (criterio 2.5.8); adoptamos 44 px porque los usuarios son docentes mayores que trabajan desde el celular. Ese valor ya era el que verificaban las pruebas de la revisión de calificaciones. Del nivel AAA solo adoptamos el lenguaje llano (3.1.5).

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `.specify/memory/constitution.md` | principio V y versión |
| `docs/accesibilidad-usabilidad.md` | guía |
| `docs/SPEC_KIT.md` | recorrido en specs de interfaz |

## Riesgo

Ninguno en producción. Las specs de interfaz tendrán un recorrido más explícito.
