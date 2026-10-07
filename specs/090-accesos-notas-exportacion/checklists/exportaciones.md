# Lista de calidad: exportaciones
**Propósito**: revisar requisitos antes de implementar. **Fecha**: 2026-10-07. **Spec**: [spec.md](../spec.md)
Los marcadores pertenecen al revisor; significan calidad, no implementación.
- [x] CHK001 ¿Está definida selección individual/Todos y su alcance? [Completitud, FR-004/FR-007]
- [x] CHK002 ¿Se distingue clave disponible de histórica irrecuperable? [Claridad, FR-005]
- [x] CHK003 ¿Se mantiene renovación separada sin mutar al descargar? [Consistencia, FR-006, alcance vigente]
- [x] CHK004 ¿Notas pendientes y cero real están diferenciados? [Claridad, FR-008]
- [x] CHK005 ¿Roles y pertenencia están delimitados? [Cobertura, FR-010]
- [x] CHK006 ¿CSV seguro/privacidad están especificados? [Cobertura, FR-011/FR-012]
- [x] CHK007 ¿Datos incompletos/sesión/selección obsoleta bloquean archivo? [Cobertura, FR-009]
- [x] CHK008 ¿Tamaño móvil, resultado y criterios verificables están definidos? [Medición, SC-002 a SC-006]

## Enmienda #190 — revisión del plan ampliado
- [x] CHK009 ¿El formato de notas define exactamente nombre y una columna por evaluación, con encabezados repetidos distinguibles y pendientes vacíos? [Claridad, FR-008, SC-004]
- [x] CHK010 ¿La renovación distingue consentimiento de descargar/copiar/imprimir y explica su efecto global? [Completitud, FR-006]
- [x] CHK011 ¿Está delimitada la elegibilidad a cuentas internas autorizadas sin renovar alumnos no seleccionados? [Cobertura, FR-006, FR-010]
- [x] CHK012 ¿La recuperación parcial distingue claves recibidas, resultados inciertos y alumnos no intentados sin repetir automáticamente? [Cobertura, ampliación #190, FR-006]
- [x] CHK013 ¿Se define la entrega de claves recién creadas por foto/manual y su vida efímera ante cierre o cambio de sesión? [Claridad, FR-005, ampliación #190]
- [x] CHK014 ¿Los criterios separan cambios de claves explícitos de conservación de notas, matrículas y usuarios existentes? [Consistencia, FR-013]

Revisión asistida autorizada expresamente por el usuario: «Sí, revisa y continúa». Se contrastaron seis requisitos contra spec/plan; 14/14 completos. Los marcadores no certifican implementación.
