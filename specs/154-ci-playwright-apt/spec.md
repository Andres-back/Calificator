# Especificación: Un mirror lento de Ubuntu no agota la CI de frontend

**Rama**: `codex/154-ci-playwright-apt` | **Creada**: 2026-11-06 | **Estado**: Pendiente de aprobación | **Issue**: [#325](https://github.com/Andres-back/Calificator/issues/325)

**Entrada**: el paso `npx playwright install --with-deps chromium webkit` agotó tres veces el tiempo de trabajos de frontend en CI. El usuario pidió corregirlo.

## Escenarios de usuario y pruebas

### Historia 1 - Menos reintentos manuales (Prioridad: P1)

Como responsable del repositorio, quiero que la instalación no dependa del mirror de Ubuntu en cada trabajo, para no repetir una CI de 40 minutos por un fallo ajeno al código.

**Prueba independiente**: con la caché creada, el registro del paso descarga muy poco desde el mirror y los paquetes se restauran desde la caché.

### Historia 2 - Fallar rápido (Prioridad: P1)

Como responsable del repositorio, quiero que una instalación lenta falle en minutos y muestre su causa, para no confundirla con un fallo de las pruebas.

**Prueba independiente**: el paso tiene un límite propio que, sumado al de las pruebas, no supera el límite del trabajo.

### Casos límite

- Sin caché, por ejemplo la primera vez, la instalación funciona como antes, con el nuevo límite de tiempo.
- Si Playwright pide paquetes nuevos, `apt` solo descarga lo que falta y la caché parcial sigue siendo útil.
- Una caché obsoleta no instala versiones viejas: `apt` decide la versión y solo aprovecha el archivo si coincide.
- Las pruebas E2E, sus límites y sus requisitos de aprobación no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: Los dos trabajos que instalan Playwright DEBEN restaurar los paquetes `.deb` desde la caché antes de instalar.
- **FR-002**: El paso de instalación DEBE tener un límite propio de 5 minutos o menos.
- **FR-003**: El límite de instalación más el de las pruebas NO DEBE superar el límite del trabajo.
- **FR-004**: Una instalación fallida DEBE hacer fallar el trabajo; no se oculta con `continue-on-error`.
- **FR-005**: DEBE existir una prueba de gobernanza que falle con el flujo anterior.

### Entidades clave

- Sin datos de la aplicación. Solo cambia el flujo de CI.

## Criterios de éxito

- **SC-001**: En una ejecución con la caché creada, los trabajos que restauran la caché no descargan del mirror los paquetes ya guardados.
- **SC-002**: Una instalación lenta no puede consumir más de 5 minutos de un trabajo.
