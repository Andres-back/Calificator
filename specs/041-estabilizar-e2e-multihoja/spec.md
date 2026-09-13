# Hotfix: Estabilización del E2E de carga multihoja

**Rama**: `codex/041-estabilizar-e2e-multihoja` | **Creada**: 2026-09-13 | **Estado**: Hotfix aprobado | **Issue**: [#84](https://github.com/Andres-back/Calificator/issues/84)

## Impacto y reproducción

El escenario E2E que comprueba dos entregas consecutivas reutiliza el mismo payload de archivo para ambos estudiantes. En Chromium sobre Linux, la segunda selección puede no producir un cambio observable después de que React limpia y vuelve a renderizar el selector. El botón «Enviar a calificar» permanece deshabilitado hasta agotar los 30 segundos del caso, aunque el flujo productivo, las pruebas unitarias y los otros 61 E2E funcionan.

La incidencia se reprodujo dos veces en el CI de `main` del commit `7ac3ed7`, mientras el mismo caso pasó de forma aislada localmente y la suite completa pasó en el PR #83.

## Historia de usuario y prueba

### Historia 1 - CI reproducible para entregas consecutivas (Prioridad: P1)

Como responsable de mantenimiento, necesito que el escenario automatizado represente dos archivos distintos y espere la precondición visible antes de enviar, para distinguir una regresión real de una selección sintética no observable.

**Prueba independiente**: ejecutar el caso «dos paquetes quedan en cola, un fallo conserva hojas para reintentar» y comprobar que el segundo archivo habilita el botón antes de continuar.

**Aceptación**:

1. **Dado** que el primer estudiante ya tiene un paquete en cola, **cuando** se selecciona otro estudiante y un archivo inequívocamente nuevo, **entonces** el test espera que «Enviar a calificar» esté habilitado antes de pulsarlo.
2. **Dado** un fallo controlado de la segunda subida, **cuando** se reintenta, **entonces** las hojas se conservan y el paquete termina en cola para el estudiante correcto.
3. **Dado** este hotfix, **cuando** se revisa el código productivo, **entonces** no existen cambios en componentes, API, backend, rutas ni contratos de calificación.

## Causa

El test volvía a asignar el mismo descriptor en memoria (`name`, contenido y metadatos) al mismo `input[type=file]` después de que el primer envío vaciara el estado. La automatización dependía de que Chromium generara nuevamente el evento de cambio. Esa precondición no era determinista en el runner Linux y el clic posterior ocultaba el origen al esperar durante todo el timeout sobre un botón deshabilitado.

## Requisitos funcionales

- **FR-001**: El escenario DEBE usar un archivo distinto para la segunda entrega, igual que dos evidencias reales de estudiantes diferentes.
- **FR-002**: El escenario DEBE comprobar explícitamente que el botón de envío está habilitado después de seleccionar la segunda evidencia.
- **FR-003**: El escenario DEBE conservar la validación del fallo controlado, el reintento, los propietarios y los dos trabajos persistidos localmente.
- **FR-004**: El hotfix NO DEBE cambiar código productivo, contratos HTTP, estados de calificación, datos ni proveedores de IA.
- **FR-005**: La prueba específica y la suite frontend aplicable DEBEN pasar antes de fusionar.

## Criterios de éxito

- **SC-001**: El caso específico pasa localmente de forma repetida.
- **SC-002**: El CI del PR termina con los 62 E2E aprobados.
- **SC-003**: El diff funcional se limita a la prueba de regresión y a sus artefactos de trazabilidad.

## Supuestos

- La incidencia está en la precondición sintética del test, no en el selector usado por personas; las pruebas unitarias del selector ya comprueban añadir, ordenar, rotar, eliminar y volver a tomar fotos.
- La aprobación explícita y continuada del usuario en esta conversación corresponde a la aprobación humana registrada con `spec-approved` en el issue #84.

