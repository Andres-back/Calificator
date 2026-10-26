# Investigación 129: flujo de retroalimentaciones

**Fecha**: 2026-10-26. Base main d871fbe, sin producción ni alumnos reales. Principal revisó composición e integración; investigación delegada acotada de Phase 0 contrastó contratos y pruebas. No se delegaron instrucciones de skills.

## Composición actual

**Evidencia**: ShareFeedbackDialog.tsx:191–227 renderiza publicación, selección/impresión, copia guardada, creación de enlaces, enlaces recién preparados, lista de alumnos y control de enlaces en posiciones distintas. La unificación de contenido ya existe, no resuelve por sí sola la navegación. FeedbackFrame usa una Modal de cuerpo entero desplazable, sin pie de selección estable. CalificacionesWorkspace tiene pies individual y de lote que requieren coordinación con el modo integrado.

**Decisión**: un marco de cabecera/cuerpo/pie, una lista fuente y vistas relacionadas. Compartir incluye preparación y resultado; los accesos se gestionan en contexto de su fila, no en una segunda lista grupal. Desktop lista/detalle; móvil una vista completa por vez.

**Alternativas descartadas**: repetir botones arriba y abajo, scroll automático al generar, modal sobre modal o una pantalla independiente que reproduzca reglas. Mantendrían desplazamientos, estado duplicado o confusión de contexto.

## Emisión, copia y vigencia

**Evidencia**: backend/app/modules/feedback_sharing/service.py:161–184 reutiliza por created_by/request_id/calificacion_id, no por «ya tiene activo». Request nuevo puede crear otro acceso. Reintento exacto conserva ID y devuelve token=None. link_service.py:12–51 recupera credencial cifrada por acceso, valida actualidad/vigencia/permisos y añade auditoría sin cambiar nota, vigencia ni cuota. router.py:121 usa savepoint por alumno; un error inesperado/una respuesta incompleta no equivale a un resultado individual confirmado.

**Decisión**: reconciliar listado/preview antes de preparar, copiar activos con operación existente, emitir solo faltantes elegibles expresamente elegidos. Resultado íntegro por ID y URL recuperada después de reintento si corresponde. Copy_available no se trata como garantía; manda la respuesta del servidor.

**Alternativas descartadas**: emitir como upsert o para «copiar», renovar/reactivar sin confirmación, usar /lotes/{request_id} para recuperar emisión (es publicación académica). No eliminar accesos previos ni agregar una regla de unicidad global no presente.

## Recuperación y límites

**Evidencia**: schemas.py:43, emisión/impresión/copia admiten 1–100, duración 1–30 y fingerprint hexadecimal de 64 caracteres. Publicación académica admite 25. Lifecycle exige versión e identidad; renovar rota credencial sin extender duración/reactivar, y reactivar crea publicación con fingerprint vigente. quota_service.py:17 conserva cinco preguntas por 600 s por estudiante/evaluación incluso con múltiples accesos.

**Decisión**: reutilizar contratos sin nuevas rutas, guardar manifiesto mínimo sin credenciales para reintentar la misma operación. Snapshot de selección y lotes; incertidumbre explícita y errores parciales localizados. Mantener límites y separar aceptar/publicar, entregar y copiar.

**Límite**: listar y después emitir no es exclusión atómica frente a otra pestaña con una solicitud nueva. Frontend evita doble clic y duplicado de la misma operación, no garantiza unicidad global. Especificación y plan lo declaran; ampliar backend necesita nueva dirección.

## Sesión, foco y portapapeles

**Evidencia**: los componentes actuales capturan owner como objeto y comparan por referencia; una renovación de usuario puede invalidar el estado sin cambio real de actor. useMobileFormViewport y Modal ya resuelven espacio visible/foco de forma opt-in. La copia actual espera red antes de invocar portapapeles y dispone de alternativa manual.

**Decisión**: identidad estable de actor/evaluación con permisos actuales y cancelación lógica/abort. Preparar URLs primero y copiar por gesto explícito desde memoria. Reutilizar adaptación al viewport, sin enfocar texto automáticamente ni perderlo al rotar. Preservar el fallback manual en vez de prometer acceso al portapapeles en cualquier navegador.

## Cobertura y siguiente fase

Diagnóstico ejecutado: 23/23 pruebas existentes en ShareFeedbackDialog, FeedbackWorkspace, FeedbackLinkActions y FeedbackToolsButton aprobadas. Protegen contratos actuales; no verifican el nuevo recorrido ni disposición.

Pruebas backend a conservar: test_feedback_link_copy.py, test_feedback_sharing_authorization.py, test_feedback_sharing_routes.py, test_feedback_sharing_lifecycle.py y test_feedback_sharing_quota.py. E2E existentes feedback-delivery.spec.ts / feedback-delivery-batch.spec.ts cubren varios tamaños/temas; la configuración debe incluir explícitamente los nuevos casos WebKit, no depender de un grep anterior.

Conclusión: frontend-only factible con los límites declarados; sin nueva dependencia, IA, esquema o contrato. Investigación completa para presentar el plan; implementación pendiente de aprobación.
