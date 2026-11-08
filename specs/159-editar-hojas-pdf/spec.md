# Especificación: Editar hojas también en entregas antiguas guardadas como PDF

**Rama**: `codex/159-editar-hojas-pdf` | **Creada**: 2026-11-08 | **Estado**: Pendiente de aprobación | **Issue**: [#337](https://github.com/Andres-back/Calificator/issues/337)

**Entrada**: el usuario reportó "el de editar hojas no funciona", con el aviso "No podemos editar las hojas de esta evidencia".

## Evidencia

En producción (consulta de solo lectura del 2026-11-08):

| Entregas con archivo | Registro de hojas | Formato | Cantidad | Periodo |
| --- | --- | --- | --- | --- |
| Antiguas | No | Imagen | 158 | 2026-08-10 a 2026-10-29 |
| Antiguas | No | PDF | 45 | 2026-08-10 a 2026-10-26 |
| Nuevas | Sí | Imagen | 54 | 2026-10-30 a 2026-11-06 |
| Nuevas | Sí | PDF | 16 | 2026-10-30 a 2026-11-05 |

Las 45 antiguas en PDF no se pueden editar: `read_editing_evidence` las rechaza siempre. La evaluación del reporte tiene sus 19 entregas en ese caso.

## Escenarios de usuario y pruebas

### Historia 1 - Editar las hojas de una entrega antigua en PDF (Prioridad: P1)

Como docente, quiero girar, recortar, quitar o añadir hojas en una entrega antigua guardada como PDF, igual que en una con fotos, para corregir la evidencia y volver a calificar.

**Aceptación**:
1. **Dada** una entrega antigua en PDF de hasta 10 páginas, **cuando** abro **Editar hojas**, **entonces** veo una hoja por página, en el mismo orden.
2. **Dada** esa entrega, **cuando** giro, recorto, añado o quito hojas y confirmo, **entonces** se guarda como cualquier otra edición y la entrega pasa a calificarse de nuevo.
3. **Dada** esa entrega, **cuando** abro el editor y cancelo, **entonces** el archivo, la nota y la entrega quedan exactamente como estaban.

### Casos límite

- Un PDF con más hojas que el límite, dañado o sin páginas sigue mostrando el aviso actual, que ofrece consultarla o reemplazar la entrega completa.
- Si el PDF guardado cambia mientras el editor está abierto, guardar se rechaza, como hoy.
- Las entregas con registro de hojas y las antiguas con una sola imagen no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: El editor DEBE ofrecer una hoja por página de un PDF antiguo sin registro de hojas, en orden, hasta el límite de hojas por entrega.
- **FR-002**: Cada hoja DEBE poder girarse, recortarse, quitarse o combinarse con fotos nuevas, igual que una imagen antigua.
- **FR-003**: Abrir o cancelar el editor NO DEBE modificar el archivo, la nota ni la entrega. Solo el guardado confirmado crea la nueva evidencia.
- **FR-004**: Un PDF dañado, vacío, sin páginas o por encima de los límites DEBE seguir rechazándose con el aviso actual.
- **FR-005**: La referencia y la huella de cada hoja DEBEN ser estables mientras el PDF no cambie, para que la vista previa y el guardado coincidan.

## Criterios de éxito

- **SC-001**: Una entrega antigua en PDF de varias páginas se abre en el editor, se gira una hoja y se guarda, en pruebas automáticas.
- **SC-002**: Las pruebas actuales del editor siguen pasando sin cambios en sus comprobaciones, salvo la que exigía rechazar todo PDF.
