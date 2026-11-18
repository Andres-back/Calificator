# Especificación: Toda tarea de IA obedece al panel de administración

**Rama**: `codex/204-ia-obedece-panel` | **Creada**: 2026-11-18 | **Estado**: Aprobada e implementada | **Issue**: [#428](https://github.com/Andres-back/Calificator/issues/428)

**Entrada**: el usuario indicó que la IA y los proveedores se controlan desde el panel de administración, que allí ya no figura el modelo retirado y pidió revisar que el sistema tome esa configuración y «se actualice todo».

## Hallazgo

Una sonda en producción, sin llamar a ningún modelo, mostró que todas las etapas del panel se obedecen. Fuera del panel quedaban:

- dos tareas que resolvían una ruta sembrada que el panel no muestra (`grading_photo`, del calificador de respaldo, y `presentacion` cuando no hay configuración capturada);
- cuatro rutas sembradas (`calificacion_foto`, `calificacion_texto`, `evaluacion_digitalizar`, `presentaciones`) que conservaban un modelo que el proveedor ya no incluye;
- ninguna barrera para que una tarea nueva sin ruta acabe en el modelo por defecto del proveedor y en la plantilla local sin avisar (pasó con las sugerencias de criterios, corregidas en la Spec 203).

## Escenarios de usuario y pruebas

### Historia 1 - Lo publicado es lo que corre (Prioridad: P1)

**Aceptación**:
1. **Dada** la configuración publicada, **cuando** el calificador de respaldo o una presentación sin configuración capturada piden un modelo, **entonces** usan la etapa correspondiente del panel.
2. **Dada** una publicación desde el panel, **entonces** las rutas sembradas quedan con el mismo proveedor y modelo que su etapa.

### Historia 2 - No vuelve a pasar (Prioridad: P1)

**Aceptación**:
1. **Dada** una tarea de texto nueva sin etapa ni alias, **entonces** la prueba de gobernanza falla y dice cuál es.
2. **Dada** una función que no resuelve ninguna ruta guardada, **entonces** queda constancia en los registros.

### Casos límite

- Instalación sin la fila de una etapa: la etapa sigue heredando de su ruta sembrada.
- Lista guardada sin la etapa de una ruta sembrada: esa ruta se conserva tal cual.
- La etiqueta, el permiso de claves personales y los límites de la ruta sembrada no se copian de la etapa.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las tareas `grading_photo`, `grading_text` y `grading` DEBEN resolver primero `calificacion.valoracion`.
- **FR-002**: La tarea `presentacion` DEBE resolver primero `presentaciones.contenido`.
- **FR-003**: Al guardar rutas o publicar la configuración, cada ruta sembrada DEBE quedar con el proveedor principal, el modelo principal, el respaldo, el modelo de respaldo y el estado de su etapa del panel, si esa etapa está en la lista.
- **FR-004**: Una función que no resuelve ninguna ruta guardada DEBE dejar una advertencia en los registros con su nombre.
- **FR-005**: Una prueba DEBE recorrer el código y exigir que toda tarea de texto escrita en él resuelva una ruta editable desde el panel.
- **FR-006**: Las etapas del panel DEBEN seguir heredando de su ruta sembrada cuando no tienen fila propia.

## Criterios de éxito

- **SC-001**: Con la configuración de producción, la sonda no muestra ninguna tarea de texto usada por el código que resuelva una ruta fuera del panel.
- **SC-002**: La suite del servidor sigue pasando.
