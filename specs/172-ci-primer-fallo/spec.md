# Especificación: La CI se detiene en el primer fallo de prueba

**Rama**: `codex/172-ci-primer-fallo` | **Creada**: 2026-11-11 | **Estado**: Aprobada e implementada | **Issue**: [#364](https://github.com/Andres-back/Calificator/issues/364)

**Entrada**: el usuario pidió el 2026-11-11: «para la próxima agrega que si falla 1 prueba en ci se detenga, para analizarla y volver a enviar así si va fallando se detiene y se corrige en lugar de esperar a que acabe todo». En la ronda de seis PR de ese día, cada ejecución tardó más de 20 minutos y el motivo de un fallo solo se pudo leer al terminar todo.

## Escenarios de usuario y pruebas

### Historia 1 - Saber pronto que algo falló (Prioridad: P1)

Como quien envía un PR, quiero que la CI se detenga en cuanto falla una prueba, para leer el fallo y corregirlo sin esperar al resto de la ejecución.

**Prueba independiente**: cada conjunto de pruebas del workflow corre con su opción de corte en el primer fallo, y el trabajo que falla cancela la ejecución en su último paso.

### Historia 2 - Un tropiezo de infraestructura no tumba todo (Prioridad: P2)

Como quien envía un PR, quiero que una instalación lenta de navegadores no cancele los demás trabajos, para poder relanzar solo el que falló.

**Prueba independiente**: en los trabajos E2E, la cancelación depende de que haya fallado el paso de pruebas, no cualquier paso; y los cuatro fragmentos de la suite general siguen sin cancelarse entre sí.

### Casos límite

- La compuerta del frontend no cambia: un trabajo cancelado u omitido sigue sin contar como aprobado.
- Los diagnósticos de Playwright y la lista de pruebas repetidas se siguen publicando antes del corte.
- Los trabajos que no ejecutan pruebas (compuertas y construcción de contenedores) conservan permisos de solo lectura y no cancelan nada.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las pruebas unitarias, de integración y del conversor del backend DEBEN detenerse en su primer fallo.
- **FR-002**: Las pruebas unitarias del frontend DEBEN detenerse en su primer fallo.
- **FR-003**: Las suites E2E general y contextual DEBEN detenerse en su primer fallo.
- **FR-004**: Cuando falla un trabajo de pruebas, ese trabajo DEBE cancelar el resto de la ejecución como último paso.
- **FR-005**: En los trabajos E2E, un fallo anterior al paso de pruebas NO DEBE cancelar la ejecución, y un fragmento de la suite general NO DEBE cancelar a los otros por la estrategia de la matriz.
- **FR-006**: Solo los trabajos que cancelan DEBEN tener permiso de escritura sobre Actions; el resto conserva solo lectura.
- **FR-007**: La compuerta del frontend DEBE seguir rechazando trabajos fallidos, cancelados u omitidos.

### Entidades clave

- Ninguna. Solo cambia `.github/workflows/ci.yml` y sus pruebas de gobernanza.

## Criterios de éxito

- **SC-001**: Con una prueba rota, la ejecución termina poco después de ese fallo en vez de correr todos los trabajos.
- **SC-002**: Una ejecución sin fallos tarda lo mismo que antes y ejecuta los mismos casos.
