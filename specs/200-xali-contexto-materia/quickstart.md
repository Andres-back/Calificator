# Validación: Xali docente conoce los datos de la materia seleccionada

## Pruebas

```
python -m pytest tests/unit -q -k xali          57 pasan (8 nuevas)
npx vitest run src/modules/xali                 34 pasan (3 nuevas)
ruff, tsc --noEmit y eslint                     sin errores
```

## Conversación real en local (modelo económico de producción)

| Mensaje | Resultado |
| --- | --- |
| «hola», con materia | Saluda por el nombre, dice cuántas notas confirmadas hay, el promedio del grupo y que no hay pendientes, y propone tres acciones de esa materia. |
| «¿qué alumno va mejor en promedio y cuál es su punto débil?» | Nombra al estudiante de mayor promedio (1,8 con 2 notas, igual que en la base), advierte que no aprueba y señala la pregunta con 0 de 1. |
| Pregunta por un estudiante nombrado | 3 de 3 respuestas sobre el estudiante correcto, con su promedio real. |
| «¿cuál fue la asistencia de la semana pasada?» | Reconoce que no tiene ese registro. |
| «hola», sin materia | Saluda por el nombre e invita a elegir una materia. |

Durante la prueba apareció un fallo que quedó corregido: al nombrar a un estudiante, el modelo confundía el nombre con el número del código. La aclaración del sistema ahora va pegada a la consulta y las reglas dicen que los códigos no son posiciones.

## Datos reales (producción, solo lectura)

El armado se ejecutó sobre las tres materias con más notas confirmadas: 22 a 28 estudiantes, 3.600 a 6.000 caracteres, menos de una décima de segundo, y ningún nombre de estudiante en el texto.

## Pantalla (390 px)

- Sin materia: invita a elegir una.
- Con materia: «Ya conozco…» y seis sugerencias sobre los datos.
- Respuesta con el nombre real del estudiante y la nota de procedencia de datos.
