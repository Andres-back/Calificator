# Validación rápida: autorización efectiva

## Prerrequisitos

- Rama `codex/014-alinear-autorizacion-superficies`.
- Dependencias backend y frontend instaladas.
- PostgreSQL disponible para las pruebas de integración que lo requieran.
- No usar cuentas, evidencias ni credenciales de producción.

## 1. Verificación documental

```powershell
python scripts/build_system_inventory.py --check
```

Esperado: inventario vigente y cero diferencias de autorización para las diez superficies de [authorization-matrix.md](./contracts/authorization-matrix.md). La especificación completa se valida en el PR mediante el trabajo `Spec governance` de `.github/workflows/spec-governance.yml`, que proporciona al script `scripts/check_spec_governance.py` el evento y las referencias Git requeridas.

## 2. Backend dirigido

```powershell
Set-Location backend
python -m pytest tests/unit/test_authorization_contracts.py tests/unit/test_analytics_events.py tests/unit/test_presentaciones_router.py tests/unit/test_student_review_request.py -q
```

Esperado:

- profesor propietario permitido y profesor ajeno denegado;
- estudiante solo lee objetos publicados/asignados de matrícula activa;
- estudiante no resuelve incidencias;
- analítica rechaza evento, rol, referencia o metadata no admitidos;
- ninguna denegación crea o modifica registros.

## 3. Frontend dirigido

```powershell
Set-Location frontend
npm run typecheck
npm run lint:strict
npm run test:run -- src/lib/analytics.test.ts src/components/layout/AppShell.test.tsx
```

Esperado: telemetría sigue siendo fire-and-forget, no envía identidad/rol y un fallo analítico no bloquea la acción principal.

## Resultado del recorrido estudiantil independiente

Validado el 2026-08-14 con `npm run test:e2e -- e2e/student-activity-delivery.spec.ts`: **1 prueba aprobada** en viewport 390 × 844. El estudiante autenticado abrió un taller publicado, leyó sus ejercicios, no recibió claves de respuesta, conservó descarga sin soluciones y accedió a “Ir a entregar” sin desbordamiento horizontal.
## 4. Inventario determinístico

```powershell
Set-Location ..
python scripts/build_system_inventory.py --write
git diff --exit-code -- specs/system-inventory/current.json specs/*/inventory.md
python scripts/build_system_inventory.py --check
```

Tras versionar la regeneración esperada, dos ejecuciones consecutivas no producen diferencias.

## 5. Regresión completa

```powershell
Set-Location backend
python -m pytest tests/unit -q
python -m pytest tests/integration -q
Set-Location ../frontend
npm run typecheck
npm run lint:strict
npm run test:run
npm run build
npm run test:e2e
Set-Location ..
docker compose config --quiet
```

Esperado: toda la calidad aplicable permanece verde antes de solicitar merge.
