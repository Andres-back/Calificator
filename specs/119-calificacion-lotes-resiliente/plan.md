# Plan: calificaciones en lote recuperables

**Rama**: `codex/119-calificacion-lotes-resiliente` | **Fecha**: 2026-10-23 | **Spec**: [spec.md](./spec.md) | **Issue**: #253

## Resumen

Aplicar un plazo total de 60 segundos a cada llamada de valoración/verificación/revisión adicional después de obtener capacidad compartida. Guardar resultados e intentos por etapa en el JSON privado del trabajo, protegido por el claim vigente y una huella de entrega/contenido/rutas. Recuperar como máximo una vez la misma etapa ante errores transitorios; no reiniciar lectura ni valoración válidas. Un principal recuperado pasa por el verificador configurado. El resultado y el trabajo distinguen verificación incompleta de revisión dual terminada.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11+ (contenedor), TypeScript/React.
**Dependencias**: asyncio, HTTPX, Redis, SQLAlchemy, Celery, pytest, Vitest; sin dependencias nuevas.
**Persistencia**: JSONB existente de ai_jobs, con clave privada y esquema versionado; sin migración. La nota y evidencia vigentes mantienen sus tablas y permisos.
**Pruebas**: TDD unitario de transporte/política/recuperación, lote simulado de 20 entregas, integración con PostgreSQL aislado para claims/progreso y decisión docente, frontend de administración y aviso de verificación pendiente; CI y gobernanza.
**Plataforma objetivo**: Linux/VPS; profesor móvil 360 px y escritorio; administración autenticada.
**Rendimiento y escala**: límite global existente, sin llamadas adicionales en el camino exitoso; un intento adicional por etapa lógica incluyendo reinicios. Medición relativa del camino normal con proveedor simulado, sin red ni IA pagada.

## Verificación de la constitución

- Separación de roles: no se agregan permisos ni endpoints públicos; progreso privado del trabajo autorizado. Pruebas de propietarios y rechazo de claim perdido.
- Integridad y trazabilidad: prioridad de decisión docente, resultados validados y huella compatible, no ceros técnicos ni publicación automática.
- Asincronía e idempotencia: cola existente y lease; intentos persistidos antes de inferir, resultados guardados después, sin reanudar trabajo ajeno.
- Datos y secretos: ningún dato real ni clave en Git/CI; resultados por etapa permanecen en JSON privado, no en logs.
- Accesibilidad: mensajes breves en la revisión existente, sin pantallas nuevas; aviso administrativo del tope efectivo y diferencia con cola.
- Gobernanza y pruebas: hotfix #253, spec aprobada por el usuario con tope 60; pausa de plan omitida conforme a constitución. Checklist, Tasks, Analyze, TDD y Converge antes de PR; merge protegido.

## Estructura del proyecto

- backend/app/modules/calificaciones/: política de ejecución y progreso recuperable, orquestador y agentes.
- backend/app/workers/tasks_grading.py y backend/app/modules/jobs/service.py: lectura/escritura compatible del progreso y estado final.
- backend/app/modules/admin_ai_config/control_center_service.py y frontend/src/modules/admin/ai/: política efectiva visible.
- backend/app/modules/analytics/usage_logger.py: códigos seguros específicos de transporte, sin cambiar registros históricos.
- backend/tests/, frontend/src/**/tests y specs/119-calificacion-lotes-resiliente/: regresiones, documentación e inventario generado.

## Decisiones y complejidad

- No subir el timeout compartido del proveedor: afectaría otras funciones y seguiría confundiendo la espera efectiva. La política de calificación se muestra y captura explícitamente, con máximo fijo 60 aprobado por el usuario.
- No añadir reintentos en todas las capas: el controlador de etapa administra dos intentos totales y llama al cliente con un intento de transporte y sin fallback implícito dentro de esa etapa. Conserva el modelo/ruta elegidos para cada rol.
- No sustituir al verificador por una segunda ejecución del principal ni llamar al árbitro para ocultar un fallo técnico.
- Se conserva el checkpoint OCR heredado para compatibilidad. El nuevo progreso de revisión incluye lectura válida, valoración y verificación, y permanece independiente del flag heredado.
- La capacidad global deja de fallar abierta para estas llamadas: si Redis no permite admitirlas, se conserva el trabajo para recuperación acotada, sin ráfaga externa.
- Diseño revisado contra los ocho principios; sin excepción ni cambio de esquema. Los documentos de contratos y datos resuelven los detalles de compatibilidad.
