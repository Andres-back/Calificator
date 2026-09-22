# Validación rápida

## Prerrequisitos

- PostgreSQL y Redis locales activos.
- Backend, worker de digitalización y frontend en ejecución.
- Docente titular, materia propia y tres imágenes de prueba: legible, girada y borrosa.

## Escenario principal

1. Abrir la materia como docente y entrar por Estudiantes.
2. Subir la lista legible y continuar navegando.
3. Volver al lote, corregir un nombre, omitir un encabezado y añadir un alumno.
4. Confirmar y comprobar el número exacto de cuentas y matrículas.
5. Copiar un acceso temporal e iniciar como alumno.
6. Verificar que solo aparece el cambio de contraseña.
7. Cambiarla y comprobar acceso a la materia.

## Seguridad y duplicados

1. Repetir la confirmación: no aparecen nuevas cuentas/matrículas ni se repiten claves.
2. Subir nuevamente la misma lista: alumnos ya matriculados quedan señalados.
3. Probar un homónimo de otra materia: no se vincula automáticamente.
4. Como otro profesor o estudiante, consultar el lote: debe rechazarse.
5. Revisar logs: no deben contener foto, nombres completos en lote ni contraseñas.

## Recuperación

1. Interrumpir el worker durante reconocimiento y reiniciarlo.
2. Verificar recuperación del trabajo sin crear usuarios.
3. Restablecer acceso desde la materia e intentar la clave anterior: debe fallar.
4. Cancelar un lote y verificar eliminación del archivo privado.

## Comandos focales

```powershell
cd backend
python -m pytest tests/unit/test_roster_import_*.py tests/integration/test_roster_import_*.py -q

cd ../frontend
npm run test:run -- src/modules/materias
npm run typecheck
npx playwright test e2e/roster-import.spec.ts
```

## Validación de implementación (2026-09-22)

- Migración `202609220001` aplicada desde cero hasta `head` en la base PostgreSQL temporal `spec061_roster_test`; no se modificó la base del producto.
- Backend: 808 pruebas superadas, 7 omitidas por requerir otros entornos; además, 9 pruebas de transacciones reales de importación superadas, incluyendo confirmación simultánea, aislamiento docente, renovación de clave y expiración de fotos.
- Frontend: 367 pruebas superadas; TypeScript, lint estricto y build de producción superados.
- Playwright: 3 recorridos E2E superados (360 px, 1366 px y reutilización de cuenta en otra materia).
- `ruff` y `git diff --check` superados. Inventario técnico regenerado a 559 superficies.
- Pendiente después del merge: comprobar en producción la ruta visual OpenCode con una fotografía real de lista autorizada; las pruebas automáticas no envían datos estudiantiles a un proveedor externo.
