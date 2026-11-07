# Especificación: Preparar las fotos con el escáner al digitalizar una evaluación

**Rama**: `codex/157-escaner-digitalizar` | **Creada**: 2026-11-07 | **Estado**: Aprobada | **Issue**: [#332](https://github.com/Andres-back/Calificator/issues/332)

**Entrada**: el usuario pidió llevar el escáner de hojas que ya se usa al calificar (Spec 131) a «Digitalizar evaluación». Así, las fotos del examen se enmarcan, se enderezan y se recortan antes de enviarse. El usuario aprobó esta propuesta el 2026-11-07 con «si sigue con todas no pares hasta terminar y dejar el ci arriba».

## Evidencia

- En producción, `EVIDENCE_SCAN_ENABLED=true` para todos los docentes (`EVIDENCE_SCAN_TEACHER_IDS` vacío) y `EVIDENCE_CORNER_ASSISTANCE_ENABLED=false`.
- Al calificar, `MultiPageEvidencePicker` recibe `scanEnabled` y abre `EvidenceScanEditor`. El servidor prepara la hoja con `prepare_evidence_scan` en un proceso aislado.
- Al digitalizar, el mismo selector se usa **sin** `scanEnabled`. Las fotos llegan con la mesa y la hoja inclinada, y `_normalize_photo` solo gira, reduce y sube el contraste antes de armar el documento que se lee.

## Escenarios de usuario y pruebas

### Historia 1 - Preparar cada hoja antes de digitalizar (Prioridad: P1)

Como docente, quiero recortar y enderezar cada foto del examen antes de digitalizarlo, para que la lectura trabaje sobre la hoja y no sobre la mesa.

**Prueba independiente**: a 360 px, subir una foto sintética, prepararla con el editor real y comprobar que el envío lleva la foto original y su receta.

**Aceptación**:
1. **Dado** que el escáner está habilitado para el docente, **cuando** añade una foto en «Digitalizar evaluación», **entonces** se abre el editor «Preparar hoja» de la calificación, sin ayuda automática de esquinas.
2. **Dada** una hoja preparada y revisada, **cuando** pulsa «Digitalizar», **entonces** se envía la foto original y, a su lado, la receta (esquinas, giro y aspecto) de esa hoja.
3. **Dada** esa receta, **cuando** el servidor arma el documento, **entonces** usa la hoja recortada y derecha, tal como el docente la vio.

### Historia 2 - Conservar la foto original (Prioridad: P1)

Como docente, quiero poder usar la foto original de una hoja o de todas, para no depender del escáner.

**Aceptación**:
1. **Dada** una hoja sin revisar, **cuando** el escáner está activo, **entonces** «Digitalizar» espera a que el docente la prepare o elija «Usar original sin preparar», y se explica por qué.
2. **Dado** que el docente pulsa «Usar las fotos originales», **cuando** digitaliza, **entonces** el envío es el de hoy, sin recetas.
3. **Dado** que el escáner no está habilitado, o su consulta falla, **cuando** el docente digitaliza, **entonces** el flujo es exactamente el de hoy.

### Historia 3 - Una hoja que no se puede preparar no bloquea (Prioridad: P1)

Como docente, quiero que una hoja que no se pudo preparar se lea igual, para no repetir la digitalización.

**Aceptación**:
1. **Dada** una hoja cuya preparación falla, tarda demasiado o supera 10 MB, **cuando** se arma el documento, **entonces** se usa su foto original con el tratamiento de hoy.
2. **Dado** ese caso, **cuando** termina el envío, **entonces** el docente ve «No pudimos preparar la hoja N. Usamos su foto original.».

### Casos límite

- Recetas con otro número de hojas, esquinas inválidas, campos extra o un giro distinto al de la hoja: se rechazan con un mensaje claro y la selección se conserva.
- Recetas enviadas cuando el escáner no está habilitado para el docente: 409, igual que al calificar.
- Recetas junto a un PDF o Word: 400.
- La foto cambió de tamaño respecto de la receta: la preparación falla y se usa la original con aviso.

## Requisitos

### Requisitos funcionales

- **FR-001**: Una lectura de capacidad, sin evaluación ni estudiante, DEBE decir si el docente puede preparar fotos al digitalizar, con la misma regla `scan_enabled_for` de la calificación y sin ayuda de esquinas.
- **FR-002**: El selector de «Digitalizar evaluación» DEBE ofrecer «Preparar hoja» solo cuando esa lectura lo permita, y fijar el modo al añadir la primera foto.
- **FR-003**: El envío DEBE llevar, junto a `rotaciones`, una receta opcional por foto (`recetas`), validada con el modelo `ScanRecipe` existente y con el mismo giro de la hoja.
- **FR-004**: El servidor DEBE preparar cada hoja con receta mediante el mismo proceso aislado de la calificación (`run_page_preparation`) y usar esa copia en el documento sin otro retoque.
- **FR-005**: Si la preparación de una hoja falla, tarda más del presupuesto o la foto supera 10 MB, el servidor DEBE usar la foto original con el tratamiento de hoy y devolver un aviso por hoja, sin bloquear.
- **FR-006**: Las fuentes temporales del escáner NO DEBEN quedar guardadas después de preparar.
- **FR-007**: El docente DEBE poder usar la foto original de una hoja o de todas, y ver los avisos al terminar.
- **FR-008**: Recetas sin escáner habilitado DEBEN rechazarse con 409; recetas inválidas o con un PDF o Word, con 400.
- **FR-009**: NO DEBEN cambiar la calificación, sus recetas ni el envío de digitalización sin recetas.

### Entidades clave

- Sin tablas ni migraciones. La receta es el `ScanRecipe` de la Spec 131. Los metadatos de las hojas ganan `preparada` solo cuando se enviaron recetas.

## Criterios de éxito

- **SC-001**: A 360 px, un docente prepara una hoja con el editor real y la envía a digitalizar sin desbordes horizontales.
- **SC-002**: Ninguna hoja que falle al prepararse impide digitalizar; siempre se usa su foto original y se avisa.
- **SC-003**: Sin escáner habilitado, el envío es idéntico al de hoy.
