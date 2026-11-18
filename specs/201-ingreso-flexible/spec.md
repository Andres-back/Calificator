# Especificación: Llenar campos sin digitar, desde una foto o un archivo

**Rama**: `codex/201-ingreso-flexible` | **Creada**: 2026-11-17 | **Estado**: Aprobada e implementada | **Issue**: [#422](https://github.com/Andres-back/Calificator/issues/422)

**Entrada**: al hacer una evaluación manual, el usuario quiso añadir el texto de referencia y no pudo tomarle foto; tuvo que digitarlo. Pidió que sea fácil en todos los campos: tomar foto, subir archivo o pegar texto, aceptando variedad de formatos (tablas de Excel, Word, PDF, fotos).

## Escenarios de usuario y pruebas

### Historia 1 - La lectura entra con una foto (Prioridad: P1)

**Aceptación**:
1. **Dado** el campo «Lectura o texto de apoyo», **cuando** el docente toma una foto de la lectura, **entonces** el campo queda con el texto completo, listo para revisar.
2. **Dado** un campo que ya tiene texto, **entonces** el texto leído se añade debajo, sin borrar nada.

### Historia 2 - Cualquier formato común sirve (Prioridad: P1)

**Aceptación**:
1. **Dado** un Word, **entonces** se obtienen sus párrafos y tablas en orden.
2. **Dado** un Excel o un CSV, **entonces** se obtiene una fila por línea, con las celdas separadas.
3. **Dado** un PDF con texto, **entonces** se lee sin usar IA; **dado** un PDF escaneado, **entonces** se lee hoja por hoja.

### Historia 3 - Los errores se entienden (Prioridad: P2)

**Aceptación**:
1. **Dado** un tipo de archivo que no se puede leer, **entonces** el mensaje dice qué formatos sirven.
2. **Dada** una foto sin texto legible, **entonces** el campo no cambia y se sugiere otra foto o pegar el texto.

### Casos límite

- Archivo de más de 20 MB: no se envía.
- PDF escaneado de más de 6 hojas: se leen las primeras 6 y se avisa.
- La extensión no coincide con el contenido: manda el contenido.
- Si falla una hoja de un PDF escaneado, se conservan las demás.
- El archivo no se guarda en el servidor.

## Requisitos

### Requisitos funcionales

- **FR-001**: DEBE existir un punto de acceso que reciba un archivo y devuelva su texto, su origen y advertencias, sin guardar el archivo ni modificar datos, solo para docentes y administradores.
- **FR-002**: DEBE leer fotos JPG, PNG y WEBP con transcripción literal; PDF con texto o escaneado; Word; Excel; CSV y texto plano, identificando el tipo por su contenido.
- **FR-003**: Word DEBE conservar párrafos y tablas en orden; Excel y CSV DEBEN entregar una fila por línea.
- **FR-004**: Los tipos no admitidos, los archivos vacíos o dañados y los que superan 20 MB DEBEN rechazarse con un mensaje claro.
- **FR-005**: DEBE existir un componente reutilizable con «Tomar foto» y «Subir archivo» que entregue el texto al campo y recuerde que también se puede pegar.
- **FR-006**: El texto leído DEBE añadirse al campo sin borrar lo ya escrito.
- **FR-007**: El campo de lectura de la evaluación, en edición simple y por secciones, DEBE ofrecer ese componente.

## Criterios de éxito

- **SC-001**: Una foto de un texto impreso llena el campo de lectura en menos de 10 segundos en la prueba real.
- **SC-002**: Las pruebas de evaluaciones siguen pasando.
