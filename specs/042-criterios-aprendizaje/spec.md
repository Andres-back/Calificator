# Especificación: Criterios de aprendizaje desde material docente

**Rama**: `codex/042-criterios-aprendizaje`
**Creada**: 2026-09-13
**Estado**: Aprobada para planificación
**Issue**: [#19](https://github.com/Andres-back/Calificator/issues/19)
**Descripción de entrada**: Reemplazar la experiencia limitada de DBA por criterios de aprendizaje que puedan construirse desde libros, fotografías, documentos, texto o material trabajado, según lo que el profesor quiera evaluar y cómo quiera calificarlo.

**Inventario técnico responsable**: [Superficies de criterios de aprendizaje](./inventory.md).

## Escenarios de usuario y pruebas

### Historia 1 - Construir criterios desde lo enseñado (Prioridad: P1)

Como profesor, quiero aportar el material que trabajé en clase y explicar qué deseo evaluar, para obtener criterios alineados con mi enseñanza real sin depender obligatoriamente de un DBA.

**Razón de prioridad**: Esta es la base del nuevo flujo. Sin contexto docente, la rúbrica y la calificación pueden valorar aspectos que no fueron enseñados.

**Prueba independiente**: Un profesor selecciona una materia, aporta dos fotografías ordenadas de un libro, indica que desea valorar principalmente el procedimiento y obtiene una propuesta editable de criterios con referencia a su fuente.

**Escenarios de aceptación**:

1. **Dado** un profesor dentro de una materia, **cuando** aporta fotografías, un documento, texto o un material existente y explica qué quiere evaluar, **entonces** recibe criterios observables relacionados con ese contexto.
2. **Dado** que la materia no tiene DBA, **cuando** el profesor inicia el flujo, **entonces** puede continuar sin bloqueo y dejar que la IA proponga los criterios.
3. **Dado** que existen DBA históricos, **cuando** el profesor consulta fuentes oficiales, **entonces** puede seleccionarlos opcionalmente como «Estándares oficiales» sin perder relaciones anteriores.
4. **Dado** un material ilegible o incompleto, **cuando** no hay suficiente información para proponer criterios confiables, **entonces** el profesor recibe una alerta y puede corregir, reemplazar o completar la referencia.

---

### Historia 2 - Revisar criterios y rúbrica antes de usarlos (Prioridad: P1)

Como profesor, quiero editar los criterios, pesos, niveles y descripciones sugeridos antes de generar o calificar, para conservar la autoridad sobre lo que cuenta y cómo se construye la nota.

**Razón de prioridad**: La revisión humana evita que una sugerencia incorrecta de la IA se convierta silenciosamente en regla de evaluación.

**Prueba independiente**: El profesor modifica un criterio, elimina otro, añade uno propio, cambia los pesos y aprueba una rúbrica cuya suma coincide con el valor total de la actividad.

**Escenarios de aceptación**:

1. **Dado** un conjunto sugerido, **cuando** el profesor lo revisa, **entonces** puede agregar, editar, ordenar y eliminar criterios antes de aprobarlo.
2. **Dado** un criterio, **cuando** el profesor define cómo se valorará, **entonces** puede editar su evidencia esperada, peso, puntaje y descriptores de desempeño.
3. **Dado** que los puntajes o pesos no forman un total válido, **cuando** el profesor intenta aprobar, **entonces** el sistema explica la inconsistencia y no continúa.
4. **Dado** que la propuesta aún no fue aprobada, **cuando** se intenta usar para generar o calificar una actividad, **entonces** el sistema exige primero la confirmación docente.

---

### Historia 3 - Aplicar criterios a evaluaciones y recursos (Prioridad: P1)

Como profesor, quiero reutilizar los criterios aprobados en una evaluación, taller, dictado, lectura u otra actividad, para que creación, entrega y calificación compartan la misma intención pedagógica.

**Razón de prioridad**: Los criterios solo aportan valor si acompañan el ciclo completo y no quedan como documentos aislados.

**Prueba independiente**: Un conjunto aprobado se asocia a una actividad, distribuye sus puntos entre preguntas o dimensiones y queda disponible en la revisión de las entregas.

**Escenarios de aceptación**:

1. **Dado** un conjunto aprobado, **cuando** el profesor crea o edita una actividad, **entonces** puede asociarlo completo o seleccionar criterios concretos.
2. **Dado** que una pregunta o dimensión está relacionada con varios criterios, **cuando** se configura su valoración, **entonces** la distribución se muestra de forma comprensible y no duplica puntos.
3. **Dado** un criterio modificado después de haber sido utilizado, **cuando** ya existen entregas o notas, **entonces** el historial conserva la versión aplicada y las calificaciones anteriores no cambian silenciosamente.
4. **Dado** un recurso de apoyo no evaluativo, **cuando** se asocia a criterios, **entonces** los criterios sirven para orientar el aprendizaje sin crear una nota obligatoria.

---

### Historia 4 - Comprender cada puntaje de la calificación (Prioridad: P1)

Como profesor, quiero ver qué criterio se aplicó a cada respuesta, qué evidencia encontró la IA y por qué otorgó esos puntos, para revisar rápidamente inconsistencias y respaldar la nota final.

**Razón de prioridad**: La transparencia de la calificación es central para la tesis y para que el docente confíe, corrija y mida el ahorro real de tiempo.

**Prueba independiente**: Al revisar una entrega, cada respuesta muestra evidencia, criterio, puntaje máximo, puntaje sugerido y explicación; la suma coincide con la nota sugerida y el profesor puede ajustarla dejando trazabilidad.

**Escenarios de aceptación**:

1. **Dado** una entrega procesada, **cuando** el profesor abre la revisión, **entonces** cada respuesta o dimensión presenta la evidencia utilizada, el criterio aplicado, el máximo, lo otorgado y la justificación.
2. **Dado** una respuesta que satisface parcialmente un criterio, **cuando** se propone el puntaje, **entonces** la explicación identifica qué parte se logró y qué faltó.
3. **Dado** evidencia ausente, contradictoria o ilegible, **cuando** no puede justificarse un puntaje, **entonces** el caso queda marcado para revisión manual y no se inventa evidencia.
4. **Dado** que el profesor modifica el puntaje o la explicación, **cuando** guarda su decisión, **entonces** se conserva la propuesta original, el ajuste, el motivo y la persona responsable.
5. **Dado** el detalle de todas las respuestas, **cuando** se calcula la nota final, **entonces** el total coincide exactamente con los puntajes visibles y su escala configurada.

---

### Historia 5 - Consultar criterios con lenguaje claro (Prioridad: P2)

Como profesor, quiero encontrar criterios, referencias y estándares desde una sola vista comprensible en celular o escritorio, para no navegar entre conceptos duplicados ni pantallas técnicas.

**Razón de prioridad**: Una estructura pedagógica clara reduce tiempo de configuración y evita que el docente confunda fuente, criterio, rúbrica y actividad.

**Prueba independiente**: Desde una pantalla de 360 px, el profesor crea, filtra y abre un conjunto de criterios sin desbordamiento, mientras un estudiante no puede acceder a herramientas docentes.

**Escenarios de aceptación**:

1. **Dado** el espacio antes llamado DBA, **cuando** el profesor entra, **entonces** ve «Criterios de aprendizaje» y distingue entre criterios propios, sugeridos y estándares oficiales.
2. **Dado** un dispositivo móvil, **cuando** el profesor recorre creación, revisión y aprobación, **entonces** todos los controles son accesibles, legibles y no producen desplazamiento horizontal.
3. **Dado** un estudiante, **cuando** intenta acceder a la administración de criterios, **entonces** no obtiene capacidades docentes ni información privada de materiales de referencia.
4. **Dado** un profesor que entra por primera vez, **cuando** inicia la preparación, **entonces** elige entre subir material, escribir sin material o reutilizar criterios aprobados sin exponerse a conceptos técnicos.
5. **Dado** una propuesta manual o asistida, **cuando** revisa sus criterios, **entonces** puede editar tarjetas en lenguaje docente y dejar pesos, fuentes y niveles dentro de una sección avanzada opcional.
6. **Dado** una evaluación con preguntas, **cuando** aplica criterios aprobados, **entonces** el sistema propone las relaciones pregunta–criterio y presenta una vista previa para confirmar o corregirlas.
7. **Dado** un profesor que vuelve a la pantalla, **cuando** necesita orientación, **entonces** puede repetir un recorrido corto sin que este reaparezca obligatoriamente en cada visita.

### Casos límite

- Varias fotografías pueden contener páginas repetidas, giradas, desordenadas o una explicación continuada entre páginas.
- El profesor puede crear criterios manualmente sin material, sin DBA y sin usar IA.
- Una referencia puede mezclar contenido de varios temas; la propuesta debe limitarse a la intención declarada por el docente o pedirle que la delimite.
- Las instrucciones del profesor prevalecen sobre una inferencia contradictoria del material y la discrepancia debe quedar visible.
- Si el servicio de IA no está disponible, el material y la intención quedan guardados como borrador y el profesor puede continuar manualmente o reintentar.
- Un mismo criterio puede reutilizarse en varias actividades sin compartir notas ni alterar versiones ya aplicadas.
- Los materiales de referencia permanecen privados y no se muestran al estudiante salvo que el profesor los asigne expresamente como recurso.
- Las evaluaciones, criterios, DBA y calificaciones históricas deben seguir siendo consultables durante y después de la transición.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE presentar «Criterios de aprendizaje» como concepto principal en lugar de exigir DBA para configurar recursos o evaluaciones.
- **FR-002**: El profesor DEBE poder crear criterios manualmente o desde fotografías multihoja, un documento, texto libre, un material existente o estándares oficiales.
- **FR-003**: El profesor DEBE poder declarar qué desea evaluar, qué evidencia espera, el grado, el tipo de actividad y los aspectos de mayor importancia.
- **FR-004**: La propuesta DEBE limitarse al material y a la intención docente disponibles, distinguir inferencias y alertar cuando el contexto resulte insuficiente o contradictorio.
- **FR-005**: Cada criterio DEBE describir un aprendizaje observable, su evidencia esperada, peso o puntaje y fuente de referencia.
- **FR-006**: El profesor DEBE poder agregar, editar, ordenar, duplicar y eliminar criterios antes de aprobarlos.
- **FR-007**: El sistema DEBE proponer una rúbrica editable con niveles de desempeño, descriptores y distribución de puntajes vinculados a los criterios.
- **FR-008**: El sistema DEBE impedir la aprobación cuando existan criterios incompletos, puntajes inválidos o una distribución que no coincida con el total configurado.
- **FR-009**: Ninguna propuesta generada por IA DEBE utilizarse para crear o calificar una actividad sin aprobación explícita del profesor.
- **FR-010**: Los criterios aprobados DEBEN poder asociarse a evaluaciones, preguntas, talleres, dictados, lecturas, recursos evaluativos y materiales de apoyo.
- **FR-011**: Un material de apoyo DEBE poder usar criterios como orientación sin producir obligatoriamente una entrega o calificación.
- **FR-012**: Toda actividad evaluativa DEBE conservar la versión exacta de los criterios y rúbrica que se aplicó, incluso si la fuente se edita posteriormente.
- **FR-013**: La revisión de una entrega DEBE mostrar por respuesta o dimensión la evidencia, criterio aplicado, máximo, puntaje sugerido y explicación del resultado.
- **FR-014**: La suma de los puntajes explicados DEBE coincidir exactamente con la nota sugerida y con la escala de la actividad.
- **FR-015**: Cuando falte evidencia suficiente, el sistema DEBE marcar el componente para revisión humana en lugar de confirmar automáticamente un puntaje sin respaldo.
- **FR-016**: El profesor DEBE poder ajustar puntajes y explicaciones conservando la propuesta original, el motivo del cambio, la fecha y la persona responsable.
- **FR-017**: Los DBA existentes DEBEN conservarse y mostrarse como «Estándares oficiales» opcionales, sin pérdida de relaciones, datos históricos o compatibilidad.
- **FR-018**: Los materiales usados únicamente como referencia DEBEN permanecer privados y solo podrán mostrarse al estudiante mediante una asignación explícita del profesor.
- **FR-019**: El sistema DEBE conservar un borrador recuperable si falla la lectura del material o la generación de criterios.
- **FR-020**: Las capacidades de crear, editar y aprobar criterios DEBEN limitarse a profesores autorizados dentro de su ámbito; estudiantes y profesores ajenos no podrán acceder a referencias privadas.
- **FR-021**: El flujo completo DEBE ser utilizable en modo claro y oscuro desde 360 px hasta escritorio, con controles comprensibles y estados visibles de carga, error, borrador y aprobación.
- **FR-022**: Los nombres y ayudas de la interfaz DEBEN distinguir claramente material de referencia, criterio de aprendizaje, rúbrica, actividad y calificación.
- **FR-023**: Las evaluaciones y calificaciones históricas DEBEN mantener su visualización y resultado durante la transición.
- **FR-024**: El sistema DEBE registrar el tiempo activo que el profesor dedica a configurar y revisar criterios, separado del tiempo de espera de la IA, para medir su impacto en la eficiencia docente.
- **FR-025**: La entrada principal DEBE llamarse «Definir qué voy a evaluar» y ofrecer tres inicios inequívocos: material nuevo, creación sin material y reutilización de criterios aprobados.
- **FR-026**: La revisión inicial DEBE presentar cada criterio como una tarjeta editable en lenguaje docente y ocultar versiones, identificadores, distribución detallada, fuentes y niveles bajo controles avanzados opcionales.
- **FR-027**: Al agregar o quitar criterios, el sistema DEBE poder distribuir sus pesos automáticamente hasta completar 100 %, conservando la posibilidad de ajuste manual explícito.
- **FR-028**: Al seleccionar una versión aprobada para una evaluación, el sistema DEBE mostrar los criterios incluidos, proponer su relación con las preguntas y permitir confirmar o corregir la propuesta antes de guardar.
- **FR-029**: Antes de aprobar o aplicar, el sistema DEBE mostrar una vista previa con intención, criterios, cobertura, preguntas relacionadas, puntaje total y advertencias por criterios sin evidencia.
- **FR-030**: Durante la revisión de una respuesta, cambiar el puntaje DEBE mantener un estado pedagógico coherente: máximo como correcta, valor intermedio como parcial y cero como incorrecta, salvo elección explícita de «Sin respuesta».
- **FR-031**: El profesor DEBE poder abrir un recorrido inicial breve y repetible que explique crear, revisar, aplicar y consultar criterios, sin bloquear el uso normal ni reaparecer después de descartarlo.
- **FR-032**: Los resultados DEBEN resumir por criterio si el aprendizaje está logrado, en proceso o necesita apoyo, sin introducir una segunda fórmula de calificación.

### Entidades clave

- **Fuente de aprendizaje**: Material privado aportado o seleccionado por el profesor; incluye tipo, orden de páginas, contexto declarado, procedencia y relación con la materia.
- **Conjunto de criterios**: Agrupación versionada y reutilizable de criterios para una intención pedagógica, con estado de borrador, aprobado o archivado.
- **Criterio de aprendizaje**: Aprendizaje observable con descripción, evidencia esperada, peso o puntaje, fuente y alcance educativo.
- **Rúbrica**: Forma de valorar los criterios; contiene niveles de desempeño, descriptores y distribución de puntajes.
- **Aplicación de criterios**: Copia versionada de los criterios y rúbrica asociados a una actividad, pregunta o dimensión evaluativa.
- **Justificación de puntaje**: Relación entre evidencia de la entrega, criterio aplicado, máximo, puntaje sugerido, explicación y posibles ajustes docentes.

## Criterios de éxito

### Resultados medibles

- **SC-001**: Al menos 90 % de los profesores de prueba pueden crear y aprobar criterios desde un material nuevo en menos de cinco minutos de trabajo activo, sin asistencia externa.
- **SC-002**: El 100 % de las propuestas generadas requiere una acción explícita del profesor antes de utilizarse en una actividad evaluativa.
- **SC-003**: El 100 % de las calificaciones cubiertas por criterios muestra evidencia, criterio, puntaje máximo, puntaje otorgado y explicación, y su suma coincide con la nota final.
- **SC-004**: El 100 % de los casos con evidencia insuficiente incluidos en las pruebas termina en revisión manual y ninguno inventa una justificación.
- **SC-005**: El 100 % de los DBA y relaciones históricas de la muestra de migración continúa disponible como estándares oficiales o referencia histórica.
- **SC-006**: Los recorridos críticos se completan sin desbordamiento horizontal ni controles inaccesibles en 360×800, 390×844, 768×1024 y escritorio, en modo claro y oscuro.
- **SC-007**: Ninguna prueba de permisos permite a estudiantes o profesores ajenos consultar materiales privados o modificar criterios fuera de su ámbito.
- **SC-008**: En una prueba con docentes, al menos 80 % considera comprensible la diferencia entre referencia, criterio, rúbrica, actividad y explicación de nota en el primer recorrido.
- **SC-009**: Las evaluaciones y notas históricas de la muestra de regresión conservan el mismo resultado visible antes y después de la transición.
- **SC-010**: Las mediciones separan en el 100 % de las sesiones instrumentadas el trabajo activo del docente y la espera automática, permitiendo comparar el tiempo de calificación asistida y manual.
- **SC-011**: En una prueba de primer uso, al menos 90 % de docentes identifica correctamente cómo comenzar, reutilizar criterios y aprobarlos sin explicación externa.
- **SC-012**: Agregar o eliminar criterios deja una distribución válida con una sola acción y nunca exige corregir manualmente errores de redondeo para llegar a 100 %.
- **SC-013**: El 100 % de los cambios de puntaje intermedio guardados presenta estado parcial, nota recalculada e historial auditable coherentes.

## Supuestos

- Los criterios de aprendizaje son el concepto general; los DBA continúan como una fuente oficial opcional dentro de ese concepto.
- El profesor puede iniciar sin DBA, sin documento y sin IA mediante creación manual.
- Las fuentes se consideran privadas por defecto; compartirlas con estudiantes requiere una asignación separada y visible.
- La aprobación docente se realiza por versión. Editar un conjunto aprobado genera una nueva versión y no altera aplicaciones históricas.
- La primera versión reutiliza los tipos de actividad y mecanismos de evidencia ya disponibles en XCalificator.
- La calidad pedagógica final depende de la revisión del profesor; la IA propone y explica, pero no reemplaza su decisión.

## Dependencias y límites

### Corrección transversal de navegación aprobada (2026-09-16)

El usuario autoriza corregir los bloqueos de desplazamiento compartidos que afectan a la experiencia móvil y a la revisión docente, aun con la lista de integridad pendiente. Paneles, menú móvil y diálogos deben compartir un bloqueo reversible: cerrar o desmontar cualquier combinación no dejará estilos bloqueantes residuales. El menú debe liberar el contenido al navegar o pasar a escritorio; la guía de respuestas seguirá el scroll del contenedor de revisión. No se modifican procesamiento, fórmula, publicación ni datos de calificaciones. Esta aprobación no equivale a completar la lista de integridad ni autoriza despliegue.

- Depende de los flujos existentes de materias, recursos, evaluaciones, evidencias, rúbricas y calificación explicable.
- No incluye distribución pública de libros ni materiales protegidos; solo su uso privado como referencia docente.
- No redefine la escala institucional de notas ni publica automáticamente resultados.
- No elimina tablas o rutas históricas hasta demostrar que no existen consumidores y completar una migración compatible.
