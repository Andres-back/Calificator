# Checklist de calidad de requisitos UX: Optimizar fluidez y organización

**Purpose**: Revisar que los requisitos de experiencia, rendimiento percibido y accesibilidad estén completos antes de implementación.
**Created**: 2026-09-26
**Audience**: Revisión humana del PR
**Ownership**: `[x]` significa que un revisor humano aprobó la calidad del requisito; no representa implementación terminada.

## Completitud

- [ ] CHK001 ¿Están documentadas las acciones que deben conservarse al eliminar redundancias en cada rol? [Completeness, Spec §FR-010]
- [ ] CHK002 ¿Están definidos estados estable y transitorio para decidir cuándo existe actualización periódica? [Completeness, Spec §FR-003]
- [ ] CHK003 ¿Se cubren carga, error, vacío, éxito y recuperación de las operaciones asíncronas afectadas? [Coverage, Spec §FR-011]
- [ ] CHK004 ¿Se especifican las rutas y permisos que deben permanecer invariantes? [Completeness, Spec §FR-012]

## Claridad y consistencia

- [ ] CHK005 ¿La espera “breve” de búsqueda queda cuantificada y es consistente entre especificación, contrato y plan? [Clarity, Spec §FR-001]
- [ ] CHK006 ¿La definición de “vista estable” evita retirar seguimiento a procesos activos? [Consistency, Spec §FR-003]
- [ ] CHK007 ¿Los requisitos de navegación móvil distinguen claramente el control compacto y las pestañas de escritorio? [Clarity, Spec §FR-009]
- [ ] CHK008 ¿La política CSP es consistente con la restricción de no habilitar orígenes mediante comodines o directivas globales? [Consistency, Spec §FR-014]

## Medición y escenarios

- [ ] CHK009 ¿La reducción de transferencia tiene base, umbral y exclusiones medibles? [Measurability, Spec §SC-004]
- [ ] CHK010 ¿La ausencia de consultas periódicas define ventana y condición de reposo observables? [Measurability, Spec §SC-002]
- [ ] CHK011 ¿La matriz responsive y los modos claro/oscuro están enumerados para el recorrido completo? [Coverage, Spec §SC-005]
- [ ] CHK012 ¿Se contemplan limpieza de búsqueda, respuesta obsoleta, pérdida de foco y fallo de recurso visual? [Edge Cases, Spec §Casos límite]
- [ ] CHK013 ¿La accesibilidad de teclado, tacto, lector y objetivos mínimos está expresada de manera verificable? [Coverage, Spec §FR-013]

## Límites y supuestos

- [ ] CHK014 ¿Queda explícito que no se cambian notas, evidencias, datos, contratos ni autorización? [Boundary, Spec §FR-012]
- [ ] CHK015 ¿La exclusión del refactor profundo está justificada sin impedir los resultados medibles? [Assumption, Spec §Supuestos]
- [ ] CHK016 ¿Los requisitos distinguen ruido externo de analítica y fallos funcionales propios? [Dependency, Spec §FR-014]

## Notes

- Esta lista permanece sin marcar hasta la revisión humana del PR.
- `$speckit-implement` puede leer su estado, pero no modifica sus marcadores.
