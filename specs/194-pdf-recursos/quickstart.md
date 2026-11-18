# Validación: PDF imprimibles de recursos claros y listos para el aula

## Pruebas

```
python -m pytest backend/tests/unit -q -k "pdf or herramient"
  pasan 110 (21 nuevas); 1 fallo ajeno al cambio: la versión local de fpdf2 no es la fijada
python -m pytest tests/unit/test_document_exports.py tests/unit/test_evaluation_exports.py tests/unit/test_evaluation_visual_render.py
  48 pasan
ruff check --select F401,F821,F822,F823,F841 (archivos tocados)     sin errores
```

## PDF revisados en imagen

Generados dentro del contenedor del entorno de pruebas, con el código de la rama montado, a partir de un recurso real por herramienta. Se revisaron las 14 herramientas, con y sin soluciones, y cuatro casos límite.

- **Rúbrica**: columnas Excelente, Bueno, Regular, Insuficiente; con seis niveles, formato apilado en el orden de la escala.
- **Tarjetas de estudio**: ocho tarjetas punteadas por hoja; la hoja de respuestas añade el reverso en verde.
- **Ficha**: opciones en líneas separadas y recuadro «Dibuja aquí».
- **Quiz**: encabezado «QUIZ RÁPIDO»; ninguna pregunta partida entre páginas.
- **Plan de refuerzo y guía**: semanas y secciones completas en una página.
- **Taller**: «A) El conejo», sin letra repetida; «1 pt» en singular.
- **Cuento**: sin imagen, el relato usa todo el ancho; con imagen, dos columnas dentro del margen. Preguntas numeradas con renglones.
- **Para colorear**: sin imagen, aviso corto; con imagen, el dibujo ocupa la hoja.
- **Sopa de letras**: 13 × 13 con celdas de 32 px; 20 × 20 cabe en una hoja.
- **Relacionar pares, crucigrama, mapa conceptual y lectura**: nombres corregidos, sin otros cambios.
