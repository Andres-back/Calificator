# Especificación: «Editar hojas» fácil para cualquier edad

**Rama**: `codex/217-editar-hojas-facil` | **Creada**: 2026-11-24 | **Estado**: Aprobada e implementada | **Issue**: [#456](https://github.com/Andres-back/Calificator/issues/456)

**Entrada**: el usuario pidió el 2026-11-24 revisar que editar la evidencia «tenga buena usabilidad, sea fácil para los usuarios; la experiencia debe ser agradable para cualquier edad».

## Hallazgo

Recorrido de «Editar hojas» (vista Evidencia de una calificación) en celular (390 × 844) y computador (1440 × 900), en claro y oscuro.

1. **En computador, «Preparar hoja» quedaba encerrado dentro de «Editar hojas».** Se abre a pantalla completa, pero se dibujaba dentro del diálogo de atrás, cuyo fondo desenfocado (`backdrop-filter`) hace de caja para todo lo que tiene posición fija. El botón principal «Usar esta hoja» quedaba en y = 921 en una pantalla de 900: había que desplazar dentro del diálogo para encontrarlo. En celular sí se veía. Afecta también a «Cambiar evidencia», que abre el mismo editor.
2. Las acciones de cada hoja eran solo iconos sin texto ni borde. El de ajustar (un icono de escáner) no se reconocía y nada decía que ahí se gira la hoja.
3. Las miniaturas medían 48 × 64 px y no se podían ampliar.
4. «Quitar» no se podía deshacer, salvo cancelando todo el editor.
5. «Guardar y volver a calificar» aparecía apagado sin decir qué faltaba.
6. La casilla de confirmación era un párrafo largo y técnico.
7. Cada hoja guardada decía «Guardada», como si se acabara de guardar algo.

## Escenarios de usuario y pruebas

### Historia 1 - Terminar el ajuste sin buscar botones (Prioridad: P1)

**Aceptación**:
1. **Dado** un docente en computador que toca «Girar o recortar» en una hoja, **entonces** «Preparar hoja» ocupa toda la pantalla y «Usar esta hoja» se ve sin desplazar.
2. **Dado** el mismo docente en celular, **entonces** sigue igual que hoy.

### Historia 2 - Entender cada acción sin adivinar (Prioridad: P1)

**Aceptación**:
1. **Dada** la lista de hojas, **entonces** cada acción tiene texto: «Girar o recortar», «Subir», «Bajar», «Quitar», con tamaño táctil de 44 px o más.
2. **Cuando** toca la miniatura, **entonces** ve la hoja en grande y la cierra con «Cerrar».
3. **Cuando** quita una hoja, **entonces** aparece «Quitaste la hoja N.» con «Deshacer», que la devuelve a su lugar.
4. **Mientras** no puede guardar, **entonces** una frase junto al botón dice qué falta: hacer un cambio, dejar al menos una hoja o marcar la casilla.

## Requisitos funcionales

- **FR-001**: Un diálogo a pantalla completa se dibuja en el documento y no dentro del diálogo que lo abrió. Los demás diálogos no cambian.
- **FR-002**: Cada acción de una hoja muestra su texto y conserva un nombre accesible que lo contiene («Subir hoja 2», «Girar o recortar la hoja 1»).
- **FR-003**: La miniatura es un botón que abre la hoja en grande a pantalla completa, con un botón «Cerrar».
- **FR-004**: Tras quitar una hoja aparece «Deshacer» hasta el siguiente cambio; deshacer la devuelve a su posición.
- **FR-005**: Mientras «Guardar y volver a calificar» está apagado por falta de un cambio, de hojas o de la confirmación, una frase dice qué falta.
- **FR-006**: La confirmación dice lo esencial en una línea («Confirmo guardar las hojas y volver a calificar.») y el detalle en lenguaje llano.
- **FR-007**: El estado de cada hoja dice «Sin cambios», «Girada o recortada» o «Foto nueva».
- **FR-008**: Sin cambios en el servidor ni en lo que se envía al guardar.

## Criterios de éxito

- **SC-001**: A 1440 × 900 px, «Usar esta hoja» queda dentro de la pantalla y recibe el toque en su centro. Con el diálogo anterior, la misma prueba falla.
- **SC-002**: axe no encuentra violaciones WCAG A y AA en «Editar hojas» (claro y oscuro, 390 y 1366 px).

## Fuera de alcance

- Unificar «Editar hojas» y «Cambiar evidencia» en una sola entrada.
- Girar una hoja directamente desde la lista sin abrir «Preparar hoja»: hoy el giro de una hoja guardada viaja con su receta y necesita el editor.
