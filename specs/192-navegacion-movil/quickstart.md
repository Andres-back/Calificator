# Validación: Secciones de la materia visibles en celular sin deslizar

## Pruebas

```
npx vitest run src/modules/materias     pasan (175)
npx tsc --noEmit                         sin errores
```

## Capturas después del cambio (390 px)

- **Docente**: Vista general, Evaluaciones, Recursos, Asistencia, Boletín y Criterios de aprendizaje en tres columnas, en la primera pantalla.
- **Estudiante**: Vista general, Evaluaciones, Recursos y Boletín en dos columnas.
- Desde tableta, la fila de siempre.
