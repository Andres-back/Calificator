# Validación rápida

1. Abrir una materia como docente y seleccionar “Agregar estudiantes existentes”.
2. Comprobar que el control “Todos” aparece junto al contador de seleccionados.
3. Pulsarlo y verificar que todas las cuentas visibles quedan marcadas.
4. Pulsarlo otra vez y verificar que se desmarcan.
5. Buscar un nombre, seleccionar todos los resultados y limpiar la búsqueda; confirmar que las selecciones anteriores se conservan.
6. Ejecutar:

```powershell
cd frontend
npm run test:run -- ExistingStudentsDialog
npm run typecheck
```

## Resultado

- Prueba focalizada: 2 escenarios aprobados.
- TypeScript: aprobado.
- Lint: aprobado sin advertencias.
- No se modificaron contratos ni código del backend.

## Reconciliación con `main` — 2026-09-28

- Se conservó la captura inmediata de `event.target.checked` de `main`, evitando leer el evento dentro de una actualización diferida.
- Las dos regresiones también comprueban que desmarcar resultados filtrados conserva selecciones ocultas y que “Todos” no envía solicitudes de matrícula.
- Prueba focalizada, TypeScript, ESLint y las 8 pruebas de inventario aprobadas sobre la rama reconciliada. El CI completo sigue siendo obligatorio antes del merge.
