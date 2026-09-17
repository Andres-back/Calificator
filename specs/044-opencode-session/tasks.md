# Tareas del hotfix 044

Issue #88; aprobación humana registrada el 2026-09-16.

- [x] T001 (FR-001, FR-003, FR-004) Crear el contrato compartido de sesión, agente de usuario y autenticación por protocolo en `backend/app/services/opencode_request.py`.
- [x] T002 (FR-001, FR-002, FR-004, FR-005) Integrar el contrato en calificación, visión, enrutamiento, catálogo y prueba administrativa sin alterar payloads ni tiempos de espera.
- [x] T003 (FR-002, FR-003, FR-004, FR-007) Añadir regresiones de encabezados y estabilidad entre reintentos en las pruebas unitarias existentes y del helper.
- [x] T004 (FR-006, FR-007) Ejecutar pruebas focalizadas, análisis estático y gobernanza; revisar diff sin secretos ni cambios de datos/calificaciones.
- [x] T005 (FR-005, FR-006) Preparar el runbook de PR, despliegue desde main y medición productiva autorizada sin persistir una nota; la ejecución posterior queda sujeta a CI verde.
