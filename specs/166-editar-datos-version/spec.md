# Especificación: «Editar datos» funciona después de repartir puntos, imprimir o copiar

**Rama**: `codex/166-editar-datos-version` | **Creada**: 2026-11-11 | **Estado**: Implementada como hotfix; falta que el usuario registre `spec-approved` | **Issue**: [#350](https://github.com/Andres-back/Calificator/issues/350)

**Entrada**: la auditoría funcional del 2026-11-10 guardó el reparto de puntos de una evaluación y después abrió «Editar datos» en la materia. Guardar, incluso sin cambiar nada, respondió «La evaluación cambió. Conservamos tu edición; vuelve a abrir la versión actual antes de guardar». Volver a abrirla no lo resolvió.

## Escenarios de usuario y pruebas

### Historia 1 - Cambiar nombre, fecha o modalidad de una evaluación con versión (Prioridad: P1)

Como docente, quiero editar los datos de una evaluación a la que ya le repartí puntos, preparé la impresión o copié, para corregir el nombre o la fecha límite sin quedar bloqueada.

**Prueba independiente**: al guardar «Editar datos» de una evaluación con `contenido_version_id`, la petición incluye `expected_updated_at` y `expected_content_version_id` con los valores de la evaluación abierta.

### Historia 2 - Un cambio hecho en otra pestaña sigue avisando (Prioridad: P2)

Como docente, quiero que el aviso de «la evaluación cambió» aparezca solo cuando de verdad cambió en otro lugar, para no perder una edición más reciente.

**Prueba independiente**: si el backend responde 409, el formulario sigue abierto con lo escrito y muestra el mensaje del backend.

### Casos límite

- Una evaluación sin versión de contenido se guarda como hoy.
- La página general de evaluaciones, el editor de criterios, el panel de impresión y el asistente no cambian: ya envían la versión.
- Después de guardar, la lista se actualiza y una segunda edición usa la versión nueva.

## Requisitos

### Requisitos funcionales

- **FR-001**: «Editar datos» de la materia DEBE enviar `expected_updated_at` con la fecha de actualización de la evaluación que se abrió.
- **FR-002**: «Editar datos» de la materia DEBE enviar `expected_content_version_id` cuando la evaluación tiene versión de contenido.
- **FR-003**: Un rechazo del backend DEBE conservar el formulario abierto con los valores escritos.
- **FR-004**: DEBE existir una prueba de regresión que falle con el código anterior.

### Entidades clave

- **Evaluación** y **versión de contenido**: sin cambios de esquema ni de backend.

## Criterios de éxito

- **SC-001**: La secuencia repartir puntos, «Editar datos» y guardar termina con «Evaluación actualizada», comprobada con una prueba de componente y en el navegador.
- **SC-002**: No se modifica ninguna fila de producción para aplicar la corrección.
