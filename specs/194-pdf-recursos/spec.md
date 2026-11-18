# Especificación: PDF imprimibles de recursos claros y listos para el aula

**Rama**: `codex/194-pdf-recursos` | **Creada**: 2026-11-16 | **Estado**: Aprobada e implementada | **Issue**: [#406](https://github.com/Andres-back/Calificator/issues/406)

**Entrada**: el usuario pidió revisar las herramientas que generan recursos distintos de evaluaciones, reparar lo que funciona mal y perfeccionar lo que funciona bien. Se generó un recurso real con cada herramienta y se revisó su PDF, con y sin soluciones.

## Evidencia (PDF generados en el entorno de pruebas)

| Recurso | Lo que se veía |
| --- | --- |
| Ficha, quiz, lectura, mapa, tarjetas | El subtítulo mostraba el nombre interno (`quiz_rapido`, `flashcards`). |
| Quiz y relacionar pares | Encabezados «EXAMEN» y «UNIR COLUMNAS», distintos de la aplicación. |
| Rúbrica | Niveles en orden alfabético (Bueno, Regular, Excelente, Insuficiente), apilados en una celda. |
| Taller | Opciones con la letra repetida: «A) A. El conejo». |
| Cuento y Para colorear sin imagen | Se imprimía el texto interno con el que se pide la imagen. |
| Quiz, plan y guía | Preguntas, semanas y secciones partidas entre dos páginas. |
| Ficha | Opciones pegadas en un párrafo; el ejercicio de dibujo con dos renglones. |
| Tarjetas de estudio | Una hoja de renglones, no tarjetas. |
| Sopa de letras | Cuadrícula pequeña, menos de media hoja. |

## Escenarios de usuario y pruebas

### Historia 1 - Imprimir sin sorpresas (Prioridad: P1)

**Aceptación**:
1. **Dado** cualquier recurso, **cuando** el docente descarga el PDF, **entonces** el subtítulo y el encabezado usan el mismo nombre que la aplicación.
2. **Dado** un cuento o un dibujo para colorear sin imagen, **entonces** el PDF no muestra el texto interno de la imagen.
3. **Dada** una pregunta, ejercicio, tarjeta o semana que cabe en una página, **entonces** no queda partida entre dos.
4. **Dadas** opciones que ya traen su letra, **entonces** la letra se imprime una sola vez.

### Historia 2 - Formatos que sirven en el aula (Prioridad: P2)

**Aceptación**:
1. **Dada** una rúbrica con hasta cinco niveles, **entonces** hay una columna por nivel, en el orden de la escala.
2. **Dadas** unas tarjetas de estudio, **entonces** se imprimen dos por fila, con borde punteado para recortar; el reverso solo sale en la hoja de respuestas.
3. **Dada** una ficha, **entonces** se respetan los saltos de línea del enunciado y los ejercicios de dibujo tienen un recuadro.
4. **Dado** un cuento, **entonces** las preguntas van numeradas, con dos renglones cada una.
5. **Dada** una sopa de letras, **entonces** las celdas miden cerca de 8,5 mm y todo cabe en una hoja.

### Casos límite

- Una rúbrica con más de cinco niveles conserva el formato apilado, en el orden de la escala.
- Una opción que empieza por una inicial que no es su letra («A. C. Clarke») no se altera.
- Una sección larga de la guía puede continuar en la página siguiente.
- La sopa de letras de 20 × 20 reduce la celda para caber en una hoja.
- El PDF de las evaluaciones no cambia, salvo que tampoco repite la letra «A.».

## Requisitos

### Requisitos funcionales

- **FR-001**: El subtítulo y el encabezado de sección DEBEN usar nombres legibles: Ficha didáctica, Quiz rápido, Lectura comprensiva, Mapa conceptual, Tarjetas de estudio y Relacionar pares.
- **FR-002**: La rúbrica DEBE ordenar los niveles según la escala y, con hasta cinco niveles, mostrar una columna por nivel; con más, DEBE conservar el formato apilado.
- **FR-003**: Una opción que ya trae su letra NO DEBE imprimirla dos veces.
- **FR-004**: Sin imagen real, el PDF NO DEBE imprimir el texto interno de la imagen: el cuento usa todo el ancho y Para colorear muestra un aviso breve.
- **FR-005**: Las preguntas del cuento DEBEN ir numeradas, con tilde en el título y dos renglones cada una.
- **FR-006**: Las tarjetas de pregunta, ejercicio, tarjeta y semana que caben en una página NO DEBEN partirse entre páginas.
- **FR-007**: La ficha DEBE respetar los saltos de línea del enunciado y dar un recuadro de unos 5 cm a los ejercicios de dibujo.
- **FR-008**: Las tarjetas de estudio DEBEN imprimirse como tarjetas recortables, dos por fila; el reverso solo aparece con soluciones.
- **FR-009**: La sopa de letras DEBE usar celdas de unos 8,5 mm hasta 15 columnas y reducirlas en cuadrículas mayores para caber en una hoja.

## Criterios de éxito

- **SC-001**: El PDF de cada herramienta, con y sin soluciones, se revisó visualmente sin los defectos de la tabla de evidencia.
- **SC-002**: Las pruebas existentes de PDF y exportación de evaluaciones siguen pasando.
