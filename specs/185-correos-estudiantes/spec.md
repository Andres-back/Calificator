# Especificación: Correos de estudiante fáciles: apellido + iniciales

**Rama**: `codex/185-correos-estudiantes` | **Creada**: 2026-11-13 | **Estado**: Aprobada e implementada | **Issue**: [#388](https://github.com/Andres-back/Calificator/issues/388)

**Entrada**: el usuario pidió correos fáciles y claros para todos los estudiantes registrados: apellido + iniciales de los nombres (o el primer nombre si solo tiene uno) `@xcalificator.com`, con un número si se repite. Ejemplo: «Daniel Felipe Mora Rosas» → `moradf@xcalificator.com`.

**Decisiones del usuario (2026-11-13)**:
- Solo cuentas creadas por la app (`email_es_interno`); quien usa su correo personal lo conserva.
- Para las cuentas existentes, una tabla para revisar antes de aplicar.
- Una vez aprobada la tabla, cuentas nuevas y existentes cambian a la vez.

Reemplaza la FR-003 de la Spec 090, que mantenía el correo de las cuentas existentes.

## Evidencia (producción, solo lectura)

| Observación | Dato |
| --- | --- |
| Formato actual | `nombre.apellido.<8 hex>@alumnos.xcalificator.daimuz.com` |
| Cuentas internas de estudiante | 589 (363 con el nombre en mayúsculas, 226 en mezcla) |
| Orden de los nombres | Mayoría con apellidos primero, también en mezcla; algunos con nombres primero. |
| Correos ya en `@xcalificator.com` | 15 (no son de estudiantes internos); se respetan. |

## Escenarios de usuario y pruebas

### Historia 1 - Cuentas nuevas con correo fácil (Prioridad: P1)

**Aceptación**:
1. **Dada** una importación de lista, **cuando** se confirman las cuentas, **entonces** cada correo es apellido + iniciales `@xcalificator.com`.
2. **Dado** un correo ocupado, **entonces** se usa el siguiente número libre: `moradf1`, `moradf2`…

### Historia 2 - Cuentas existentes con revisión previa (Prioridad: P1)

**Aceptación**:
1. **Cuando** se simula la migración, **entonces** sale una tabla con nombre, correo actual, correo propuesto, orden supuesto y si es dudoso, sin cambiar nada.
2. **Cuando** se aplica con la huella de la tabla revisada, **entonces** cambian exactamente esos correos en una transacción y queda un respaldo para revertir.
3. **Dado** que algo cambió desde la revisión, **entonces** no se aplica nada.

### Casos límite

- Tildes, ñ y símbolos se quitan; partículas («de la», «del») forman parte del apellido o del nombre.
- Un nombre sin evidencia de orden se propone con apellidos primero y se marca dudoso.
- Aplicar dos veces no cambia nada la segunda.

## Requisitos

### Requisitos funcionales

- **FR-001**: El correo DEBE ser primer apellido + iniciales de los nombres de pila, o el nombre completo si solo hay uno, en minúsculas, sin tildes, `@xcalificator.com`.
- **FR-002**: Si el correo existe en cualquier cuenta, DEBE añadirse el menor número libre; dos importaciones simultáneas no DEBEN elegir el mismo.
- **FR-003**: El orden (apellidos o nombres primero) DEBE proponerse con una lista de nombres de pila comunes y marcarse dudoso sin evidencia.
- **FR-004**: La migración DEBE limitarse a estudiantes con `email_es_interno`, simular por defecto y exigir la huella de la tabla revisada para aplicar.
- **FR-005**: Aplicar DEBE guardar el mapa anterior→nuevo y ofrecer revertir; no cambia contraseñas ni cierra sesiones.

## Criterios de éxito

- **SC-001**: «Daniel Felipe Mora Rosas» → `moradf@xcalificator.com` y «MEJIA JULIO WINDERLIS JOSAIN» → `mejiawj@xcalificator.com`.
- **SC-002**: La tabla de las 589 cuentas se revisa antes de aplicar.
