# Validación rápida

## Prerrequisitos

- Dependencias backend instaladas.
- No se requieren proveedores de IA ni datos productivos.

## Escenarios

1. Ejecutar las pruebas nuevas de evidencia y validación bloqueada.
2. Ejecutar la comprobación de nombres indefinidos usada por CI.
3. Ejecutar las pruebas unitarias de calificaciones y evaluaciones relacionadas.
4. Compilar el backend y verificar que el contrato OpenAPI no pierde las rutas existentes.

## Comandos

```powershell
cd backend
python -m pytest tests/unit/test_calificaciones_revision_workspace.py -q
python -m pytest tests/unit -q
python -m ruff check --select F821,F822,F823 app tests
python -m compileall -q app tests
```

## Resultado esperado

- La evidencia completa produce `FileResponse` con tipo y encabezados privados.
- La página renderizada conserva su respuesta PNG.
- La estructura bloqueada produce 409 con el mensaje acordado.
- No existen nombres indefinidos detectables en backend.
- No se modifica ninguna calificación ni archivo persistente durante las pruebas.
