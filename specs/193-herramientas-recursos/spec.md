# Especificación: Recursos de clase con vistas claras y completas en celular

**Rama**: `codex/193-herramientas-recursos` | **Creada**: 2026-11-16 | **Estado**: Aprobada e implementada | **Issue**: [#407](https://github.com/Andres-back/Calificator/issues/407)

**Entrada**: el usuario pidió revisar las herramientas que generan recursos distintos de evaluaciones: cuáles funcionan bien, cuáles mal, reparar lo malo y perfeccionar lo bueno, con permiso para mejorar el frontend sin dañar la funcionalidad.

## Auditoría

Se generó un recurso de cada tipo (14) con el modelo económico que usa producción y se abrió como docente y como estudiante, en 390 px y en PC.

| Resultado | Detalle |
| --- | --- |
| Generación | Las 14 herramientas responden (6 a 15 s) y guardan el recurso. |
| Apertura | Ninguna da error ni desborda la página. |
| Vista en pantalla | Defectos de presentación en 10 de 14, casi todos en celular (esta spec). |
| PDF imprimible | Defectos propios; van en la Spec 194. |
| Contenido generado | Pares ambiguos y recurso «para colorear» sin dibujo; van en la Spec 195. |

## Escenarios de usuario y pruebas

### Historia 1 - El juego se ve completo en el celular (Prioridad: P1)

**Aceptación**:
1. **Dado** un crucigrama de 14 columnas en 390 px, **entonces** se ve toda la grilla sin deslizar hacia el lado.
2. **Dada** una sopa de letras de 13 columnas en 390 px, **entonces** se ven todas las columnas.
3. **Dado** relacionar pares en 390 px, **entonces** ninguna palabra se parte letra por letra.

### Historia 2 - El recurso se lee sin tropiezos (Prioridad: P1)

**Aceptación**:
1. **Dado** un taller en celular, **entonces** el enunciado ocupa todo el ancho y las etiquetas van debajo.
2. **Dada** una opción que la IA escribió como «A. El conejo», **entonces** se muestra «A) El conejo».
3. **Dado** cualquier recurso, **entonces** las instrucciones aparecen una sola vez, también para el estudiante.
4. **Dadas** las etiquetas de tipo, dificultad y puntaje, **entonces** se leen «Opción múltiple», «Dificultad baja», «1 punto».

### Casos límite

- Una opción que empieza por una letra distinta de la suya («C. elegans» como opción A) se conserva tal cual.
- Una sopa o un crucigrama de 20 columnas conserva un tamaño mínimo de celda y, solo entonces, se desliza.
- En PC las vistas conservan su tamaño de antes.

## Requisitos

### Requisitos funcionales

- **FR-001**: El crucigrama DEBE repartir el ancho disponible entre sus columnas (celda mínima de 1.25 rem y máxima de 2.375 rem) en vez de usar celdas fijas que se salen.
- **FR-002**: La sopa de letras DEBE repartir el ancho entre sus columnas, con celdas cuadradas, sin cambiar la selección por arrastre ni por teclado.
- **FR-003**: Relacionar pares DEBE dar más ancho al texto en celular y partir palabras solo por sílabas o cuando no quepan.
- **FR-004**: En el taller, el enunciado y las etiquetas DEBEN apilarse por debajo de `lg`.
- **FR-005**: Las opciones NO DEBEN repetir su letra; el prefijo solo se quita si coincide con la letra que la vista antepone.
- **FR-006**: Las instrucciones DEBEN mostrarse una sola vez por recurso, para docente y estudiante.
- **FR-007**: Tipo, dificultad y puntaje DEBEN mostrarse con etiquetas legibles en español; los botones «Ver soluciones» y «Ver respuestas» y el porcentaje de la rúbrica NO DEBEN partirse.
- **FR-008**: La ficha DEBE respetar los saltos de línea del enunciado.
- **FR-009**: Las tarjetas de estudio DEBEN decir «Toca para ver la definición» y rotular sus tres botones («No la sé», «Dudé», «La sé»).
- **FR-010**: Si falta el dibujo, el mensaje DEBE decir «El dibujo no está disponible» y qué hacer, sin jerga.

## Criterios de éxito

- **SC-001**: En 390 px, crucigrama, sopa de letras, relacionar pares y taller se usan sin desplazamiento lateral.
- **SC-002**: Las pruebas existentes de recursos siguen pasando; no cambia ningún dato guardado.
