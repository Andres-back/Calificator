# Especificación: La decisión del empate llega a todas las lecturas, la analítica y el PDF (backend)

**Rama**: `codex/148-nota-presentada-lecturas` | **Creada**: 2026-11-04 | **Estado**: Aprobada (spec y plan aprobados por el usuario el 2026-11-04) | **Issue**: [#314](https://github.com/Andres-back/Calificator/issues/314)

**Entrada**: continúa la regla de redondeo acordada con el docente responsable (2026-11-04). La [Spec 147](../147-decision-empate-backend/spec.md) guarda la decisión del empate (2.9 o 3.0) aparte de la nota exacta. Esta spec es el **PR 2b**:

- todas las respuestas que muestran una nota entregan también esa decisión;
- la tasa de aprobación de la analítica y el PDF usan la nota presentada, no la exacta.

## Escenarios de usuario y pruebas

### Historia 1 - El estudiante ve la nota decidida (Prioridad: P1)

Como estudiante, cuando mi docente decidió que mi 2.95 queda en 3.0, quiero ver 3.0 en mi boletín, en el resultado de la evaluación, en Xali y en la devolución compartida.

**Razón de prioridad**: sin la decisión en estas respuestas, la pantalla solo puede mostrar 2.95 (Spec 145), aunque el docente ya decidió.

**Prueba independiente**: con una nota de 2.95 sobre 5 decidida "arriba", el boletín, la lista de evaluaciones del estudiante, Xali y la devolución incluyen la decisión junto a la nota exacta.

**Aceptación**:
1. **Dado** una nota en empate con decisión, **cuando** el estudiante consulta su boletín, sus evaluaciones, Xali o una devolución, **entonces** la respuesta incluye la nota exacta y la decisión.
2. **Dado** una nota sin empate, **cuando** se consulta, **entonces** la respuesta no cambia respecto a hoy.

### Historia 2 - La aprobación se cuenta con la nota presentada (Prioridad: P1)

Como docente o directivo, quiero que la tasa de aprobación de la analítica cuente como aprobado a quien tiene 2.96 (que se presenta como 3.0) y respete mi decisión en el empate, para que la analítica coincida con lo que ve el estudiante.

**Prueba independiente**: con las notas 2.94, 2.96, 2.95 decidida "arriba" y 2.95 sin decidir sobre 5, la tasa cuenta 2 aprobados de 3 notas contables. El empate sin decidir no cuenta ni como aprobado ni como reprobado.

**Aceptación**:
1. **Dado** notas de una evaluación, **cuando** se calcula la tasa de aprobación, **entonces** se compara la nota presentada con el umbral (60 % de la nota máxima).
2. **Dado** un empate sin decidir, **cuando** se calcula la tasa, **entonces** queda fuera del cálculo hasta que el docente decida.

### Historia 3 - El reporte PDF muestra la nota presentada (Prioridad: P2)

Como docente, quiero que el reporte PDF muestre la misma cifra que la aplicación.

**Aceptación**:
1. **Dado** una nota, **cuando** se genera el PDF, **entonces** aparece con un decimal según la regla, o "2.95 (por decidir)" si es un empate sin decisión.

### Casos límite

- Las devoluciones ya compartidas conservan su contenido y su huella: la decisión solo se añade cuando existe. Así, una nota sin empate produce exactamente la misma huella que hoy y ninguna devolución previa aparece como "cambiada".
- Los promedios del curso siguen calculándose con las notas exactas. Son otra decisión, fuera de alcance.
- Una sugerencia de la IA que todavía no se ha confirmado no tiene decisión; la analítica la trata con la misma regla.

## Requisitos

### Requisitos funcionales

- **FR-001**: El boletín del estudiante, su lista de evaluaciones (`mi_*`), Xali y la devolución compartida DEBEN incluir la decisión del empate cuando exista.
- **FR-002**: La huella de las devoluciones DEBE seguir igual para las notas sin decisión.
- **FR-003**: La tasa de aprobación DEBE calcularse con la nota presentada y dejar fuera los empates sin decidir.
- **FR-004**: El PDF DEBE mostrar la nota presentada con un decimal, o la nota exacta con "(por decidir)" si es un empate sin decisión.
- **FR-005**: DEBEN existir pruebas que fallen con el comportamiento anterior.

## Criterios de éxito

- **SC-001**: Para una misma calificación, la analítica, el PDF y las respuestas al estudiante permiten mostrar la misma cifra que la revisión del docente.
- **SC-002**: 0 devoluciones previas marcadas como "cambiadas" por esta entrega.

## Supuestos

- La regla es la de `grade_rounding` (Spec 147), sin redefinirla.
- La presentación en pantalla con la decisión y la pregunta al docente llegan en el PR 3 del frontend.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Lecturas, analítica y PDF (backend) | Campo de decisión en las respuestas; aprobación con la nota presentada | `grade_rounding` y las respuestas existentes | Ninguno. Solo backend. |

## Evidencia visual requerida

No aplica: es solo backend. El PDF se verifica con su texto en una prueba.
