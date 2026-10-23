# Validación

1. Base aislada: upgrade y datos previos intactos; downgrade/upgrade solo sin uso del esquema nuevo. Si existen perfiles/credenciales utilizadas, comprobar que el downgrade se niega a borrarlos. La reversión de producción conserva el esquema aditivo y los secretos privados, no los elimina.
2. pytest: formatos, texto/imagen, truncamiento/rechazo, SSRF/redirect, secretos, permisos, snapshots; regresiones gateway/calificación/digitalización.
3. Frontend: TypeScript/lint/Vitest y E2E con mocks a 360/1366 px: conexión, modelo, prueba, publicación/reapertura/error y guardado/efectivo/observado.
4. CI completo antes de squash; nada directo a main.
5. Producción: commit/salud/estado previo no secreto; prueba sintética Luna/GLM; publicar con versión esperada las cinco rutas aprobadas: extracción/estructura de digitalización con Luna y respaldo GLM; valoración Luna, verificación GLM y revisión adicional Luna. Verificar guardado/efectivo en admin y resolución de worker. Mantener sin cambios todas las rutas ajenas, incluida la extracción de respuestas del alumno. No recalificar alumnos. Reversión mediante configuración versionada si falla. No afirmar que esta selección ya está activa mientras no se compruebe su publicación.
6. Prueba sintética de regresión: documento con lectura, dibujo, una pregunta abierta y numeración con huecos. Verificar que no se invente una letra de clave sin opciones, no se pierdan imágenes al cambiar de protocolo y no se publique automáticamente un resultado inconsistente. Esta comprobación no sustituye la validación de calidad docente ni garantiza recortes perfectos.

## Evidencia de implementación local — 22-10-2026

La entrega parte de main `557b5ccf76783b22cd761715c8003d8e5e3cee31`, con Spec 117 integrado. Estas comprobaciones no significan que la configuración Luna/GLM ya esté activa en producción.

- Backend: 1.287 pruebas unitarias y cinco contratos PostgreSQL de Spec 116. Incluye formatos, resultados incompletos, imágenes, fallback con claves distintas y el mismo identificador de modelo, pruebas falsificadas, rotación, revocación, publicación simultánea y resolución de las cinco rutas sin cambiar las demás selecciones.
- Frontend: 849 pruebas en 135 archivos; TypeScript, ESLint sin advertencias y build de producción. La primera ejecución concurrente tuvo un timeout en una prueba de presentaciones ajena a estos cambios; se repitió toda la suite con dos procesos, sin ampliar el timeout, y pasó.
- Navegador: 4 casos Chromium (panel anterior y nuevo), 3 WebKit. Conexión, catálogo, fallo recuperable, prueba, publicación/reapertura y permisos a 360/1366 px; sin desbordamiento horizontal. Inspección de capturas local, con datos ficticios.
- Migraciones: base nueva hasta `202610230001`; downgrade a `202610220001` y nuevo upgrade en otra base vacía. El downgrade de una base con perfiles utilizados fue rechazado y conservó el esquema.
- Contenedores: builds locales de backend y web. El cambio no añade dependencias de producción ni modifica el convertidor de documentos.
- Datos: las pruebas crean únicamente registros sintéticos en bases aisladas; comparan notas y evidencias antes/después de publicar. No se han enviado entregas reales a proveedores para esta implementación.
- Primera ejecución CI del PR #246: cuatro regresiones de integración usaban dobles anteriores que no contemplaban la lectura nueva del catálogo/dependencias. Se actualizaron sus contratos sintéticos, sin omitir aserciones ni relajar validaciones de producción. Los ocho casos de esos archivos pasaron localmente; se exige una nueva ejecución completa de CI antes de fusionar.

## Uso del panel

1. Abrir **Proveedores y claves → APIs compatibles y formatos de modelos**. Puede usarse una API incorporada o prepararse una conexión independiente con HTTPS y clave propia. No colocar la clave en URL, ruta relativa ni nombre del modelo.
2. Consultar el catálogo completo o escribir el identificador exacto si el proveedor no publica catálogo. Los modelos sin metadatos se conservan sin adjudicarles visión por el nombre; todavía necesitan una prueba. Una consulta fallida/parcial conserva el borrador. No se retira automáticamente un modelo por una consulta fallida.
3. Elegir Chat Completions, Responses o Messages y sus opciones admitidas. Marcar imágenes solo cuando corresponda. **Probar y preparar modelo** realiza una solicitud con texto o imagen ficticia y entrega un comprobante del servidor, no una certificación de calidad pedagógica.
4. Seleccionar principal/respaldo en **Funciones**. Se admiten dos modelos diferentes de la misma API. Cuando una ruta usa perfiles, también se prueba el perfil de su respaldo; no se mezcla silenciosamente con otro protocolo. Ollama nativo, imágenes y embeddings conservan sus adaptadores.
5. **Guardar cambios** valida las dependencias modificadas y solicita confirmación. Otro administrador que publicó antes produce conflicto de versión, no sobreescritura silenciosa. Guardado/efectivo se actualizan; observado no se inventa mientras no haya una ejecución.
6. Para rotar una conexión ya perfilada, seleccionar su nombre en **Añadir una API o actualizar su clave**, preparar, volver a probar sus modelos y publicar. Las claves de adaptadores originales siguen separadas en el bloque general de credenciales. La revisión anterior no se sobrescribe ni se envía al destino nuevo; un trabajo iniciado conserva su referencia.

## Activación aprobada, después de CI y despliegue

| Ruta administrativa | Principal | Respaldo |
|---|---|---|
| `digitalizacion.extraccion` | OpenCode / `gpt-6-luna` | OpenCode / `glm-5.3-flash` |
| `digitalizacion.estructura` | OpenCode / `gpt-6-luna` | OpenCode / `glm-5.3-flash` |
| `calificacion.valoracion` | OpenCode / `gpt-6-luna` | Conservar la selección previa, si existe y sigue comprobada |
| `calificacion.verificacion` | OpenCode / `glm-5.3-flash` | Conservar la selección previa, si existe y sigue comprobada |
| `calificacion.revision_adicional` | OpenCode / `gpt-6-luna` | Conservar la selección previa, si existe y sigue comprobada |

Los nombres anteriores son datos de la decisión de activación, no condiciones de negocio. Luna se prepara con Responses; GLM con Chat Completions. No deducir controles de razonamiento por el nombre: comprobar el perfil y disponibilidad reales con la prueba sintética antes de guardar.

Procedimiento de entrega:

1. Confirmar HEAD, todos los controles requeridos verdes y squash a main sin bypass. Conservar la referencia del commit de fusión.
2. Esperar despliegue automático; comprobar fuente/commit, migración, salud backend/web/worker y nuevo asset público administrativo. No activar si falta la migración o si el código servido no coincide.
3. Leer la configuración no secreta y conservar versión/hash anteriores. Preparar y probar Luna/GLM con contenido ficticio; nunca imprimir o descargar claves. Si la prueba falla o el resultado queda incierto, no repetir sin diagnóstico ni publicar una ruta no comprobada.
4. Construir el borrador desde esa versión, cambiando exclusivamente las cinco rutas de la tabla y los dos perfiles necesarios. Comparar antes de guardar el resto de rutas, la extracción de respuestas del alumno, imágenes y embeddings. Conservar las condiciones actuales de verificación y revisión adicional.
5. Validar y publicar con `expected_version`. Verificar resolución de las cinco rutas mediante el mismo resolver usado por trabajos nuevos. Comprobar hash/versión backend/worker y correspondencia guardado/efectivo. No modificar un snapshot de trabajo ya admitido.
6. Ejecutar un trabajo sintético con lectura, imagen, preguntas 1/17/20, opción múltiple y respuesta abierta. Registrar proveedor/modelo reales, tiempo, estado y completitud. Mantener cobertura insuficiente en revisión. No alterar notas o evidencias reales ni afirmar una mejora de calidad universal a partir de esta prueba.
7. Registrar resultados y versión publicada en el PR. Cerrar #243 solo cuando la entrega requerida esté verificada, no al terminar estas instrucciones.

## Reversión segura

Ante fallo, dejar de admitir nuevas pruebas, conservar evidencia y usar **Restaurar versión anterior** en una publicación auditable; volver a comprobar sus credenciales y resolución. No borrar revisiones privadas, ejecutar downgrade sobre datos utilizados ni recalificar alumnos. El esquema aditivo es compatible con registros anteriores y se conserva durante la reversión. Si la configuración anterior también depende de un proveedor retirado, no presentarla como recuperación funcional: informar el fallo y usar únicamente un respaldo comprobado.

## Correspondencia de requisitos y pruebas

Analyze/Converge: 11 requisitos funcionales, cinco criterios de éxito y seis escenarios de aceptación cubiertos por 19 tareas. La revisión adicional detectó la proyección del identificador granular de estructuración: T019 lo corrige y añade regresión; no quedan brechas de construcción ni conflictos con los ocho principios constitucionales. Lista de calidad 10/10, sin modificar sus marcas durante implementación. No hay hooks de extensiones. La gobernanza se ejecuta sobre una copia del índice que excluye los borradores 034/115; 49 pruebas verdes. El inventario debe comprobarse de nuevo después de cualquier ajuste de código. CI remoto y activación no se consideran completados por este resultado.

| Requisitos | Evidencia principal |
|---|---|
| FR-001, FR-006, FR-007 | `test_ai_api_connections.py`, `test_ai_api_configuration.py`: permiso, HTTPS/DNS, redirecciones, clave ligada al destino, comprobante y versión |
| FR-002, FR-004, FR-005 | `test_ai_api_transport.py`, `test_ai_api_connections.py`: tres protocolos, imagen intacta, resultado final completo y fallback independiente |
| FR-003 | Catálogo paginado, total/truncamiento, conservación en fallo y capacidades desconocidas sin heurística en consulta compatible |
| FR-008, FR-010 | Snapshot de ruta y revisión, notas/evidencias intactas, documento sintético con huecos y clave segura; activación real pendiente del procedimiento anterior |
| FR-009 | `CompatibleAPISection.test.tsx`, `FunctionsSection.test.tsx`, `admin-compatible-api.spec.ts` y regresión de `admin-ai-control-center.spec.ts` |
| FR-011 | CI obligatorio, migraciones/builds/gobernanza y comprobaciones de entrega separadas de la implementación local |

## Corrección de autoservicio — 23-10-2026, issue #247

Incidente: al seleccionar un principal comprobado para lectura visual, un respaldo heredado sin perfil impedía guardar. La protección era necesaria —el transporte compatible no ejecuta ese respaldo nativo—, pero el aviso no ofrecía una solución desde la función. No se debe retirar la protección ni quitar respaldos en silencio.

T020 añade una ayuda junto a la selección que identifica principal o respaldo pendientes; permite elegir explícitamente otro respaldo comprobado o quitarlo. Los modelos de API pendientes se comprueban en un diálogo con proveedor/modelo y capacidad visual ya seleccionados, reutilizando el mismo editor. Un fallo conserva formato y borrador. No hay inferencia automática al cambiar un selector; cada prueba se inicia con el botón y advierte su costo. Guardar sigue validando comprobantes en servidor, versiones y permisos.

Los errores de validación permanecen en la página con acciones para revisar la función o comprobar el modelo indicado. Backend devuelve el campo exacto sin modificar criterios de aceptación ni pruebas de compatibilidad. Cambiar el proveedor principal ya no elimina automáticamente el respaldo. No hay migraciones nuevas ni modificaciones automáticas de la configuración efectiva, notas o evidencias.

Verificación local: 1.289 pruebas unitarias backend; 858 pruebas frontend en 137 archivos, incluidas 27 focalizadas; TypeScript, ESLint y build correctos. Doce escenarios de navegador Chromium/WebKit cubren cambio con respaldo heredado a 360/1366 px, prueba desde la función con fallo y recuperación, publicación/reapertura y denegación de acceso. Capturas móviles y de escritorio inspeccionadas. El primer E2E nuevo intentaba resolver el respaldo antes de preparar el principal; se corrigió esa secuencia de prueba, sin ampliar timeouts ni relajar aserciones. La primera suite frontend completa no arrancó sus procesos dentro del aislamiento local; se detuvo y se ejecutó con sus permisos normales, sin cambiar pruebas. CI remoto y entrega se registran por separado; estos resultados no significan despliegue.

Convergencia de la corrección: FR-005/FR-009, SC-001/SC-005 y la aceptación US1/AC2 cubiertos; se mantiene la decisión de arquitectura de prueba única explícita y publicación versionada. No quedan tareas de construcción abiertas. No hay hooks de extensiones.

Revisión final de accesibilidad: las etapas sin IA no reciben identificadores repetidos; una prueba adicional comprueba los destinos de navegación (cuatro casos de FunctionsSection verdes). No modifica selecciones ni permisos.
