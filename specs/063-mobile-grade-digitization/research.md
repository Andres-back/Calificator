# Investigación

## Hallazgo móvil

El término crudo del input forma parte de `['evaluation-review', evalId, filtro, searchTerm]`. React Query inicia una consulta por cada carácter y el listado entra repetidamente en transición. El cargador de evidencias, por separado, presenta todos los alumnos en un `select` nativo.

**Decisión**: diferir únicamente el término enviado al servidor durante 300 ms, conservar el valor visual instantáneo y ofrecer búsqueda local en el cargador, cuya matrícula ya está cargada completa.

## Hallazgo de digitalización

La extracción visual marca manuscritos con `[RESPUESTA DEL ESTUDIANTE: ...]`, pero las fases posteriores reciben el texto completo. El caso productivo confirmado tiene enunciado `270 × 67` y clave persistida `18.760`, equivalente a una lectura errónea `280 × 67`; la respuesta correcta es `18.090`.

**Decisión**: usar defensa en profundidad. Primero se eliminan etiquetas de estudiante del texto que alimenta la estructura. Después, la clave se contrasta con el enunciado normalizado definitivo. Una corrección se registra como advertencia para el docente.

## Alternativas descartadas

- **Filtrar solo la página ya cargada**: perdería estudiantes de otras páginas.
- **Exigir una evaluación limpia**: no responde al uso real de fotografiar hojas ya contestadas.
- **Reprocesar evaluaciones existentes**: podría alterar calificaciones publicadas y contradice la evolución segura.
- **Confiar solo en el prompt**: el incidente demuestra que una instrucción textual no es una garantía suficiente.
