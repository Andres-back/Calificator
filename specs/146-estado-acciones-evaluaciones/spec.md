# Especificación: Estado legible, carga por tarjeta y confirmación al publicar o cerrar evaluaciones

**Rama**: `codex/146-estado-acciones-evaluaciones` | **Creada**: 2026-11-04 | **Estado**: Aprobada (hotfix) | **Issue**: [#308](https://github.com/Andres-back/Calificator/issues/308)

**Entrada**: hallazgos 1–3 de la revisión de distribución de evaluaciones de `main` @ `8588296` (2026-11-04). El usuario aprobó en el chat empezar por estos fallos antes del rediseño ("sigue").

## Escenarios de usuario y pruebas

### Historia 1 - Entender el estado de cada evaluación (Prioridad: P1)

Como docente, quiero leer el estado de cada evaluación en español y con un color coherente, para saber de un vistazo qué está en preparación, qué está abierta y qué está por revisar.

**Razón de prioridad**: en Materia › Evaluaciones la etiqueta muestra el valor técnico ("en_calificacion", "pendiente_revision") y pinta de verde también los borradores.

**Prueba independiente**: con evaluaciones en borrador, en calificación y por revisar, la tarjeta muestra "Borrador", "En calificación" y "Por revisar", y el borrador no se pinta de verde.

**Aceptación**:
1. **Dado** una evaluación en cualquier estado, **cuando** se muestra su tarjeta, **entonces** la etiqueta usa el texto en español y el tono definidos para ese estado en toda la aplicación.

### Historia 2 - Publicar o cerrar con intención (Prioridad: P1)

Como docente, quiero confirmar antes de publicar una evaluación o de cerrar sus entregas, porque publicar la hace visible a los estudiantes y cerrar les impide entregar.

**Prueba independiente**: pulsar Publicar o Cerrar entregas abre una confirmación con el nombre de la evaluación; Cancelar no envía nada.

**Aceptación**:
1. **Dado** un borrador, **cuando** el docente pulsa "Publicar", **entonces** aparece "Publicar evaluación" con el nombre, y solo al confirmar se publica.
2. **Dado** una evaluación con entregas abiertas (en la materia), **cuando** pulsa "Cerrar entregas", **entonces** aparece "Cerrar entregas" con el nombre, y solo al confirmar se cierran.
3. **Dado** una evaluación publicada en la página general de Evaluaciones, **cuando** pulsa "Cerrar", **entonces** aparece "Cerrar evaluación" y solo al confirmar se cierra.
4. **Dado** cualquiera de esas confirmaciones, **cuando** pulsa "Cancelar" o Escape, **entonces** no se envía ningún cambio.

### Historia 3 - Ver la carga solo donde actué (Prioridad: P2)

Como docente, quiero que el indicador de carga aparezca solo en la tarjeta que publiqué o cerré, para no confundirme con las demás.

**Prueba independiente**: con dos borradores, al publicar el primero solo su botón queda ocupado (`aria-busy`); el del segundo sigue habilitado.

### Casos límite

- "Abrir entregas" no se confirma: no retira nada al estudiante. Su carga también queda limitada a la tarjeta.
- Si la acción falla, la confirmación se cierra y se muestra el error como hasta ahora.
- Un estado desconocido muestra "Estado desconocido" con tono neutro, nunca el valor técnico.

## Requisitos

### Requisitos funcionales

- **FR-001**: La tarjeta de evaluación de la materia DEBE mostrar el estado con la etiqueta en español y el tono compartidos (`ESTADO_LABEL`, `statusTone`).
- **FR-002**: "Publicar" DEBE pedir confirmación con el nombre de la evaluación antes de ejecutarse, en la materia y en la página general.
- **FR-003**: "Cerrar entregas" (materia) y "Cerrar" (página general) DEBEN pedir confirmación con el nombre y aclarar que entregas y notas se conservan.
- **FR-004**: El indicador de carga de Publicar, Cerrar, Cerrar entregas y Abrir entregas DEBE aparecer solo en la tarjeta de la evaluación afectada.
- **FR-005**: DEBE existir una prueba de regresión que falle con el código anterior.

### Entidades clave

- **Evaluación**: estado y recepción de entregas. Sin cambios de datos ni de contrato.

## Criterios de éxito

- **SC-001**: Ningún valor técnico de estado aparece en las tarjetas.
- **SC-002**: Publicar y cerrar requieren dos acciones explícitas; cancelar no llama a la API.
- **SC-003**: Las pruebas de regresión fallan con `main` @ `8588296` y pasan con la corrección.

## Supuestos

- Hotfix limitado a `MateriaEvaluaciones` y `EvaluacionesPage`. La reorganización por grupos, la jerarquía de la tarjeta, el avance por evaluación y las fechas relativas quedan para su propia especificación.
- Sin cambios de backend, permisos ni textos fuera de las confirmaciones nuevas.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Materia › Evaluaciones | Confirmaciones "Publicar evaluación" y "Cerrar entregas" | `ConfirmDialog`, `statusTone`, `ESTADO_LABEL` (movido a `evaluationStatus.ts`) | Retira la etiqueta con el valor técnico del estado. |
| Evaluaciones (página general) | Confirmaciones "Publicar evaluación" y "Cerrar evaluación" | `ConfirmDialog` y mutaciones existentes | Ninguno. |

## Evidencia visual requerida

No se requiere maqueta: el hotfix no cambia la distribución; añade diálogos con el primitivo existente y corrige textos de etiqueta.
