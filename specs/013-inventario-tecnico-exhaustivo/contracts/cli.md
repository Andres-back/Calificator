# Contrato de interfaces del inventario

## CLI

Comando base:

python scripts/build_system_inventory.py [--write | --check] [--root RUTA]

### --write

- Extrae superficies desde las raíces permitidas.
- Valida propiedad, excepciones y esquema.
- Escribe primero archivos temporales y reemplaza current.json e inventory.md únicamente después de validar el conjunto completo.
- Código 0: generación válida.
- Código 1: inventario inválido o propiedad incompleta.
- Código 2: uso incorrecto o error de lectura estructural.

### --check

- Genera el resultado esperado en memoria.
- Compara con los artefactos versionados.
- No modifica archivos.
- Código 0: inventario vigente.
- Código 1: deriva, propiedad inválida, excepción inválida o salida no determinista.
- El mensaje lista superficies añadidas, eliminadas o modificadas y el comando de corrección.

Los modos son mutuamente excluyentes. El valor por defecto es --check.

## Archivos de entrada

- specs/system-inventory/ownership.json.
- specs/system-inventory/exceptions.json.
- specs/system-inventory/permission-overrides.json.
- backend/app/**/*.py.
- backend/alembic/**/*.py.
- backend/tests/**/*.py.
- frontend/src/**/*.{ts,tsx}.
- frontend/e2e/**/*.ts.

El lector rechaza rutas fuera de estas raíces y no sigue enlaces simbólicos hacia el exterior.

## Archivos de salida

- specs/system-inventory/current.json.
- specs/002-arquitectura-roles-seguridad/inventory.md hasta specs/012-ia-jobs-produccion/inventory.md.

Los archivos se codifican en UTF-8, terminan en salto de línea y usan orden canónico.