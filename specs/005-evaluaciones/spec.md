# Especificación: Evaluaciones

**Rama**: codex/005-evaluaciones | **Creada**: 2026-08-14 | **Estado**: Aprobada | **Issue**: #6

## Escenarios de usuario y pruebas

### Evolución 102: lectura completa

[102-camara-visor-completo](../102-camara-visor-completo/spec.md), issue #212, mantiene los documentos autorizados PDF/Word y solucionario restringido, con lectura amplia de todas las páginas y opciones de descarga a petición. Sin modificar evaluación guardada, respuestas, notas ni API.

### Historia 1 - Flujo principal (Prioridad: P1)
Como profesor, necesito crear, digitalizar, editar, asignar y controlar evaluaciones para obtener un resultado claro, seguro y trazable.

**Prueba independiente**: El recorrido termina en estado visible, conserva datos esperados y no concede permisos ajenos.

**Aceptación**:
1. **Dado** un actor autorizado, **cuando** completa el flujo, **entonces** recibe el resultado esperado.
2. **Dado** un actor no autorizado, **cuando** intenta acceder, **entonces** se rechaza sin revelar datos.

### Historia 2 - Estados y recuperación (Prioridad: P2)
Como mantenedor, necesito permisos, estados, errores y recuperación documentados para verificar el dominio.

### Historia 3 - Especificación viva (Prioridad: P3)
Como equipo, necesito actualizar estos artefactos cuando cambie el comportamiento para evitar contradicciones.

### Casos límite
- Eliminar una evaluación con entregas requiere reglas y confirmación docente
- Una dependencia lenta deja estado recuperable y no duplica operaciones.
- Sesión vencida o rol incorrecto se rechazan consistentemente.

## Requisitos

### Requisitos funcionales
- **FR-001**: El flujo principal DEBE estar disponible solo para actores autorizados.
- **FR-002**: La autorización DEBE aplicarse en servidor e interfaz.
- **FR-003**: Se DEBEN conservar estas entidades: Evaluacion, EvaluacionBlueprint, Pregunta, Criterio, EvaluacionEstado, EvaluacionModalidad.
- **FR-004**: Carga, vacío, éxito, error y reintento DEBEN ser visibles.
- **FR-005**: Operaciones repetidas DEBEN respetar idempotencia y unicidad.
- **FR-006**: Errores NO DEBEN exponer secretos ni datos ajenos.
- **FR-007**: Contratos DEBEN estar trazados en contracts/interfaces.md.
- **FR-008**: Todo cambio futuro DEBE actualizar especificación, plan, tareas y pruebas.

### Entidades clave
- **Evaluacion**: identidad, estado y relaciones definidos por el dominio.
- **EvaluacionBlueprint**: identidad, estado y relaciones definidos por el dominio.
- **Pregunta**: identidad, estado y relaciones definidos por el dominio.
- **Criterio**: identidad, estado y relaciones definidos por el dominio.
- **EvaluacionEstado**: identidad, estado y relaciones definidos por el dominio.
- **EvaluacionModalidad**: identidad, estado y relaciones definidos por el dominio.

## Criterios de éxito
- **SC-001**: El 100 % de módulos, rutas y tablas declarados aparece en el índice.
- **SC-002**: Recorridos P1 se verifican sin acceso cruzado.
- **SC-003**: Cada requisito tiene tarea o evidencia.
- **SC-004**: No quedan marcadores pendientes, contradicciones críticas ni secretos.

## Supuestos
- Registra comportamiento vigente; no introduce cambios funcionales.
- Inconsistencias se convierten en issues separados.
- Se conservan arquitectura y contratos públicos.
## Inventario técnico

- [Ver superficies, permisos y cobertura de este dominio](./inventory.md).

## Evolución 095: acciones principales claras

[095-flujo-docente-ligero](../095-flujo-docente-ligero/spec.md) limita a tres las acciones principales válidas por examen: visualizar, ver notas y calificar por foto cuando corresponda. Borradores conservan preparación/publicación; editar datos/preguntas/criterios, gestionar entregas y eliminar permanecen bajo Más opciones según permisos, con handlers y confirmaciones existentes. No modifica preguntas, notas, modalidades ni estados al consultar el menú.

## Evolución 096: preparar y revisar

[096-evaluacion-dos-pantallas](../096-evaluacion-dos-pantallas/spec.md), issue #202, simplifica el asistente IA a Preparar/Revisar con nombre sugerido, reparto visible, opciones y ayuda desplegables. Una entrada común ofrece IA, foto/PDF y creación manual desde materia o acceso general. Guarda el mismo borrador con validación/versionado y publica mediante acción separada. Conserva borradores v7, selección explícita de criterios, modalidades, respuestas y contratos de documentos; no cambia notas, evidencia ni proveedores.

## Evolución 105: éxito contextual

La captura compartida evoluciona en [127-camara-nativa-movil](../127-camara-nativa-movil/spec.md), issue #268: prioriza cámara del teléfono/tableta, conserva webcam de PC y aísla el retorno por intento/época. Digitalización y entrega del estudiante conservan límites, formatos, permisos y envío explícito.

[105-materia-movil-cola](../105-materia-movil-cola/spec.md) conserva el éxito visible en el paso Revisar y elimina únicamente el toast redundante de generación que podía cubrir la cabecera. No altera errores, advertencias, preguntas, guardado, modalidades ni publicación.

## Evolución 097: escritura móvil despejada

La evolución [101 — digitalización y edición visual completa](../101-digitalizacion-visual-completa/spec.md), issue #211, conserva originales privados, inventario de páginas y recursos versionados para PDF, DOCX e imagen. Añade revisión de asociaciones y material limpio, carga/recorte manual, edición estructurada y propuestas IA aceptadas expresamente por pregunta. El mismo material se consulta y exporta a PDF/Word; omisión o clave pendiente impide publicar una evaluación incompleta. Conflictos conservan la edición sin sobrescribir revisiones. Importación/editor/generación están desactivados por defecto y los lectores permanecen disponibles.

[097-escritura-docente-movil](../097-escritura-docente-movil/spec.md), issue #204, reduce la cabecera al escribir, evita enfoque textual automático en celular y adapta únicamente los formularios IA/manual al espacio visible. Listo termina la edición local sin generar ni guardar; preguntas/respuestas manuales usan áreas de texto y los ajustes siguen disponibles en Personalizar. Conserva datos, borradores, permisos y reglas académicas; las pruebas de viewport sintético no acreditan un teclado físico.

## Evolución 130: documento organizado

[130-digitalizacion-secciones](../130-digitalizacion-secciones/spec.md), issue #274, extiende este contrato con `estructura_documento` opcional y versiones textuales sin manifiestos visuales ficticios. Secciones y textos referencian preguntas por identidad; el reparto optativo se compila a máximos canónicos. Admisión desactivada por defecto; no reescribe evaluaciones históricas. La recuperación revisada usa una copia independiente. Validación y límites de entrega se registran en la guía130.

## Evolución 128: reutilización editorial entre materias propias

[128-materias-notas-reutilizacion](../128-materias-notas-reutilizacion/spec.md), issue #270, crea un borrador independiente por solicitud durable en ai_jobs, sin OCR/IA ni migración. Fuente versionada conserva una revisión fija y la copia recibe nueva revisión/IDs/bytes; texto legacy sin versión mantiene su contrato de edición/publicación. Conserva lectura, preguntas, claves privadas, criterios, recursos revisados o pendientes y formato. No copia estudiantes, entregas, notas, chat, publicación ni recepción. Destino activo distinto del mismo propietario y permisos de lectura/creación/gestión en servidor; archivo corrupto, enlace externo no reproducible o recurso interactivo se explican sin éxito incompleto. Progreso privado, reintento con la misma identidad y recuperación sin duplicados.
