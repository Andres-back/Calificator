# Especificación: El docente decide 2.9 o 3.0 en pantalla

**Rama**: `codex/150-pregunta-empate` | **Creada**: 2026-11-06 | **Estado**: Aprobada (`spec-approved`, `plan-approved`) | **Issue**: [#321](https://github.com/Andres-back/Calificator/issues/321)

**Entrada**: regla institucional de la [Spec 147](../147-decision-empate-backend/spec.md): la nota se presenta con un decimal, salvo el empate exacto en el umbral de aprobación (2.95 sobre 5), que decide el docente. El backend (147) y las lecturas (148) ya están en producción. Falta la pantalla: hoy el docente solo recibe un mensaje de rechazo.

## Escenarios de usuario y pruebas

### Historia 1 - Decidir al fijar la nota (Prioridad: P1)

Como docente, cuando confirmo, ajusto o establezco una nota en empate, quiero elegir 2.9 o 3.0 en ese momento, para no recibir un error.

**Prueba independiente**: confirmar una sugerencia de 2.95 sobre 5, elegir 3.0 y comprobar que la petición lleva la decisión y que la nota queda confirmada.

**Aceptación**:
1. **Dado** una sugerencia en empate, **cuando** pulso "Confirmar nota", **entonces** el diálogo pregunta "¿2.9 o 3.0?" y no deja confirmar hasta que elija.
2. **Dado** el editor de nota final, el ajuste rápido o "Establecer nota", **cuando** escribo una nota en empate, **entonces** aparece la misma pregunta y no deja guardar hasta que elija.
3. **Dado** una nota que no está en empate, **cuando** la confirmo o la ajusto, **entonces** no aparece ninguna pregunta y todo funciona como hoy.

### Historia 2 - Decidir una nota que quedó pendiente (Prioridad: P1)

Como docente, quiero poder decidir una nota ya confirmada que está en empate sin decisión, para poder publicarla.

**Prueba independiente**: abrir una nota confirmada en 2.95 sin decisión, elegir 2.9 en el aviso y comprobar que queda decidida y se puede publicar.

**Aceptación**:
1. **Dado** una nota confirmada en empate sin decisión (anterior a la Spec 147 o resultado de un cálculo), **cuando** abro su detalle, **entonces** un aviso me pide elegir 2.9 o 3.0 y "Publicar" no se ofrece hasta decidir.
2. **Dado** que elijo una opción, **cuando** se guarda, **entonces** la nota exacta no cambia y el historial registra quién decidió.

### Historia 3 - Ver la cifra decidida (Prioridad: P1)

Como docente o estudiante, quiero ver 2.9 o 3.0 en lugar de 2.95 cuando ya hay decisión, para que todas las pantallas coincidan con la aprobación.

**Prueba independiente**: con una nota de 2.95 decidida "arriba", la lista del docente, el detalle, el boletín del estudiante y la devolución muestran 3.0.

**Aceptación**:
1. **Dado** un empate con decisión, **cuando** veo la nota en una pantalla que recibe la decisión, **entonces** veo la cifra decidida.
2. **Dado** un empate sin decisión, **cuando** lo veo como docente, **entonces** veo 2.95 con la marca "por decidir".
3. **Dado** una nota sin empate, **cuando** la veo, **entonces** se muestra como hoy.

### Casos límite

- **Otras escalas**: la pregunta usa las cifras reales (5.9 o 6.0 sobre 10), con la misma regla de la Spec 145.
- **Confirmar o ajustar en lote**: el backend rechaza solo las notas en empate y procesa las demás. El resultado del lote ya muestra el motivo y deja esas notas seleccionadas; se deciden una por una.
- **Cambiar la cifra escrita**: si la nota deja de estar en empate, la pregunta desaparece y no se envía decisión.
- **Doble envío o nota cambiada en otra sesión**: se aplican las protecciones actuales.
- **Sugerencia de la IA sin confirmar**: no tiene decisión; se muestra 2.95 con "por decidir" solo al docente.

## Requisitos

### Requisitos funcionales

- **FR-001**: El frontend DEBE detectar el empate con la misma regla de `formatGradeScore` (Spec 145), en una sola función compartida.
- **FR-002**: Confirmar, el editor de nota final, el ajuste rápido y "Establecer nota" DEBEN pedir la decisión si la nota está en empate, y enviarla como `redondeo_empate`.
- **FR-003**: No DEBE preseleccionarse ninguna opción: la decisión siempre la toma el docente.
- **FR-004**: Una nota confirmada en empate sin decisión DEBE mostrar un aviso para decidir, sin cambiar la nota exacta.
- **FR-005**: `formatGradeScore` DEBE aceptar la decisión y presentar la cifra decidida.
- **FR-006**: Las pantallas que reciben la decisión (`redondeo_empate`, `mi_redondeo_empate`) DEBEN usarla.
- **FR-007**: La lista de estudiantes de la revisión DEBE mostrar la cifra decidida. Si su respuesta no trae la decisión, se añade como un campo opcional; ese sería el único cambio de backend.
- **FR-008**: Las notas sin empate DEBEN comportarse exactamente igual que hoy.
- **FR-009**: DEBEN existir pruebas de regresión que fallen con el código anterior.

### Entidades clave

Ninguna nueva. Usa la decisión de empate de la Spec 147. Sin migraciones.

### Fuera de alcance

- Decidir varios empates a la vez desde el lote.
- Cambiar la regla, el umbral o los promedios del curso.
- Modificar notas o decisiones existentes en producción.

## Criterios de éxito

- **SC-001**: Un docente puede confirmar y publicar una nota de 2.95 sin ver un mensaje de rechazo.
- **SC-002**: Para una misma nota decidida, todas las pantallas de esta spec muestran la misma cifra.
- **SC-003**: Las pruebas actuales de notas sin empate siguen en verde.
