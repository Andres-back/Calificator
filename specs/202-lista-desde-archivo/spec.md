# Especificación: Importar la lista de estudiantes desde la galería o un archivo

**Rama**: `codex/202-lista-desde-archivo` | **Creada**: 2026-11-17 | **Estado**: Aprobada e implementada | **Issue**: [#424](https://github.com/Andres-back/Calificator/issues/424)

**Entrada**: el usuario pidió revisar, por ejemplo, la digitalización de la lista de asistencia para que también reciba una foto subida o un archivo seleccionado, y aceptar variedad de formatos (Excel, Word, PDF, fotos).

## Situación anterior

El diálogo «Importar estudiantes desde una foto» tenía una sola entrada con cámara obligatoria en el celular y solo aceptaba JPG, PNG o WEBP. El servidor rechazaba cualquier otro tipo.

## Escenarios de usuario y pruebas

### Historia 1 - Elegir cómo traer la lista (Prioridad: P1)

**Aceptación**:
1. **Dado** el diálogo en el celular, **entonces** hay dos botones: «Tomar foto» (cámara) y «Elegir foto o archivo» (galería y archivos).
2. **Dado** un archivo de Excel, Word, PDF, CSV o texto, **entonces** se acepta y se procesa.

### Historia 2 - La lista de un archivo queda limpia (Prioridad: P1)

**Aceptación**:
1. **Dado** un Excel con título, encabezados, numeración, documento y marcas de asistencia, **entonces** quedan solo los nombres, uno por fila.
2. **Dadas** columnas separadas de apellidos y nombres, **entonces** se unen como «Nombres Apellidos».
3. **Dados** nombres en mayúsculas, **entonces** se presentan con mayúscula inicial.

### Casos límite

- Nombres repetidos en el archivo: se conserva el primero.
- Más de 100 estudiantes: se toman los primeros 100, igual que con la foto.
- PDF escaneado: se leen hasta 3 hojas como fotos, sin repetir nombres entre hojas.
- Archivo sin nombres reconocibles: el lote queda en error con un mensaje que dice qué revisar.
- La revisión y confirmación posteriores no cambian.

## Requisitos

### Requisitos funcionales

- **FR-001**: El diálogo DEBE ofrecer «Tomar foto» y, aparte, «Elegir foto o archivo» sin forzar la cámara.
- **FR-002**: El servidor DEBE aceptar fotos JPG, PNG y WEBP, PDF, Word, Excel, CSV y texto, identificando el tipo por su contenido, y rechazar los demás con un mensaje que liste los formatos.
- **FR-003**: Excel, CSV, Word, texto y PDF con texto DEBEN leerse sin IA, tomando un nombre por fila e ignorando encabezados, numeración, documentos y marcas de asistencia.
- **FR-004**: Con columnas de apellidos y nombres, el nombre DEBE componerse como «Nombres Apellidos».
- **FR-005**: Un PDF sin texto DEBE leerse hoja por hoja con la lectura de fotos existente, hasta 3 hojas.
- **FR-006**: Si no se encuentran nombres, el mensaje DEBE orientar tanto para foto como para archivo.
- **FR-007**: El almacenamiento temporal privado DEBE admitir los nuevos tipos.

## Criterios de éxito

- **SC-001**: Un Excel real con apellidos y nombres en columnas separadas queda en revisión con los nombres correctos.
- **SC-002**: Las pruebas existentes de importación siguen pasando.
