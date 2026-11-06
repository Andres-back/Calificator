# Especificación: El reparto de puntos no bloquea publicar ni editar

**Rama**: `codex/153-reparto-sin-bloqueo` | **Creada**: 2026-11-06 | **Estado**: Aprobada (hotfix) | **Issue**: [#323](https://github.com/Andres-back/Calificator/issues/323)

**Entrada**: en producción, el 2026-11-06, una docente digitalizó una evaluación, corrigió el reparto de puntos y no pudo publicarla. El usuario aprobó el hotfix en el chat.

## Escenarios de usuario y pruebas

### Historia 1 - Publicar después de repartir los puntos (Prioridad: P1)

Como docente, quiero publicar una evaluación sin material visual después de guardar su reparto, para no quedar bloqueada por una revisión de material que no existe.

**Prueba independiente**: una versión con `coverage_json` vacío y sin `contenido_visual` se publica y abre la recepción.

### Historia 2 - Corregir la clave después de repartir los puntos (Prioridad: P1)

Como docente, quiero editar el texto y las respuestas correctas después de guardar el reparto, para corregir la evaluación antes de publicarla.

**Prueba independiente**: una evaluación con versión, sin material ni documento, y con preguntas sin `contenido_id`, guarda una versión nueva con la clave editada.

### Casos límite

- Una versión con material sigue exigiendo cobertura `completa`, y las claves pendientes siguen impidiendo publicar.
- Una evaluación sin versiones sigue necesitando material o documento para entrar a la edición de contenido.
- Las notas y entregas existentes no cambian. Las entregas conservan la versión que ya tenían.

## Requisitos

### Requisitos funcionales

- **FR-001**: Publicar NO DEBE exigir cobertura si la versión actual no tiene material visual.
- **FR-002**: Publicar DEBE seguir rechazando una versión con material sin cobertura `completa`, o con claves pendientes de revisión.
- **FR-003**: Una evaluación con versión, sin material ni documento, DEBE poder guardar una nueva versión de texto o clave.
- **FR-004**: Esa versión nueva DEBE guardar la cobertura como `completa` y conservar `contenido_visual` nulo.
- **FR-005**: La primera versión de contenido DEBE seguir exigiendo material o documento.
- **FR-006**: DEBE existir una prueba de regresión que falle con el código anterior.

### Entidades clave

- **Versión de contenido**: sin cambios de esquema ni migraciones. Las versiones ya guardadas no se modifican.

## Criterios de éxito

- **SC-001**: La secuencia reparto, corrección de clave y publicación ya no recibe los rechazos descritos, comprobado por etapas con pruebas unitarias.
- **SC-002**: No se modifica ninguna fila de producción para aplicar la corrección.
