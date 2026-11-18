# Especificación: Ilustraciones para pantallas vacías y de error

**Rama**: `codex/191-ilustraciones-estados` | **Creada**: 2026-11-14 | **Estado**: Aprobada e implementada | **Issue**: [#404](https://github.com/Andres-back/Calificator/issues/404)

**Entrada**: el usuario pidió revisar que todos los flujos se vean adecuados y, si hace falta decoración, crear imágenes con GPT. En el recorrido, varias pantallas vacías mostraban solo un ícono pequeño y el error general un triángulo rojo.

## Escenarios de usuario y pruebas

### Historia 1 - Pantallas vacías con la identidad de la app (Prioridad: P1)

**Aceptación**:
1. **Dada** una sección sin contenido (presentaciones, recursos de la materia, criterios de aprendizaje o reporte de asistencia sin registros), **entonces** se ve su ilustración con Xali o el objeto de la sección, sin fondo blanco.
2. **Dado** el modo oscuro, **entonces** la ilustración se ve igual de limpia.

### Historia 2 - Un error que no asusta (Prioridad: P2)

**Aceptación**:
1. **Dada** una consulta que falla, **entonces** se ve a Xali tranquilo con el texto «Algo salió mal», el motivo y «Reintentar».

### Casos límite

- La pantalla de Xali en las imágenes generadas quedó semitransparente; se volvió opaca para que no se vea gris en modo claro.

## Requisitos

### Requisitos funcionales

- **FR-001**: Los estados vacíos de presentaciones, recursos de la materia, criterios de aprendizaje (sin criterios y sin sugerencias) y reporte de asistencia DEBEN mostrar su ilustración.
- **FR-002**: El error general (`QueryError`) DEBE mostrar la ilustración de error en lugar del triángulo, conservando el rol `alert`, el mensaje y «Reintentar».
- **FR-003**: Las ilustraciones DEBEN ser decorativas (`alt=""`), con fondo transparente y en WebP de 512 px.

## Criterios de éxito

- **SC-001**: En 390 px y en PC, las pantallas vacías listadas muestran su ilustración, en claro y oscuro.
- **SC-002**: Las pruebas existentes de componentes y módulos tocados siguen pasando.
