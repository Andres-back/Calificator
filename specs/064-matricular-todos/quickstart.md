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
