# Especificación: Vista por pregunta sin ruido y con la zona siempre a la vista

**Rama**: `codex/176-revision-minimal` | **Creada**: 2026-11-12 | **Estado**: Aprobada e implementada | **Issue**: [#372](https://github.com/Andres-back/Calificator/issues/372)

**Entrada**: tras desplegar la Spec 175, el usuario envió dos capturas de producción y pidió mejorar la vista de forma minimalista, ocultar la información innecesaria y que no desaparezca el aviso de pendientes por revisión al entrar a una evaluación.

## Evidencia

Producción, 2026-11-12, en una calificación con foto de una hoja.

| Observación | Dato |
| --- | --- |
| Visor de la respuesta | «No pudimos comprobar que esta zona corresponda a la evidencia actual». |
| Registros del servidor a esa hora | Las peticiones de la hoja con su versión respondieron 200 con el archivo completo (1,7 MB). |
| Respuesta del backend reproducida con sus versiones | Trae versión, hoja y tipo correctos. El proxy público no transforma imágenes y deja pasar las cabeceras. |
| Hoja sin zona a 100 % | Ocupa cerca de un tercio del ancho del visor; el texto no se lee. |
| Avisos | Las diez preguntas muestran la caja «Conviene comprobar · No hay información suficiente…». |
| Cabecera de la nota | No dice cuántas notas quedan por revisar; la lista que lo decía se oculta al entrar. |

No se pudo observar en el navegador del docente qué parte de la comprobación rechaza la respuesta.

## Escenarios de usuario y pruebas

### Historia 1 - La zona se muestra (Prioridad: P1)

Como docente, quiero ver el recuadro de la respuesta siempre que la hoja sea la vigente, para no buscarla a mano.

**Aceptación**:
1. **Dado** que el servidor entrega la hoja de la versión pedida, **cuando** abro una pregunta con zona, **entonces** veo la hoja con su recuadro, aunque la comprobación previa del navegador no concluya.
2. **Dado** que el servidor responde que la evidencia cambió, o la respuesta declara otra versión u otra hoja, **cuando** abro la pregunta, **entonces** no se señala ninguna zona y puedo abrir la hoja sin señalamiento.

### Historia 2 - La hoja se lee al abrir (Prioridad: P1)

**Aceptación**:
1. **Dada** una respuesta sin zona y una hoja vertical, **cuando** abro la pregunta, **entonces** la hoja ocupa el ancho del visor y empieza por arriba.
2. **Dado** el visor ampliado, **cuando** lo abro, **entonces** muestra la hoja completa como antes.

### Historia 3 - Solo lo necesario (Prioridad: P2)

**Aceptación**:
1. **Dada** una pregunta con el aviso «Conviene comprobar», **cuando** la abro, **entonces** el aviso ocupa una línea, sin caja.
2. **Dada** una pregunta con «Revisión prioritaria», **cuando** la abro, **entonces** conserva su caja.
3. **Dado** un ordenador, **cuando** miro el visor, **entonces** nombre de la hoja y controles están en una fila, los controles son iconos y las instrucciones no ocupan espacio.
4. **Dado** el índice de preguntas, **cuando** lo leo, **entonces** cada pregunta muestra su número y sus puntos; el estado queda en el título y para lectores de pantalla.

### Historia 4 - Pendientes a la vista (Prioridad: P2)

**Aceptación**:
1. **Dada** una evaluación con notas por revisar, **cuando** entro a una nota, **entonces** la cabecera muestra «N por revisar».
2. **Dada** una evaluación sin pendientes, **cuando** entro a una nota, **entonces** no aparece ese aviso.

### Casos límite

- Si la hoja pedida con su versión no carga, el visor ofrece reintentar, como con cualquier imagen.
- Cada control conserva su nombre accesible y su tamaño táctil de 44 px.
- En teléfono las instrucciones del visor siguen a la vista.

## Requisitos

### Requisitos funcionales

- **FR-001**: El visor DEBE mostrar la zona cuando el servidor entrega la hoja de la versión pedida, aunque la lectura previa falle o llegue sin sus cabeceras.
- **FR-002**: El visor NO DEBE señalar una zona si el servidor responde 409 o si la respuesta declara otra versión u otra hoja.
- **FR-003**: Sin zona, el visor de una respuesta DEBE abrir la hoja ajustada al ancho, desde arriba y con un máximo de 2,5 aumentos; el visor ampliado y la vista «Evidencia» no cambian.
- **FR-004**: «Conviene comprobar» DEBE mostrarse en una línea sin caja en la vista por pregunta; «Revisión prioritaria» conserva su caja.
- **FR-005**: La barra del visor de una respuesta DEBE caber en una fila con el nombre de la hoja, con controles de icono que conservan nombre accesible y 44 px.
- **FR-006**: El índice de preguntas DEBE mostrar número y puntos, y conservar el estado en el título y en la descripción accesible.
- **FR-007**: La cabecera de una nota DEBE mostrar cuántas notas de la evaluación quedan por revisar, y nada cuando no queda ninguna.

## Criterios de éxito

- **SC-001**: A 1440 × 900 px, una hoja vertical sin zona abre con 752 px de ancho dentro del visor.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.
