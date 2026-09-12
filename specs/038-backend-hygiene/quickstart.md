# Validación rápida

## Escenarios

1. Ejecutar la comprobación ampliada sobre aplicación y pruebas.
2. Comprobar que una muestra aislada con import o variable sin uso es rechazada.
3. Compilar el backend.
4. Ejecutar pruebas backend y gobernanza.
5. Confirmar que el inventario técnico sigue vigente.

## Comandos

```powershell
cd backend
python -m ruff check --select F401,F821,F822,F823,F841 app tests
python -m compileall -q app tests
python -m pytest tests/unit -q
python -m pytest tests/integration -q

cd ..
python -m pytest tests/spec_governance -q
python scripts/build_system_inventory.py --check
```

## Resultado esperado

- Ruff termina sin hallazgos.
- La muestra negativa es rechazada.
- Todas las pruebas aplicables pasan.
- No hay deriva en el inventario ni cambios de contrato.
