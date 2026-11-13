# Especificación: La pregunta completa a la vista y el aviso se va al entrar

**Rama**: `codex/178-pregunta-completa` | **Creada**: 2026-11-12 | **Estado**: Aprobada e implementada | **Issue**: [#376](https://github.com/Andres-back/Calificator/issues/376)

**Entrada**: el usuario pidió que, en «Respuestas y puntajes», el visor dé un espacio suficiente para ver la pregunta completa («no un zoom de 800 sobre la respuesta sino uno de 250 donde se aprecie toda la pregunta y sus respuestas») y aclaró que, al entrar a revisar, el letrero de respuestas por comprobar debe irse «porque ya entré a revisar».

## Evidencia

| Observación | Dato |
| --- | --- |
| Enfoque de una respuesta con zona, 1440 px | El visor amplía a 514–527 % sobre la marca. En producción el usuario vio cerca de 800 %. |
| Dentro de una pregunta con aviso | «Conviene comprobar · No hay información suficiente…» se muestra aunque el docente ya la esté comprobando. |
| Índice de preguntas | La marca ámbar no cambia después de abrir la pregunta. |
| Cabecera de la nota | «N por revisar», añadido en la Spec 176 al entender la petición al revés. |

## Escenarios de usuario y pruebas

### Historia 1 - Ver la pregunta completa (Prioridad: P1)

**Aceptación**:
1. **Dada** una respuesta con zona, **cuando** abro la pregunta o pulso «Ver zona sugerida», **entonces** la hoja se centra en la zona con 250 % como máximo.
2. **Dada** una zona grande, **cuando** cabe con menos aumento, **entonces** no se amplía hasta 250 %.
3. **Dado** que quiero más detalle, **cuando** pulso «Acercar», **entonces** puedo ampliar más, como antes.

### Historia 2 - El aviso se va al entrar (Prioridad: P1)

**Aceptación**:
1. **Dada** una pregunta con «Conviene comprobar», **cuando** la abro, **entonces** el aviso no se muestra dentro de la pregunta.
2. **Dado** que ya abrí una pregunta, **cuando** miro el índice, **entonces** su marca ya no está en ámbar; las que no he abierto conservan la suya.
3. **Dado** que salgo de la nota y vuelvo en la misma sesión del navegador, **cuando** miro el índice, **entonces** las preguntas que abrí siguen sin marca.
4. **Dada** una pregunta con «Revisión prioritaria», **cuando** la abro, **entonces** su caja y su marca siguen ahí.
5. **Dada** la cabecera de una nota, **cuando** entro, **entonces** no muestra un contador de pendientes.

### Casos límite

- El nombre accesible de cada pregunta del índice y su prioridad real no cambian: lo visto es solo una presentación.
- Si el navegador no permite guardar la sesión, lo visto vale mientras dure la visita.
- Una calificación nueva (otro desglose) empieza sin preguntas vistas.

## Requisitos

### Requisitos funcionales

- **FR-001**: El enfoque automático de una respuesta NO DEBE superar 250 % de ampliación.
- **FR-002**: Dentro de la vista por pregunta NO DEBE mostrarse el aviso «Conviene comprobar».
- **FR-003**: La pregunta abierta, y las ya abiertas en la sesión del navegador, DEBEN mostrarse en el índice sin la marca ámbar.
- **FR-004**: «Revisión prioritaria» DEBE conservar su caja y su marca.
- **FR-005**: La cabecera de la nota NO DEBE mostrar el contador de pendientes.
- **FR-006**: El contenedor de la pregunta NO DEBE dibujar un contorno de foco propio.

## Criterios de éxito

- **SC-001**: A 1440 × 900 px, una pregunta de opción múltiple con zona se abre a 250 % con su enunciado y sus opciones a la vista.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.
