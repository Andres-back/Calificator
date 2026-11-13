# Especificación: Identidad visual — isotipo legible, iconos ilustrados en la revisión y páginas de error

**Rama**: `codex/177-identidad-visual` | **Creada**: 2026-11-12 | **Estado**: Aprobada e implementada | **Issue**: [#374](https://github.com/Andres-back/Calificator/issues/374)

**Entrada**: el usuario pidió mejorar la imagen visual del frontend en general, usando la capacidad de ChatGPT de generar imágenes desde la línea de comandos, con permiso abierto para la interfaz.

## Evidencia

Capturas de 13 pantallas de la aplicación local el 2026-11-12, a 1440 y 390 px.

| Pantalla | Qué se ve |
| --- | --- |
| Menú lateral, portada, inicio de sesión, registro | El logotipo con texto, encogido a un cuadro de 40 a 64 px, junto al nombre «XCalificator» ya escrito. No se lee. Existe un isotipo de la marca que no se usa. |
| Resumen de una calificación | Las cuatro opciones de «¿Qué quieres revisar?» llevan iconos de línea de 20 px. El menú, las materias y los reportes usan iconos ilustrados de la marca. |
| Página no encontrada y acceso denegado | Un icono de línea sobre un cuadro de color. |
| Resto de pantallas | Ya usan la identidad ilustrada: no se tocan. |

## Escenarios de usuario y pruebas

### Historia 1 - La marca se reconoce (Prioridad: P1)

**Aceptación**:
1. **Dado** el menú lateral, la portada, el inicio de sesión o el registro, **cuando** los abro, **entonces** veo el isotipo de la marca, nítido a su tamaño.

### Historia 2 - La revisión habla el mismo idioma visual (Prioridad: P2)

**Aceptación**:
1. **Dado** el resumen de una calificación, **cuando** leo «¿Qué quieres revisar?», **entonces** cada opción lleva un icono ilustrado del estilo de la marca.
2. **Dado** que un icono no carga, **cuando** se muestra la opción, **entonces** aparece su icono de línea de respaldo.

### Historia 3 - Los errores no asustan (Prioridad: P3)

**Aceptación**:
1. **Dada** una dirección que no existe o una sección sin permiso, **cuando** llego a ella, **entonces** veo una ilustración de la mascota, el mismo mensaje y las mismas acciones.

### Casos límite

- Las imágenes nuevas son decorativas: texto alternativo vacío y ningún mensaje depende de ellas.
- Se ven bien sobre fondo claro y oscuro.
- Ninguna supera 60 KB.

## Requisitos

### Requisitos funcionales

- **FR-001**: El menú lateral, la portada, el inicio de sesión y el registro DEBEN mostrar el isotipo de la marca en lugar del logotipo con texto encogido.
- **FR-002**: Las cuatro opciones de la revisión DEBEN usar iconos ilustrados servidos por `EducationalIcon`, con su respaldo de línea.
- **FR-003**: Las páginas «Página no encontrada» y «Acceso denegado» DEBEN mostrar una ilustración decorativa y conservar título, texto y acciones.
- **FR-004**: Cada imagen nueva DEBE tener fondo transparente, verse sobre claro y oscuro, y pesar menos de 60 KB.

## Criterios de éxito

- **SC-001**: Las cinco imágenes nuevas suman menos de 200 KB.
- **SC-002**: Las pruebas existentes de las pantallas tocadas siguen pasando.
