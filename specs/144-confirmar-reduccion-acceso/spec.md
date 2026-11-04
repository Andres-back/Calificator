# Especificación: Confirmar la reducción de acceso por encima del editor de usuarios

**Rama**: `codex/144-confirmar-reduccion-acceso` | **Creada**: 2026-11-04 | **Estado**: Aprobada (hotfix) | **Issue**: [#306](https://github.com/Andres-back/Calificator/issues/306)

**Entrada**: hallazgo A6 de la revisión del frontend de `main` @ `ef35597` (2026-11-04). En Administración › Usuarios, al reducir el acceso de un usuario desde el editor, la confirmación "Confirmar reducción de acceso" se abre debajo del editor: el administrador no la ve y no puede aplicar el cambio. El usuario aprobó expresamente esta corrección en el chat de revisión.

## Escenarios de usuario y pruebas

### Historia 1 - Confirmar una reducción de acceso (Prioridad: P1)

Como administrador, quiero ver y responder la confirmación cuando desactivo a un usuario, le bajo el perfil o le retiro el rol personalizado, para aplicar el cambio sabiendo que puede quitarle acceso.

**Razón de prioridad**: hoy el flujo queda bloqueado. "Guardar usuario" no muestra nada visible, porque la confirmación queda tapada por el editor, y el editor conserva el foco y la tecla Escape.

**Prueba independiente**: en un navegador real, a 384 px y a 1440 px, en modo claro y oscuro, el botón "Aplicar cambio" es el elemento que recibe el toque en su posición, y el foco está dentro de la confirmación.

**Aceptación**:
1. **Dado** el editor abierto con un cambio que reduce el acceso, **cuando** el administrador pulsa "Guardar usuario", **entonces** la confirmación aparece encima del editor y recibe el foco.
2. **Dado** la confirmación visible, **cuando** el administrador pulsa Escape o "Cancelar", **entonces** solo se cierra la confirmación, el editor conserva lo escrito y no se envía ningún cambio.
3. **Dado** la confirmación visible, **cuando** el administrador pulsa "Aplicar cambio", **entonces** se guarda el usuario y se cierran la confirmación y el editor.

### Casos límite

- Un cambio que no reduce el acceso se guarda sin confirmación, como hasta ahora.
- La confirmación de eliminar o desactivar cuenta ya estaba después del editor y no cambia.
- Si el guardado falla, el editor y lo escrito se conservan, igual que antes del hotfix.

## Requisitos

### Requisitos funcionales

- **FR-001**: Cuando se abre sobre el editor, la confirmación de reducción de acceso DEBE ser el diálogo modal superior: visible, con el foco y con Escape.
- **FR-002**: Cancelar la confirmación DEBE cerrar solo la confirmación, conservar los valores del editor y no enviar cambios.
- **FR-003**: Confirmar DEBE aplicar el cambio con los mismos datos de antes del hotfix y cerrar ambos diálogos.
- **FR-004**: DEBE existir una prueba de regresión que falle con el orden anterior, tanto en jsdom (orden de diálogos y foco) como en un navegador real (elemento que recibe el toque).

### Entidades clave

- **Usuario administrado**: perfil, estado y rol personalizado. Sin cambios de datos ni de contrato.

## Criterios de éxito

- **SC-001**: En las cuatro combinaciones (384 px y 1440 px, claro y oscuro), "Aplicar cambio" recibe el toque en su posición y el foco está en la confirmación.
- **SC-002**: La prueba de regresión falla con el código anterior y pasa con el corregido.

## Supuestos

- Es un hotfix limitado a `AdminUsersPage`. Cambiar el primitivo `Modal` para que use portal y una pila de diálogos (hallazgo M14) queda fuera de alcance, para no afectar las demás pantallas sin su propia especificación.
- Los otros cuatro archivos que renderizan un `ConfirmDialog` antes que un `Modal` (`CalificacionesWorkspace`, `ResolverEvaluacionPage`, `herramientas/DetailPage`, `MateriaVistaGeneral`) no abren ambos diálogos a la vez, así que no presentan el fallo.
- Sin cambios de backend, permisos, datos ni textos.

## Añade, reutiliza y retira

| Área | Qué añade | Qué reutiliza | Qué texto o control retira/reubica |
| --- | --- | --- | --- |
| Admin › Usuarios | Pruebas de regresión unitaria y E2E | `ConfirmDialog`, `Modal` y la mutación `update` existentes | Reubica el `ConfirmDialog` de reducción de acceso después del `Modal` editor. No retira textos ni controles. |

## Evidencia visual requerida

No se requiere maqueta, porque el hotfix no cambia la jerarquía ni el diseño: solo restaura el orden de apilamiento previsto. Capturas reales de la implementación, con datos sintéticos, en `visual/`:

- `confirmacion-384-light-chromium.png`
- `confirmacion-384-dark-chromium.png`
- `confirmacion-1440-light-chromium.png`
- `confirmacion-1440-dark-chromium.png`
