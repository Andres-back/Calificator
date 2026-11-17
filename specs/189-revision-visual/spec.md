# Especificación: Revisión visual. Datos que engañan y fondos blancos

**Rama**: `codex/189-revision-visual` | **Creada**: 2026-11-14 | **Estado**: Aprobada e implementada | **Issue**: [#398](https://github.com/Andres-back/Calificator/issues/398)

**Entrada**: el usuario pidió revisar que todos los flujos del frontend se vean responsivos y adecuados y mejorar UI y UX donde haga falta, usando imágenes generadas si se necesita decoración.

## Evidencia

Se recorrieron 45 rutas (público, docente, estudiante y administrador) en 390 px y 1440 px, con métricas automáticas (desborde, tamaño táctil, recortes, consola) y tres revisiones visuales de las capturas.

| Hallazgo | Dónde |
| --- | --- |
| Ninguna página desborda horizontalmente | Todas |
| «Promedio general 0.88», sin escala y con dos decimales; eje del gráfico ajustado al dato; encabezados de tabla partidos | Reportes |
| «¡Excelente!» y «¡Vas muy bien!» con 1.8 / 5 | Inicio del estudiante |
| 0.0 en verde; vencida en ámbar con segundos; etiqueta interna «Publicada» al estudiante | Evaluaciones del estudiante |
| «Borrador IA» junto a «Publicada»; modalidad en bruto («fisica», «online») | Evaluaciones del docente, resolver evaluación |
| «Sábado, 14 De Noviembre De 2026»; «1 pendientes» | Asistencia, boletines |
| «Eliminar de mis materias» archiva y se puede restaurar | Materias |
| Imágenes de Xali y de estados vacíos con fondo blanco: cuadros sobre tarjetas de color y en modo oscuro | Inicio del estudiante, materias, evaluaciones, Xali, login |

## Escenarios de usuario y pruebas

### Historia 1 - Las notas se leen bien (Prioridad: P1)

**Aceptación**:
1. **Dado** el reporte docente, **entonces** los promedios se muestran «x.x / 5.0», con un decimal, en barras horizontales de 0 a 5.
2. **Dado** un estudiante con promedio menor a 3.0, **entonces** el inicio no lo felicita: le pide repasar y muestra «/ 5.0».
3. **Dada** una evaluación calificada, **entonces** el estudiante ve «Tu nota: x / máximo», en verde solo si aprueba (60 %).

### Historia 2 - Textos y fechas claros (Prioridad: P2)

**Aceptación**:
1. Los vencimientos dicen «Vence el …» o «Venció el …», sin segundos.
2. Las fechas largas llevan mayúscula solo al inicio y los conteos usan el singular cuando corresponde.
3. Las modalidades se muestran «En papel», «En línea» o «Mixta», y una evaluación hecha con IA dice «Hecha con IA».
4. Archivar una materia se llama «Archivar materia», con la confirmación «Sí, archivar».

### Historia 3 - Imágenes sin cuadro blanco (Prioridad: P2)

**Aceptación**:
1. Las imágenes de Xali, estados vacíos, evaluar, IA, login y logo tienen fondo transparente y se ven bien en claro y oscuro.

## Requisitos

### Requisitos funcionales

- **FR-001**: El resumen docente DEBE promediar las notas confirmadas en escala 5 (cada nota sobre su nota máxima) y la página DEBE mostrarlas con su escala y un decimal.
- **FR-002**: El inicio del estudiante DEBE elegir el mensaje y el color según la nota: excelente (≥ 4.0), aprobado (≥ 3.0) o por repasar (< 3.0).
- **FR-003**: La tarjeta de evaluación del estudiante DEBE colorear la nota según si aprueba y no mostrar el estado de publicación.
- **FR-004**: Fechas, modalidades, plurales y la acción de archivar DEBEN usar los textos de la Historia 2.
- **FR-005**: Las imágenes de marca en uso DEBEN tener fondo transparente sin perder el dibujo.

## Criterios de éxito

- **SC-001**: Ninguna nota reprobada se muestra en verde ni se felicita.
- **SC-002**: Las pruebas existentes siguen pasando.
