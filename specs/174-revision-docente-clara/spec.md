# Especificación: Evidencia a pantalla, recalificar en lote y asistencia en mosaico

**Rama**: `codex/174-revision-docente-clara` | **Creada**: 2026-11-12 | **Estado**: Aprobada e implementada | **Issue**: [#368](https://github.com/Andres-back/Calificator/issues/368)

**Entrada**: el usuario pidió, en un solo cambio: mejorar el apartado de evidencia en ordenador, poder recalificar a todos o a los seleccionados, un mosaico para tomar asistencia, quitar Presentaciones, comprobar que los recursos funcionan y pulir la calificación y la retroalimentación.

## Evidencia

Aplicación local del 2026-11-12, con un docente de prueba, a 1280, 1440, 1600 y 1900 px.

| Pantalla | Qué se ve |
| --- | --- |
| Evidencia de una calificación | El marco de la hoja mide el 45 % del alto de la pantalla. En un monitor ancho una hoja vertical queda pequeña entre dos franjas vacías. |
| Lista de revisión | Solo «Confirmar todos», «Ajustar nota común» y «Publicar seleccionados». Para volver a calificar hay que abrir cada entrega. |
| Asistencia | A partir de 1024 px, una fila por estudiante a todo el ancho. |
| Menú del docente y del administrador | Incluye «Presentaciones». |
| Generar un recurso sin respuesta de la IA | El servidor responde 500 («Los proveedores configurados no pudieron responder») y el docente ve un error genérico. |
| Lista de revisión | Los estados se leen «Sin Entrega» y «Requiere Revision», en gris y sin distinguirse entre sí. El nombre largo de una evaluación parte la ruta de navegación en tres líneas. |

## Escenarios de usuario y pruebas

### Historia 1 - La hoja se lee en un ordenador (Prioridad: P1)

Como docente, quiero que la hoja de evidencia ocupe el alto de la pantalla, para leerla sin ampliarla cada vez.

**Aceptación**:
1. **Dada** una pantalla de 1024 px o más, **cuando** abro «Evidencia», **entonces** el marco de la hoja ocupa el alto disponible de la ventana.
2. **Dado** un teléfono, **cuando** abro «Evidencia», **entonces** el marco conserva su alto actual.

### Historia 2 - Volver a calificar varias entregas (Prioridad: P1)

Como docente, quiero volver a calificar varias entregas de una vez, para no abrirlas una por una cuando cambia la clave o el calificador.

**Aceptación**:
1. **Dadas** varias notas seleccionadas, **cuando** elijo «Recalificar seleccionados» y confirmo, **entonces** cada entrega sin decisión docente vuelve a la cola y conserva su resultado anterior en el historial.
2. **Dada** una evaluación con notas sin revisar, **cuando** abro «Más acciones», **entonces** puedo elegir «Recalificar no revisadas» con su cantidad.
3. **Dada** una nota que ya revisé, confirmé o publiqué, **cuando** entra en un lote, **entonces** no se reabre y el resultado dice por qué.
4. **Dado** un lote donde una entrega se rechaza, **cuando** termina, **entonces** las demás se procesaron y veo el motivo de cada rechazo.
5. **Dada** la confirmación, **cuando** la leo, **entonces** explica que la lectura puede cambiar y que tarda varios minutos.

### Historia 3 - Asistencia en mosaico (Prioridad: P2)

Como docente, quiero marcar la asistencia en tarjetas ordenadas en columnas, para ver más estudiantes a la vez en un ordenador.

**Aceptación**:
1. **Dada** una pantalla de 1024 px o más, **cuando** tomo asistencia, **entonces** los estudiantes se muestran en dos columnas, y en tres desde 1536 px.
2. **Dada** una pantalla de 1280 px, **cuando** la lista tiene ocho estudiantes, **entonces** caben en 600 px de alto y cada botón mide al menos 44 px.

### Historia 4 - Menú y recursos (Prioridad: P2)

**Aceptación**:
1. **Dado** cualquier rol, **cuando** abro el menú o el inicio del administrador, **entonces** no aparece «Presentaciones».
2. **Dado** que la IA no responde, **cuando** genero un recurso, **entonces** recibo un aviso para reintentar y mis datos siguen en el formulario.

### Historia 5 - Estados legibles (Prioridad: P3)

**Aceptación**:
1. **Dada** la lista de revisión, **cuando** la leo, **entonces** cada estado tiene su nombre correcto y un punto de color.
2. **Dada** una evaluación de nombre largo, **cuando** estoy en un ordenador, **entonces** la ruta de navegación ocupa una línea y el nombre completo está en su título.

### Casos límite

- El lote admite hasta 60 entregas por petición; el frontend envía las primeras 60 y lo dice.
- La ruta `/app/presentaciones` sigue existiendo para quien tenga el enlace; solo se retira del menú.
- Recalificar vuelve a leer la foto con IA y cuesta lo mismo que una calificación nueva por entrega.

## Requisitos

### Requisitos funcionales

- **FR-001**: En pantallas de 1024 px o más, el marco de la hoja de evidencia DEBE ocupar el alto disponible de la ventana.
- **FR-002**: El sistema DEBE permitir volver a calificar varias entregas en una sola acción, usando para cada una la misma reapertura que la acción individual.
- **FR-003**: El lote NO DEBE reabrir una nota revisada, confirmada, ajustada o publicada, y DEBE informar el motivo por entrega.
- **FR-004**: Un rechazo dentro del lote NO DEBE impedir que las demás entregas se procesen.
- **FR-005**: La acción en lote DEBE pedir confirmación explicando duración y que la lectura puede cambiar.
- **FR-006**: En pantallas de 1024 px o más, la asistencia DEBE mostrarse en columnas, conservando ocho estudiantes en 600 px a 1280 px.
- **FR-007**: «Presentaciones» NO DEBE aparecer en el menú de ningún rol ni en el inicio del administrador.
- **FR-008**: Si la IA no responde al generar un recurso, el servidor DEBE responder 503 con un mensaje para reintentar.
- **FR-009**: La lista de revisión DEBE mostrar cada estado con su nombre correcto y un tono propio, y la ruta de navegación DEBE ocupar una línea en ordenador.

## Criterios de éxito

- **SC-001**: A 1900 × 900 px, la hoja de evidencia mide al menos 600 px de alto.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.
