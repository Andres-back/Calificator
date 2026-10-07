# Lista de calidad de requisitos: inicio docente móvil

**Propósito**: validar claridad, completitud, consistencia y medición del alcance móvil aprobado; profundidad estándar, revisión previa a implementación.
**Creada**: 2026-10-06
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa calidad de requisitos revisada, no implementación terminada. Generada sin marcar; no sustituye las aprobaciones de especificación y plan.

## Completitud y cobertura

- [x] CHK001 ¿Están definidos los destinos para sesión vigente, vencida y cambio obligatorio de contraseña en cada rol? [Completitud, Spec FR-001, SC-003]
- [x] CHK002 ¿Está explícita la diferencia entre app instalada, navegador y actualización de instalaciones previas en iPhone y Android? [Claridad, Spec FR-002, Historia 1/AC4–5]
- [x] CHK003 ¿Están definidos prioridad de materias, acciones directas y conservación de herramientas secundarias sin navegación duplicada? [Consistencia, Spec FR-003/004/008, SC-002]
- [x] CHK004 ¿Están diferenciados carga, vacío, error, recuperación y fallo parcial sin cantidades ficticias? [Cobertura, Spec FR-005, SC-005]

## Claridad y consistencia

- [x] CHK005 ¿El alcance especifica búsqueda, nombres largos, grado ausente y permisos personalizados sin inventar datos o capacidades? [Completitud, Spec FR-004/008, Casos límite]
- [x] CHK006 ¿Están definidos detalle voluntario y límites de consulta de pendientes sin decisiones académicas implícitas? [Claridad, Spec FR-006/010, Historia 3/AC1–2]
- [x] CHK007 ¿Son explícitas omisión, reapertura y persistencia limitada de ayuda sin bloquear el trabajo? [Cobertura, Spec FR-007, SC-006; Plan decisión 4]

## Medición y trazabilidad

- [x] CHK008 ¿La presentación compacta tiene condiciones y medidas verificables, incluyendo tamaños, temas, objetivos táctiles y teclado? [Medición, Spec FR-009, SC-001/004]
- [x] CHK009 ¿Está documentada la distinción entre automatización y comprobación física en ambas plataformas, sin certificaciones supuestas? [Claridad, Spec FR-010, SC-004; quickstart.md]
- [x] CHK010 ¿Los límites de cambio protegen registros, trabajos, sesión y APIs, y se vinculan a aceptación y tareas? [Trazabilidad, Spec FR-001/008/010, SC-003/005]

## Notas

Revisión asistida autorizada expresamente por el usuario: «Sí, revisa la lista y continúa». Evaluación posterior a la generación: 10/10 satisfechos según referencias de cada criterio; CHK001/002 cubren acceso y continuidad, CHK003/005 distribución y permisos, CHK004/006 fallos y decisiones explícitas, CHK007/008 ayuda y medidas, CHK009/010 evidencia y límites. No hay inconsistencias ni alcance nuevo. Los marcadores se actualizan como revisión de requisitos, no como ejecución de pruebas; `speckit-implement` solo los lee. Sin hooks registrados.
