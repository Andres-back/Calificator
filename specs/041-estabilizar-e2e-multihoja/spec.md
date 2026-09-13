# Hotfix: Estabilización del E2E de carga multihoja

**Rama**: `codex/041-estabilizar-e2e-multihoja` | **Creada**: 2026-09-13 | **Estado**: Implementado; fusión condicionada a CI | **Issue**: [#84](https://github.com/Andres-back/Calificator/issues/84) | **PR**: [#85](https://github.com/Andres-back/Calificator/pull/85)

## Impacto y reproducción

El escenario E2E que comprueba dos entregas consecutivas cambiaba de estudiante y cargaba inmediatamente el segundo archivo. Ese cambio actualiza el contexto en la URL y desmonta deliberadamente el panel anterior para impedir que una evidencia quede asociada al alumno equivocado. En el runner Linux, Playwright alcanzaba a cargar el archivo en el selector saliente; el panel nuevo aparecía vacío y «Enviar a calificar» permanecía deshabilitado. El flujo productivo, las pruebas unitarias y los otros 61 E2E funcionan.

La incidencia se reprodujo dos veces en el CI de `main` del commit `7ac3ed7`, mientras el mismo caso pasó de forma aislada localmente y la suite completa pasó en el PR #83.

## Historia de usuario y prueba

### Historia 1 - CI reproducible para entregas consecutivas (Prioridad: P1)

Como responsable de mantenimiento, necesito que el escenario automatizado represente dos archivos distintos y espere la precondición visible antes de enviar, para distinguir una regresión real de una selección sintética no observable.

**Prueba independiente**: ejecutar el caso «dos paquetes quedan en cola, un fallo conserva hojas para reintentar» y comprobar que el segundo archivo habilita el botón antes de continuar.

**Aceptación**:

1. **Dado** que el primer estudiante ya tiene un paquete en cola, **cuando** se selecciona otro estudiante, **entonces** el test espera que la URL cambie y que el estado del panel anterior desaparezca antes de cargar un archivo inequívocamente nuevo.
2. **Dado** un fallo controlado de la segunda subida, **cuando** se reintenta, **entonces** las hojas se conservan y el paquete termina en cola para el estudiante correcto.
3. **Dado** este hotfix, **cuando** se revisa el código productivo, **entonces** no existen cambios en componentes, API, backend, rutas ni contratos de calificación.

## Causa

El test no esperaba la navegación iniciada por `changeContext` después de seleccionar al segundo alumno. Como `GradingUploadPanel` usa el estudiante dentro de su clave de aislamiento, React reemplaza correctamente el selector. Playwright podía ejecutar `setInputFiles` sobre el nodo anterior antes del reemplazo y esa evidencia se perdía al desmontarlo. El clic posterior ocultaba el origen al esperar durante todo el timeout sobre un botón deshabilitado.

## Requisitos funcionales

- **FR-001**: El escenario DEBE esperar que el contexto de URL corresponda al segundo estudiante antes de interactuar con su selector de evidencia.
- **FR-002**: El escenario DEBE usar un archivo distinto y comprobar explícitamente que el botón de envío está habilitado después de seleccionar la segunda evidencia.
- **FR-003**: El escenario DEBE conservar la validación del fallo controlado, el reintento, los propietarios y los dos trabajos persistidos localmente.
- **FR-004**: El hotfix NO DEBE cambiar código productivo, contratos HTTP, estados de calificación, datos ni proveedores de IA.
- **FR-005**: La prueba específica y la suite frontend aplicable DEBEN pasar antes de fusionar.

## Criterios de éxito

- **SC-001**: El caso específico pasa localmente de forma repetida.
- **SC-002**: El CI del PR termina con los 62 E2E aprobados.
- **SC-003**: El diff funcional se limita a la prueba de regresión y a sus artefactos de trazabilidad.

## Supuestos

- La incidencia está en la falta de sincronización del test con la navegación y el desmontaje protector del panel, no en el selector usado por personas; las pruebas unitarias ya comprueban añadir, ordenar, rotar, eliminar y volver a tomar fotos.
- La aprobación explícita y continuada del usuario en esta conversación corresponde a la aprobación humana registrada con `spec-approved` en el issue #84.
