# Lista de calidad de requisitos: entrega individual y devolución docente

**Propósito**: revisión previa a implementación, centrada en aislamiento, cupo y claridad de la devolución.
**Creada**: 2026-10-20.
**Especificación**: [spec.md](../spec.md). Profundidad estándar; destinatario: revisor del cambio antes de implementar.

> Los marcadores pertenecen al revisor. `[x]` aprueba calidad del requisito, no funcionalidad construida. La generación deja todos sin marcar; Implement los lee pero no los modifica.

## Completitud y límites

- [x] CHK001 ¿Quedan inequívocos el acceso por estudiante/evaluación, la exclusión de parentescos por apellidos y la audiencia exclusivamente docente de la hoja completa? [Completitud, Spec FR-011/012/014/026, SC-006]
- [x] CHK002 ¿Se distinguen nota revisada, revisión autorizada y cambios posteriores, incluyendo conservación del histórico sin entrega/desglose y suspensión sin recalificar? [Consistencia, Spec FR-003/006/007/018/024, SC-002/008]
- [x] CHK003 ¿Están definidos vigencia finita, vencimiento exacto, pérdida de permiso/matrícula, reactivación, renovación y respuesta tardía sin ampliar alcance? [Cobertura, Spec FR-008/009/010/017, SC-005]

## Claridad y recuperación

- [x] CHK004 ¿La regla cinco preguntas/600 segundos define identidad estable, ventana móvil, varios dispositivos, concurrencia, reintentos, fallos y renovación sin reiniciar contador? [Claridad, Spec FR-019/020/027, SC-010]
- [x] CHK005 ¿Se documentan exposición mínima, riesgo de reenvío, exclusión de soluciones ocultas y credenciales de plataforma, y separación entre lectura y chat sin cuenta? [Completitud, Spec FR-013/015/016/017/019/026, contratos]
- [x] CHK006 ¿Los errores parciales, emisión repetida, pérdida de respuesta y control del enlace tienen resultados definidos sin duplicación ni éxito falso? [Cobertura, Spec FR-009/021/022/027, plan decisiones 4/6]

## Medición y dependencias

- [x] CHK007 ¿La consulta móvil, teclado, impresión legible/recortable y textos largos disponen de criterios medibles para celular y escritorio? [Medición, Spec FR-023/025, SC-004/007/009]
- [x] CHK008 ¿Están explícitas las dimensiones de calidad, referencia docente, comparación de modelos, protección de datos anteriores y dependencias pendientes sin afirmar pruebas o activaciones inexistentes? [Trazabilidad, Spec FR-001/002/004/005/024, SC-001/002/003/008, plan]

## Notas

Ocho requisitos de calidad, todos con referencias. Sin verificación de código en esta lista. Solicitar al usuario autorización explícita para asistir en la revisión antes de modificar sus marcadores; la aprobación anterior del plan no marca esta lista nueva.

Revisión asistida expresamente autorizada por el usuario («autorizo», 2026-10-20), realizada antes de Implement: 8/8 satisfechos contra las referencias indicadas y los contratos. No amplía el alcance ni certifica implementación. En adelante los marcadores son una puerta de solo lectura para Implement.
