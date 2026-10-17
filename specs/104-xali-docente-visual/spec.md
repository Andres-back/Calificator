# Especificación: Xali docente por materia y apoyos visuales

**Rama**: `codex/104-xali-docente-visual` | **Creada**: 2026-10-17 | **Estado**: Spec y plan aprobados por el usuario el 2026-10-17 | **Issue**: [#215](https://github.com/Andres-back/Calificator/issues/215)

Evoluciona el dominio 009 de Xali. Formaliza la solicitud adicional documentada con cámaras/iconos (#214), pero tiene alcance y entrega propios. No afirma funcionamiento implementado ni modifica producción.

## Escenarios de usuario y pruebas

### Historia 1 - Hablar con el asistente de mi materia (Prioridad: P1)

Como profesor, selecciono mi materia para recibir ayuda pedagógica adaptada a su área y grado, sin repetir esos datos en cada consulta ni ser tratado como estudiante.

**Razón de prioridad**: elegir una materia debe cambiar el contexto real de la ayuda, no solo un rótulo.
**Prueba independiente**: sin documentos cargados, seleccionar Matemáticas de sexto y pedir ejercicios; el asistente usa esa materia, permite soluciones docentes y no inventa datos faltantes. Cambiar a Lenguaje no mezcla conversaciones.

**Aceptación**:
1. **Dado** un profesor autorizado en una materia, **cuando** pregunta, **entonces** el asistente conoce su rol y el nombre, área y grado registrados de esa materia; muestra «Hablando sobre…» y adapta la respuesta sin afirmar que esa es la única asignatura que enseña.
2. **Dado** que no hay documentos o falla la búsqueda de materiales, **cuando** solicita ayuda, **entonces** puede recibir una propuesta general de esa materia con aviso de que no se consultaron fuentes; no se inventan citas ni se bloquea toda ayuda.
3. **Dado** material pertinente autorizado, **cuando** complementa una respuesta, **entonces** se identifican las fuentes reales utilizadas y se distinguen de los ejemplos propuestos. No se incorporan materiales privados de otra materia/docente.
4. **Dado** que no seleccionó materia, **cuando** abre ayuda general, **entonces** no se mezclan mensajes de materias particulares ni «Borrar esta conversación» elimina conversaciones de otras materias.
5. **Dado** una materia ajena sin autorización, **cuando** intenta consultar, recuperar o borrar su conversación, **entonces** se rechaza sin acceder a materiales ni llamar al asistente.

### Historia 2 - Explicar con ejercicios, tablas y figuras (Prioridad: P1)

Como profesor, quiero pedir ejercicios y apoyos visuales útiles para enseñar, verlos completos y consultar sus soluciones razonadas cuando lo necesite.

**Razón de prioridad**: una explicación visual debe mostrarse de verdad y ser coherente con los datos; no basta un enlace inventado o código que el profesor tenga que ejecutar.
**Prueba independiente**: solicitar una tabla y plano con A(-2,3), O(0,0), B(3,-1), un gráfico de barras con valores dados y una figura de medidas conocidas; comprobar posiciones, unidades y consistencia.

**Aceptación**:
1. **Dado** un pedido de coordenadas, **cuando** responde, **entonces** muestra plano, ejes, origen, puntos y tabla equivalente sin cambiar signos ni valores.
2. **Dado** datos explícitos, **cuando** crea un gráfico de barras o líneas, **entonces** representa exactamente esos datos, con título, etiquetas y unidades suministradas. Si faltan datos, pregunta o declara que son de ejemplo.
3. **Dado** una figura geométrica compatible, **cuando** la muestra, **entonces** conserva proporciones/medidas declaradas y ofrece descripción equivalente; no promete una construcción exacta que no puede representar.
4. **Dado** un profesor que solicita soluciones para preparar su clase, **cuando** responde, **entonces** puede explicar soluciones razonadas; el estudiante sigue sin obtener las soluciones docentes ni notas no publicadas.

### Historia 3 - Leer sin saturación ni pérdidas en celular (Prioridad: P2)

Como docente en celular, quiero leer la explicación, ampliar cada apoyo visual y cambiar de materia sin recibir respuestas cruzadas ni perder el acceso a mis conversaciones guardadas.

**Razón de prioridad**: el programa está pensado principalmente para celular y debe seguir utilizable al escribir.
**Prueba independiente**: en 360/390/1440 px y ambos temas, ampliar/cerrar plano y tabla; cambiar materia durante una respuesta demorada, un error y un borrado de historial.

**Aceptación**:
1. **Dado** un visual, **cuando** pulsa «Ampliar», **entonces** lo ve con título y descripción, puede cerrar con botón/Escape y recupera el foco. Las tablas se desplazan dentro de su sección, sin desbordar toda la página.
2. **Dado** un envío pendiente en Matemáticas, **cuando** cambia a Lenguaje o de cuenta, **entonces** la respuesta tardía, su error y sus controles no se insertan en el nuevo contexto; una respuesta guardada sigue consultable en la conversación original.
3. **Dado** un fallo incierto de conexión, **cuando** quiere reintentar, **entonces** primero se comprueba el historial original para no reenviar automáticamente una consulta que pudo terminar. El profesor mantiene control de cualquier envío nuevo.
4. **Dado** un mensaje antiguo solo de texto o un visual inválido, **cuando** lo abre, **entonces** conserva una explicación legible y una recuperación comprensible, sin ejecutar instrucciones técnicas.

### Casos límite

- Materia sin grado/área: usar lo conocido y preguntar solo si es necesario; no inferir edad ni identidad de alumnos.
- Permiso revocado, materia eliminada o sesión vencida: mensaje sencillo; no exponer fuentes ni reutilizar respuestas de otra cuenta.
- Conversación general no significa «todas las materias»; recuperar/borrar se limita al contexto indicado y al usuario actual.
- Búsqueda de fuentes lenta/no disponible: ayuda general identificada como tal; una selección de materia por sí sola no inicia generación.
- Valores no finitos, tabla irregular, escalas invertidas, puntos fuera del plano, visual excesivo o tipo no soportado: no dibujar un resultado engañoso; conservar texto/tabla válidos y explicar el límite.
- Fórmulas, etiquetas, archivos o instrucciones maliciosas en contenido: no ejecutar código, abrir enlaces fabricados ni revelar datos internos. Materiales recuperados son referencias, no instrucciones del sistema.
- Cancelar/navegar no garantiza detener un procesamiento ya recibido por el servidor; su resultado nunca cambia notas/evaluaciones ni aparece en otra materia.
- Doble toque y reintento: un envío activo por conversación en la vista; nada de reintentos automáticos de conexión con resultado desconocido.

## Requisitos

### Requisitos funcionales

- **FR-001**: Xali DEBE distinguir docente de estudiante y usar el contexto autorizado de la materia (nombre, área y grado existentes), independientemente de documentos. La selección DEBE ser visible y no asumir una única especialidad por profesor.
- **FR-002**: Acceso al contexto, conversación, materiales y borrado DEBE validarse en servidor para propietario autorizado o administrador; historial y contexto general DEBEN quedar separados por usuario y materia.
- **FR-003**: Las fuentes pertinentes DEBEN limitarse a la materia y propietario autorizados, identificarse cuando se usan y tratarse como referencias; ausencia/error DEBE permitir ayuda general explícita sin citas inventadas.
- **FR-004**: El docente DEBE poder solicitar ejercicios, explicaciones, actividades y soluciones razonadas. El flujo estudiantil y sus restricciones de evaluaciones/retroalimentación DEBEN conservarse.
- **FR-005**: El asistente DEBE mostrar tablas, gráficos de barras/líneas, figuras geométricas básicas y planos cartesianos solicitados, con título, descripción y datos coherentes; no sustituirlos por código o enlaces inexistentes.
- **FR-006**: Los apoyos visuales DEBEN respetar valores, signos, dominios, proporciones y unidades indicadas; ejemplos DEBEN declararse y datos insuficientes/no soportados DEBEN producir aclaración o alternativa útil, no precisión inventada.
- **FR-007**: Visuales DEBEN poder ampliarse y leerse desde 360 px a escritorio, en ambos temas, con teclado/foco y controles táctiles de 44 px; tablas/fórmulas pueden desplazarse dentro de su contenedor, no toda la página. No depender de hover o color para explicar datos.
- **FR-008**: Cambios de cuenta/materia, cierre, respuestas tardías, carga/error y reintento DEBEN conservar el contexto correcto, el texto guardado y los controles; fallos inciertos NO DEBEN causar reenvíos automáticos ni mensajes duplicados visibles.
- **FR-009**: Mensajes anteriores DEBEN seguir legibles. Contenido visual inválido, excesivo o de versión desconocida NO DEBE ejecutarse ni impedir ver texto válido; debe ofrecer explicación comprensible sin datos técnicos.
- **FR-010**: No se DEBEN alterar notas, evidencias, evaluaciones, criterios ni reglas de calificación; los ejemplos NO DEBEN requerir datos personales de alumnos ni cambios de proveedor o claves.
- **FR-011**: Dibujar/ampliar/seleccionar materia NO DEBE añadir llamadas de generación; apoyos matemáticos se basan en datos verificables, no en imágenes generativas. Ilustraciones creativas de pago quedan fuera de esta entrega y requieren autorización aparte.

### Entidades clave

- **Conversación docente**: usuario, materia concreta o contexto general, mensajes y estado de envío; separada del flujo de ayuda estudiantil.
- **Contexto pedagógico**: rol validado, datos registrados de materia y fuentes pertinentes autorizadas, con límites explícitos de disponibilidad.
- **Apoyo visual**: tipo, título, descripción, datos y representación verificable que acompaña una respuesta, sin facultad para ejecutar acciones.

## Criterios de éxito

- **SC-001**: En pruebas con Matemáticas sexto y Lenguaje cuarto sin documentos, el 100 % de respuestas de prueba recibe la materia/rol correctos; los intentos de materia ajena se rechazan antes de consultar materiales o generar.
- **SC-002**: Tabla, barras, líneas, figura y plano de las pruebas coinciden con el 100 % de los valores/etiquetas especificados. A(-2,3), O(0,0) y B(3,-1) se ubican en cuadrantes/ejes correctos; datos inválidos no producen un visual aparentemente correcto.
- **SC-003**: En 360, 390 y 1440 px, ambos temas y dos motores de navegador, los cinco tipos se leen/amplían sin scroll horizontal de página; foco, cierre y lectura alternativa siguen accesibles.
- **SC-004**: Todas las pruebas de respuesta tardía, cambio de cuenta/materia, borrado, doble toque y fallo incierto mantienen separación de contexto y cero modificaciones de registros académicos.
- **SC-005**: La conversación textual previa permanece legible sin conversión masiva; seleccionar materia o ampliar un visual produce cero llamadas de generación adicionales y no cambia el flujo estudiantil.

## Supuestos

- Primer alcance: tablas, gráficos de barras/líneas, planos con puntos/segmentos/rectas y figuras básicas (segmento, círculo, rectángulo, polígono y etiquetas). Curvas simbólicas arbitrarias, geometría dinámica avanzada y dibujos artísticos quedan fuera.
- El asistente conoce la materia seleccionada en esa conversación, no todas las asignaturas o características personales del profesor.
- No cambia la selección institucional/docente de modelos, embeddings ni claves. Se reutiliza el historial existente sin migrar mensajes antiguos ni modificar calificaciones.
- Una representación numéricamente fiel no demuestra que toda explicación pedagógica del modelo sea correcta; el docente conserva revisión y decisión.
- No se usarán datos ni consultas reales de producción para implementar/probar. Emulación de tamaños/WebKit no se presentará como prueba física de teclado o cámara de teléfonos.
- Spec y plan requieren aprobación humana antes de implementar. La aprobación de cámaras/iconos y su CI no autorizan fusión, despliegue ni ejecución del nuevo alcance del bot.
