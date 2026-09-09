# Especificación: Calificación confiable e impacto docente medible

**Rama**: `codex/032-calificacion-impacto-docente` | **Creada**: 2026-09-09 | **Estado**: Alcance y plan aprobados por el usuario el 2026-09-09 | **Issue**: [#65](https://github.com/Andres-back/Calificator/issues/65)

**Aprobación**: alcance mediante «adeante aprove»; plan mediante «aprove». Etiquetas spec-approved y plan-approved en issue #65. Autorizada implementación por etapas sujeta al control de checklist; no activa piloto ni despliegue. [Plan aprobado](./plan.md).

## Escenarios de usuario y pruebas

### Historia 1 - Recuperar entregas sin perder contenido (Prioridad: P1)

Como profesor necesito evaluar trabajos extensos o multihoja completos y recuperar fallos sin volver a cargar la evidencia ni perder decisiones docentes.

**Razón de prioridad**: Las omisiones y los reintentos sin efecto invalidan la confianza y aumentan el trabajo.

**Prueba independiente**: Procesar una respuesta continuada entre hojas, provocar un fallo posterior a la extracción y reintentar conservando una sola calificación vigente.

**Aceptación**:
1. **Dada** una respuesta que supera 5.000 caracteres y continúa en otra hoja, **cuando** se procesa, **entonces** se considera completa una sola vez con sus páginas, o se señala expresamente la parte no procesable; nada se omite silenciosamente.
2. **Dada** una extracción válida y un fallo posterior, **cuando** se reintenta, **entonces** se ejecuta trabajo pendiente sin volver a cargar la evidencia ni repetir etapas válidas compatibles.
3. **Dada** una decisión docente guardada durante el procesamiento, **cuando** llega el resultado automático, **entonces** no la sobrescribe.
4. **Dado** un lote de 30 estudiantes con un fallo aislado, **cuando** se recupera ese caso, **entonces** los demás conservan su avance y no se duplican entregas ni notas.

### Historia 2 - Revisar pregunta y evidencia juntas (Prioridad: P1)

Como profesor necesito comparar evidencia, criterio, puntaje y explicación sin recorrer repetidamente la página y continuar con el siguiente estudiante al guardar.

**Razón de prioridad**: La rapidez del modelo no compensa una revisión difícil.

**Prueba independiente**: Abrir una entrega de veinte preguntas, modificar una intermedia y continuar, en escritorio y celular.

**Aceptación**:
1. **Dada** una pregunta con página conocida, **cuando** se selecciona, **entonces** el visor permite llegar a su página y ampliar sin perder la edición; no inventa recortes sin coordenadas fiables.
2. **Dado** un ajuste, **cuando** se guarda y continúa, **entonces** conserva historial, recalcula la nota y avanza solo después de confirmar el guardado.
3. **Dado** un error de guardado o cambios pendientes, **cuando** se intenta salir, **entonces** no descarta la edición ni anuncia éxito falso.
4. **Dado** un celular, **cuando** se alterna evidencia/revisión, **entonces** conserva selección, edición y posición pertinente sin controles inaccesibles.
5. **Dado** un lote, **cuando** se consulta, **entonces** muestra estudiantes reconocibles y estados en cola, analizando, lista para revisar, revisión necesaria, error y publicada.

### Historia 3 - Valorar respuestas abiertas y orientar el aprendizaje (Prioridad: P1)

Como docente de Lenguaje o Ciencias Sociales necesito reconocer ideas válidas expresadas de formas distintas y explicar crédito parcial según mis criterios.

**Razón de prioridad**: La propuesta se centra en respuestas abiertas, no solo coincidencias con una clave.

**Prueba independiente**: Usar casos controlados de paráfrasis válida, argumento parcial, interpretación justificada, error conceptual, blanco e ilegible con referencias docentes preparadas antes del ensayo.

**Aceptación**:
1. **Dada** una respuesta semánticamente válida, **cuando** se evalúa, **entonces** no se penaliza únicamente por no coincidir literalmente con la referencia.
2. **Dado** crédito parcial, **cuando** se explica, **entonces** identifica logro, faltante y criterio que determina los puntos.
3. **Dada** escritura ilegible, **cuando** se extrae, **entonces** no se sustituye por la solución esperada ni se presenta como error conceptual.
4. **Dada** retroalimentación, **cuando** se revisa, **entonces** distingue justificación de la nota y orientación concreta, sin inventar dificultades en respuestas correctas.
5. **Dado** material docente autorizado y pertinente, **cuando** sustenta la evaluación, **entonces** identifica la fuente; si no existe, declara la ausencia sin inventar referencias.
6. **Dada** una verificación que recibió la primera valoración, **cuando** se presenta, **entonces** no se describe como juicio independiente ni como probabilidad de acierto demostrada.

### Historia 4 - Medir trabajo docente y separar espera automática (Prioridad: P1)

Como docente e investigador autorizado necesito tiempos observados de preparación, revisión, corrección y finalización separados de la espera automática, para comparar trabajo habitual y asistido.

**Razón de prioridad**: Los tiempos supuestos y eventos sin vinculación suficiente no demuestran ahorro.

**Prueba independiente**: Simular intervalos conocidos con pausas, reaperturas, dos pestañas, ajustes y confirmación grupal; obtener totales reproducibles sin duplicidades.

**Aceptación**:
1. **Dada** una sesión medida, **cuando** se abre, pausa, reanuda y termina, **entonces** sus intervalos se vinculan a actividad y condición y no se cuentan dos veces.
2. **Dado** un profesor leyendo una hoja física sin pulsar controles, **cuando** mantiene la sesión activa, **entonces** el tiempo no se descarta por falta de clics; pausas explícitas e interrupciones ambiguas se distinguen.
3. **Dado** un cierre inesperado, **cuando** no se puede reconstruir el tiempo, **entonces** se marca incompleto, no cero; las correcciones manuales conservan motivo y origen.
4. **Dada** ausencia de comparación manual válida, **cuando** se abre el informe, **entonces** declara falta de datos en lugar de mostrar ahorro supuesto.
5. **Dadas** mediciones comparables en ambas condiciones, **cuando** se calcula ahorro, **entonces** se puede reproducir y se muestran unidad, cobertura y exclusiones; un ahorro negativo no se oculta.
6. **Dado** tiempo compartido de preparación o finalización de lote, **cuando** se agrega, **entonces** se contabiliza una vez y cualquier distribución por entrega se declara explícitamente.

### Historia 5 - Preparar evidencia del piloto sin alterar notas (Prioridad: P2)

Como investigador autorizado necesito relacionar tiempos, sugerencia original, revisión docente, referencia independiente y satisfacción sin alterar notas ni exponer identidades innecesarias.

**Razón de prioridad**: La existencia de la plataforma no prueba los objetivos del piloto.

**Prueba independiente**: Incorporar observaciones sintéticas y valoraciones externas autorizadas; exportar y reproducir indicadores incluyendo datos faltantes y resultados desfavorables.

**Aceptación**:
1. **Dado** un conjunto de estudio, **cuando** se exporta, **entonces** distingue docentes, trabajos, respuestas y condiciones manual/asistida sin tratarlos como unidades equivalentes.
2. **Dada** una referencia independiente, **cuando** se registra, **entonces** declara si el revisor vio la IA y no modifica la nota oficial; confirmar una sugerencia no equivale a revisión ciega.
3. **Dada** una encuesta o valoración incorporada, **cuando** se confirma registro, **entonces** puede recuperarse con respuestas, instrumento y versión; no anuncia guardados inexistentes.
4. **Dada** una persona no autorizada, **cuando** solicita datos del estudio, **entonces** se deniega; la exportación autorizada excluye nombres, contactos y evidencia original por defecto.
5. **Dadas** las metas de ahorro del 40 % y Kappa de 0,75, **cuando** no se alcanzan o faltan datos, **entonces** se informa sin modificar resultados ni muestra para aparentar cumplimiento.

### Casos límite

- Respuestas extensas, numeración ambigua, solapamiento, continuaciones, tachones y gráficos que requieren inspección visual.
- Fallo parcial de hoja, blanco frente a ilegible, clave incompleta y cobertura insuficiente; no inventar respuesta ni cero.
- Reintentos repetidos, cambios de evidencia/criterios/configuración y decisiones docentes simultáneas.
- Último estudiante, error al guardar, recarga, cambio de dispositivo y conexión intermitente.
- Lectura fuera de pantalla, intervalos menores de diez segundos o mayores de una hora, dos pestañas y tiempos compartidos.
- Nota cero real, ausencia de nota, muestra vacía, una sola categoría o denominador temporal nulo.
- Fuentes ajenas, retiradas o irrelevantes; encuestas repetidas e importaciones parciales.
- Históricos sin medición o desglose: conservarlos sin reconstruir observaciones inexistentes.

## Requisitos

### Requisitos funcionales

- **FR-001**: Se DEBE conservar el contenido completo de las entregas admitidas, orden y procedencia; toda parte no procesada DEBE señalarse, nunca truncarse silenciosamente.
- **FR-002**: La extracción DEBE preservar lo visible sin recibir soluciones esperadas para completar escritura ambigua; la interpretación evaluativa permanece separada de la transcripción original.
- **FR-003**: Una respuesta continuada DEBE evaluarse una vez con sus páginas; asociaciones inciertas requieren revisión y evidencia gráfica relevante debe poder inspeccionarse visualmente.
- **FR-004**: Reintentar DEBE ejecutar trabajo pendiente, reutilizar etapas válidas compatibles y no duplicar entregas ni notas; cambios de evidencia, criterios o configuración invalidan la reutilización dependiente.
- **FR-005**: La decisión docente DEBE prevalecer sobre resultados tardíos; fallo, cola y ausencia de nota NO DEBEN mostrarse como cero ni autorizar publicación automática.
- **FR-006**: Los lotes DEBEN mostrar identidad reconocible y estados individuales, conservarse tras recarga/cambio de dispositivo y aislar fallos por estudiante.
- **FR-007**: La revisión DEBE reunir evidencia, criterio, puntaje y explicación de la pregunta seleccionada, con acceso a su página y ampliación cuando existan.
- **FR-008**: Guardar y continuar DEBE preservar historial, fórmula y cambios pendientes, avanzando solo tras persistencia confirmada. Guardar, confirmar y publicar siguen siendo decisiones distinguibles.
- **FR-009**: La revisión DEBE funcionar en móvil/escritorio y claro/oscuro sin desbordamientos, desplazamientos atrapados o controles inaccesibles, conservando selección y edición.
- **FR-010**: Las respuestas abiertas DEBEN valorarse por significado y criterios aprobados, admitiendo equivalencias y crédito parcial; DBA y criterios descriptivos no duplican puntos.
- **FR-011**: La retroalimentación DEBE separar razón del puntaje y orientación concreta cuando corresponda, ser fiel y adecuada al grado, sin razonamiento interno privado ni errores inventados.
- **FR-012**: El contexto recuperado DEBE respetar materia y autorización, identificar material y versión utilizados y declarar ausencia de fuentes pertinentes; no atribuir conocimiento general a fuentes inexistentes.
- **FR-013**: La interfaz DEBE distinguir extracción, valoración y verificación; confianza declarada o coincidencia de modelos no se presenta como exactitud validada o independencia inexistente.
- **FR-014**: La medición DEBE distinguir preparación, revisión, corrección, finalización y espera automática con sesión, condición, actividad, inicio, pausa, reanudación y cierre identificables.
- **FR-015**: Los intervalos DEBEN evitar duplicidades por reapertura, pestañas o eventos repetidos; los tiempos compartidos cuentan una vez. Datos incompletos y ajustes conservan procedencia.
- **FR-016**: No se DEBEN descartar tiempos por ser cortos/largos ni equiparar falta de interacción con inactividad; se ofrece pausa explícita y revisión de intervalos dudosos.
- **FR-017**: El ahorro observado DEBE usar comparaciones documentadas y reproducibles; estimaciones históricas se separan, faltantes no se imputan como cero y deterioros no se ocultan.
- **FR-018**: Primera sugerencia, criterios/versiones, ajustes y nota publicada DEBEN conservarse distinguibles; una confirmación informada por IA no sustituye una referencia independiente.
- **FR-019**: El conjunto de estudio DEBE registrar unidad, condición, docente seudonimizado, asignatura, grado, trabajo, respuesta, criterios y configuración efectiva, con cobertura y exclusiones justificadas.
- **FR-020**: Se DEBEN poder incorporar mediciones manuales, encuestas y valoraciones independientes de instrumentos autorizados, con versión y procedencia. No se exige una plataforma nativa completa de encuestas.
- **FR-021**: Los informes DEBEN separar ahorro, concordancia y satisfacción; Kappa no se rotula como porcentaje de acierto ni mide ahorro/satisfacción. Escala, categorías, tamaño y limitaciones son explícitos.
- **FR-022**: La calidad de retroalimentación DEBE registrarse mediante instrumento versionado con corrección, especificidad, claridad, utilidad y adecuación al grado; se declara si el revisor vio la IA.
- **FR-023**: Incorporar o acceder a conjuntos de estudio DEBE requerir autorización explícita; exportaciones minimizadas excluyen nombres, contactos, secretos y evidencia original por defecto. Seudonimización no equivale a anonimato.
- **FR-024**: Los tiempos automáticos DEBEN separar cola, espera de capacidad, lectura, valoración, verificación y guardado según corresponda; distinguir primer resultado y finalización grupal, incluyendo fallos/reintentos.
- **FR-025**: La capacidad DEBE respetar permisos, rutas institucionales/personales y límites del proveedor; no se cambian modelos ni retiran verificadores/controles para cumplir un tiempo sin aprobación específica.
- **FR-026**: La adopción DEBE ser progresiva, reversible y probada con datos sintéticos, sin alterar publicados, reprocesar históricos, exigir nuevas claves ni activar investigación automáticamente.

### Entidades clave

- **Evidencia y respuesta extraída**: contenido, páginas, legibilidad y relación con pregunta.
- **Valoración versionada**: primera sugerencia, criterios, explicación, fórmula y decisión docente; reutiliza el concepto de 016.
- **Referencia contextual**: fuente autorizada, versión y fragmento pertinente, o ausencia explícita.
- **Sesión docente**: actividad, condición, intervalos, pausas, incidencias y origen.
- **Conjunto de estudio**: unidades, autorización, participantes seudonimizados e instrumentos; separado de las notas oficiales.
- **Observación**: tiempos, sugerencia, ajustes, referencia independiente, calidad y datos faltantes.

## Criterios de éxito

- **SC-001**: En la matriz controlada todas las respuestas se conservan o señalan pendientes; cero omisiones silenciosas por longitud, duplicaciones por continuidad o respuestas ilegibles inventadas.
- **SC-002**: El ensayo de 30 estudiantes tiene cero pérdidas, duplicados o asignaciones incorrectas; un fallo deja a los otros 29 avanzando y el reintento ejecuta únicamente trabajo necesario.
- **SC-003**: En todos los ensayos, guardar/continuar conserva cambios y fórmula; errores o cambios pendientes impiden avanzar silenciosamente y el último estudiante muestra finalización clara.
- **SC-004**: Se puede abrir la página asociada en máximo dos acciones desde una pregunta; edición y avance son accesibles en 360×800, 390×844, 768×1024, 1366×768 y 1920×1080, claro y oscuro.
- **SC-005**: Los casos de Lenguaje y Ciencias Sociales cubren paráfrasis, argumento parcial, interpretación válida, error conceptual, blanco e ilegible; toda discrepancia con referencia docente se documenta antes del piloto.
- **SC-006**: Todos los ensayos de contexto identifican fuentes autorizadas o ausencia; ninguno atribuye referencias inventadas o material ajeno no autorizado.
- **SC-007**: Los intervalos conocidos reproducen tiempos con diferencia máxima de un segundo por intervalo, sin duplicidades; cierres incompletos se identifican y no inflan ahorro.
- **SC-008**: Las exportaciones sintéticas permiten reproducir indicadores y distinguir docente/trabajo/respuesta; faltantes, exclusiones, ahorro negativo y ausencia de referencia independiente son visibles.
- **SC-009**: Ningún registro anuncia éxito sin persistencia comprobable, ninguna consulta no autorizada revela datos y ningún conjunto de estudio se crea automáticamente con evidencia productiva.
- **SC-010**: La regresión conserva históricos, decisiones, publicación controlada y configuraciones; actualizar documentación no se presenta como implementación funcional.

## Supuestos

- Se conserva el título y objetivos de la propuesta. Reducción ≥40 % y Kappa ≥0,75 son metas por contrastar, no resultados garantizados ni motivos para manipular datos.
- Cinco entrevistas diagnósticas no fijan la muestra del estudio. La sugerencia de 8–12 docentes es logística, no cálculo estadístico ni requisito del producto.
- Antes del piloto real, usuario, asesor e institución deben resolver 200 evaluaciones frente a 200 respuestas, asignaturas, participantes, comparación y categorías; aprobar instrumento de calidad, permisos, retención y tratamiento de datos. Esto no bloquea correcciones sintéticas.
- La comparación incluye trabajo equivalente de calificación y retroalimentación. No se atribuye a cada tecnología el efecto del sistema completo sin comparación específica.
- No se cambian lenguajes/proveedores por su nombre, ni se incluyen nuevas herramientas, decoración general, plataforma completa de encuestas o garantía de uso sin conexión.
- Se conservan los objetivos de latencia de 031 sin declararlos alcanzados. La rama parte del commit local 35f5139 de 031, un commit por delante de origin/main observado al iniciar; esta actualización no lo publica ni fusiona.
- Secuencia: Specify → Clarify → aprobación humana de spec → Plan → aprobación humana de plan → Checklist/Tasks/Analyze → implementación/pruebas → Converge → PR/CI. No hay aprobación implícita ni push directo a main.

## Trazabilidad y propiedad

Evolución transversal con alcance aprobado, no segundo contrato de producto. Los dominios mantienen propiedad. El diseño está propuesto en 032; actualizar planes, tareas, contratos y pruebas propietarios durante implementación después de aprobar el plan. No se declara funcionalidad implementada.

| Propietario | Requisitos de esta evolución |
|---|---|
| [008 Calificaciones](../008-calificaciones/spec.md) y [016 Desglose](../016-calificacion-explicable/spec.md) | FR-005, FR-007–011, FR-013, FR-018: revisión, explicación y decisión |
| [020 Extracción](../020-deepseek-vision/spec.md) | FR-001–003: fidelidad y continuidad |
| [009 RAG](../009-xali-rag-refuerzos/spec.md) | FR-012: contexto y procedencia |
| [011 Impacto](../011-reportes-analitica-impacto/spec.md) | FR-014–023: medición, instrumentos y exportación |
| [012 Jobs](../012-ia-jobs-produccion/spec.md) y [031 Rendimiento](../031-acelerar-pipelines-ia/spec.md) | FR-004–006, FR-024–025: recuperación, capacidad y tiempos |
| [002 Roles](../002-arquitectura-roles-seguridad/spec.md) | FR-023 y FR-026 transversales; sin crear un rol nuevo de investigador |

## Hallazgos de partida y orden

- Confirmados por lectura local: recorte de respuestas extensas; ahorro con constantes; eventos de confirmación sin la asociación requerida para medir tiempos; encuestas sin persistencia; extracción por página con solución esperada en contexto.
- Pendiente de reproducción: reintento marcado retrying que el trabajador no reconoce como pendiente. No se afirma reproducción ni corrección productiva.
- Mejoras propuestas: evidencia/guía/desglose dispersos, identidad opaca en lote y confianza del modelo no calibrada como exactitud.
- Orden: cerrar confiabilidad y medición; concentrar revisión; validar abiertas/contexto; preparar instrumentos. Cada incremento exige pruebas proporcionales y conservación del flujo previo.
- Ningún hallazgo acredita piloto institucional ni metas alcanzadas.
