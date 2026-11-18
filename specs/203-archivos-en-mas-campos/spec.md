# Especificación: Foto o archivo también en criterios de aprendizaje e instrucciones

**Rama**: `codex/203-archivos-en-mas-campos` | **Creada**: 2026-11-18 | **Estado**: Aprobada e implementada | **Issue**: [#425](https://github.com/Andres-back/Calificator/issues/425)

**Entrada**: el usuario pidió que en todos los campos sea fácil tomar foto, subir archivo o pegar texto, con variedad de formatos, y que se busquen mejoras de ese tipo. Esta entrega continúa la Spec 201.

## Escenarios de usuario y pruebas

### Historia 1 - Criterios desde cualquier documento (Prioridad: P1)

**Aceptación**:
1. **Dada** una foto del plan de área, **cuando** el docente la sube en «Criterios de aprendizaje», **entonces** recibe sugerencias de criterios.
2. **Dado** un Excel, un CSV o un archivo de texto, **entonces** también se acepta.
3. **Dado** un archivo cuyo tipo declarado por el navegador es incorrecto, **entonces** se reconoce por su contenido.

### Historia 2 - Instrucciones sin digitar (Prioridad: P2)

**Aceptación**:
1. **Dado** el campo «Instrucciones adicionales» al crear un recurso o una presentación, **entonces** hay botones para tomar una foto o subir un archivo.
2. **Dado** un texto ya escrito, **entonces** el texto leído se añade debajo.

### Casos límite

- Texto leído muy largo: las instrucciones se limitan a 6.000 caracteres.
- Tipo no admitido en criterios: mensaje con la lista de formatos.
- Foto sin texto legible: se avisa y no se generan sugerencias.

## Requisitos

### Requisitos funcionales

- **FR-001**: La subida de criterios de aprendizaje DEBE aceptar fotos, PDF, Word, Excel, CSV y texto, reconociendo el tipo por su contenido.
- **FR-002**: Un archivo no admitido o sin texto legible DEBE rechazarse con un mensaje que diga qué formatos sirven o qué revisar.
- **FR-003**: Las instrucciones adicionales de recursos y de presentaciones DEBEN ofrecer «Tomar foto» y «Subir archivo» en versión compacta.
- **FR-004**: El texto leído DEBE añadirse sin borrar lo escrito y con un tope de 6.000 caracteres.
- **FR-005**: La pantalla de criterios DEBE nombrar los formatos aceptados en lugar de «PDF o Word».

## Criterios de éxito

- **SC-001**: Las pruebas de recursos, presentaciones, materias y captura siguen pasando.
- **SC-002**: En 390 px los botones compactos caben sin desplazamiento lateral.
