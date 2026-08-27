# Validación rápida

## Landing

1. Abrir `/` sin sesión a 360 px y escritorio.
2. Comprobar código abierto, invitación docente y acciones a `/login`, `/registro` y GitHub.
3. Activar modo oscuro y movimiento reducido; no debe existir desplazamiento horizontal.

## Solicitud docente

1. Registrar estudiante y confirmar rol estudiante sin solicitud.
2. Registrar solicitando docencia y confirmar rol estudiante con estado pendiente.
3. Como administrador aprobar la cuenta y confirmar el rol profesor.
4. Repetir con rechazo y confirmar que permanece estudiante.

## Mapa conceptual

1. Crear un mapa indicando materia, grado y tema.
2. Confirmar concepto central, 6–12 nodos, conectores y frases de relación.
3. Revisar a 360 px, modo oscuro y PDF.
4. Abrir un mapa anterior y confirmar compatibilidad.

## Validación focalizada

```powershell
docker compose exec backend pytest -q backend/tests/unit/test_user_teacher_requests.py backend/tests/unit/test_concept_map_normalization.py
cd frontend
npm test -- --run src/modules/auth/RegisterPage.test.tsx src/modules/admin/AdminUsersPage.test.tsx src/modules/herramientas/views/ContenidoView.test.tsx
npm run type-check
npm run lint
npm run build
```

La suite completa y contenedores se validan una sola vez en CI.