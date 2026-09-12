# Validación rápida

## Objetivo

Probar que la extracción cambia propiedad interna, pero no el comportamiento de evidencia ni calificación.

## Comandos

```powershell
cd backend
python -m ruff check --select F401,F821,F822,F823,F841 app tests
python -m compileall -q app tests
python -m pytest tests/unit/test_calificaciones_revision_workspace.py -q
python -m pytest tests/unit/test_evidence_replacement.py tests/unit/test_mixed_evaluation_flow.py -q
python -m pytest tests/unit -q
python -m pytest tests/integration -q

cd ..
python -m pytest tests/spec_governance -q
python scripts/build_system_inventory.py --check
git diff --check
```

## Escenarios obligatorios

1. Abrir una imagen válida y rechazar su página 2.
2. Abrir la página 20 de un PDF y reutilizar el archivo cacheado.
3. Rechazar un PDF de más de 20 páginas.
4. Conservar URL segura y ocultar ubicación persistida.
5. Conservar metadatos multihoja y de modalidad mixta.
6. Reemplazar evidencia sin dejar una referencia anterior activa.
7. Confirmar que encolado, estados y nota no cambian.

## Resultado esperado

- Todas las pruebas aplicables pasan.
- No hay cambios de contrato o persistencia.
- El router deja de definir las transformaciones extraídas.
- El inventario identifica un único servicio propietario de evidencia.
