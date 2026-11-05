# Especificación: Decisión del docente en el empate del umbral (backend)

**Rama**: `codex/147-decision-empate-backend` | **Creada**: 2026-11-04 | **Estado**: Aprobada (spec y plan aprobados por el usuario el 2026-11-04) | **Issue**: [#312](https://github.com/Andres-back/Calificator/issues/312)

**Entrada**: regla institucional definida por el docente responsable el 2026-11-04. La nota final se presenta con un decimal y la mitad sube; la única excepción es el empate exacto en el umbral de aprobación (60 % de la nota máxima; 2.95 sobre 5), que decide el docente. La [Spec 145](../145-nota-un-decimal/spec.md) unificó la presentación. Esta spec es el **PR 2a**: el sistema guarda la decisión y no deja que una nota en empate quede como final sin ella. Decisiones del usuario: guardar la decisión aparte sin reescribir la nota exacta, y dividir el backend en dos entregas.

## Escenarios de usuario y pruebas

### Historia 1 - Decidir el empate al fijar la nota (Prioridad: P1)

Como docente, cuando confirmo, ajusto o establezco una nota que cae justo en el empate del umbral, quiero indicar si queda en 2.9 o en 3.0, para que la aprobación del estudiante sea decisión mía y no del sistema.

**Razón de prioridad**: hoy un 2.95 se guarda y se publica sin decisión, y cada pantalla lo interpretaba a su manera.

**Prueba independiente**: confirmar 2.95 sobre 5 sin decisión se rechaza con un mensaje claro; con la decisión "arriba" se acepta y queda registrada.

**Aceptación**:
1. **Dado** una nota en empate, **cuando** el docente la confirma, ajusta o establece sin decisión, **entonces** no se guarda y recibe un mensaje claro que menciona la nota y las dos opciones.
2. **Dado** una nota en empate, **cuando** la confirma con la decisión "abajo" o "arriba", **entonces** se guardan el valor exacto y la decisión, y el historial registra quién decidió y qué.
3. **Dado** una nota que no está en empate, **cuando** se confirma, **entonces** se guarda igual que hoy y cualquier decisión enviada se ignora.

### Historia 2 - Ninguna nota en empate se publica sin decisión (Prioridad: P1)

Como docente, quiero que el sistema no publique a los estudiantes una nota en empate que aún no he decidido, aunque provenga de un cálculo o de la sugerencia de la IA.

**Prueba independiente**: publicar una nota confirmada en 2.95 sin decisión se rechaza; "aceptar y publicar devoluciones" deja esa nota pendiente con un aviso, sin afectar a las demás del lote.

**Aceptación**:
1. **Dado** una nota en empate sin decisión, **cuando** se intenta publicar (individual o en lote), **entonces** se rechaza con un mensaje que pide decidir.
2. **Dado** un lote de confirmación, ajuste o publicación, **cuando** alguna nota está en empate sin decisión, **entonces** solo esa queda con error y las demás se procesan.
3. **Dado** que la nota cambia por un cálculo (edición del desglose o nuevo reparto de puntos), **cuando** el nuevo valor es distinto, **entonces** la decisión anterior se descarta, porque se tomó sobre otra cifra.

### Historia 3 - Leer la decisión (Prioridad: P2)

Como frontend, necesito recibir la decisión junto con la calificación, para presentar 2.9 o 3.0 en lugar de 2.95 y no volver a preguntar.

**Aceptación**:
1. **Dado** una calificación con decisión, **cuando** se consulta, **entonces** la respuesta incluye la decisión.

### Casos límite

- Las escalas distintas de 5 usan el mismo cálculo (5.95 sobre 10, 59.95 sobre 100, 2.65 sobre 4.5).
- Si se envía una decisión con una nota que no está en empate, se ignora y no se guarda.
- Si se reabre o anula la calificación, o se piden una foto nueva o un reemplazo, la decisión se borra junto con la nota.
- El cero automático por entrega vencida nunca es empate.
- Si una nota **ya publicada** pasa a un empate por un cálculo (edición del desglose o nuevo reparto), vuelve a "ajustada" y deja de estar publicada hasta que el docente decida. El historial lo explica. Así ninguna nota en empate queda publicada sin decisión (SC-001).
- Las notas guardadas antes de esta spec que estén en empate quedan sin decisión. No se publican de nuevo hasta que el docente decida, y lo ya publicado no se modifica.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE identificar el empate del umbral con una única regla compartida: nota (2 decimales) = umbral − 0.05, donde el umbral es el 60 % de la nota máxima llevado a un decimal con la mitad hacia arriba.
- **FR-002**: Confirmar, ajustar, "Establecer nota" y sus variantes en lote DEBEN rechazar una nota en empate que no traiga decisión, y aceptar la decisión "abajo" o "arriba".
- **FR-003**: El sistema DEBE guardar la decisión aparte de la nota exacta, sin cambiar `nota_confirmada`, el desglose ni su validación de publicación, y registrarla en el historial con quién decidió.
- **FR-004**: Publicar (individual o en lote) y "aceptar y publicar devoluciones" DEBEN rechazar o dejar pendiente una nota en empate sin decisión.
- **FR-005**: Cualquier cambio del valor de la nota final DEBE descartar una decisión previa, salvo que el mismo cambio traiga una nueva.
- **FR-006**: La consulta de la calificación DEBE incluir la decisión.
- **FR-007**: Los clientes actuales DEBEN seguir funcionando para notas que no estén en empate: la decisión es opcional en todas las peticiones.

### Entidades clave

- **Decisión de empate**: atributo de la calificación con los valores "abajo" o "arriba", o vacío. Solo tiene sentido mientras la nota esté en empate.

## Criterios de éxito

- **SC-001**: 0 notas en empate publicadas sin decisión docente desde esta versión.
- **SC-002**: Las notas que no están en empate se confirman y publican exactamente igual que antes; las pruebas existentes siguen pasando.
- **SC-003**: Cada decisión queda en el historial con el docente que la tomó.

## Supuestos

- El umbral es el 60 % de la nota máxima (decisión del docente responsable).
- Hasta que llegue el PR 3 del frontend, un docente que confirma 2.95 recibe el mensaje de rechazo. Puede ajustar la nota a 2.9 o 3.0 directamente, o esperar la pregunta del PR 3, que enviará la decisión sin errores.
- La analítica de aprobación y el PDF siguen igual hasta el PR 2b.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Calificaciones (backend) | Campo de decisión de empate, regla compartida y mensaje de rechazo | Validaciones de confirmar, ajustar y publicar, y el historial de la calificación | Ninguno: solo backend, sin cambios de interfaz en esta entrega |

## Evidencia visual requerida

No aplica: es solo backend y no cambia ninguna pantalla. La evidencia son las pruebas de cada camino de escritura y de publicación.
