# Especificación: Ilustraciones para la portada, el inicio del docente y Crear material

**Rama**: `codex/198-recursos-visuales` | **Creada**: 2026-11-16 | **Estado**: Aprobada e implementada | **Issue**: [#415](https://github.com/Andres-back/Calificator/issues/415)

**Entrada**: el usuario pidió generar con GPT recursos para mejorar la interfaz de la página.

## Escenarios de usuario y pruebas

### Historia 1 - La portada se entiende de un vistazo (Prioridad: P1)

**Aceptación**:
1. **Dado** un visitante en la portada, **entonces** cada beneficio tiene su ilustración y la invitación a docentes muestra a un grupo de docentes trabajando con Xali.

### Historia 2 - Elegir qué crear es más fácil (Prioridad: P1)

**Aceptación**:
1. **Dado** un docente en «Crear material», **entonces** cada intención tiene un icono ilustrado que la distingue.
2. **Dado** un celular, **entonces** las intenciones se muestran compactas, con el icono a la izquierda.
3. **Dado** un recurso en generación, **entonces** la pantalla de espera muestra a Xali trabajando.

### Historia 3 - El inicio del docente tiene identidad (Prioridad: P2)

**Aceptación**:
1. **Dada** una tableta o un PC, **entonces** el saludo va acompañado de una ilustración; en celular no se muestra para no quitar espacio.

### Casos límite

- Modo oscuro: las ilustraciones no tienen fondo ni recuadro.
- Lectores de pantalla: son decorativas y no se anuncian.
- Al generar dos tandas a la vez, GPT cruzó los nombres de archivo; cada imagen se identificó por su contenido antes de usarla.

## Requisitos

### Requisitos funcionales

- **FR-001**: La portada DEBE mostrar una ilustración por beneficio y una en la invitación a docentes.
- **FR-002**: «Crear material» DEBE mostrar un icono ilustrado por intención; por debajo de `sm`, en disposición horizontal compacta.
- **FR-003**: La pantalla de espera de generación DEBE mostrar la ilustración de Xali trabajando.
- **FR-004**: El inicio del docente DEBE mostrar una ilustración junto al saludo desde `sm`.
- **FR-005**: Las ilustraciones DEBEN ser decorativas (`alt=""`), con fondo transparente, en WebP de menos de 90 KB, y DEBEN existir en `public/branding`.

## Criterios de éxito

- **SC-001**: Capturas en 390 px y 1440 px sin desplazamiento lateral ni imágenes rotas.
- **SC-002**: Las pruebas de portada, inicio y herramientas siguen pasando.
