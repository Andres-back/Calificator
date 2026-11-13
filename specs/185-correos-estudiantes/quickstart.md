# Validación: Correos de estudiante fáciles: apellido + iniciales

## Pruebas

```
python -m pytest tests/unit/test_student_email.py tests/unit/test_migrate_student_emails.py   (backend)
  20 pruebas: pasan

Pruebas de importación de estudiantes (unitarias)
  79 pasan; las de integración necesitan base de datos y corren en la CI
```

## Después de desplegar (con autorización del usuario)

1. Simulación (solo lectura):
   `docker exec -i -w /app xcalificator_backend python - < scripts/migrate_student_emails.py > tabla.csv`
   La salida de errores trae la cantidad de cuentas, los dudosos y la huella.
2. El usuario revisa la tabla, sobre todo las filas dudosas, y da las correcciones como `ID=parte_local`.
3. Aplicar con la huella de la tabla revisada:
   `... python - --apply --expected-sha256 <huella> [--override ID=parte_local …] < scripts/migrate_student_emails.py`
4. Si hace falta, revertir con `--revert <archivo de respaldo>`.

## Lo que no se comprobó

- La tabla real de producción: se genera después de desplegar.
