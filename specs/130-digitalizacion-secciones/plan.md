# Plan: digitalización que conserva secciones y contexto

**Rama**: `codex/130-digitalizacion-secciones` | **Fecha**: 2026-10-26 | **Spec**: [spec.md](./spec.md) | **Issue**: [#274](https://github.com/Andres-back/Calificator/issues/274)

**Estado**: diseño ampliado con reparto opcional de puntos por sección aprobado mediante «aprobe», después de la pausa y ampliación solicitadas. La aprobación incluye revisar requisitos y continuar si están completos; no autoriza fusión, despliegue, recalificación o cambios históricos.

## Resumen

Conservar una representación editorial explícita y ordenada del documento: secciones, subsecciones, instrucciones, lecturas, actividades sin nota, preguntas y material existente. Extender el digitalizador actual, su versionado, editor y consumidores; no crear un segundo flujo de OCR ni resolver la pérdida de contenido cambiando únicamente el prompt.

La lista `preguntas` sigue siendo el contrato académico de puntajes, respuestas y componentes. El documento la referencia por identidad estable. La numeración visible original puede repetirse por sección, pero el número interno que emplea la calificación permanece global y único. Una actividad sin nota no entra al scaffold académico. El docente podrá activar un reparto opcional de puntos por sección: sus valores se compilan a los puntajes máximos canónicos de las preguntas antes de guardar, sin una segunda ponderación durante la calificación.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11/FastAPI/SQLAlchemy/Alembic/Pydantic vigentes; TypeScript/React 18/Vite/Tailwind; PostgreSQL, Celery y almacenamiento privado existentes.
**Dependencias**: módulos evaluaciones, jobs, versiones de contenido, calificaciones y proyección de retroalimentaciones; exportadores PDF/Word y editor vigentes. Sin proveedores, modelos, claves o dependencias nuevas.
**Persistencia**: columna opcional JSONB `evaluaciones.estructura_documento`, con contrato cerrado, migración aditiva y sin backfill. Incluirla en snapshots inmutables, hash y copias; cobertura/procedencia documental privadas separadas de la proyección pública. Los trabajos conservan inventario, extracción y propuesta bajo su solicitud original.
**Pruebas**: pytest unitario/integración en PostgreSQL aislado, Vitest/Testing Library, Playwright Chromium/WebKit, renderizado real de PDF y revisión de Word. Fixtures sintéticos, proveedores simulados y cero llamadas pagadas para implementar/verificar contratos.
**Plataforma objetivo**: móvil 360/390 px, tablet 768 px y escritorio 1440 px, claro/oscuro, teclado/viewport reducido y texto ampliado. No equiparar emulación con prueba en teléfonos físicos.
**Rendimiento y escala**: conservar máximos vigentes de archivos, páginas, preguntas, contexto y salida. Jerarquía acotada a ocho niveles y 5.000 nodos, texto público acumulado dentro del presupuesto de lectura vigente; no duplicarlo como lectura legacy y documento a la vez. No hacer llamadas extra para intentar corregir estructura incierta. Validación local lineal sobre nodos y referencias; nuevas operaciones de recuperación usan la cola durable.

## Verificación de la constitución

- **Roles (I)**: lectura, edición y recuperación verifican permisos y propiedad en backend. El estudiante recibe DTO público cerrado. Los identificadores de trabajos y recursos nunca sustituyen autorización.
- **Integridad (II)**: conservar `numero` canónico y claves; introducir `etiqueta_original` solo para presentación. La versión de la entrega gobierna todos los consumidores. Legacy con entregas no se reescribe: recuperación en copia, sin migración de notas ni recalificación.
- **Asincronía (III)**: extender trabajos/checkpoints actuales; persistir inventario antes de estructurar y no repetir extracción ya confirmada. Recuperación con `request_key`, fingerprint de fuente y respuesta idempotente; no crear una copia nueva por un reintento.
- **Evolución segura (IV)**: migración nullable sin actualizar registros o snapshots antiguos. Generalizar el escritor de versiones existente para texto sin fabricar manifiestos visuales. Copia en la misma materia solo bajo intención explícita de recuperación, no quitar la prohibición general de reutilización.
- **Accesibilidad (V)**: índice de secciones compacto, un editor contextual a la vez, lectura visible donde corresponde, objetivos de al menos 44 px y alternativas de movimiento mediante botones/teclado. No depender de arrastrar ni abrir áreas de texto simultáneas para todas las preguntas.
- **IA y secretos (VI)**: conservar configuración administrativa, timeouts y presupuestos; separar contenido fuente de instrucciones del sistema. Sin originales reales, identificadores privados, claves o transcripciones docentes en Git/CI. La transcripción antigua no demuestra que se conserven sus dibujos.
- **Gobernanza y producción (VII/VIII)**: issue #274 y esta Spec130 antes de código; aprobación de especificación/plan, Checklist, Tasks y Analyze antes de Implement; Converge, CI y PR antes de fusión. No hay autorización implícita para desplegar, recalificar o modificar datos históricos.

Revisión posterior al diseño: no se identifica una excepción constitucional necesaria. La decisión de persistencia, proyección y versionado exige integración backend/frontend, no es un cambio exclusivamente visual. Aprobación humana del plan ampliado registrada; se exige completar requisitos, tareas y análisis antes de código.

## Estructura del proyecto

- `backend/app/modules/evaluaciones/document_structure.py` y `document_schemas.py` propuestos: validación, inventario/cobertura, referencias, recorrido editorial, reparto opcional de puntos y proyección pública; no duplicar las figuras de `visual_schemas.py`.
- `digitalize_service.py`, `visual_import_service.py`, `visual_normalization.py`, `backend/app/workers/tasks_digitalization.py`: conservar bloques de origen y estructura en el flujo/cache actuales; normalización por identidad independiente del rótulo impreso.
- `models.py`, `schemas.py`, `service.py`, `blueprint_service.py`, `visual_service.py`, `reading_service.py`, `grading_visual_context.py`: campo opcional, validación/guardado/publicación, snapshots textuales y contexto educativo de versión.
- `copy_service.py`, `copy_schemas.py`, router y servicio de recuperación documental acotado propuesto: proyección docente de transcripción disponible, copia explícita e idempotente, reutilización de los mecanismos de cola/archivos, sin copiar datos de estudiantes.
- `export_service.py`, `document_print.py`, `print_preparation.py` y `backend/app/modules/herramientas/pdf_render.py`: recorrido ordenado del mismo documento en previsualización/PDF/Word; mantener los tres modos de distribución, espacios y privacidad de soluciones. `pdf_render.py` es el renderizador real del examen; no se introduce un segundo exportador en `services/pdf_service.py`.
- `backend/app/modules/calificaciones/agents.py`, consumidores Xali y proyección/chat de `feedback_sharing`: helper común de contexto educativo revisado; conservar referencias de versión, listas blancas y publicaciones antiguas.
- `frontend/src/types/api.ts`, `frontend/src/modules/evaluaciones/api.ts`, `components/generationWizardModel.ts`, `GenerationWizard.tsx`, `ResolverEvaluacionPage.tsx`: conservar la estructura y etiquetas; editor de secciones y textos, consulta y recuperación dentro del flujo actual. Componentes acotados propuestos `EvaluationDocumentOutline.tsx` y `EvaluationDocumentContent.tsx` con pruebas.
- Migración Alembic aditiva y fixtures/regresiones nuevas bajo `backend/tests/unit`, `backend/tests/integration`, frontend unitario y `frontend/e2e/evaluation-document-structure.spec.ts` propuesto. Incluir los casos nuevos en la configuración efectiva Chromium/WebKit y particiones verificadas del CI, no solo crear un archivo sin consumidor.
- Actualizar specs responsables 005, 007, 008, 101, 113, 125 y 128; 009/107/126 únicamente donde se amplía consumo público/ayuda. Índice, inventario y baseline en el mismo PR, sin transferir propiedad ni marcar tareas no ejecutadas.

## Decisiones y complejidad

### 1. Documento propio, preguntas canónicas y numeración visible

`estructura_documento` es un agregado editorial opcional; no vive dentro de `reglas_feedback`, que es privado. Nodos planos con padre, orden y tipo representan la jerarquía sin recursión no acotada. Los nodos de pregunta referencian `contenido_id`; los visuales referencian bloques existentes. Cada pregunta debe aparecer exactamente una vez; los contenidos compartidos se referencian, no se duplican como nuevas preguntas.

El número interno sigue siendo único y secuencial en las nuevas digitalizaciones; la etiqueta original puede ser «1», «A» o «2.b». En una edición de evaluación ya versionada no se reasignan claves académicas por un cambio de presentación. Mover preguntas mantiene su identidad y respuesta. No migrar scaffold, notas ni claves históricas a un esquema UUID nuevo.

### 2. Cobertura antes de declarar éxito

Extender las salidas de extracción existentes para identificar bloques educativos y títulos detectados. El servidor asigna IDs del inventario y el estructurador refiere esos IDs; no aceptar IDs de recursos, seguridad o versiones inventados por la IA. Conservar los bloques detectados, aun cuando necesiten asociación manual.

La estructura se contrasta contra inventario, preguntas y material conocido. Omisión, ciclo, referencia desconocida o duda de asociación produce aviso localizado y borrador revisable, nunca éxito completo. Si un proveedor antiguo solo devuelve texto, conservar íntegro ese texto y marcar la organización pendiente; no descartarlo ni inventar jerarquía. El parser local de rescate tampoco puede comunicar cobertura completa sin evidencia.

No se puede detectar por contrato algo que el OCR no leyó: las pruebas sintéticas demuestran conservación y validación, no una garantía absoluta de reconocimiento de cualquier fotografía. El docente compara con el original conservado en los casos inciertos.

### 3. Versionado académico también sin figuras

Incluir el documento en `_snapshot`, hash, lectura de revisión, proyección pública y copia. Extender `ContentEdit/prepare_content_edit/save_content_revision` para que un manifiesto visual sea opcional cuando existe documento textual válido; mantener todos los chequeos actuales cuando hay imágenes. No fabricar un manifiesto vacío para pasar validaciones.

Una actualización de documento es académica, no solo un ajuste de impresión. Conservar bloqueo de evaluación, fechas/versiones esperadas y conflicto409. No añadir el campo a snapshots existentes ni alterar su hash. En legacy con entregas, proponer recuperación/copia; nunca completar retroactivamente su lectura o secciones. Una copia recibe IDs propios de documento, nodos, preguntas y recursos con remapeo integral.

### 4. Una fuente para editor, impresión y contexto

Un recorrido validado genera la secuencia de contenidos para pantalla y exportación. El documento con estructura no vuelve a imprimirse como lectura general más lista de preguntas; se usa la vía legacy solamente cuando el campo es null. La propiedad `lectura` legacy se considera derivada/no editable por separado en un documento organizado, evitando dos fuentes mutables contradictorias.

PDF y Word conservan los títulos junto a un primer fragmento acotado del contenido siguiente, permiten que lecturas largas continúen y no cambian el peso de preguntas. Figuras siguen su autorización/publicación actual. Mantener impresión compacta/media/amplia, color y espacios configurados.

`evaluation_to_grading_blueprint` obtiene el contexto de la versión fijada. Principal, segundo evaluador y confirmador consumen el mismo helper acotado; no basta con añadirlo al primer prompt. Xali autenticado y devoluciones nuevas reciben solo contexto educativo público revisado. No rehacer publicaciones/enlaces antiguos ni cambiar fingerprints de un payload legacy únicamente por introducir una propiedad null.

### 5. Recuperación supervisada, sin prometer dibujos inexistentes

La lectura autorizada de recuperación devuelve transcripción educativa disponible y procedencia/fingerprint; nunca `input_json`, configuración IA, rutas de almacenamiento o el resultado completo de un job. Debe comprobar propietario, evaluación/materia y tipo de trabajo, no aceptar un job arbitrario suministrado por el cliente.

La propuesta se organiza en el editor y se confirma antes de solicitar su guardado en un nuevo borrador. La operación durable puede reutilizar la infraestructura de copia con intención explícita `recuperacion_documental`: destino misma materia activa/propietario, fuente fija y propuesta validada. La intención normal de reutilización sigue exigiendo otra materia. No ejecutar IA en esta recuperación: los textos disponibles se asignan manualmente o mediante segmentación determinista que siempre requiere revisión.

El backend comprueba que la propuesta no cambie los dieciséis enunciados, claves, puntajes u orden académico de la fuente en una recuperación solo organizativa; modificaciones académicas posteriores se realizan sobre el nuevo borrador en su editor normal. Todo texto recuperado debe quedar conservado o identificado como exclusión revisada; ningún título se agrega como nueva pregunta. Fuente cambiada devuelve409. Faltante de figura se declara y no se inventa ni se marca como figura recuperada. El caso real se preparará después del código/CI; si requiere una figura ausente, se pedirá el original antes de publicar esa copia como completa.

### 6. Entrega y activación seguras

Implementar primero contrato/migración compatible y lectores; luego normalización, edición y escritura de versiones, exportación/contexto y recuperación. Lectores aceptan null/snapshots antiguos. Las escrituras nuevas se habilitan únicamente cuando backend, workers y frontend compatibles estén desplegados desde un commit de main aprobado, con bandera de admisión documentada y sin alterar selección de modelos.

Un rollback no ejecuta downgrade ni borra documentos. Detener primero admisión/escritura de documentos nuevos y conservar los campos; un binario antiguo no se declara apto para editar un documento estructurado. Validar migración y reversión operativa en una base aislada. Ningún despliegue manual forma parte de esta aprobación de diseño.

El usuario aprobó este plan ampliado mediante «aprobe», incluida la revisión de la lista de calidad y continuación si está completa. Se registra esta nueva aprobación posterior a la pausa, no la autorización anterior al reparto nuevo. No se presentan estas decisiones como funcionalidad ya entregada.

### 7. Puntajes opcionales por sección, sin doble fórmula de nota

Desactivado por defecto: conservar el contrato actual por pregunta y no exigir puntaje a una sección. Activado: presupuestos positivos en puntos de la escala de la evaluación —por ejemplo2+2+1 sobre5— para un conjunto completo de grupos calificables no solapados. Elegir un padre cubre sus preguntas descendientes; elegir sus subsecciones en lugar del padre convierte el valor de este en subtotal, no otro sumando. Ninguna pregunta puede quedar fuera o pertenecer a dos grupos de presupuesto. Las secciones sin preguntas calificables no reciben puntos por su existencia.

La propuesta utiliza como pesos base los puntajes previos de las preguntas; pesos iguales producen cuotas iguales salvo redondeo. Persistir los pesos base por identidad para que editar varias veces el presupuesto no reescale los resultados ya redondeados ni cause deriva. Una configuración parcial o inválida se conserva como edición local pendiente, no como presupuesto aplicado. Los pesos originales incompletos se muestran como pendientes de decisión, no se adivinan.

Backend y frontend comparten la regla contractual, pero el servidor recalcula/valida siempre. Usar Decimal y unidades de0,01 en la escala actual, reparto por mayores restos con desempate estable por identidad; rechazar un presupuesto que produzca máximos no positivos o no se pueda representar, sin compensaciones negativas o puntos extra. El docente ve y confirma la propuesta antes de guardarla y puede cambiar los pesos internos conservando la suma de la sección. Los inputs y subtotales muestran hasta dos decimales, no colas flotantes.

El resultado confirmado se compila una vez a `preguntas[].puntaje`, asociado a `contenido_id/numero` y revisión. Principal, segundo evaluador y confirmador siguen valorando los mismos máximos canónicos; la suma global no vuelve a multiplicar ni añadir subtotales de sección. La IA no elige ni ajusta presupuestos. Resumen por secciones es derivado y verificable, no otra nota de autoridad.

Mover/agregar/eliminar una pregunta, cambiar la escala o desactivar el modo invalida la propuesta de reparto hasta revisar y confirmar; el guardado no hace ajustes invisibles. Al desactivar, proponer restaurar los valores base conservados y mostrar si necesitan ajuste a la escala; no asumir redistribución. Aplicar solo en borrador nuevo o una edición académica permitida/versionada, jamás en snapshots/notas históricos. La recuperación solo organizativa mantiene los puntajes de origen: el docente podrá configurar este modo después, sobre la copia independiente.

Mostrar en el editor «Asignar puntaje por sección», presupuesto de cada grupo, total asignado/pendiente y vista previa por pregunta. La previsualización, PDF/Word, copias y nuevas devoluciones derivan esos valores del mismo contrato; muestran como subtotal un padre no seleccionado, sin duplicarlo. Ampliar regresiones con2+2+1, grupos de distinto tamaño, pesos internos desiguales, redondeo, entrada con coma, padres/hijos, movimientos, cambio de escala, modo desactivado y versiones previas.
