# Especificación: crear evaluaciones en dos pantallas

**Rama**: `codex/096-evaluacion-dos-pantallas` | **Creada**: 2026-10-13 | **Estado**: Alcance y plan aprobados; revisión de requisitos autorizada antes de implementar | **Issue**: [#202](https://github.com/Andres-back/Calificator/issues/202)

El usuario aprobó reducir la creación con IA de seis pasos a Preparar y Revisar, con opciones secundarias desplegables, entrada común y prioridad para celular. No autoriza implementar antes de aprobar el plan, ni fusionar o desplegar. Evoluciona el dominio propietario 005 y conserva las mejoras 095 en fase demo.

El usuario respondió «aprove» al plan y a la revisión autorizada de requisitos con continuidad el 2026-10-13. Implementación autorizada después de revisar la lista; sin autorización de fusión/despliegue.

## Escenarios de usuario y pruebas

### Historia 1 - Preparar sin recorrer opciones innecesarias (Prioridad: P1)

Como profesor, quiero indicar qué evaluaré, cuántas preguntas necesito y cómo responderá mi grupo, sin recorrer pantallas para opciones que no usaré.

**Razón de prioridad**: Reducir navegación y carga visual sin decidir por el docente qué aprendizajes comprobar.

**Prueba independiente**: En una materia, indicar tema, elegir cinco preguntas en papel y generar; llegar directamente a Revisar sin pulsar Siguiente en pantallas intermedias.

**Aceptación**:
1. **Dado** un profesor autorizado dentro de una materia, **cuando** abre Crear evaluación, **entonces** puede elegir IA, foto/PDF o manual sin una tercera etapa obligatoria del asistente de IA; conserva el contexto de materia, grado y área.
2. **Dado** una creación nueva con IA, **cuando** abre Preparar, **entonces** encuentra tema, cantidad y modalidad; Personalizar y Necesito ayuda permanecen cerrados inicialmente.
3. **Dado** un nombre sugerido a partir del tema, **cuando** el profesor lo modifica, **entonces** se conserva su nombre y no se reemplaza al cambiar el tema.
4. **Dado** tipos personalizados y criterios seleccionados, **cuando** modifica la cantidad o pliega Personalizar, **entonces** conserva sus elecciones, ve un resumen y no se agregan otros criterios o tipos silenciosamente.

### Historia 2 - Revisar y guardar con control docente (Prioridad: P1)

Como profesor, quiero leer las preguntas, comprobar las respuestas esperadas y corregir puntajes o criterios antes de dar la evaluación por preparada.

**Razón de prioridad**: La simplificación no debe eliminar revisión humana, controles de integridad ni explicaciones de cómo se calificará.

**Prueba independiente**: Generar una evaluación sintética, editar una pregunta y un peso, guardar el borrador y abrir su vista final; no publicar ni crear notas durante el recorrido.

**Aceptación**:
1. **Dado** una generación exitosa, **cuando** termina, **entonces** se abre Revisar con preguntas numeradas y edición accesible; no se exige otra pantalla de resumen antes de guardar.
2. **Dado** una evaluación en revisión, **cuando** abre Cómo se calificará o una respuesta, **entonces** puede consultar/editar criterios, rúbrica, respuesta correcta y puntaje; errores y advertencias relevantes permanecen identificables aunque la sección esté plegada.
3. **Dado** una revisión válida, **cuando** pulsa Guardar borrador, **entonces** guarda sus cambios y dispone de visualizar, imprimir, Word y publicar según permisos; publicar requiere una acción separada.
4. **Dado** una evaluación ya publicada o asignada, **cuando** abre editar, **entonces** entra directamente en Revisar, conserva su estado y ve la advertencia vigente; Guardar cambios no recalifica ni borra entregas o notas.

### Historia 3 - Continuar y recuperarse desde celular (Prioridad: P2)

Como profesor, quiero retomar una evaluación sin terminar y usar controles legibles en celular sin perder trabajo al fallar la conexión.

**Razón de prioridad**: Proteger la demo, borradores existentes y uso en teléfonos Android/iPhone.

**Prueba independiente**: Recuperar borradores de las seis etapas anteriores, provocar fallo de generación/guardado y repetir el recorrido con otra cuenta y otra materia.

**Aceptación**:
1. **Dado** un borrador anterior propio, **cuando** decide continuarlo, **entonces** recupera tema, preguntas, respuestas, criterios y material conservado en Preparar o Revisar, sin reiniciar ni regenerar automáticamente.
2. **Dado** una operación pendiente o fallida, **cuando** intenta repetirla o cerrar, **entonces** ve el estado y se conserva su trabajo; no se envía otra operación por doble clic ni se anuncia un guardado inexistente.
3. **Dado** un celular o computador, **cuando** prepara o revisa, **entonces** los controles están accesibles, el editor tiene un único desplazamiento principal y el teclado, barras o ayudas no tapan acciones.

### Casos límite

- Materia única/múltiple, sin grado y nombre largo: contexto legible y selección disponible solo donde corresponde; ninguna materia ajena se incorpora por restaurar un borrador.
- Modalidad mixta existente: opción conservada bajo Personalizar y validación de respuestas físicas/online vigente; no convertirla silenciosamente a otra modalidad.
- Cantidad personalizada de 3 a 30, cambio de tipo y nombre editado: conservar límites, elección y resumen; no afirmar un número de preguntas distinto del preparado.
- Criterios activados sin selección, rúbrica incompleta/pesos inválidos, respuesta vacía o inválida: impedir la acción correspondiente, explicar dónde corregir y abrir la sección necesaria.
- Borrador de otra cuenta/materia, malformado, caducado, archivo que debe reseleccionarse o almacenamiento denegado: no mezclar datos ni bloquear el uso por indisponibilidad local; nunca afirmar recuperación de un archivo que no se conservó.
- Evaluación generada eliminada, acceso revocado o conflicto de actualización: no sobrescribir ni publicar; explicar el problema sin exponer datos ajenos y mantener cambios recuperables cuando sea posible.
- Volver a preparar después de generar: conservar preguntas; cambiar cantidad/tipos mediante la edición de preguntas, sin crear una segunda evaluación ni regenerar silenciosamente.
- Digitalización y creación manual: conservar extracción, revisión de respuestas, visor, permisos y guardado actuales; simplificar su entrada, no cambiar modelos ni interpretación.

## Requisitos

### Requisitos funcionales

- **FR-001**: La creación con IA DEBE tener dos pantallas obligatorias, Preparar y Revisar; la elección de método no añade otra etapa obligatoria y se elimina la confirmación repetitiva de seis pasos.
- **FR-002**: Crear evaluación DEBE ofrecer IA, foto/PDF y manual mediante sus flujos existentes y permisos, tanto desde materia como desde el acceso general; no crear otra sección de calificación.
- **FR-003**: Preparar DEBE priorizar tema, cantidad y modalidad, heredar materia/grado/área y ofrecer nombre sugerido editable sin sobrescribir un nombre elegido por el profesor.
- **FR-004**: La cantidad DEBE ofrecer 5, 10 y Personalizar; conservar límites de 3 a 30 y tipos escogidos, con distribución visible y sin añadir tipos desactivados silenciosamente.
- **FR-005**: Personalizar DEBE conservar tipos, modalidad mixta, escala, nombre, criterios de aprendizaje, rúbrica, referencias, fecha y otras opciones actuales; mostrar resumen de ajustes activos al plegarse, sin seleccionar todos los criterios por defecto.
- **FR-006**: Generar evaluación DEBE validar la preparación y pasar a Revisar solo ante éxito; mostrar espera/error y preservar datos, evitando doble envío y regeneraciones automáticas.
- **FR-007**: Revisar DEBE mostrar preguntas legibles, numeradas y editables, con respuestas correctas, puntajes, orden y criterios consultables/editables; errores críticos DEBEN ser visibles y permitir localizar su corrección.
- **FR-008**: Guardar borrador DEBE ser una acción explícita desde Revisar; las acciones finales de visualizar, imprimir, Word y publicar conservan permisos y contratos. Guardar NO publica automáticamente ni oculta que la generación ya produjo un borrador.
- **FR-009**: Editar una evaluación existente DEBE abrir directamente Revisar, conservar estado, advertencias y protección frente a conflictos; no reescribir preguntas si solo se modifica la rúbrica, ni afectar notas/entregas anteriores.
- **FR-010**: Se DEBEN recuperar los borradores anteriores propios, de preparación o revisión, conservando contenido y aislamiento por cuenta/materia; se conserva la política vigente de caducidad y reselección de archivos.
- **FR-011**: La ayuda de Xali DEBE abrirse a petición, sin ocupar espacio permanente ni aplicar sugerencias sin confirmación; no aumentar llamadas IA por navegar o desplegar controles.
- **FR-012**: El flujo DEBE funcionar desde 360/390 hasta 768/1280/1440 píxeles en ambos temas, Android/iPhone y computador; controles de al menos 44 × 44, un único desplazamiento principal del editor y sin desbordamiento horizontal ni acciones tapadas.
- **FR-013**: Se DEBEN conservar generación, digitalización, respuestas esperadas, criterios, validaciones, permisos, impresión/exportación y registros académicos; no cambiar proveedores, fórmulas, notas, evidencia ni estudiantes por esta simplificación.
- **FR-014**: Implementación, fusión y producción DEBEN seguir aprobación del plan, revisión de requisitos, pruebas focalizadas, CI completo y autorización de entrega; no usar alumnos reales ni inferencias IA en pruebas visuales innecesarias.

### Entidades clave

- **Preparación**: tema, nombre, modalidad, cantidad, tipos, criterios elegidos, rúbrica y material del docente.
- **Evaluación**: identidad, estado, preguntas, respuestas esperadas, puntajes y relaciones actuales.
- **Borrador en curso**: contenido sin terminar de una cuenta/materia, con etapa recuperable y vigencia limitada.
- **Revisión docente**: cambios explícitos y validaciones antes de guardar; publicación separada.

## Criterios de éxito

- **SC-001**: El recorrido sintético de IA pasa por exactamente dos pantallas y alcanza revisión con una sola acción de generar, sin pulsar Siguiente para opciones no utilizadas.
- **SC-002**: Desde una materia, no se pide nuevamente grado/área; en 390 × 844, tema, cantidad y modalidad son identificables sin abrir Personalizar o Xali.
- **SC-003**: El 100 % de las combinaciones probadas de criterios, tipos y rúbrica conserva su selección al plegar/volver; solo los criterios elegidos orientan la evaluación.
- **SC-004**: Los borradores sintéticos de cada etapa anterior recuperan el contenido y la etapa equivalente; cuentas/materias distintas no lo recuperan y archivos no conservados se anuncian como tales.
- **SC-005**: Los recorridos de consulta y personalización realizan cero publicaciones y cero cambios en notas/evidencias; doble clic produce una sola solicitud y fallos no anuncian éxito.
- **SC-006**: Toda la matriz indicada permite generar, editar, corregir errores, guardar y abrir documentos sin desbordamiento, pérdida de foco ni acciones inaccesibles; incluye ambos motores de navegador sin afirmar certificación de dispositivos físicos.

## Supuestos

- La respuesta «aprove» aprueba el alcance propuesto, no un plan aún no presentado ni cambios en producción.
- La simplificación de dos pantallas se aplica al generador IA; digitalizar/manual conservan sus procesos internos y comparten únicamente la entrada.
- Una creación nueva propone cinco preguntas y modalidad en papel, ambos visibles y modificables; los borradores/evaluaciones existentes mantienen sus valores. El reparto propuesto de inicio es tres de selección múltiple y dos abiertas, mostrado al docente.
- El formato final descargable se comprueba después de guardar; en revisión se muestra el contenido editable sin presentar un documento guardado anterior como si incluyera cambios aún no guardados.
- No se mide ni promete una reducción del tiempo del LLM en este cambio; el objetivo es reducir navegación y facilitar revisión.
- No se añaden entidades, rutas, tecnologías o servicios; se reutilizan los controles y contratos vigentes.
