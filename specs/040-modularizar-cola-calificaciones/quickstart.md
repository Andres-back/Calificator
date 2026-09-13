# Verificación rápida

## Objetivo

Comprobar que la extracción del coordinador de cola no altera persistencia, contratos, recuperación ni concurrencia.

## Pruebas dirigidas

```powershell
Set-Location backend
python -m pytest tests/unit/test_grading_queue_service.py tests/unit/test_photo_grading_persistence.py tests/unit/test_online_grading_persistence.py tests/unit/test_mixed_evaluation_flow.py tests/unit/test_calificaciones_lote_async.py tests/unit/test_worker_queue_routing.py tests/unit/test_tasks_grading.py -q
python -m pytest tests/integration/test_ai_job_leases.py -q
```

## Calidad estática

```powershell
Set-Location backend
python -m ruff check app/modules/calificaciones/router.py app/modules/calificaciones/grading_queue_service.py tests/unit/test_grading_queue_service.py
python -m compileall -q app/modules/calificaciones
```

## Gobierno y trazabilidad

```powershell
Set-Location ..
python -m pytest tests/spec_governance -q
python scripts/build_system_inventory.py --check
git diff --check
```

## Criterios manuales

- Una entrega válida responde sin esperar la inferencia.
- La calificación queda pendiente y enlazada al trabajo hijo.
- Un fallo simulado de `apply_async` deja el hijo recuperable y no pierde evidencia.
- Dos intentos de reclamar el mismo hijo producen una sola ejecución efectiva.
- El lote de 30 entregas conserva un hijo por entrega y no se modifica en esta fase.
- No cambian rutas, estados HTTP, esquemas ni interfaz de usuario.
