# Investigación y decisiones

## Diagnóstico confirmado

Decisión: separar tiempos agotados de caídas del proveedor. En la ventana auditada hubo 23 trabajos, cuatro intervalos solapados, tres llamadas del principal y dos del verificador con espera agotada alrededor de 45 segundos. No se registraron reinicios ni falta de memoria. El registro agregado no conserva suficiente precisión para asignar la demora al proveedor o a la red.

Razón: arreglar únicamente el presupuesto de salida de Spec 118 no atiende el plazo de transporte. Las rutas configurables de agents.py tampoco pasan por provider_capacity, aunque el trabajador tiene concurrencia cuatro.

Alternativas descartadas: atribuirlo a veinte solicitudes simultáneas, cambiar de modelo sin evidencia o aumentar indiscriminadamente el número de llamadas.

## Tope solicitado

Decisión: política de calificación explícita de 60 segundos por inferencia, con asyncio.timeout para plazo total y límites HTTPX finitos; la espera de capacidad ocurre antes. Capturar y mostrar la política, sin modificar timeout compartido de proveedores, modelos ni claves. Las llamadas exitosas devuelven inmediatamente.

Alternativas: 120 segundos rechazados por el usuario; read-timeout aislado no garantiza máximo total ante recepción fragmentada; cambiar conexión compartida alteraría Xali y recursos.

## Recuperación durable

Decisión: controlador de etapa con resultados AgentResult validados, huella de entrega/evidencia/blueprint/rutas y conteo persistido antes de cada intento. Máximo dos intentos totales por partición/rol; un reinicio consume el intento en vuelo en vez de reiniciar el contador. Persistencia bajo claim y lease del trabajo existente. Reutilizar extracción compatible antes de volver a leer.

Alternativas: reintentar el pipeline completo duplica tiempo y gasto; reintentos independientes en HTTP/orquestador/Celery multiplican llamadas. Reutilizar entre trabajos, estudiantes o configuraciones diferentes queda excluido.

## Verificación y estados

Decisión: repetir el modelo pendiente del rol, no reemplazarlo por el árbitro. El principal recuperado siempre recibe el verificador. Fallo permanente o dos intentos agotados conserva la propuesta, requiere revisión docente y expone la etapa pendiente. La respuesta correcta no se certifica únicamente porque una llamada terminó.

Alternativa: mantener success de cola sin metadatos de completitud oculta revisiones parciales; cambiar todos los estados de calificación rompería contratos existentes. Se usa requires_review de trabajos, ya soportado, y campos aditivos de completitud.

## Validación y activación

Decisión: proveedores simulados y base aislada; cero inferencias pagadas o recalificaciones reales. Pruebas de veinte trabajos, fallos persistentes, reinicios, pérdida de claim y prioridad docente. La autorización anterior de pruebas reales está agotada. Merge/activación solo con autorización y CI verde; el despliegue no reenvía registros existentes.
