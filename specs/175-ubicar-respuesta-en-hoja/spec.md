# Especificación: Ubicar la respuesta en la hoja al revisar una calificación

**Rama**: `codex/175-ubicar-respuesta-en-hoja` | **Creada**: 2026-11-12 | **Estado**: Aprobada e implementada | **Issue**: [#370](https://github.com/Andres-back/Calificator/issues/370)

**Entrada**: el usuario pidió que, en «Respuestas y puntajes», pulsar una respuesta ayude a ubicar su zona en la hoja con IA, para que el docente no tenga que ampliar a mano y buscar dónde está y qué marcó el estudiante; y que calificar sea más fácil a la vista.

## Evidencia

Producción en solo lectura y aplicación local, el 2026-11-12.

| Observación | Dato |
| --- | --- |
| Preguntas con zona guardada | 927 de 5671. Las calificadas antes del 30 de octubre no tienen ninguna; desde el 9 de noviembre la tienen todas. |
| Notas que esperan revisión | 203. De sus 2239 preguntas, 480 tienen zona. 145 notas tienen alguna respuesta sin zona. |
| Qué hace hoy el visor con una zona | Acerca la hoja, sin dibujar nada: no se ve qué parte es la respuesta. |
| Alto del visor de una respuesta | 256 px en teléfono y 320 px en ordenador. |
| Pulsar la respuesta | No hace nada. Tras mover la hoja, solo «Ver zona sugerida» vuelve a la zona. |
| Qué tarda leer una hoja con IA | De 13 a 20 s por página, y cerca de 0,012 USD con el modelo configurado para leer evidencias. |

## Escenarios de usuario y pruebas

### Historia 1 - Ver dónde está la respuesta (Prioridad: P1)

Como docente, quiero que la hoja marque la zona de la respuesta que estoy revisando, para comprobar de un vistazo qué escribió o marcó el estudiante.

**Aceptación**:
1. **Dada** una respuesta con zona, **cuando** abro la pregunta, **entonces** la hoja se acerca a la zona y la rodea con un recuadro.
2. **Dado** que moví o alejé la hoja, **cuando** pulso la respuesta del estudiante, **entonces** la hoja vuelve a la zona.
3. **Dado** un teléfono, **cuando** pulso la respuesta, **entonces** la pantalla baja hasta la hoja.
4. **Dado** un ordenador, **cuando** abro la pregunta, **entonces** el visor usa el alto de la pantalla sin tapar la explicación.

### Historia 2 - Ubicar con IA lo que no tiene zona (Prioridad: P1)

Como docente, quiero pedir a la IA que ubique las respuestas de una hoja que se calificó sin zonas, para no buscarlas a mano.

**Aceptación**:
1. **Dada** una respuesta sin zona en una entrega con foto, **cuando** abro la pregunta, **entonces** veo «Ubicar respuestas con IA».
2. **Dado** que lo pulso, **cuando** la lectura termina, **entonces** todas las respuestas que la IA encontró en la entrega quedan con su zona y la hoja marca la que estoy viendo.
3. **Dada** cualquier nota, **cuando** se ubican sus respuestas, **entonces** no cambian la nota, los puntajes, los estados, las explicaciones, la retroalimentación ni una devolución ya aprobada.
4. **Dado** que la IA no responde, **cuando** lo intento, **entonces** leo que no cambió nada y puedo reintentar.
5. **Dado** que ya se buscó dos veces, **cuando** una respuesta sigue sin zona, **entonces** leo que no se distingue en la foto y no se ofrece buscar otra vez.

### Casos límite

- Una respuesta que ya trae su zona de la calificación la conserva; la ubicación a petición no la reemplaza.
- Si la nota se recalifica mientras la IA lee, no se guarda nada y se pide recargar.
- Una entrega escrita en línea no tiene foto: no se ofrece ubicar.
- El estudiante nunca recibe zonas, igual que hoy.
- El botón no se ofrece mientras el docente edita un puntaje.

## Requisitos

### Requisitos funcionales

- **FR-001**: Cuando una respuesta tiene zona, el visor DEBE dibujar un recuadro sobre ella además de acercarse.
- **FR-002**: Pulsar la respuesta del estudiante DEBE llevar la hoja a su zona y, en teléfono, desplazar la pantalla hasta la hoja.
- **FR-003**: El docente con permiso de calificar DEBE poder pedir que la IA ubique las respuestas sin zona de una entrega con foto.
- **FR-004**: Ubicar NO DEBE modificar la calificación, sus componentes ni la huella de una devolución aprobada; las zonas se guardan aparte.
- **FR-005**: Una zona guardada al calificar DEBE prevalecer sobre una ubicada a petición.
- **FR-006**: Si la lectura falla, NO DEBE guardarse nada y el intento NO DEBE contarse; la respuesta DEBE ser 503 con un mensaje para reintentar.
- **FR-007**: El sistema DEBE permitir como máximo dos búsquedas por desglose y explicar el motivo al llegar al límite.
- **FR-008**: La lectura NO DEBE recibir claves de respuesta ni puntajes.
- **FR-009**: En pantallas de 1024 px o más, el visor de una respuesta DEBE crecer con el alto de la ventana.

## Criterios de éxito

- **SC-001**: A 1440 × 900 px, el visor de una respuesta mide al menos 440 px de alto.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.
