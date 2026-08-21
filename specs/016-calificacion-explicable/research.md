# Investigación: Calificación explicable y auditable

## 1. Fuente canónica del desglose

**Decisión**: Persistir versiones normalizadas de desglose y componentes; conservar `Calificacion.resultado_json` únicamente para compatibilidad heredada y telemetría sanitizada.

**Razón**: El JSON actual mezcla estado del trabajo, salida de proveedores, timeline y criterios de un evaluador. No ofrece identidad estable por pregunta, concurrencia, FK para reclamos ni historial inmutable.

**Alternativas consideradas**:
- Ampliar solamente `resultado_json`: menor migración, pero mantiene escrituras opacas y difícil validación.
- Reemplazar de inmediato `calificaciones`: riesgo innecesario para notas y reportes existentes.

## 2. Cálculo de la nota

**Decisión**: Crear una calculadora pura basada en `Decimal`: `nota_base = puntos_obtenidos / puntos_posibles × nota_maxima`; después aplica un ajuste global explícito, limita al rango permitido y redondea con `ROUND_HALF_UP` a dos decimales por defecto. La regla y precisión se guardan con la fórmula.

**Razón**: Permite reproducir exactamente la nota, evita diferencias binarias y conserva el `NUMERIC(6,2)` existente.

**Alternativas consideradas**:
- Conservar el total libre del LLM: no es auditable ni reproducible.
- Usar `float` del frontend: puede discrepar del backend y no sirve como autoridad.

## 3. Identidad y cobertura de componentes

**Decisión**: Construir el esqueleto desde el blueprint antes de calificar. Las claves estables serán `pregunta:<id-o-numero>`, `rubrica:<id-o-orden>` y `manual:<calificacion_id>`. El proveedor solo puede completar claves entregadas por el sistema.

**Razón**: Garantiza que cada componente esperado aparezca una vez, detecta faltantes y evita que dos fotos solapadas dupliquen una pregunta.

**Alternativas consideradas**:
- Aceptar libremente la lista generada por visión: confunde extracción con definición académica.
- Emparejar solo por texto: es frágil ante OCR, tildes y reformulaciones.

## 4. Consenso entre evaluadores

**Decisión**: Comparar por clave estable. La validación objetiva manda. Para respuestas abiertas, puntajes/estados compatibles forman consenso; diferencias mayores al máximo entre 0,10 puntos y 10 % del máximo del componente, o estados semánticamente incompatibles, quedan como discrepancia pendiente. El total puede mostrarse como sugerencia, pero no confirmarse/publicarse con pendientes.

**Razón**: Dos sumas iguales pueden ocultar errores compensados entre preguntas. Un umbral relativo funciona en preguntas de distinto peso.

**Alternativas consideradas**:
- Comparar solo nota total: problema actual.
- Hacer que un tercer modelo elija silenciosamente: conserva opacidad y dependencia de proveedor.
- Bloquear ante cualquier centésima: generaría revisiones innecesarias por redondeo.

## 5. Privacidad de las explicaciones automáticas

**Decisión**: Persistir únicamente campos de una lista permitida. La explicación será una conclusión pedagógica breve sustentada en respuesta, referencia y criterio; se descartarán `_reasoning`, prompts, mensajes crudos, secretos y campos desconocidos del proveedor.

**Razón**: La transparencia requerida es sobre evidencia y regla de puntuación, no sobre razonamiento privado del modelo.

**Alternativas consideradas**:
- Guardar toda la respuesta cruda para auditoría: aumenta exposición y puede persistir información prohibida.
- No guardar procedencia: impediría observar proveedor/modelo y depurar fallos.

## 6. Edición docente y concurrencia

**Decisión**: Cada guardado usa `version_esperada` y crea una nueva versión completa. Un 409 obliga a recargar si otro actor modificó la nota. Los cambios registran motivo interno, explicación estudiantil y valores anterior/nuevo.

**Razón**: La copia inmutable simplifica historial y evita que dos sesiones sobrescriban decisiones.

**Alternativas consideradas**:
- Actualizar filas en sitio: pierde la fotografía exacta publicada.
- Bloqueo pesimista largo: mala experiencia web y riesgo de sesiones abandonadas.

## 7. Visibilidad estudiantil

**Decisión**: Usar un DTO específico generado en servidor. Solo se sirve la versión publicada; la referencia correcta se reemplaza por `null` y `referencia_oculta=true` mientras las entregas sigan abiertas, salvo liberación docente explícita.

**Razón**: Evita filtrar claves en payloads o herramientas del navegador.

**Alternativas consideradas**:
- Reutilizar el DTO docente y ocultar secciones en React: inseguro.
- Ocultar todas las explicaciones hasta cerrar entregas: retrasa retroalimentación que no contiene la clave.

## 8. Compatibilidad con modalidades e históricos

**Decisión**: Online, visión, mixto y rúbrica generan el mismo desglose. Una nota manual crea un componente manual. Las calificaciones anteriores sin desglose quedan como `legacy_unavailable`; no hay backfill inferido.

**Razón**: Mantiene un solo concepto sin falsificar respuestas históricas.

**Alternativas consideradas**:
- Crear componentes repartiendo el total viejo: presentaría como real algo que nunca se evaluó por pregunta.

## 9. Idempotencia del worker

**Decisión**: El desglose automático incluye `pipeline_run_id` único por calificación. Repetir la misma ejecución devuelve la versión existente. Un reintento distinto solo sustituye una propuesta automática no revisada; una versión tocada por el docente nunca se sobrescribe.

**Razón**: Conserva la regla de una calificación y un conjunto vigente por entrega aun con reintentos y lotes.

**Alternativas consideradas**:
- Borrar y recrear siempre: rompe referencias e historial.
- Añadir versiones ilimitadas por redelivery de Celery: duplica auditoría sin decisión real.

## 10. DBA, rúbricas y fuente del puntaje

**Decisión**: Mantener DBA como referencia curricular no puntuable. Una rúbrica solo genera componentes y puntos cuando el profesor configuró criterios puntuables y pesos; una rúbrica descriptiva sirve para explicar cada respuesta sin sumar una segunda vez.

**Razón**: El docente conserva libertad para usar DBA, rúbrica, ambos o ninguno, mientras el estudiante puede saber exactamente qué evidencia justificó cada punto.

**Alternativas consideradas**:
- Convertir automáticamente cada DBA en puntos: confunde alineación curricular con evaluación y altera la intención docente.
- Sumar preguntas y rúbrica completa sin ponderación: duplica el mérito evaluado.

## 11. Adopción sin afectar el flujo vigente

**Decisión**: Separar el despliegue en esquema compatible, generación controlada y autoridad de cálculo mediante una bandera configurable. Durante validación se puede comparar la nota vigente con la fórmula nueva sin modificar ni publicar el resultado nuevo.

**Razón**: La calificación actual funciona y contiene datos sensibles. Un cambio de autoridad debe poder observarse, activarse y revertirse sin migraciones destructivas.

**Alternativas consideradas**:
- Sustituir el pipeline en un solo despliegue: eleva el riesgo de regresión.
- Mantener dos motores indefinidamente: crea resultados divergentes y deuda; el modo paralelo será temporal y medido.
