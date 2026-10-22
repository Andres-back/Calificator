# Hotfix: admitir fotos nuevas con material digitalizado

Fecha: 2026-10-22. Rama: `codex/117-foto-entrega-completa`.
Issue: #244.
Autorización: el usuario pidió reparar producción conservando el funcionamiento y aportó la captura del fallo. Esta entrega urgente precede a Spec 116; no cambia modelos.

## Historia de usuario P1

Como docente, envío una o varias hojas de un alumno sin entrega previa y recibo la aceptación para calificar, también cuando la evaluación tiene una revisión de contenido digitalizado.

Aceptación: una entrega física nueva queda completa antes de cualquier consulta que pueda guardarla; conserva su versión de contenido y la evidencia. La ruta devuelve 202 y encola una sola vez. Una entrega ya calificada sigue exigiendo el reemplazo explícito con historial.

## Requisitos

- FR-001: inicializar el tipo de entrega antes de añadirla a la sesión o consultar la revisión; cubrir foto y PDF de varias hojas, con y sin revisión. Reparar la misma omisión en el envío físico del estudiante.
- FR-002: conservar autorización de docente, matrícula, revisión fijada y rechazo del reemplazo implícito de una entrega calificada; no modificar notas ni evidencias previas.
- FR-003: mantener almacenamiento y cola existentes, con una sola entrega/encolado por solicitud aceptada y limpieza ante fallo; no cambiar proveedores, esquema ni desactivar autoflush globalmente.
- FR-004: reproducir el fallo con PostgreSQL aislado y cubrirlo con regresión permanente; CI verde, fusión y verificación controlada del código desplegado antes de afirmar que está reparado.

## Criterios de éxito

- SC-001: la regresión falla antes del cambio por `entregas.tipo` nulo y pasa después con 202 para foto y paquete de hojas.
- SC-002: las pruebas de permisos, evaluación mixta, conservación de versión, historial y cola existentes siguen verdes; no se actualizan registros reales para probar.
- SC-003: producción contiene el commit aprobado, backend/web sanos y el constructor corregido; se distingue esta comprobación de una calificación real de un alumno.

## Diagnóstico y límites

El POST falla por autoflush durante `grading_job_reference`: la entrega nueva está pendiente en la sesión sin `tipo`. Ocurre antes de guardar la foto y antes de llamar a un modelo. El aviso de baja resolución no provoca el error. No se atribuye este incidente al proveedor de IA ni se cambian políticas regionales.

No se reprocesan automáticamente solicitudes fallidas ni registros anteriores. El docente conserva sus hojas en el navegador y puede reenviar después de la reparación. No se promete que nunca pueda fallar un servicio externo.
