# Especificación: visualizar y descargar evaluaciones

**Rama**: `codex/081-evaluacion-vista-word`
**Creada**: 2026-10-04
**Estado**: Especificación y plan aprobados por el usuario («continua me gusta» y «Sí, apruebo el plan y continúa»); implementación en validación.
**Issue**: [#169](https://github.com/Andres-back/Calificator/issues/169).
**Solicitud**: El docente necesita visualizar el formato final de su evaluación sin entrar
al editor de preguntas y descargarla en Word para poder editarla o imprimirla.

## Escenarios de usuario y pruebas

### Historia 1 - Ver la evaluación sin editar (Prioridad: P1)

Desde Evaluaciones dentro de una materia, el docente elige «Visualizar» y consulta
el documento para estudiantes con su título, instrucciones, preguntas, opciones,
puntajes y espacios de respuesta. Puede hacerlo tanto en borradores como en
evaluaciones publicadas o cerradas que tenga permiso de consultar.

**Por qué esta prioridad**: Revisar el examen no debería requerir abrir el editor
ni arriesgar cambios accidentales antes de imprimirlo o entregarlo.

**Prueba independiente**: Abrir un examen guardado, revisar todos sus puntos y cerrar
la vista; comprobar que su contenido y estado continúan exactamente iguales.

**Escenarios de aceptación**:

1. Dada una evaluación con preguntas, cuando el docente pulsa «Visualizar», ve el
   formato de entrega sin respuestas correctas y sin controles de edición.
2. Dada esa vista, cuando pulsa «Descargar PDF», obtiene el mismo documento para
   estudiantes que está visualizando, con todas sus preguntas y opciones.
3. Dado un celular de 360×800 o 390×844, cuando abre y recorre la vista, puede acceder
   a todas las preguntas, cerrar y descargar sin controles superpuestos ni
   desbordamiento de la interfaz. Puede ampliar el documento si lo necesita.

### Historia 2 - Descargar Word editable (Prioridad: P1)

El docente descarga una evaluación en Word desde su visualización para ajustar
el documento o imprimirlo fuera de XCalificator.

**Por qué esta prioridad**: Necesita conservar la capacidad de editar el material
en sus herramientas habituales, sin copiar manualmente cada pregunta.

**Prueba independiente**: Descargar y abrir el documento Word de una evaluación
con selección múltiple, preguntas abiertas y texto largo; comprobar su integridad.

**Escenarios de aceptación**:

1. Dada una evaluación propia, cuando el docente descarga Word, obtiene un archivo
   `.docx` válido con título, instrucciones, preguntas, opciones y puntajes
   coherentes con la vista final; el contenido textual es editable, no una captura.
2. Dada una evaluación guardada, cuando se exporta, se usan sus preguntas actuales
   sin regenerarlas ni modificar registros, rúbricas, entregas o calificaciones.
3. Dado un fallo de descarga, se comunica el error y se permite reintentar sin
   bloquear la navegación ni duplicar la evaluación.

### Historia 3 - Consultar el solucionario docente (Prioridad: P2)

El docente propietario o administrador autorizado puede seleccionar una versión
con respuestas correctas para consultar o descargar su solucionario.

**Por qué esta prioridad**: Facilita revisar el material, separando claramente
el examen que recibe el estudiante y la guía exclusiva del docente.

**Prueba independiente**: Comparar versiones con/sin respuestas; intentar solicitar
soluciones como estudiante u otro profesor y comprobar el acceso denegado.

**Escenarios de aceptación**:

1. Al abrir «Visualizar», se selecciona por defecto la versión para estudiantes.
   El solucionario exige una elección explícita y muestra su condición de docente.
2. El solucionario muestra las respuestas esperadas guardadas y su correspondencia
   con las preguntas; si faltan, lo informa sin inventarlas ni llamar a una IA.
3. Un estudiante o docente sin autorización no obtiene respuestas privadas aunque
   solicite directamente la exportación o cambie las opciones de la dirección.

### Casos límite

- Evaluación sin preguntas: mostrar un estado claro, no un documento aparentemente completo.
- Preguntas extensas, tildes, caracteres Unicode, opciones múltiples, fórmulas y
  saltos de página: conservar el contenido y documentar cualquier limitación de edición.
- Respuestas esperadas ausentes: indicar la ausencia solo en el solucionario.
- Material asignado como evaluación: reutilizar su contenido real o informar una
  limitación específica, sin sustituirlo silenciosamente por un examen vacío.
- Sesión vencida, permisos denegados o errores de exportación: mensaje y recuperación.
- Navegador móvil sin previsualización PDF integrada: ofrecer acceso al mismo
  documento y descarga; no mostrar una vista vacía sin explicación.

## Requisitos

### Requisitos funcionales

- **FR-001**: El docente DEBE disponer de «Visualizar» en cada evaluación que pueda
  consultar desde su materia y la lista docente existente, independientemente de
  que tenga permiso para modificarla. La acción es de solo lectura.
- **FR-002**: La vista DEBE mostrar el documento final para estudiantes y permitir
  descargar ese mismo contenido como PDF, sin abrir el editor ni publicar.
- **FR-003**: El docente DEBE poder descargar un Word `.docx` válido y editable con
  las mismas preguntas, opciones, instrucciones y puntajes guardados que la vista.
- **FR-004**: Las versiones para estudiantes NO DEBEN incluir respuestas correctas,
  justificaciones privadas ni pistas derivadas del solucionario.
- **FR-005**: El solucionario DEBE ser una selección explícita, exclusiva del dueño
  docente o administrador autorizado, aplicada a visualización y exportaciones.
- **FR-006**: Abrir o exportar NO DEBE alterar estado, preguntas, respuestas, criterios,
  calificaciones, entregas o registros históricos, ni invocar IA para regenerarlos.
- **FR-007**: La interfaz DEBE funcionar en 360×800, 390×844 y escritorio, claro/oscuro,
  con controles accesibles, desplazamiento utilizable y estados de carga/error/reintento.
- **FR-008**: Las evaluaciones anteriores y de origen material DEBEN seguir accesibles;
  la edición, publicación, recepción, resolución estudiantil y calificación existentes
  mantienen su comportamiento y sus autorizaciones.

### Entidades clave

- **Evaluación guardada**: título, descripción/instrucciones, preguntas, opciones,
  puntajes, respuestas esperadas, propietario y posible material de origen.
- **Documento de evaluación**: representación de solo lectura de esa evaluación;
  versión para estudiantes o solucionario autorizado. No es una evaluación nueva.

## Criterios de éxito

### Resultados medibles

- **SC-001**: Desde la lista, visualizar requiere una acción y descargar Word desde
  la vista requiere una acción adicional, sin pasar por la edición.
- **SC-002**: Las pruebas representativas conservan el 100 % de las preguntas,
  opciones y puntajes tanto en la vista final como en el documento Word.
- **SC-003**: Ninguna consulta o exportación cambia los registros educativos; ningún
  estudiante ni docente ajeno obtiene solucionarios en las pruebas de autorización.
- **SC-004**: En las dos dimensiones móviles definidas se puede recorrer, cerrar y
  descargar sin solapamiento de controles ni desbordamiento horizontal de la interfaz.

## Supuestos

- La vista final se corresponde con el documento para imprimir, no con el reproductor
  interactivo de resolución en línea; ambos usan las mismas preguntas guardadas.
- Word se edita fuera del sistema. Importar nuevamente los cambios de Word queda
  fuera de esta mejora y no se promete sincronización automática.
- Se reutilizan permisos y evaluaciones existentes. No se añaden datos estudiantiles
  a los documentos ni se crean tablas, notas o nuevas llamadas a modelos.
- La selección de respuestas es docente; no se amplía el acceso del estudiante
  a borradores, solucionarios o evaluaciones de otras materias.
- Alcance y plan aprobados por el usuario. El despliegue continúa sujeto a PR/CI
  y autorización de entrega conforme a la constitución.
