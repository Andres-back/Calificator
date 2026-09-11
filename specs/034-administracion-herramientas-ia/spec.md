# Especificación: Administración efectiva de herramientas e IA

**Rama**: `codex/034-administracion-herramientas-ia` | **Creada**: 2026-09-10 | **Estado**: Especificación y plan técnico aprobados; implementación autorizada | **Issue**: [#70](https://github.com/Andres-back/Calificator/issues/70)

El administrador necesita gestionar las funciones existentes sin depender de conocer nombres internos o de editar el servidor. Debe distinguir qué eligió, qué resolverá el sistema para un trabajo nuevo y qué modelo ejecutó realmente un trabajo anterior. Esta evolución conserva como propietarios 012 para operación IA, 029 para permisos, 006/026 para recursos y 008/016 para calificación.

## Aclaraciones

### Sesión 2026-09-10

- P: ¿Se aprueba que el alcance incluya pausar/reactivar herramientas y configurar individualmente los modelos que realmente consume cada etapa? → R: Sí, aprobado.

## Escenarios de usuario y pruebas

### Historia 1 - Entender qué IA utiliza cada función (Prioridad: P1)

Como administrador quiero un resumen por función: calificación, digitalización, evaluaciones y rúbricas, recursos educativos, presentaciones, imágenes, Xali y recuperación de contexto. Cada función muestra sus etapas reales, no una elección genérica que oculte otras llamadas.

**Razón de prioridad**: Un modelo configurado no demuestra que sea el ejecutado y una etiqueta ambigua produce cambios equivocados.

**Prueba independiente**: Contrastar una calificación con extracción, valoración, verificación y revisión adicional; localizar proveedor, modelo y origen de cada decisión sin abrir el servidor.

**Aceptación**:
1. Dada una función, al abrirla se ven las etapas ejecutables, las condicionales y las que no utilizan IA, con proveedor, identificador exacto de modelo, respaldo y procedencia de configuración.
2. Dado un modelo heredado, se muestra su valor resuelto y de dónde se hereda, sin dejar solo «predeterminado».
3. Dado un trabajo anterior, se distinguen su configuración fijada, modelos realmente registrados y configuración vigente; una sustitución explica etapa y motivo conocido.
4. Dada ausencia de trazabilidad histórica, aparece «No registrado»; nunca se completa el pasado con la configuración actual ni se presenta una consulta de configuración como prueba de disponibilidad.

### Historia 2 - Cambiar modelos con seguridad (Prioridad: P1)

Como administrador quiero modificar desde la función el modelo de cada etapa admitida, validar la selección y revisar su impacto antes de publicar.

**Razón de prioridad**: La facilidad de configuración no debe interrumpir trabajos ni cambiar la nota de trabajos ya realizados.

**Prueba independiente**: Cambiar solo la extracción de una calificación, previsualizar la configuración resultante y comprobar que valoración/verificación y un trabajo en curso permanecen intactos.

**Aceptación**:
1. Dada una etapa, se ofrecen solo proveedores y modelos que el flujo admite realmente; la capacidad declarada de visión por sí sola no acredita integración completa.
2. Dado un borrador, se muestra antes/después y funciones afectadas por herencia. Validar configuración no consume IA; una prueba real es separada, explícita y advierte posible consumo.
3. Dado guardado confirmado, los trabajos aceptados posteriormente fijan la nueva versión; los ya aceptados conservan la anterior, incluidos sus reintentos, salvo incompatibilidad informada y sin sustitución silenciosa.
4. Dados dos administradores editando, el segundo recibe conflicto conservando borrador. Restaurar crea una nueva versión auditable para trabajos futuros, sin revertir notas ni evidencias.
5. Dada una conexión sin credencial válida o modelo incompatible, no se publica como funcional; se explica qué falta. Un proveedor desactivado con dependencias exige resolverlas antes de publicar.

### Historia 3 - Administrar las herramientas existentes (Prioridad: P1)

Como administrador quiero buscar cada recurso existente, ver para qué sirve y qué IA utiliza, pausar nuevas generaciones o reactivarlas, y decidir si hereda el modelo de recursos o utiliza una excepción explícita.

**Razón de prioridad**: Las herramientas deben ser gestionables individualmente sin duplicarlas ni perder materiales que los docentes ya asignaron.

**Prueba independiente**: Pausar la generación de cuentos y comprobar que el generador no admite solicitudes nuevas, mientras un cuento asignado sigue visible y descargable según sus permisos.

**Aceptación**:
1. El catálogo presenta una sola entrada por herramienta funcional, sin duplicar aliases antiguos como emparejar/unir columnas; conserva compatibilidad de enlaces autorizados.
2. Al pausar una herramienta se pide confirmación y motivo, se impiden generaciones nuevas también por acceso directo y se muestra estado comprensible; los trabajos aceptados continúan y el material existente se conserva.
3. Una excepción de modelo muestra el valor efectivo; «Usar configuración general» elimina esa excepción. Las etapas deterministas o de exportación no muestran selectores de IA sin función.
4. Activar una herramienta no otorga permisos adicionales a ningún rol ni publica recursos previamente privados.

### Historia 4 - Distinguir configuración institucional y docente (Prioridad: P1)

Como administrador quiero saber qué utilizaría una función para un docente, sin conocer sus claves ni hacerme pasar por él.

**Razón de prioridad**: Una API personal puede explicar por qué un trabajo no usa el modelo institucional.

**Prueba independiente**: Consultar resolución para un docente institucional y otro con preferencia personal permitida, sin iniciar generación.

**Aceptación**:
1. Se explican la procedencia institucional o personal, la herencia, el permiso para preferencias personales y el respaldo autorizado; nunca se revelan secretos.
2. La publicación institucional y la autorización de preferencias personales son controles distintos con etiquetas que describen su efecto real.
3. Una conexión local no disponible o una preferencia no aplicable produce aviso y únicamente el respaldo consentido; no se trata la ausencia como acceso institucional ilimitado.

### Historia 5 - Consultar uso y tiempos entendibles (Prioridad: P2)

Como administrador quiero comparar lo observado por función, etapa, proveedor, modelo y período, sin confundir velocidad con calidad.

**Razón de prioridad**: Permite decidir con datos y detectar diferencias entre selección y ejecución.

**Prueba independiente**: Mostrar muestras antiguas, fallidas y exitosas; separar espera en cola, procesamiento y revisión humana.

**Aceptación**:
1. Cada resumen indica período, número de muestras, fecha de última observación, éxitos y fallos; los tiempos sin registros aparecen como desconocidos, no cero.
2. Los tiempos por etapa no se suman como duración total cuando se solapan. Los indicadores humanos solo aparecen con medición explícita y consentimiento vigente del estudio.
3. Una diferencia entre lo configurado y lo observado señala su causa registrada: versión anterior, preferencia docente, respaldo o dato ausente. No se recomienda un modelo como mejor evaluador solo por ser rápido.

### Casos límite

- Modelo retirado, credencial revocada, catálogo desactualizado o proveedor inaccesible: error específico, sin prometer disponibilidad a partir del nombre del modelo.
- Varias funciones heredan una elección; el resumen de cambios incluye todas antes de publicar.
- Desactivación durante una entrega o generación: preserva evidencia y trabajo aceptado; no convierte la indisponibilidad en nota cero.
- Trabajos heredados sin configuración fijada: aviso explícito y aplicación de la política existente documentada, sin inventar procedencia.
- Servicio ejecutor sin responder: estado «Sin verificar» y última comprobación fechada, nunca «Consistente» por ausencia de información.
- Filtros vacíos, desconexión, conflicto de versión, recarga con borrador, teclado y pantalla pequeña: mensajes y salida sin pérdida silenciosa de edición.

## Requisitos

### Requisitos funcionales

- **FR-001**: El panel DEBE organizarse por funciones y herramientas existentes con búsqueda, resumen y detalles avanzados desplegables, reutilizando la administración actual.
- **FR-002**: Cada etapa DEBE distinguir elección guardada, resolución efectiva para trabajo nuevo y ejecución observada, con identificador exacto, procedencia, versión y respaldo.
- **FR-003**: Extracción, valoración, verificación y revisión adicional de calificación DEBEN ser configurables por separado en las combinaciones admitidas, conservando sus condiciones de ejecución y las verificaciones deterministas.
- **FR-004**: Generación de contenido, digitalización, presentaciones e imágenes DEBEN mostrar todas sus etapas IA realmente consumidoras y herencias; no ofrecer controles desconectados ni rutas duplicadas.
- **FR-005**: Selección y validación DEBEN compartir las mismas reglas que ejecución; incompatibilidad y credencial ausente DEBEN impedir publicación engañosa. No declarar una función integrada solo porque su proveedor figura en el catálogo.
- **FR-006**: Cambios DEBEN pasar por borrador, resumen de impacto, confirmación y publicación indivisible con control de versión, historial y restauración; secretos permanecen protegidos y nunca se recuperan en texto.
- **FR-007**: Los trabajos ya aceptados DEBEN conservar configuración fijada; ninguna publicación administrativa recalifica, publica notas, cancela solicitudes activas o borra evidencia.
- **FR-008**: Configuración institucional y permiso de preferencias docentes DEBEN tener semántica independiente y visible. La consulta de resolución por docente no revela claves ni amplía permisos.
- **FR-009**: El administrador DEBE poder pausar/reactivar generación de cada herramienta existente y elegir herencia o excepción compatible; la pausa se aplica en servidor sin impedir consulta de materiales previos o finalizar entregas existentes.
- **FR-010**: Disponibilidad de herramienta, permiso por rol y visibilidad de un material DEBEN permanecer conceptos distintos; se conservan las comprobaciones de propietario y permisos actuales.
- **FR-011**: Métricas DEBEN indicar antigüedad, muestra y alcance; diferenciar tiempo de cola, ejecución, fallos y revisión humana, sin atribuir ahorro o calidad no medidos.
- **FR-012**: Probar conexión/modelo DEBE ser una acción explícita diferenciada de guardar y de validar sin consumo; usar contenido sintético, informar posible cargo y registrar fecha/resultado sin datos estudiantiles.
- **FR-013**: Ningún control DEBE mostrar un ajuste editable que el ejecutor ignore; los parámetros no administrables en esta fase se muestran como heredados de despliegue y solo lectura.
- **FR-014**: Panel y cambios DEBEN funcionar con teclado, móvil desde 360 px, escritorio y ambos temas, sin desbordamientos, acciones inaccesibles ni pérdida silenciosa de borradores.
- **FR-015**: La transición DEBE conservar modelos efectivos actuales antes de la primera publicación explícita, fórmulas, rúbricas/DBA, aprobación docente, permisos, secretos y estado del estudio de tesis.

### Entidades clave

- **Función y etapa**: operación existente, necesidad de texto/visión/imagen u otra capacidad, condiciones de uso y dependencias.
- **Herramienta administrable**: identidad canónica, aliases compatibles, estado de generación y política heredada o propia.
- **Configuración publicada**: versión, autor, fecha, elecciones, dependencias y versión restaurable.
- **Resolución efectiva**: función, contexto autorizado, procedencia, modelo, respaldo y razones de selección.
- **Ejecución observada**: versión fijada, etapas realmente ejecutadas, modelos registrados, tiempos y resultados sin contenido privado.

## Criterios de éxito

- **SC-001**: Para todas las funciones IA activas identificadas en el inventario, se puede consultar la elección efectiva y su origen en máximo tres acciones desde el panel; cualquier etapa no trazable se señala explícitamente.
- **SC-002**: Cambiar solo la extracción conserva valoración/verificación y muestra el antes/después; la nueva elección aparece en el siguiente trabajo controlado y no altera ninguno aceptado antes.
- **SC-003**: Los casos controlados institucional, personal, heredado, respaldo y ausencia histórica muestran selección y procedencia correctas, sin claves ni equivalencias inventadas.
- **SC-004**: Pausar una herramienta bloquea nuevas generaciones tanto por interfaz como por acceso directo, y conserva consulta/descarga de materiales y finalización de entregas existentes.
- **SC-005**: Conflicto, incompatibilidad, error al publicar y restauración se prueban sin publicaciones parciales, pérdidas de borrador ni cambios de notas.
- **SC-006**: En las cinco resoluciones acordadas (360×800, 390×844, 768×1024, 1366×768, 1920×1080), ambos temas, controles principales de 44 px y teclado permiten completar consulta, cambio y cancelación.
- **SC-007**: Cada control editable cuenta con un consumidor y una regresión verificable; todas las métricas exhiben período y muestra o ausencia explícita. La configuración vigente antes de la adopción sigue produciendo la misma ruta efectiva.

## Supuestos

- «Herramientas» incluye los generadores existentes y las funciones IA del producto; no un editor para crear plugins, código, roles o nuevas herramientas arbitrarias.
- Se administra disponibilidad para generaciones nuevas, no borrado masivo ni ocultamiento retroactivo de recursos asignados. Los permisos siguen en Usuarios y roles.
- Configuración global por función con excepciones por herramienta y preferencias docentes ya autorizadas; no se cambia el consentimiento de respaldo personal.
- Se conservan proveedores actualmente integrados. Nuevas integraciones, cambio de prompts pedagógicos, elección automática por precio y entrenamiento de modelos quedan fuera.
- Se reutilizan publicación, auditoría, restauración, catálogo y secretos existentes. Límites de concurrencia y despliegue se muestran fielmente si afectan ejecución; convertirlos en controles editables requiere diseño explícito posterior, no casillas decorativas.
- No se hacen pruebas pagadas, cambios productivos ni modificaciones funcionales durante la especificación. La especificación y el plan requieren aprobación humana antes de implementar.
