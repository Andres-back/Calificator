# Propuesta funcional: Xali docente por materia y apoyos visuales

**Solicitud**: 2026-10-17 | **Seguimiento**: [issue #215](https://github.com/Andres-back/Calificator/issues/215) | **Estado**: especificación solicitada; implementación y plan propios pendientes.

Esta propuesta desarrolla el dominio de [Xali, RAG y refuerzos](../009-xali-rag-refuerzos/spec.md). No sustituye su flujo estudiantil ni afirma capacidades ya implementadas. Se conserva separada del cambio funcional de cámaras e iconos del issue #214.

## Necesidad y escenario principal

El docente selecciona «Matemáticas — grado 6» y pregunta «Ayúdame a explicar coordenadas». Xali reconoce que conversa con el docente de esa materia, adapta el vocabulario al grado conocido y ofrece explicación, ejercicios, una tabla de puntos y un plano cartesiano coherentes entre sí. El profesor no debe repetir materia o grado en cada mensaje. La selección es contexto de la conversación, no una suposición sobre todas las asignaturas que enseña esa persona.

## Requisitos propuestos

- **XD-001 — Contexto explícito**: cada mensaje docente debe usar la materia seleccionada y autorizada, su nombre, área y grado cuando estén registrados, y el rol docente real. La interfaz muestra «Hablando sobre: …». Si falta un dato, no se inventa ni se exige repetir información ya disponible. Sin materia se ofrece ayuda general con contexto claramente indicado.
- **XD-002 — Contexto independiente del RAG**: el contexto básico de materia no depende de tener documentos indexados. Los criterios y materiales pertinentes de esa materia complementan la respuesta cuando existen; se identifican las fuentes utilizadas y se distingue una propuesta del asistente de una cita del material. No se envían todos los criterios/documentos en cada consulta ni se afirma usar fuentes no recuperadas.
- **XD-003 — Continuidad y aislamiento**: historial y respuesta permanecen vinculados al usuario y a la materia. Cambiar de materia no mezcla la conversación ni coloca en la nueva una respuesta pendiente de la anterior. La selección y el acceso se validan en servidor, no solo en el menú.
- **XD-004 — Ayuda pedagógica docente**: permitir explicaciones paso a paso, ejercicios con dificultad adecuada, soluciones razonadas y propuestas de actividades. No aplicar a profesores la prohibición estudiantil de mostrar soluciones, ni conceder al estudiante permisos o soluciones docentes por cambiar el mensaje o la materia.
- **XD-005 — Apoyos visuales reales**: mostrar tablas, gráficos de datos, figuras geométricas y planos cartesianos cuando se soliciten o ayuden a explicar. Mostrar el resultado visual, no solo código, una URL inventada o una frase que diga que existe. Cada visual tiene título, etiquetas/unidades cuando correspondan y explicación alternativa legible.
- **XD-006 — Fidelidad matemática**: tablas y visuales deben compartir los mismos valores, escalas, puntos, intervalos y unidades explícitos. Un plano respeta cuadrantes, origen y signos. Datos ausentes se solicitan o se declaran como ejemplo; nunca se presentan cifras inventadas como datos reales. Si no puede representarse un resultado, se explica el límite y se conserva texto/tabla útil.
- **XD-007 — Lectura móvil**: visuales ampliables, proporciones conservadas, etiquetas legibles, tablas desplazables dentro de su contenedor y chat utilizable con teclado abierto, desde 360 px hasta computador y en ambos temas. Evitar miniaturas obligatorias y scroll horizontal de toda la página.
- **XD-008 — Revisión y seguridad**: los apoyos son propuestas revisables; no guardan evaluaciones ni cambian notas, criterios o evidencias automáticamente. No ejecutar scripts/código arbitrario devuelto por el modelo ni abrir recursos externos no autorizados. No incluir datos personales de alumnos para generar un ejemplo.
- **XD-009 — Coste y recuperación**: preferir gráficos/figuras definidos por datos verificables a imágenes generativas para matemáticas exactas. Generación de ilustraciones creativas, si se propone, será opcional, con coste explicado y autorización separada. No lanzar llamadas IA por seleccionar materia o abrir un visual; mostrar carga, error y reintento sin duplicar mensajes/recursos.

## Aceptación verificable propuesta

1. Sin documentos, seleccionar Matemáticas grado 6 produce ayuda docente contextual; cambiar a Lenguaje cambia el contexto visible y no arrastra respuestas pendientes.
2. Un ejercicio de coordenadas representa correctamente (-2, 3), (0, 0) y (3, -1), con tabla, ejes y explicación consistentes. Un gráfico de barras usa exactamente los valores entregados y una figura geométrica conserva las medidas declaradas.
3. El docente puede pedir ejercicios y consultar soluciones razonadas sin cambiar el flujo restringido del alumno. Acceder a una materia ajena sin autorización es rechazado.
4. En 360, 390 y 1440 px, plano, tabla, figura y gráfico pueden leerse/ampliarse sin desbordamiento de página; un visual inválido conserva explicación y recuperación.
5. Cancelación, cambio de contexto, error y reintento no modifican registros académicos ni generan recursos duplicados. Una consulta sintética no envía datos de alumnos.

## Revisión inicial del código actual

La interfaz ya selecciona `materiaId` y lo envía a `/xali/chat`; representa texto, tablas Markdown y fórmulas mediante RichContent. El servicio usa una instrucción docente y contexto RAG opcional, pero el prompt aún rotula el mensaje como «Pregunta del estudiante» y no inyecta explícitamente nombre/área/grado. No se observó un contrato de gráficos/planos en ese flujo. Esto justifica diseñar contexto autorizado y un formato visual validable antes de implementar; no basta con pedir al modelo que «dibuje».

No se consultaron conversaciones, documentos ni evidencias de producción para esta revisión. Pendiente: plan técnico, revisión de requisitos, tareas, pruebas y aprobación antes de implementación.
