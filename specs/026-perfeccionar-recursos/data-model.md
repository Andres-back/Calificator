# Modelo de contenido: recursos pedagógicos

No se crean tablas ni columnas. La evolución amplía de forma compatible el contenido estructurado de `Material`.

## Formato de recurso

- `tipo`: identificador estable del formato.
- `nombre_visible`: nombre presentado en el catálogo.
- `creacion_habilitada`: indica si puede iniciarse un material nuevo.
- `tipo_canonico`: destino de una intención histórica equivalente.
- `secciones_obligatorias`: contrato usado para validar generaciones nuevas.
- `admite_soluciones`: determina si existen versiones docente y estudiante.

### Reglas

- `unir_columnas` conserva lectura histórica y tiene `emparejar` como tipo canónico.
- `ficha` conserva lectura histórica y `taller` cubre las nuevas hojas de ejercicios.
- Un formato deshabilitado para creación no se elimina ni se transforma automáticamente.

## Guía de aprendizaje

- `titulo`
- `objetivos[]`
- `saberes_previos[]`
- `introduccion`
- `secciones[]`
  - `titulo`
  - `explicacion`
  - `ejemplo_guiado`
  - `actividades[]`
  - `verificacion`
- `cierre`
- `evaluacion_formativa[]`

### Validación

- Debe existir al menos un objetivo y dos secciones.
- Cada sección debe tener explicación y al menos una actividad.
- Debe existir cierre o evaluación formativa.

## Lectura comprensiva

- `titulo`
- `instrucciones`
- `texto`
- `fuente` opcional
- `preguntas[]`
  - `numero`
  - `tipo`: literal, inferencial, crítica o vocabulario
  - `enunciado`
  - `respuesta_esperada`
  - `evidencia_textual`
  - `justificacion`
  - `dificultad`
- `estrategia_lectora`

### Validación

- El texto no puede estar vacío.
- La cantidad de preguntas debe coincidir con la solicitada.
- Cada pregunta debe tener respuesta y evidencia o justificación.
- Toda lectura incluye preguntas literales e inferenciales; desde 3 preguntas incluye vocabulario y desde 4 incluye crítica. Las restantes se distribuyen equilibradamente.

## Taller

- `titulo`
- `objetivo`
- `instrucciones`
- `puntos[]`
  - `numero`
  - `tipo`
  - `enunciado`
  - `dificultad`
  - `puntaje`
  - `opciones[]` opcional
  - `respuesta_esperada` opcional
  - `criterio_logro` opcional
  - `lineas_respuesta`
- `puntaje_total`
- `criterios_revision[]`

### Validación

- La cantidad de puntos debe coincidir con la solicitada.
- Cada punto debe tener puntaje y una respuesta esperada o criterio de logro.
- La suma de puntajes debe corresponder al total declarado.

## Plan de refuerzo

- `estudiante`
- `diagnostico_inicial`
- `dificultades[]`
- `fortalezas[]`
- `objetivo_general`
- `duracion_estimada`
- `semanas[]` (nombre persistido compatible; cada entrada representa una sesión de trabajo)
  - `numero`
  - `tema`
  - `meta`
  - `actividades[]`
  - `recursos[]`
  - `evidencia`
  - `responsable`
- `estrategias_apoyo[]`
- `indicadores_mejora[]`
- `comprobacion_final`
- `recomendaciones_familia[]`

### Validación

- Debe existir diagnóstico, objetivo, al menos dos entradas en `semanas`, indicadores y comprobación final.
- Cada entrada de `semanas` debe funcionar como una sesión y producir una evidencia observable.
- Si no hay calificación inicial, el diagnóstico declara que requiere comprobación docente.

## Transiciones

La evolución no modifica las transiciones actuales: borrador → apoyo o actividad; visible ↔ oculto; entregas abiertas ↔ cerradas para actividades.
