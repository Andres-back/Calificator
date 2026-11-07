# Validación: Spec 157

Entorno local: Windows 11 y Python 3.13, sin base de datos, sin llamadas a IA y sin tocar producción. Las fotos de las pruebas son sintéticas: imágenes de color liso y la hoja `frontend/e2e/fixtures/scan-evidence.png` de la Spec 131.

## Pruebas primero (RED)

| Prueba | Resultado antes del cambio |
| --- | --- |
| `pytest tests/unit/test_digitalization_scan.py` | ❌ error de colección: `evidence_digitalization_scan` no existía |
| `vitest run DigitalizarEvaluacionModal.test.tsx` | ❌ 3 de 6 fallaron: no había consulta de capacidad, editor ni `recetas` |
| `playwright test e2e/digitalization-scan.spec.ts --project=chromium` con el modal de `main` | ❌ el editor «Preparar hoja 1» no aparece |

## Después de la corrección (GREEN)

| Comando | Resultado |
| --- | --- |
| `pytest tests/unit/test_digitalization_scan.py` | ✅ 37 aprobadas; la prueba del proceso aislado real se omite en Windows y corre en CI |
| `pytest test_digitalization_scan test_digitalization_queue test_evidence_bundle_service` | ✅ todas aprobadas |
| `pytest tests/unit` completo | 2100 aprobadas y 13 fallidas; las mismas 13 fallan en `origin/main` en Windows (escaneo de evidencias, reconciliación y versión de fpdf) |
| `ruff check` en los archivos de Python cambiados | ✅ |
| `vitest run src/modules/evaluaciones src/components/evidence` | ✅ 48 archivos y 360 pruebas |
| `tsc --noEmit` y `eslint` en los archivos cambiados | ✅ |
| `playwright test e2e/digitalization-scan.spec.ts --project=chromium` | ✅ 1 prueba a 360 px con el Worker real |
| `build_system_inventory.py --write`, `--check` y `pytest tests/spec_governance` | ✅ |

Comprobación aparte: `prepare_evidence_scan` sobre una hoja sintética de 400 × 300 con esquinas al 10 % y 90 % devuelve 320 × 240. Es el valor que espera la prueba del proceso aislado en CI.

## Límites

- No se probó con fotos reales de examen ni se midió si la lectura mejora. La lectura sigue a cargo del modelo y esta Spec no hace llamadas a IA.
- En Windows el proceso aislado no corre, porque usa `resource`, que solo existe en Linux. Por eso localmente cada hoja cae a su original con aviso. La preparación real solo se ejerce en CI y en el servidor.
- La preparación ocurre durante la petición, con 8 s por hoja y 30 s en total. No se midió con 10 fotos grandes en el servidor.
- La ayuda automática de esquinas no se ofrece al digitalizar, aunque se active al calificar.
