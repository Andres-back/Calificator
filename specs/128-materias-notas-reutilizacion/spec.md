# Especificación: materias, notas exportables y evaluación reutilizable

**Rama**: `codex/128-materias-notas-reutilizacion` | **Creada**: 2026-10-25 | **Estado**: Aprobada por el usuario el 2026-10-25; implementación en curso | **Issue**: [#270](https://github.com/Andres-back/Calificator/issues/270)

## Escenarios de usuario y pruebas

### Historia 1 - Descargar las notas y entender los pendientes (Prioridad: P1)

Como docente, quiero descargar las notas de una o varias evaluaciones de mi materia y saber qué contiene el archivo, sin recibir un supuesto éxito con todas las notas vacías.

**Razón de prioridad**: durante una demostración se descargó un CSV sin notas. El código actual excluye sugerencias pendientes por diseño; ese comportamiento está confirmado localmente, pero no se ha inspeccionado el estado académico del caso concreto en producción.

**Prueba independiente**: en una materia sintética con notas finales, sugeridas, cero real, procesamiento y sin entrega, abrir el archivo descargado y reconciliar cada celda contra su evaluación/estudiante. No basta con comprobar una llamada al descargador.

**Aceptación**:
1. **Dado** un grupo con notas confirmadas, ajustadas y publicadas, **cuando** se eligen una o varias evaluaciones y «Notas finales», **entonces** el CSV contiene nombre y columna de nota por evaluación, preserva cero/decimales y deja ausencias vacías, sin convertir sugerencias en decisiones.
2. **Dado** un grupo con sugerencias pendientes, **cuando** se abre la exportación, **entonces** se muestran conteos y vista previa que explican qué notas finales están disponibles. Si no hay ninguna final, no se descarga un archivo vacío como éxito normal y se ofrece revisar o elegir el informe provisional.
3. **Dado** el modo «Informe provisional», **cuando** se descarga expresamente, **entonces** se incluyen las notas disponibles y su estado por evaluación, identificando claramente sugerencias y pendientes, sin confirmar/publicar ninguna nota.
4. **Dado** que falla una lectura, cambian materia/selección/sesión/permisos o se cierra la vista, **cuando** llega un resultado tardío, **entonces** no se descarga un archivo parcial o de otro contexto y se puede reintentar donde corresponda.

### Historia 2 - Editar o retirar una materia sin perder su historial (Prioridad: P2)

Como docente, quiero encontrar «Editar materia» y una forma segura de quitarla de mis materias activas cuando ya no la necesito.

**Razón de prioridad**: eliminar físicamente una materia puede destruir o dejar inconsistentes sus relaciones académicas. Se propone retirada recuperable, explicada antes de confirmar, no borrado definitivo.

**Prueba independiente**: editar una materia propia, retirarla, consultar/exportar su historial desde «Archivadas» y restaurarla sin reconstruir estudiantes o notas.

**Aceptación**:
1. **Dado** que gestiono la materia y tengo permiso de edición, **cuando** abro «Editar materia», **entonces** puedo cambiar nombre, área, grado y descripción sin cambiar sus estudiantes, evaluaciones ni calificaciones.
2. **Dado** «Eliminar de mis materias», **cuando** se pide confirmación, **entonces** se explica que se moverá a «Archivadas», podrá recuperarse y no se borrarán cuentas, notas, evidencias o asistencias. Cancelar no cambia nada.
3. **Dado** que se confirma la retirada, **cuando** termina, **entonces** deja de aparecer en activas, conserva consultas autorizadas y exportación histórica, e impide nuevas inscripciones/actividades/entregas en esa materia. Trabajos ya admitidos no se pierden ni se vuelven a enviar.
4. **Dado** que se restaura, **cuando** hay cupo autorizado, **entonces** vuelve a activas conservando historial. No se reabren automáticamente inscripciones ni recepción de evaluaciones; superar el cupo se explica sin cambios parciales.

### Historia 3 - Usar una evaluación preparada en otra materia (Prioridad: P2)

Como docente, quiero copiar a otra materia propia una evaluación que ya digitalicé y dejé como quiero, sin pagar ni esperar otra digitalización y sin llevarme las entregas del otro grupo.

**Prueba independiente**: copiar una evaluación sintética con lectura, preguntas mixtas, figuras, tabla, rúbrica y presentación de impresión; revisar, guardar, reabrir y exportar la copia, editarla y comprobar que la original sigue intacta.

**Aceptación**:
1. **Dado** que tengo permiso sobre origen y destino propios, **cuando** elijo «Usar en otra materia», **entonces** selecciono una materia activa diferente y se crea un borrador independiente que puedo revisar antes de publicarlo.
2. **Dado** un contenido completo y verificable, **cuando** se copia, **entonces** se conservan lectura, preguntas/opciones/orden, puntajes, criterios, clave privada, figuras/tablas/gráficas y configuración de impresión. El original conservado permanece privado.
3. **Dado** el nuevo borrador, **cuando** se abre, **entonces** no tiene estudiantes, notas, evidencias respondidas, entregas, enlaces/chat, publicación activa ni recepción abierta. La clave y documentos originales no se exponen al alumno.
4. **Dado** un fallo, doble clic, reintento o cambio de versión del origen, **cuando** se intenta copiar, **entonces** no se crean duplicados ni una copia que omita material silenciosamente. Se informa y conserva la evaluación original.

### Casos límite

- Notas cero, decimales serializados como texto, notas ajustadas distintas de IA, intento vigente según política, procesamiento/fallo y ausencia no deben confundirse.
- Nombres de evaluación repetidos y estudiantes homónimos mantienen columnas/filas distintas por identidad, no por coincidencia textual. Orden alfabético por estudiante.
- Exportación mantiene como alcance el grupo matriculado activo que muestra el libro; lo indica expresamente. No cambia matrículas ni incorpora retirados de forma silenciosa.
- Acentos, comillas, punto y coma, saltos de línea y texto con aspecto de fórmula se conservan de forma segura en el archivo compatible con Excel.
- Una renovación normal de sesión del mismo usuario no debe cancelar silenciosamente la descarga; logout, cambio de cuenta o retirada de permiso sí impiden terminarla.
- Archivo/restauración concurrentes con crear materia o trabajo académico; límite vigente de seis materias para docentes no se elude por carreras.
- Una materia archivada no equivale a una lista vacía; el docente mantiene acceso autorizado al histórico. Ni el archivo ni la restauración cambian retrospectivamente notas o estados de evaluaciones.
- Evaluación antigua sin recursos visuales, lectura en metadatos, recursos importados pendientes, claves revisadas, DBA personalizados, identificadores internos y tamaños/posiciones de figuras deben tratarse explícitamente.
- Recurso perdido o corrupto: error recuperable, no éxito con solo texto. Origen editado mientras se copia: conflicto reconocible, sin mezclar versiones.

## Requisitos

### Requisitos funcionales

- **FR-001**: La exportación DEBE permitir una o varias evaluaciones disponibles de la misma materia, indicando grupo, selección y conteos antes de descargar.
- **FR-002**: «Notas finales» DEBE conservar el CSV mínimo de nombre y una columna numérica por evaluación; usar decisión docente vigente, preservar cero y decimales y dejar ausencias vacías sin confirmar sugerencias.
- **FR-003**: «Informe provisional» DEBE requerir elección expresa, identificar su carácter provisional en archivo/encabezados y distinguir el estado por evaluación; nunca DEBE modificar una nota, confirmar ni publicar.
- **FR-004**: Si no hay notas finales exportables, DEBE explicarse antes de descargar y ofrecer revisar o cambiar de modo; no DEBE anunciarse como éxito normal un archivo sin notas.
- **FR-005**: El archivo DEBE reconciliarse con estudiante y evaluación vigentes, mantener filas independientes para homónimos sin mezclar notas ni alterar nombres y encabezados repetidos distinguibles, orden alfabético, acentos, delimitación, decimales y protección contra interpretación de texto como fórmula. El alcance de matrícula activa y la existencia de nombres repetidos DEBEN ser visibles en la vista previa.
- **FR-006**: Lecturas fallidas, cierre, cambios de selección/materia/cuenta o retirada de permiso DEBEN impedir descargas parciales o tardías; renovar la sesión del mismo usuario DEBE conservar una operación válida o informar claramente la interrupción.
- **FR-007**: El docente autorizado DEBE disponer de «Editar materia» para nombre, área, grado y descripción, con errores claros y sin alterar datos académicos asociados.
- **FR-008**: «Eliminar de mis materias» DEBE ser retirada recuperable explicada como archivo antes de confirmar; conservar cuentas, matrículas, notas, evidencias, evaluaciones y asistencias, con acceso a «Archivadas» y «Restaurar». El borrado definitivo queda fuera de alcance.
- **FR-009**: Una materia archivada DEBE quedar fuera de activas y cerrada a nuevas inscripciones/actividades/entregas; DEBE preservar lectura/exportación autorizadas y permitir terminar trabajos admitidos, sin cancelarlos ni duplicarlos.
- **FR-010**: Restaurar DEBE comprobar cupo y concurrencia, conservar datos y no reabrir automáticamente códigos/recepción. Editar, archivar y restaurar DEBEN ser trazables y no afectar materias ajenas.
- **FR-011**: «Usar en otra materia» DEBE permitir seleccionar un destino activo distinto, del mismo docente, verificando en servidor permisos de origen y destino y creando un borrador independiente.
- **FR-012**: La copia DEBE conservar contenido guardado verificable: lectura, preguntas/opciones/orden/puntos, criterios, clave privada, recursos visuales, avisos de revisión y configuración de impresión, sin repetir OCR ni llamar IA.
- **FR-013**: La copia NO DEBE incluir estudiantes, notas, evidencias de alumnos, entregas, enlaces/chat, trabajos previos, fechas de publicación/entrega activas ni recepción abierta. No DEBE convertir originales privados o material pendiente en recursos publicables ni marcar claves no revisadas como revisadas.
- **FR-014**: Las identidades y asociaciones de la copia DEBEN ser propias; editarla o retirar el origen no DEBE modificar ni romper la otra evaluación. Origen/copia/versiones y autor de la operación DEBEN quedar trazables.
- **FR-015**: La copia DEBE ser coherente, recuperable e idempotente ante doble clic, reintento, concurrencia o fallo de archivo; fijar el contenido de origen y rechazar conflictos/material faltante sin dejar borradores incompletos presentados como éxito.
- **FR-016**: Los tres flujos DEBEN conservar autorización docente/administrador y denegar acceso de alumnos u otros docentes sin permiso, desde backend y frontend. Las claves y originales DEBEN continuar privados.
- **FR-017**: Los controles y mensajes DEBEN ser claros en celular/computador, ambos temas y anchuras 360/390/1440, con objetivos táctiles de al menos 44 px, sin desbordamiento y con cancelación/errores recuperables.
- **FR-018**: La entrega DEBE incluir pruebas del archivo real descargado y de persistencia/permisos/copia en entorno aislado con datos sintéticos, además de CI vigente; no DEBE usar alumnos reales ni cambiar producción sin autoridad adicional.

### Entidades clave

- **Materia gestionable**: asignatura/grupo de un docente, con estados activa/archivada y relaciones académicas conservadas.
- **Exportación de notas**: fotografía de lectura autorizada del grupo y evaluaciones seleccionadas, con modo final/provisional y estados explícitos, sin escritura académica.
- **Evaluación fuente**: contenido preparado que el docente selecciona en una versión concreta, junto a lectura, recursos y formato.
- **Copia independiente**: nuevo borrador con identidades propias y material privado correspondiente; no hereda actividad de estudiantes.
- **Operación de copia**: solicitud identificada y recuperable que produce como máximo una copia completa para su origen/versión/destino.

## Criterios de éxito

- **SC-001**: El 100% de las celdas de los CSV de prueba coincide con los datos de referencia para nota final/provisional/estado, incluyendo cero, decimales, homónimos y varias evaluaciones. Ninguna ausencia se convierte en cero ni una sugerencia en decisión final.
- **SC-002**: En cero notas finales, fallos de lectura y cambios de contexto, no hay un archivo vacío/parcial comunicado como éxito; se ofrece una salida comprensible y recuperable.
- **SC-003**: Editar, archivar y restaurar conserva el 100% de los registros académicos de la muestra y cumple cierre de nuevas operaciones, consultas históricas y límite de materias incluso con solicitudes concurrentes.
- **SC-004**: Una copia de la muestra con lectura y recursos se guarda, reabre y exporta conservando todo el contenido previsto; modificar origen/copia no afecta al otro. Reintentos generan una sola copia y cero llamadas a IA.
- **SC-005**: Todos los casos de usuario sin permiso o recurso privado se deniegan sin filtrar claves/archivos; las vistas 360/390/1440, ambos temas, conservan acceso a las acciones y mensajes sin desbordamiento.

## Coordinación documental 130

[Spec130](../130-digitalizacion-secciones/spec.md), issue #274, amplía este contrato bajo aprobación registrada. Las copias remapean también nodos y referencias de presupuestos/pesos. Recuperación documental es una intención explícita revisada en la misma materia, con fuente comprobada y revalidada; la copia normal sigue exigiendo otra materia. No copia notas o alumnos. El estado de pruebas y las limitaciones están en su guía de validación; no supone activación en producción.

## Supuestos

- El usuario aprobó spec/plan, eliminación recuperable y revisión de requisitos el 2026-10-25 mediante «si». Autoriza implementación, no fusión o despliegue.
- «Eliminar» significa retirar de activas con recuperación, no destruir historia ni cuentas. Esta decisión se presentó antes de la aprobación registrada.
- CSV final mínimo conserva lo acordado en Spec090; el informe provisional es una alternativa deliberada con estado por evaluación. No se cambia la política de decisión docente ni se permite publicar automáticamente.
- La demostración descargó un archivo sin notas (confirmado por el usuario). Se constató localmente una ruta que produce exactamente ese síntoma; no se afirma haber inspeccionado su caso real ni el despliegue de producción.
- Reutilizar se limita inicialmente a materias del mismo docente, incluso cuando actúa un administrador; no crea intercambio automático de contenido entre profesores.
- Copiar preserva una evaluación editorial, no clona expedientes de alumnos. Originales y claves siguen privados; revisión pendiente sigue pendiente. Un original que no se guardó históricamente no puede inventarse.
- Se prioriza reparar exportación y después gestión de materias/copia, con pruebas progresivas. No se añaden IA, modelos, edición masiva de notas, contraseñas o nuevos formatos de hoja de cálculo.
