# Especificación: Calidad de fotografía y claves seguras al digitalizar

**Rama**: `codex/064-calidad-imagen-claves`

**Creada**: 2026-09-23

**Estado**: Aprobada

**Issue**: [#129](https://github.com/Andres-back/Calificator/issues/129)

**Entrada**: Mejorar fotografías borrosas u oscuras tomadas con celulares de gama baja, sin exigir encuadrar esquinas, y evitar que las respuestas de una evaluación ya resuelta se registren como respuestas correctas durante la digitalización.

## Escenarios de usuario y pruebas

### Historia 1 — Digitalizar sin convertir respuestas del estudiante en claves (Prioridad: P1)

Como docente quiero digitalizar una evaluación impresa, incluso si ya fue respondida, para recuperar sus preguntas y construir una clave independiente sin que los aciertos o errores escritos por el estudiante se conviertan automáticamente en la solución oficial.

**Por qué esta prioridad**: Una clave incorrecta puede afectar todas las calificaciones posteriores de una evaluación y vulnerar la integridad del proceso.

**Prueba independiente**: Digitalizar una evaluación con varias respuestas manuscritas deliberadamente equivocadas y comprobar que esas respuestas no aparecen confirmadas como soluciones correctas.

**Escenarios de aceptación**:

1. **Dada** una evaluación respondida con respuestas incorrectas, **cuando** el docente la digitaliza, **entonces** el sistema extrae las preguntas, separa las marcas observadas y no confirma esas marcas como clave.
2. **Dada** una pregunta cuya solución puede derivarse con claridad del enunciado y opciones impresas, **cuando** finaliza la digitalización, **entonces** el sistema puede proponer una respuesta correcta con explicación y nivel de confianza para revisión docente.
3. **Dada** una pregunta abierta o incompleta cuya solución no puede determinarse independientemente, **cuando** finaliza la digitalización, **entonces** queda marcada como “respuesta correcta por confirmar” y la evaluación no puede publicarse con esa clave incompleta.
4. **Dada** una evaluación digitalizada anteriormente, **cuando** se despliega este cambio, **entonces** sus preguntas, claves, entregas y calificaciones no se modifican retroactivamente.

---

### Historia 2 — Recibir ayuda con fotografías difíciles sin pasos frustrantes (Prioridad: P2)

Como docente o estudiante que usa un celular de gama baja quiero que el sistema detecte si mi fotografía está borrosa, demasiado oscura o sobreexpuesta, la prepare de manera segura y me dé una recomendación sencilla solo cuando sea necesario.

**Por qué esta prioridad**: Evita esperar una extracción que probablemente fallará y mejora la legibilidad sin convertir la captura en un escáner complejo.

**Prueba independiente**: Seleccionar fotografías claras, borrosas, oscuras y sobreexpuestas desde un teléfono o emulación móvil y verificar diagnóstico, advertencia y continuidad del flujo.

**Escenarios de aceptación**:

1. **Dada** una fotografía suficientemente legible, **cuando** se agrega como evidencia, **entonces** puede continuar sin pasos adicionales.
2. **Dada** una fotografía borrosa u oscura pero potencialmente utilizable, **cuando** se analiza, **entonces** el usuario recibe un mensaje breve con opción de repetirla o continuar.
3. **Dada** una fotografía dañada o sin información recuperable, **cuando** se analiza, **entonces** se solicita reemplazarla antes de iniciar visión.
4. **Dada** una fotografía inclinada o con iluminación irregular, **cuando** el servidor la prepara, **entonces** genera una versión legible sin borrar trazos, colores, diagramas ni correcciones del estudiante.
5. **Dadas** varias hojas, **cuando** solo una presenta baja calidad, **entonces** el diagnóstico identifica esa hoja y conserva las demás.

---

### Historia 3 — Recuperar fallos sin inventar notas ni repetir todo el trabajo (Prioridad: P3)

Como docente quiero que una hoja ilegible quede claramente pendiente y pueda reemplazarse o revisarse, sin que el sistema la interprete como respuesta en blanco o nota cero.

**Por qué esta prioridad**: Protege al estudiante y reduce reintentos innecesarios del paquete completo.

**Prueba independiente**: Procesar una entrega con una respuesta ilegible y comprobar que aparece como revisión requerida, conserva la evidencia y no recibe cero automático.

**Escenarios de aceptación**:

1. **Dada** una respuesta que no puede leerse con confianza, **cuando** termina la extracción, **entonces** se marca para revisión y no se transforma en respuesta vacía ni incorrecta confirmada.
2. **Dada** una hoja problemática dentro de un paquete, **cuando** se reintenta, **entonces** se reutiliza la evidencia guardada y no se duplican entregas, calificaciones ni archivos.

### Casos límite

- Fotografías pequeñas que no deben ampliarse artificialmente para aparentar detalle.
- Hojas con lápiz tenue, tinta de colores, diagramas, tablas, tachones o correcciones.
- Fondos oscuros, sombras parciales y reflejos pequeños que no impiden leer la respuesta.
- Fotografías muy comprimidas o con metadatos de orientación incorrectos.
- Evaluaciones con respuesta modelo impresa, respuestas manuscritas y anotaciones docentes en la misma hoja.
- Preguntas abiertas cuya respuesta correcta depende de una rúbrica o material no visible.
- PDF original y paquetes de hasta diez fotografías con calidades diferentes.
- Navegadores que no permiten análisis previo o captura directa: el servidor mantiene la validación definitiva.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE evaluar por hoja al menos nitidez, iluminación y resolución útil antes del procesamiento visual definitivo.
- **FR-002**: El sistema DEBE expresar problemas de calidad en lenguaje sencillo y señalar la hoja afectada.
- **FR-003**: Una fotografía dudosa pero utilizable DEBE permitir “Repetir foto” o “Continuar de todos modos”; no se exigirán esquinas visibles ni ajuste manual obligatorio.
- **FR-004**: Un archivo dañado o sin información visual recuperable DEBE rechazarse antes de consumir un modelo de visión.
- **FR-005**: El sistema DEBE preservar el archivo original y usar copias derivadas para corrección de orientación, iluminación, contraste y tamaño.
- **FR-006**: La preparación automática NO DEBE eliminar colores, dibujos, signos matemáticos, tachones ni trazos manuscritos relevantes.
- **FR-007**: La evaluación previa en el dispositivo DEBE ser opcional y liviana; la validación del servidor será la autoridad común para todos los navegadores.
- **FR-008**: La digitalización DEBE clasificar por separado texto impreso, respuesta observada del estudiante y respuesta correcta propuesta.
- **FR-009**: Una respuesta manuscrita o marcada por el estudiante NO DEBE convertirse en clave correcta únicamente por estar presente en la evidencia.
- **FR-010**: Toda respuesta correcta propuesta DEBE tener origen independiente identificable: solución impresa explícita, relación inequívoca entre opciones y enunciado, o resolución razonada separada de la extracción.
- **FR-011**: Cuando no exista evidencia suficiente para construir una clave independiente, la pregunta DEBE quedar pendiente de confirmación docente.
- **FR-012**: Una evaluación con claves pendientes NO DEBE publicarse ni usarse para calificación automática hasta que el docente las confirme.
- **FR-013**: La interfaz de revisión DEBE mostrar el enunciado, la respuesta observada —si existe—, la respuesta correcta propuesta, su explicación y su estado de confirmación sin confundirlos.
- **FR-014**: Una respuesta ilegible DEBE generar revisión, nunca una respuesta en blanco o una nota cero automática.
- **FR-015**: Los reintentos DEBEN ser idempotentes y conservar una sola evaluación, entrega y calificación vigente.
- **FR-016**: El cambio DEBE mantener compatibilidad con una fotografía, múltiples fotografías, PDF y datos existentes.
- **FR-017**: El sistema DEBE registrar métricas de calidad y decisiones de revisión sin guardar contenido sensible adicional en logs.

### Entidades clave

- **Diagnóstico de hoja**: Resultado de calidad por página; contiene indicadores de nitidez, iluminación, resolución, estado y recomendaciones comprensibles.
- **Variante preparada**: Copia derivada de una hoja original para procesamiento; nunca reemplaza la evidencia fuente.
- **Respuesta observada**: Marca, texto, selección o procedimiento detectado en la hoja del estudiante; no expresa corrección.
- **Clave propuesta**: Respuesta candidata obtenida independientemente, con explicación, confianza y estado de confirmación.
- **Pregunta digitalizada**: Pregunta reconstruida que relaciona enunciado, opciones, respuesta observada y clave propuesta sin mezclarlas.

## Criterios de éxito

### Resultados medibles

- **SC-001**: El 100 % de las fotografías de prueba claramente dañadas, extremadamente oscuras o desenfocadas produce una advertencia antes de invocar visión.
- **SC-002**: Al menos el 90 % de fotografías legibles del conjunto de prueba continúa sin bloqueo ni ajuste manual obligatorio.
- **SC-003**: En el conjunto de evaluaciones resueltas con respuestas deliberadamente incorrectas, ninguna respuesta manuscrita incorrecta se confirma automáticamente como clave.
- **SC-004**: El 100 % de las preguntas sin solución independiente suficiente queda pendiente de confirmación docente.
- **SC-005**: Ninguna respuesta ilegible del conjunto de prueba recibe cero automático por causa exclusiva de calidad de imagen.
- **SC-006**: El diagnóstico inicial de una fotografía muestra resultado visible en menos de tres segundos en el flujo móvil normal.
- **SC-007**: Una evidencia preparada conserva visualmente escritura, diagramas y colores relevantes en todos los casos de regresión aprobados.
- **SC-008**: Los flujos existentes de una foto, multihoja y PDF continúan generando una sola entidad de negocio y pasan sus pruebas de regresión.

## Supuestos

- El usuario prefiere recomendaciones simples sobre calidad y no un asistente obligatorio para encuadrar cuatro esquinas.
- Las fotografías dudosas pueden continuar bajo responsabilidad del usuario; solo los archivos irrecuperables se bloquean.
- Las claves propuestas por IA siempre permanecen sujetas a revisión del docente antes de publicar la evaluación.
- No se recalcularán evaluaciones ni calificaciones existentes automáticamente.
- El mismo contrato de preparación se compartirá entre digitalización y calificación para evitar resultados divergentes.
