# Contratos de interfaz

## Asistencia

- Entrada etiquetada «Buscar estudiante», por nombre o correo, con tipo búsqueda.
- Cantidad «X de Y estudiantes», contando coincidencias y grupo completo.
- Acción «Limpiar búsqueda» accesible cuando haya texto. Sin coincidencias: mensaje y acción para mostrar todo el grupo.
- Posición original y marcas de cada estudiante se conservan al ocultar/mostrar.
- Resumen, pendientes y guardado incluyen a todo el grupo. El botón masivo especifica «todo el grupo».
- Buscar/limpiar no hace peticiones, modifica datos guardados ni bloquea desplazamiento.

## Libro docente

- Selector etiquetado «Filtrar por evaluación». Primera opción «Todas las evaluaciones»; incluye abiertas y cerradas, excluye borradores.
- Selección individual limita notas, estados, indicadores y acciones; rótulo «Resultado de esta evaluación», no promedio global.
- Con una evaluación elegida, lista compacta del grupo completo: estudiante, nota o estado pendiente, estado de decisión y acceso contextual al detalle. «Todos» y búsqueda vacía incluyen alumnado sin nota. Resumen ampliado y textos explicativos bajo acción explícita; no tarjetas grandes por estudiante.
- «Todas» recupera el seguimiento vigente. Búsqueda y filtros de estudiantes se combinan con la selección.
- Selección desaparecida: aviso y retorno a todas tras actualizar el listado.
- Carga/fallo/reintento corresponden a las consultas visibles. Cambiar selección no dispara escrituras, inferencias ni publicaciones.

## Navegación

- Sin «Calificar y revisar» lateral para usuarios con `subjects.read` y `evaluations.read`.
- Con `grading.read` pero sin el recorrido completo se mantiene el acceso autorizado existente.
- Cada evaluación publicada ofrece «Notas y entregas» al workspace existente con materia/evaluación fijas. No se crea otra sección de calificación. Enlaces anteriores funcionan; «Mis resultados» del estudiante permanece intacto.

## Resultado del estudiante

- Pulsar la nota o «Ver detalle» abre exactamente la calificación del estudiante y evaluación elegidos. Volver a la lista conserva selección, búsqueda y filtros.
- Orden común en celular y escritorio: «1. Nota y explicación», «2. Evidencia», «3. Respuestas y puntajes», «4. Retroalimentación».
- Solo la primera sección abierta por defecto: nota/máximo, estado, puntos y respaldo registrado. Criterios largos bajo expansión; motivos ausentes se informan, no se fabrican. Ajuste global se diferencia de suma por preguntas.
- Las otras secciones se abren con una acción, sin perder borradores. Enlaces profundos, alertas y edición activan la sección pertinente. No se fuerza evidencia/comparación simultánea en escritorio.
- Comparación: respuesta del estudiante, respuesta de referencia, puntaje/máximo y justificación registrada. Altura natural para datos cortos; textos completos accesibles.
- Alertas/bloqueos y decisión docente visibles sin desplegar contenido opcional. Confirmar/publicar/ajustar, reemplazar evidencia, historial y PQRS conservan permisos y salvaguardas; no se duplican sus controles.

## Creación contextual

- Dentro de una materia: nombre de materia y datos disponibles como contexto fijo, sin selecciones de materia/grado/área ni paso exclusivo de confirmarlos.
- Se conserva selección de materia en entrada general sin contexto. Editar no reasigna la evaluación.
- Nombre/tema, modalidad, material y criterios destacados; opciones complementarias progresivas con resumen de valores y errores visibles. Escala, pesos, edición de rúbrica y revisión de contenido siguen accesibles.
- Un borrador ajeno no se restaura ni sobrescribe al crear en otra materia; sigue recuperable desde su materia, incluido el formato local anterior compatible. No se inventan datos de grado/área ausentes.

## Estado de esta enmienda

Resultado del estudiante y creación contextual aprobados mediante «SIGUE» el 2026-09-30. Implementación y verificaciones locales completadas según quickstart.md; CI remoto, fusión y despliegue son gates separados.

## Accesibilidad

Controles principales de al menos 44 px, etiquetas visibles, foco y uso por teclado. Cantidades/avisos con anuncio no intrusivo. A 360 px y en ambos temas no hay desbordamiento ni paneles nuevos sticky que tapen contenido.

## API

Sin contratos públicos nuevos. Se siguen usando consultas y guardado actuales de asistencia, evaluaciones y calificaciones; sus payloads y autorizaciones no cambian.
