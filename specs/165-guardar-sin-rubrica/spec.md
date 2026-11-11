# Especificación: Guardar al reabrir una evaluación generada sin rúbrica

**Rama**: `codex/165-guardar-sin-rubrica` | **Creada**: 2026-11-11 | **Estado**: Pendiente de aprobación (hotfix) | **Issue**: [#349](https://github.com/Andres-back/Calificator/issues/349)

**Entrada**: la auditoría funcional del 2026-11-10 generó una evaluación con IA sin rúbrica, la guardó y la reabrió con «Editar preguntas». El botón «Guardar cambios» quedó deshabilitado con el aviso «Criterio 1: el peso debe ser mayor que cero», en un borrador y en una evaluación ya asignada.

## Escenarios de usuario y pruebas

### Historia 1 - Editar una evaluación generada sin rúbrica (Prioridad: P1)

Como docente, quiero reabrir una evaluación que generé con IA sin rúbrica y guardar mis cambios, para corregir preguntas sin tener que inventar pesos.

**Prueba independiente**: una evaluación cuyos criterios traen `peso_porcentaje: 0` y no tienen niveles se abre con la rúbrica apagada, y la validación del paso de revisión no devuelve error.

### Historia 2 - Las evaluaciones nuevas no guardan pesos en cero (Prioridad: P2)

Como docente, quiero que una evaluación guardada sin rúbrica no registre pesos, para que sus criterios no parezcan una rúbrica incompleta.

**Prueba independiente**: con la rúbrica apagada, los criterios que se envían al guardar no incluyen `peso_porcentaje` ni `puntaje_maximo`.

### Casos límite

- Una evaluación con rúbrica real (algún peso mayor que cero, o niveles) se sigue abriendo con la rúbrica encendida y con las validaciones actuales.
- Una evaluación guardada antes de esta corrección, con pesos en cero, se puede editar sin cambiar sus datos.
- El editor «Criterios y rúbrica» no cambia: ya valida la rúbrica solo cuando el docente la modifica.

## Requisitos

### Requisitos funcionales

- **FR-001**: Al abrir una evaluación para editarla, la rúbrica DEBE considerarse encendida solo si algún criterio tiene un peso mayor que cero o tiene niveles.
- **FR-002**: Con la rúbrica apagada, guardar NO DEBE enviar `peso_porcentaje` ni `puntaje_maximo` en los criterios.
- **FR-003**: Con la rúbrica encendida, guardar DEBE seguir enviando pesos, puntajes y niveles como hoy.
- **FR-004**: DEBE existir una prueba de regresión que falle con el código anterior.

### Entidades clave

- **Criterio de la evaluación**: sin cambios de esquema. Las evaluaciones ya guardadas no se modifican.

## Criterios de éxito

- **SC-001**: La secuencia generar sin rúbrica, guardar, reabrir y guardar de nuevo termina sin el aviso del peso, comprobada con pruebas del modelo del asistente y en el navegador.
- **SC-002**: No se modifica ninguna fila de producción para aplicar la corrección.
