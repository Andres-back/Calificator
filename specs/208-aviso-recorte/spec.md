# Especificación: Avisar cuando el recorte de la hoja deja fuera parte de la foto

**Rama**: `codex/208-aviso-recorte` | **Creada**: 2026-11-20 | **Estado**: Aprobada e implementada | **Issue**: [#437](https://github.com/Andres-back/Calificator/issues/437)

**Entrada**: al revisar una evaluación en producción se encontraron fotos de cuaderno recortadas a mano a una franja de lado a lado, que dejaron fuera renglones escritos. El usuario aprobó advertir al recortar.

## Hallazgo

Las fotos originales, pasadas por el detector automático de bordes, devuelven la foto completa: el detector no propone esas franjas. Las esquinas se arrastraron a mano hacia adentro desde la foto completa (todas parten exactamente de los bordes izquierdo y derecho). En una entrega solo quedó el recuadro de la primera respuesta (15 % de la foto). La IA califica solo lo que queda dentro del recorte.

## Escenarios de usuario y pruebas

### Historia 1 - No perder respuestas al recortar (Prioridad: P1)

**Aceptación**:
1. **Dado** que el docente mueve las esquinas de modo que el recorte va de un borde de la foto al otro y deja fuera una parte, **entonces** ve antes de aceptar: «Este recorte corta la foto de un borde al otro y deja fuera una parte. Comprueba que ahí no haya respuestas escritas; si dudas, usa la foto original.»
2. **Dado** el aviso, **entonces** puede aceptar igual el recorte.
3. **Dada** una hoja con sus bordes dentro de la foto, la foto completa o un recorte con un solo lado en el borde, **entonces** no hay aviso.

### Casos límite

- Al reabrir una hoja guardada con ese recorte («Editar hojas»), el aviso aparece.
- Un vértice en la esquina de la foto no cuenta como lado sobre el borde.

## Requisitos

### Requisitos funcionales

- **FR-001**: Un recorte con dos o más lados sobre el borde de la foto y que cubre menos del 97 % de ella DEBE mostrar el aviso en el editor de la hoja.
- **FR-002**: El aviso NO DEBE bloquear «Usar esta hoja» ni cambiar el recorte.
- **FR-003**: La foto completa, una hoja con los cuatro bordes dentro de la foto o un recorte con un solo lado sobre el borde NO DEBEN mostrar el aviso.
- **FR-004**: El aviso DEBE verse en el editor tanto al subir como al editar hojas guardadas, en celular y en computador.

## Criterios de éxito

- **SC-001**: En 390 px y 1280 px el aviso se ve sin desplazamiento lateral y los botones siguen visibles.
- **SC-002**: Las pruebas de evidencia siguen pasando.
