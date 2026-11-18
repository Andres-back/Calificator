# Validación: Importar la lista de estudiantes desde la galería o un archivo

## Pruebas

```
python -m pytest tests/unit -q -k "roster or importacion or storage or captura"     61 pasan (9 nuevas)
npx vitest run src/modules/materias                                                 178 pasan (3 nuevas)
ruff, tsc --noEmit y eslint                                                         sin errores
```

La prueba de integración del trabajador se adaptó (el tipo se reconoce por el contenido); en local se omite por falta de base de pruebas y corre en CI.

## Prueba real en local

| Paso | Resultado |
| --- | --- |
| Subir un ejecutable | 415: «Sube una foto (JPG, PNG o WEBP) o un archivo PDF, Word (.docx), Excel (.xlsx), CSV o de texto con la lista.» |
| Subir un Excel con título, encabezado «N° \| APELLIDOS \| NOMBRES», tres filas en mayúsculas y un total | 202, lote en proceso |
| Ejecutar el trabajo | éxito, 3 detectados |
| Lote en revisión | «Valentina Gómez Ruiz», «Samuel Andrés Torres», «María José de la Cruz», ninguno marcado para revisión |

## Pantalla

Verificada con pruebas de componente: el diálogo muestra «Tomar foto» con cámara y «Elegir foto o archivo» sin cámara obligatoria y con los formatos admitidos. No se tomó captura de pantalla de este diálogo.
