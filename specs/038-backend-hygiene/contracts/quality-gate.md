# Contrato del control de higiene backend

## Entrada

Código Python bajo `backend/app` y `backend/tests`.

## Resultado aceptado

- Cero imports sin uso detectables.
- Cero variables locales asignadas y no usadas.
- Cero nombres indefinidos, incluidos los controles ya vigentes.

## Resultado rechazado

Cualquier hallazgo F401, F821, F822, F823 o F841 detiene el trabajo backend antes de compilación, migraciones y pruebas.

## Contratos funcionales preservados

- No cambian rutas HTTP, esquemas públicos, permisos ni códigos de estado.
- No cambian contratos de proveedores de IA, colas ni persistencia.
- No cambia la estructura de la base de datos.
