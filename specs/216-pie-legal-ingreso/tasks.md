# Tareas: En «Ingresar», el pie legal no queda encima de la tarjeta

**Entrada**: [spec.md](spec.md) y [plan.md](plan.md), de #454.

### Prueba de regresión primero (RED)

- [X] T001 Prueba de regresión en `frontend/e2e/auth-navigation.spec.ts` a 320 × 568, 375 × 812 y 1280 × 600 px: el pie queda debajo de la tarjeta, el botón de tema no la toca, los cinco enlaces legales siguen y no hay desplazamiento lateral. Antes del arreglo falla en los dos tamaños de celular y pasa en computador. (FR-001, FR-002, FR-003)

### Implementación (GREEN)

- [X] T002 `LoginPage.tsx`: página en columna, contenido que ocupa el espacio disponible y pie legal después del contenido. (FR-001, FR-003)
- [X] T003 `LoginPage.tsx`: en pantallas estrechas el contenido empieza debajo del botón de tema. (FR-002)

- [X] T006 Prueba de regresión para «Crear cuenta» a 375 × 812 px y `RegisterPage.tsx`: la tarjeta empieza debajo del botón de tema. (FR-005)

### Cierre

- [X] T004 Capturas a 320, 375 y 1366 px en claro y oscuro; tipos, lint y pruebas del módulo de ingreso. Sin cambios en el servidor ni en los textos. (FR-004)
- [X] T005 Registro en `specs/README.md`, en la línea base de gobernanza y en el inventario del sistema.
