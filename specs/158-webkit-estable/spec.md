# Especificación: Las pruebas de WebKit dejan de obligar a relanzar la CI

**Rama**: `codex/158-webkit-estable` | **Creada**: 2026-11-07 | **Estado**: Aprobada | **Issue**: [#336](https://github.com/Andres-back/Calificator/issues/336)

**Entrada**: el usuario pidió "arregla las pruebas inestables de webkit".

## Evidencia

Revisé las 85 ejecuciones de CI entre el 2026-10-28 y el 2026-11-07. Solo cuento como inestables las fallas que pasaron al relanzar el mismo commit o que ocurrieron en `main`: fueron 16, todas en proyectos WebKit.

| Grupo | Veces | Error |
| --- | --- | --- |
| El navegador se cae al abrir la página | 7 | `page.goto: WebKit encountered an internal error`, cada vez en una prueba distinta |
| `regrading-score-context.spec.ts:102` | 4 | El clic en "Enviar a calificar" agota 30 s esperando que el botón quede estable |
| `evaluation-ai-wizard.spec.ts:474` | 3 | El diálogo queda con `data-writing="false"`: el modo de escritura no se activa |
| `feedback-workspace-responsive.spec.ts:150` | 1 | "Confirmar y generar 1 enlace" nunca aparece tras pulsar Enter |
| `regrading-score-context.spec.ts:52` | 1 | Agota 30 s |

## Escenarios de usuario y pruebas

### Historia 1 - Una caída del navegador no rompe la CI (Prioridad: P1)

Como responsable del repositorio, quiero que una caída de WebKit al abrir una página no obligue a relanzar 25 minutos de pruebas.

**Aceptación**:
1. **Dada** una prueba de WebKit que falla por una caída del navegador, **cuando** corre en CI, **entonces** se repite una sola vez y, si pasa, el trabajo pasa.
2. **Dada** una prueba que se repitió, **cuando** termina el trabajo, **entonces** queda listada como inestable en el resumen del trabajo, para que no se oculte.
3. **Dada** una prueba de Chromium o una ejecución local, **cuando** falla, **entonces** no se repite.

### Historia 2 - Las pruebas concretas no dependen del tiempo (Prioridad: P1)

Como responsable del repositorio, quiero que las pruebas que fallan por carreras de tiempo esperen la condición correcta en lugar de depender de la velocidad de la máquina.

**Aceptación**:
1. **Dadas** las cuatro pruebas de la tabla, **cuando** se corren repetidas en WebKit, **entonces** pasan siempre sin aumentar sus tiempos límite.
2. **Dada** la corrección de una prueba, **cuando** se revisa, **entonces** mantiene todas sus comprobaciones originales.
3. **Dada** una causa en la aplicación, no solo en la prueba, **cuando** se encuentra, **entonces** se corrige en la aplicación.

### Casos límite

- Si una prueba falla también al repetirse, el trabajo falla como hoy.
- No se suben los tiempos límite de pruebas ni de trabajos.
- No se eliminan pruebas ni comprobaciones.

## Requisitos

### Requisitos funcionales

- **FR-001**: En CI, las pruebas de los proyectos WebKit DEBEN repetirse como máximo una vez; Chromium y las ejecuciones locales no se repiten.
- **FR-002**: Las pruebas que pasaron al repetirse DEBEN aparecer en el resumen del trabajo de CI.
- **FR-003**: Las cuatro pruebas de la tabla DEBEN esperar su condición real y pasar repetidas en WebKit, sin subir tiempos límite.
- **FR-004**: Una causa encontrada en la aplicación DEBE corregirse en la aplicación, con su prueba.
- **FR-005**: NO DEBEN eliminarse pruebas ni comprobaciones.
- **FR-006**: DEBE existir una prueba de gobernanza que compruebe la regla de repetición de FR-001.

## Criterios de éxito

- **SC-001**: Las cuatro pruebas pasan 20 veces seguidas en WebKit en local o en CI.
- **SC-002**: En las siguientes ejecuciones de CI, una caída aislada del navegador ya no hace fallar el trabajo y queda visible como inestable.
