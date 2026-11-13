# Especificación: Al digitalizar, las instrucciones de lectura llegan al modelo

**Rama**: `codex/179-lectura-fiel-digitalizacion` | **Creada**: 2026-11-12 | **Estado**: Aprobada e implementada | **Issue**: [#378](https://github.com/Andres-back/Calificator/issues/378)

**Entrada**: el usuario pidió que la evaluación digitalizada salga casi con el mismo formato que la hoja escaneada. Al revisar el flujo se encontró que las instrucciones de lectura de la digitalización no llegan al modelo de visión: la hoja se lee con el prompt de calificar entregas. Es el primer paso de un plan por pasos (ver [plan.md](plan.md)).

## Escenarios de usuario y pruebas

### Historia 1 - La hoja se lee como una evaluación, no como una entrega (Prioridad: P1)

Como docente, quiero que al digitalizar una foto o un PDF escaneado se transcriba la hoja impresa completa y en su orden, para que el borrador se parezca a mi hoja y no tenga que rehacerlo.

**Prueba independiente**: al leer una hoja para digitalizarla, el texto que se envía al proveedor de visión contiene las reglas de digitalización (un elemento por renglón, orden de la hoja, secciones, lectura palabra por palabra, numeración impresa) y no la prioridad de buscar respuestas del estudiante.

### Historia 2 - La relectura literal pide de verdad el texto literal (Prioridad: P1)

Como docente, quiero que cuando la lectura llegó resumida, la segunda lectura de esa hoja (Spec 156) pida el texto literal, para que no dependa del azar.

**Prueba independiente**: en la relectura de una hoja, el texto enviado al proveedor contiene la instrucción de relectura literal.

### Historia 3 - Lo que marcó un estudiante no entra en la evaluación (Prioridad: P1)

Como docente, quiero que al digitalizar una hoja ya resuelta, las marcas y respuestas del estudiante no aparezcan en el borrador ni influyan en la clave.

**Prueba independiente**: una hoja leída con marcas del estudiante entrega al organizador solo el texto impreso; el bloque «EVIDENCIA GRÁFICA DEL ESTUDIANTE» no está en la transcripción, ni en una transcripción guardada antes de este cambio cuando se reutiliza.

### Casos límite

- Una digitalización en curso durante el despliegue reutiliza su transcripción guardada: el bloque del estudiante se retira al usarla.
- Varias hojas: el bloque del estudiante se retira aunque esté antes de otra hoja, sin perder esa hoja.
- La lectura que solo devuelve marcas del estudiante, sin texto impreso, no cuenta como hoja leída.
- PDF con texto seleccionable y Word no pasan por el modelo de visión: no cambian.
- Calificar entregas no cambia: mismo prompt y mismo resultado.

## Requisitos

### Requisitos funcionales

- **FR-001**: Al leer una hoja para digitalizarla (foto o PDF escaneado), las reglas de lectura de la digitalización DEBEN formar parte del texto enviado al modelo de visión.
- **FR-002**: Esas reglas DEBEN pedir la hoja impresa completa, literal y en su orden de lectura, con un elemento por renglón: título, instrucciones, título e indicación de cada sección, párrafos de la lectura, cada pregunta con su número impreso y cada opción con su letra.
- **FR-003**: El texto enviado al leer una hoja para digitalizarla NO DEBE incluir las reglas de calificar entregas (prioridad de buscar respuestas del estudiante).
- **FR-004**: La instrucción de relectura literal de la Spec 156 y el complemento de la importación visual DEBEN llegar al modelo, y DEBEN nombrar los campos que el lector interpreta (`page_text`, `answers`, `warnings`).
- **FR-005**: La transcripción que recibe el organizador DEBE contener solo lo impreso. Las marcas observadas del estudiante NO DEBEN añadirse, y DEBEN retirarse de una transcripción guardada antes de este cambio.
- **FR-006**: El texto enviado al modelo al calificar entregas NO DEBE cambiar.
- **FR-007**: DEBEN existir pruebas que sustituyan solo la llamada al proveedor, para que comprueben el texto que realmente se envía, y que fallen con el código anterior.

### Entidades clave

- **Transcripción de la hoja**: texto por hoja guardado en el trabajo de digitalización. Sin cambios de esquema ni migraciones.

## Criterios de éxito

- **SC-001**: Las reglas de digitalización están en el 100 % de las lecturas de hojas para digitalizar, comprobado con pruebas que capturan el texto enviado.
- **SC-002**: Ninguna transcripción entregada al organizador contiene el bloque de evidencia del estudiante.
- **SC-003**: Antes de fusionar, la lectura de las 3 hojas reales anonimizadas con un modelo de producción conserva la lectura completa y un elemento por renglón. Esta comprobación necesita una clave de IA válida y la hace quien fusiona (ver [quickstart.md](quickstart.md)); en esta entrega no se pudo hacer.

## Supuestos

- La organización por secciones (Spec 130) y la importación visual (Spec 113) siguen apagadas en producción; este cambio no las activa.
- El límite de salida del lector (`VISION_MAX_TOKENS`) no cambia en esta entrega.
