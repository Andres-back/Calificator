# Especificación: recalificar y corregir evidencia desde la revisión docente

**Rama**: `codex/114-recalificar-evidencia` | **Fecha**: 2026-10-22 | **Issue**: [#240](https://github.com/Andres-back/Calificator/issues/240)
**Estado**: alcance autorizado en el chat después de aclarar motivo opcional: «bien me ire a dormir no pares hasta dejar el pr echo». Entrega mediante PR, sin autorización de merge ni despliegue.

## Escenarios de usuario y pruebas

### US1 — Volver a calificar (P1)
El profesor puede enviar otra vez la evidencia guardada, incluso con nota confirmada o publicada. El motivo es opcional. Si afecta una decisión docente, confirma brevemente; el resultado anterior queda conservado y el nuevo requiere aprobación.

Aceptación: evidencia disponible y permisos permiten encolar una operación; una solicitud repetida no duplica trabajo; una sesión obsoleta no sobrescribe otra decisión. Sin archivo o mientras otro trabajo está activo se explica qué falta.

### US2 — Cambiar evidencia directamente (P1)
Desde la calificación del alumno el profesor toma/sube las hojas correctas sin depender del estudiante ni volver a buscarlo. Ve evaluación y alumno, revisa el paquete y confirma. Motivo opcional; archivo y resultado anteriores se conservan.

Aceptación: reemplazo completo con fotos/PDF, orden y giro reutilizados; cancelación y archivo inválido dejan todo igual. El nuevo procesamiento no publica nota automáticamente ni consume un intento del estudiante.

### US3 — Consultar lo anterior con seguridad (P1)
El historial muestra fecha, autor, acción, nota/retroalimentación anteriores y acceso autorizado a la evidencia anterior. Un estudiante u otro docente no puede acceder al historial privado.

Aceptación: las revisiones anteriores sobreviven al nuevo resultado y a otro reemplazo; las rutas privadas no revelan paths internos; motivos vacíos no impiden continuar.

## Requisitos
- **FR-001**: Recalificar desde la revisión docente con la evidencia guardada, admitiendo estados sugerido, revisión, confirmado, ajustado o publicado; evaluación activa y permisos vigentes.
- **FR-002**: Permitir cambiar fotos/PDF desde esa misma revisión usando el selector de varias hojas existente, mostrando identidad de evaluación y alumno.
- **FR-003**: El motivo DEBE ser opcional, con límite de longitud pero sin mínimo; reapertura de decisión docente exige confirmación explícita, no justificación escrita.
- **FR-004**: Conservar antes del cambio evidencia, nota, estado, retroalimentación, resultado e identidad de su entrega; mostrar historial privado con autor/fecha y descarga autorizada del archivo previo.
- **FR-005**: Mantener una calificación vigente, encolar sin esperar IA, mostrar «Calificando» sin cero artificial y dejar el resultado nuevo sin confirmación/publicación automática.
- **FR-006**: Aplicar autorización por propietario y permiso; comprobar versión, trabajo activo e identidad de solicitud para prevenir duplicados y sobrescrituras concurrentes.
- **FR-007**: Conservar configuración y contenido de evaluación asociados al intento, respuestas online de modalidad mixta, permisos y trabajos existentes; suspender devoluciones compartidas afectadas, sin reactivarlas automáticamente.
- **FR-008**: Cancelación, formato inválido y fallos previos a persistencia no alteran la entrega; un fallo posterior conserva evidencia y recuperación en cola. No eliminar archivos archivados al sustituir evidencia por otras rutas existentes.
- **FR-009**: Ambos flujos e historial deben funcionar desde 360 px, escritorio, teclado y ambos temas; errores comprensibles y borrador conservado.
- **FR-010**: Migración aditiva sin backfill académico; pruebas de permisos, persistencia, concurrencia, reversibilidad y frontend con datos sintéticos. Sin cambios productivos, modelos ni llamadas pagadas en esta entrega.

## Casos límite
Archivo perdido, nota cero real, evaluación archivada o contenido desfasado, doble clic, respuesta HTTP perdida, trabajo en cola, modal cerrado durante envío, cambio de alumno, reemplazo tras otra recalificación, rollback con historial material y entrega mixta.

## Entidades
Revisión de calificación: instantánea privada inmutable del estado anterior y evidencia, acción, autor, fecha, motivo opcional y solicitud idempotente. No constituye otra nota vigente.

## Criterios de éxito
- **SC-001**: Los dos flujos se completan desde el alumno seleccionado, sin escribir motivo ni buscarlo de nuevo, en celular y computador.
- **SC-002**: Repetir una solicitud produce un solo trabajo/revisión; versión obsoleta y usuario ajeno producen cero cambios.
- **SC-003**: Dos reemplazos consecutivos dejan consultables ambas evidencias y resultados anteriores; ningún resultado nuevo se publica automáticamente.
- **SC-004**: Pruebas sintéticas de backend, frontend, migración y responsive aplicables pasan antes de fusionar el PR, con cero notas o evidencias reales modificadas. La apertura del PR permite completar las verificaciones aisladas de CI.

## Supuestos y límites
Se corrige una entrega física/mixta existente; no reasigna una evidencia a otro niño ni modifica preguntas, criterios, modelos o reglas de cálculo. Evaluaciones online sin documento no ofrecen estas acciones. No hay restauración automática de nota anterior: se conserva para consulta y la decisión final sigue siendo docente. Se mantienen solicitudes de reemplazo al estudiante como alternativa, con motivo opcional.
