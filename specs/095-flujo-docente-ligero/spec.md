# Especificación: flujo docente ligero en fase demo

**Rama**: `codex/095-flujo-docente-ligero` | **Creada**: 2026-10-13 | **Estado**: Alcance/plan y lista aprobados; implementación y pruebas focalizadas completas, entrega a CI sin fusión/despliegue | **Issue**: [#200](https://github.com/Andres-back/Calificator/issues/200)

El usuario respondió «ADELANTE IMPLEMENTEMOS ESTO» a siete ideas de interfaz docente. Se ejecutarán primero cabeceras, acciones de evaluaciones y boletín; después claridad de nota, continuación, captura y vocabulario. En fase demo, la estabilidad y conservación de registros prevalecen. La aprobación del alcance no sustituye la revisión del plan ni autoriza fusión/despliegue.

Aprobación: el usuario respondió «adelante» al plan y a la revisión de lista con continuidad si está completa, el 2026-10-13. No autoriza fusión ni despliegue.

## Escenarios de usuario y pruebas

### Historia 1 - Ver lo importante de la materia (Prioridad: P1)

Como profesor, quiero identificar materia y grado y llegar pronto a las evaluaciones o a mis estudiantes, sin una pantalla inicial llena de controles secundarios.

**Razón de prioridad**: Las cabeceras y acciones numerosas consumen espacio y distraen de la tarea durante la demo.

**Prueba independiente**: Abrir una materia, una evaluación y un boletín en celular; identificar el grupo, encontrar sus acciones y seleccionar un estudiante sin abrir ajustes.

**Aceptación**:
1. **Dado** un grupo con grado y nombre largo, **cuando** se abre una sección, **entonces** materia y grado se leen sin desplegar información, la cabecera es compacta y no tapa contenido al desplazarse.
2. **Dado** un examen publicado, **cuando** se abre la lista, **entonces** Visualizar, Calificar por foto y Ver notas aparecen según modalidad/permisos; los ajustes y eliminar quedan en Más opciones sin perder confirmaciones. Un borrador mantiene las acciones de preparación/publicación que le correspondan.
3. **Dado** un boletín con estudiantes, **cuando** se abre, **entonces** búsqueda y mosaico se priorizan, los filtros secundarios se despliegan a petición y cualquier filtro aplicado queda indicado aunque se cierre su panel.

### Historia 2 - Entender y continuar la revisión (Prioridad: P2)

Como profesor, quiero distinguir sugerencia, nota publicada y avisos, y volver a la revisión que dejé abierta sin buscar nuevamente el grupo.

**Razón de prioridad**: Aprovechar la claridad existente y reducir recorridos sin cambiar la decisión sobre la nota.

**Prueba independiente**: Revisar una nota, regresar al inicio y continuar en el mismo alumno/evaluación; repetir con otra cuenta o con acceso revocado.

**Aceptación**:
1. **Dado** una nota pendiente o decidida, **cuando** se abre, **entonces** nota/estado son prioritarios, evidencia y respuestas conservan acceso directo, y avisos activos relevantes no se esconden entre opciones; los antiguos siguen separados.
2. **Dado** una revisión válida ya consultada, **cuando** el docente vuelve al inicio, **entonces** puede Continuar revisión en su contexto anterior sin enviar ni confirmar nada automáticamente.
3. **Dado** otra cuenta, sesión cerrada, evaluación eliminada o acceso perdido, **cuando** se intenta continuar, **entonces** no se revelan datos de la cuenta previa, no se fuerza acceso y se ofrece volver a las materias disponibles.

### Historia 3 - Registrar entregas con identidad clara (Prioridad: P2)

Como profesor, quiero saber cuánto falta de mi grupo y elegir rápidamente al siguiente estudiante sin confundir su entrega con la de otro.

**Razón de prioridad**: Reducir pasos sin sacrificar la identificación correcta ni confundir envío con calificación terminada.

**Prueba independiente**: Registrar entregas sintéticas de un grupo de 30; observar el progreso, escoger al siguiente, provocar un fallo y reintentar conservando sus hojas.

**Aceptación**:
1. **Dado** un grupo con entregas registradas, **cuando** se abre la captura, **entonces** el progreso usa alumnos únicos del grupo y diferencia entrega registrada de nota final; no afirma que todos tengan foto si el dato solo acredita una entrega.
2. **Dado** un envío aceptado, **cuando** se propone un siguiente estudiante disponible, **entonces** el profesor ve su nombre y lo elige explícitamente; no se hereda evidencia anterior ni se dispara envío/cámara automáticamente.
3. **Dado** un fallo o comprobación de entregas incompleta, **cuando** se muestra la captura, **entonces** no aumenta falsamente el progreso ni habilita cargas inseguras; se conservan las hojas y el contexto para reintentar.

### Casos límite

- Materia sin grado, título largo, cuenta con permisos parciales, evaluación borrador/online/física/mixta/archivada: mostrar solo acciones válidas y conservar las rutas existentes.
- Filtro de boletín activo pero panel cerrado, búsqueda sin resultados, ausencia de alumnos y carga fallida: explicar el estado y permitir limpiar/reintentar sin borrar configuración útil.
- Cambio de alumno/materia con foto, nota o retroalimentación sin guardar: mantener la protección existente; continuar no restaura una foto ni simula un borrador guardado.
- Historial decidido con discrepancia antigua, nota cero real y proceso en curso: no reabrir decisiones ni presentar espera como cero.
- Entregas online, notas manuales, reintentos o estudiantes retirados: el progreso describe solo lo verificable y no cuenta duplicados, usuarios ajenos ni una lectura parcial como total.
- Último estudiante, grupo vacío, siguiente ya atendido desde otra sesión y pérdida de conexión: validar disponibilidad antes de habilitar envío y mantener búsqueda manual.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las cabeceras docentes DEBEN mostrar materia y grado disponible de forma breve y legible; información administrativa secundaria permanecerá desplegable, sin cambiar los datos.
- **FR-002**: Cada evaluación DEBE mostrar un máximo de tres acciones principales apropiadas a su estado, modalidad y permisos; Más opciones conserva todas las secundarias y las confirmaciones existentes.
- **FR-003**: El boletín DEBE priorizar búsqueda/mosaico y agrupar filtros secundarios; indicar filtros activos y permitir cambiarlos/limpiarlos sin perder búsqueda, selección, previsualización ni exportación.
- **FR-004**: La revisión DEBE conservar nota/estado prioritarios, suma/escala/ajuste consultables, evidencia y puntajes accesibles, historial separado y avisos activos visibles; no cambiar cálculo ni barreras de confirmación/publicación.
- **FR-005**: El inicio docente DEBE ofrecer Continuar revisión únicamente para un contexto previo válido de esa cuenta, con materia y evaluación identificables y sin abrir ni enviar entregas automáticamente.
- **FR-006**: El contexto de continuación DEBE ser mínimo, aislado por cuenta y descartable; no guardar fotos, contraseñas, respuestas o notas. Cierre de sesión/cambio de usuario, acceso perdido, contenido eliminado y almacenamiento no disponible DEBEN manejarse sin bloquear el inicio ni revelar contexto ajeno.
- **FR-007**: La captura DEBE mostrar progreso basado en estudiantes únicos del grupo y registros comprobados; usar texto que distinga entrega registrada de trabajo terminado y no invente modalidad de evidencia.
- **FR-008**: Tras aceptación de una entrega se DEBE proponer el siguiente estudiante elegible sin seleccionarlo ni enviarlo de forma silenciosa; mantener nombre visible, búsqueda manual, validación de disponibilidad y separación de evidencias.
- **FR-009**: Los textos docentes DEBEN ser consistentes para la misma acción; Pasar lista, Ver notas, Calificar por foto y Guardar cambios conservan su significado y los avisos técnicos no aparecen como instrucciones al docente.
- **FR-010**: Los recorridos DEBEN funcionar en 360/390/768/1280/1440 píxeles, claro/oscuro, teclado y navegadores de Android/iPhone; controles de al menos 44 × 44 píxeles, sin desbordamiento horizontal ni acciones tapadas por menús o barras.
- **FR-011**: Se DEBEN conservar notas, evidencia, criterios, estudiantes, contraseñas, historial, permisos, guardado automático de asistencia, exportaciones y protección de cambios sin guardar. Consultar, continuar o escoger el siguiente alumno NO crea/publica calificaciones ni duplica registros.
- **FR-012**: No se DEBEN alterar modelos, generación, interpretación de respuestas, fórmulas o calificaciones reales en este cambio; la entrega exige pruebas focalizadas, controles verdes y autorización separada antes de producción.

### Entidades clave

- **Contexto docente**: docente, materia, evaluación y alumno consultado; referencia de navegación sin contenido educativo guardado adicional.
- **Evaluación**: modalidad, estado, permisos y acciones disponibles; registros actuales conservados.
- **Boletín**: grupo, búsqueda, filtros aplicados, estudiante y previsualización; sin notas nuevas.
- **Progreso de entregas**: total de alumnos del grupo, alumnos con entrega registrada y pendientes elegibles; no es progreso de inferencia ni confirmación.

## Criterios de éxito

- **SC-001**: En el grupo sintético de 30 estudiantes, a 390 × 844, la primera ficha del boletín está completa en la pantalla inicial sin abrir filtros; materia/grado, búsqueda y filtros activos son identificables.
- **SC-002**: Cada estado/modalidad de evaluación muestra como máximo tres acciones principales y todas sus acciones válidas siguen accesibles; un usuario sin permiso no obtiene controles privilegiados.
- **SC-003**: Continuar revisión recupera materia/evaluación/alumno con una acción desde el inicio; cuentas distintas nunca recuperan el contexto ajeno y acceso inválido permite volver a materias sin bloquear navegación.
- **SC-004**: En 30 estudiantes con duplicados, reintentos y fallos sintéticos, el progreso cuenta una sola vez a cada alumno elegible; la propuesta siguiente requiere elección y no reaprovecha fotos anteriores.
- **SC-005**: Los recorridos de consulta, menú, filtros, continuación y elección siguiente realizan cero escrituras académicas; guardado/envío explícitos conservan sus reglas y las regresiones focalizadas pasan.
- **SC-006**: La matriz de pantallas no presenta desbordamiento horizontal ni controles inaccesibles; el docente puede consultar evidencia, puntajes, exportar y volver a la lista en móvil y computador.

## Supuestos

- Se aceptan las siete ideas; las tres primeras se implementan y verifican primero, sin desplegar partes incompletas durante la demo.
- La función Continuar es una comodidad de navegación en el mismo navegador, no recuperación de borradores ni sincronización entre dispositivos. Puede descartarse sin afectar datos guardados.
- No todos los registros existentes permiten afirmar que hay foto: se mostrará Entregas registradas cuando ese sea el dato verificable.
- Las pruebas usan únicamente ejemplos sintéticos. No se prueba con estudiantes reales, no se regeneran credenciales y no se prometen tiempos nuevos de IA.
- Se reutilizan permisos, contexto de materias y recorridos de evaluación/revisión actuales. El diseño detallado y la lista de requisitos se revisan antes de código.
