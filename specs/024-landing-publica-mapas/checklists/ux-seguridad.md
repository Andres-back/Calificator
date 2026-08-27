# Checklist de requisitos: experiencia pública y seguridad de roles

**Propósito**: revisión humana previa a implementación.
**Creado**: 2026-08-26
**Propietario**: revisor del PR; `[x]` significa que el requisito está suficientemente definido.

## Completitud

- [x] CHK001 ¿Están diferenciadas la landing, el login, el registro y la aplicación protegida sin destinos ambiguos? [Spec §FR-001–FR-003]
- [x] CHK002 ¿Está definido que toda cuenta pública nace como estudiante aunque solicite docencia? [Spec §FR-004–FR-006]
- [x] CHK003 ¿Están descritas todas las transiciones y decisiones administrativas de una solicitud docente? [Spec §FR-007–FR-010]
- [x] CHK004 ¿El contrato del mapa define cantidad, niveles, relaciones válidas y compatibilidad con contenido anterior? [Spec §FR-011–FR-014]

## Claridad y consistencia

- [x] CHK005 ¿Los permisos descritos para frontend y backend son consistentes con la separación estricta de roles? [Constitución I]
- [x] CHK006 ¿Los requisitos visuales cubren 360 px, escritorio, modo oscuro, foco y texto alternativo? [Spec §FR-015]
- [x] CHK007 ¿La estrategia de pruebas focalizadas conserva las puertas completas de CI antes del merge? [Spec §FR-016]

## Casos límite

- [x] CHK008 ¿Están definidos duplicados, decisiones concurrentes, protección administrativa y salidas incompletas del mapa? [Spec §Casos límite]
- [x] CHK009 ¿Los criterios de éxito permiten medir navegación, ausencia de privilegio temprano y legibilidad del mapa? [Spec §SC-001–SC-006]

## Notas

Este checklist evalúa la calidad de los requisitos, no el funcionamiento del código.
