# Retirar del selector la evidencia ya enviada

**Rama**: `codex/065-retirar-foto-enviada`  
**Fecha**: 2026-09-23  
**Estado**: Aprobado por solicitud explícita del usuario  
**Issue**: [#135](https://github.com/Andres-back/Calificator/issues/135)

## Historia de usuario

Como docente que fotografía evaluaciones, quiero que el estudiante desaparezca de la lista de pendientes apenas su evidencia sea aceptada, para evitar cargas duplicadas y continuar con el siguiente estudiante sin confusión.

### Escenarios de aceptación

1. **Dado** un estudiante sin evidencia, **cuando** el servidor acepta sus fotos o PDF, **entonces** deja de aparecer inmediatamente en el selector de “Añadir entregas”.
2. **Dada** una evaluación abierta nuevamente, **cuando** ya existe una calificación del estudiante, incluso en proceso, **entonces** el estudiante no aparece como candidato para otra carga.
3. **Dada** una carga fallida, **cuando** el servidor la rechaza, **entonces** el estudiante y sus hojas permanecen disponibles para corregir o reintentar.
4. **Dada** una evidencia aceptada, **cuando** el docente vuelve a revisión, **entonces** ve al estudiante como “Calificando” o en el estado real informado por el servidor.

## Requisitos funcionales

- **FR-001**: El selector DEBE contener únicamente estudiantes sin calificación registrada para la evaluación activa.
- **FR-002**: Una carga aceptada DEBE excluir al estudiante localmente sin esperar el refresco de red.
- **FR-003**: La selección DEBE limpiarse después del éxito y permitir cargar al siguiente estudiante.
- **FR-004**: Una petición fallida NO DEBE excluir al estudiante ni descartar las hojas seleccionadas.
- **FR-005**: La fuente persistente para reconstruir la lista DEBE ser el conjunto de calificaciones de la evaluación.
- **FR-006**: El cambio NO DEBE eliminar ni modificar entregas, calificaciones, reemplazos o datos históricos.
- **FR-007**: Los contratos HTTP, la cola asíncrona y la publicación docente DEBEN permanecer sin cambios.

## Criterios medibles de éxito

- **SC-001**: Tras una respuesta exitosa, el estudiante desaparece del selector en el mismo ciclo de interfaz.
- **SC-002**: Tras recargar, ningún estudiante con calificación existente reaparece como pendiente de evidencia.
- **SC-003**: Una respuesta de error conserva estudiante y hojas para reintento.
- **SC-004**: Las pruebas focalizadas de carga y el chequeo de tipos permanecen verdes.

## Supuestos y límites

- Una calificación existente, cualquiera que sea su estado, indica que la evidencia ya fue recibida o que existe una decisión manual; no se ofrece otra carga desde la lista general.
- Los reemplazos de evidencia continúan por su flujo dedicado.
- No se añaden endpoints, tablas ni migraciones.

