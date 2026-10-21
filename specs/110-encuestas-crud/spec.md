# Especificación: Administrar respuestas de encuestas

**Rama**: `codex/110-encuestas-crud` | **Creada**: 2026-10-20 | **Estado**: Aprobada por el usuario («adelante», 2026-10-21) | **Issue**: #228

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar y consultar respuestas (Prioridad: P1)

El investigador entra en la administración del diagnóstico o del piloto y encuentra acciones claras para registrar, ver, corregir y eliminar respuestas de la lista.

**Razón de prioridad**: El panel publicado solo permite consultar y organizar; no resuelve la administración solicitada.

**Prueba independiente**: Desde ambos paneles, localizar una respuesta sintética y abrir su contenido y su constancia.

**Aceptación**:
1. **Dado** un administrador autenticado, **cuando** abre cualquiera de los dos paneles, **entonces** ve las acciones disponibles y una papelera diferenciada.
2. **Dado** un registro firmado, **cuando** consulta o descarga su constancia, **entonces** obtiene exactamente el original recibido.
3. **Dado** que necesita registrar otra respuesta, **cuando** pulsa «Registrar respuesta», **entonces** se abre el formulario vigente para que el docente lo complete y firme; el administrador no puede fabricar una firma.

### Historia 2 - Corregir sin reescribir lo firmado (Prioridad: P1)

El investigador corrige datos de identificación o respuestas a preguntas y explica por qué. Distingue lo declarado originalmente de la corrección administrativa.

**Razón de prioridad**: Los instrumentos son evidencia de tesis; una edición no debe aparentar una nueva declaración firmada por el docente.

**Prueba independiente**: Corregir un dato, consultar antes/después, descargar el original y comprobar su conservación.

**Aceptación**:
1. **Dado** un registro editable, **cuando** guarda cambios válidos con un motivo, **entonces** ve la corrección identificada como administrativa y un historial con cuenta responsable, fecha y valores anteriores/nuevos.
2. **Dado** un dato incorrecto o un motivo vacío, **cuando** intenta guardar, **entonces** se muestra qué corregir y no se registra ningún cambio.
3. **Dado** que otra pestaña ya modificó el registro, **cuando** guarda una versión anterior, **entonces** se rechaza la sobrescritura y se solicita volver a consultar, conservando los campos escritos.
4. **Dado** que repite un envío tras perder la confirmación, **cuando** reintenta el mismo cambio, **entonces** no se duplica el historial.

### Historia 3 - Eliminar de la lista y recuperar (Prioridad: P1)

El administrador retira una respuesta duplicada o no utilizable, con confirmación y motivo, y puede restaurarla desde la papelera.

**Razón de prioridad**: Resolver errores sin perder evidencia ni mezclar registros retirados con los analizados.

**Prueba independiente**: Retirar y restaurar una respuesta sintética; contrastar listas, informes y original firmado.

**Aceptación**:
1. **Dado** un registro activo, **cuando** confirma su código y el motivo de eliminarlo de la lista, **entonces** pasa a la papelera y deja de contribuir a informes y exportaciones de respuestas activas.
2. **Dado** un registro en papelera, **cuando** lo restaura con motivo, **entonces** vuelve a la lista y al análisis sin crear una nueva entrega.
3. **Dado** cualquier cambio de estado, **cuando** consulta el historial, **entonces** conserva el rastro y la constancia original; se explica que esta acción no es supresión definitiva de datos.

### Casos límite

- Sesión vencida, petición ajena al sitio o registro de otro panel: no se consulta ni modifica información sin autorización del panel correspondiente.
- Error de red o almacenamiento: no aparece éxito ni desaparecen campos sin confirmación; se puede reintentar sin duplicados.
- Preguntas opcionales, valores numéricos, opciones múltiples y dependencias entre respuestas: las correcciones respetan el formato de la versión original, no el cuestionario actual.
- Versión antigua sin contexto suficiente para validar: permite consultar, retirar y restaurar, pero explica por qué no ofrece corrección de preguntas.
- Registro retirado: no admite correcciones hasta restaurarlo. Dos eliminaciones/restauraciones simultáneas no generan transiciones contradictorias.
- Motivos o textos con caracteres especiales: se muestran como texto y no se ejecutan al verlos o exportarlos.

## Requisitos

### Requisitos funcionales

- **FR-001**: Ambos paneles DEBEN ofrecer registro mediante formulario firmado, consulta, corrección, eliminación de la lista y restauración, con rótulos comprensibles en español.
- **FR-002**: El original, su firma, consentimiento, versión, fecha de recepción y comprobantes de integridad DEBEN permanecer intactos tras cualquier operación administrativa.
- **FR-003**: Las correcciones DEBEN limitarse a identificación y preguntas validables con el contexto original; no deben modificar firmas, consentimientos, duración del formulario, mediciones históricas separadas ni versión del instrumento.
- **FR-004**: Cada corrección, retirada y restauración DEBE exigir motivo y conservar fecha, cuenta administrativa responsable, revisión y diferencias anteriores/nuevas. Si varias personas comparten una cuenta, no se afirmará identificar individualmente al operador.
- **FR-005**: Eliminar de la lista DEBE requerir confirmación por código y enviar a papelera, sin borrar físicamente respuestas. Restaurar DEBE ser explícito y auditable.
- **FR-006**: Reintentos y cambios concurrentes DEBEN evitar duplicados y sobrescritura silenciosa; los errores DEBEN permitir conservar y recuperar el trabajo pendiente.
- **FR-007**: Listas e informes DEBEN distinguir recibidas, activas y retiradas por versión. El recuento de docentes seguirá identificado como declarado, no verificado, sin sumar versiones de manera engañosa.
- **FR-008**: El informe principal y la exportación original DEBEN usar declaraciones originales de registros activos. Una exportación administrativa separada DEBE identificar correcciones y revisión, sin presentarlas como originales firmados; ninguna incluirá contactos, firmas ni motivos privados.
- **FR-009**: Todas las consultas y cambios DEBEN exigir acceso administrativo del instrumento correspondiente; los cambios DEBEN protegerse contra solicitudes ajenas al sitio. La versión pública no expondrá historial ni datos privados.
- **FR-010**: Las acciones DEBEN funcionar desde 360 px hasta escritorio, con teclado y foco accesibles, estados visibles de guardado/error y sin desbordamiento horizontal de la página.
- **FR-011**: La nueva entrega DEBE subir la versión del software sin cambiar preguntas ni renumerar respuestas de instrumentos ya aplicados; las pruebas DEBEN usar datos sintéticos aislados.

### Entidades clave

- **Respuesta original**: declaración recibida y constancia firmada de una versión concreta, conservadas sin alteraciones.
- **Corrección administrativa**: ajustes explicados por el investigador, vinculados al original y visibles como una capa distinta.
- **Evento administrativo**: acción, motivo, cuenta, fecha, revisión y diferencias; no se sobrescribe por una acción posterior.
- **Estado de conservación**: activo o en papelera; independiente del estado «por revisar», «revisada» o «seguimiento».

## Criterios de éxito

- **SC-001**: En los dos instrumentos se completan consulta, corrección, retirada y restauración de muestras sintéticas, y el 100 % conserva sin cambios su constancia original.
- **SC-002**: Cada acción confirmada produce exactamente un evento; un reintento idéntico no lo duplica y una edición concurrente obsoleta no sobrescribe cambios.
- **SC-003**: En 360 px y escritorio se completan las cuatro acciones sin controles ocultos ni desbordamiento horizontal de la página.
- **SC-004**: Recibidas, activas, retiradas e informes por versión coinciden con la muestra antes/después de retirar y restaurar; ambas exportaciones distinguen fielmente original y corrección.
- **SC-005**: Ninguna prueba sin autorización obtiene respuestas o ejecuta cambios, y ninguna verificación de la función requiere modificar entregas reales.

## Supuestos

- Alcance: encuestas de diagnóstico y retroalimentación del piloto, no el CRUD académico de estudiantes ni cambios en notas o evidencias.
- «Crear» inicia un formulario que completa y firma el participante. No se crearán respuestas artificiales atribuidas a docentes reales.
- «Eliminar» es reversible. La supresión definitiva por solicitud de un titular seguirá el procedimiento de custodia existente, fuera de este botón.
- Se mantiene la autenticación administrativa existente. No se añaden cuentas ni se cambian contraseñas.
- Instrumento diagnóstico 5.0 y piloto 1.0 conservan preguntas/consentimientos; el software pasará de 5.0.1 a 5.1.0.
- El usuario aprobó este alcance y su plan el 2026-10-21; pruebas y CI siguen siendo obligatorias antes de cualquier fusión.
