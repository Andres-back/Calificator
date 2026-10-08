# Especificación: boletín docente en mosaico

**Rama**: `codex/092-boletin-mosaico` | **Creada**: 2026-10-08 | **Estado**: Alcance, plan y lista revisados; implementación y validación local completadas; sin desplegar | **Issue**: [#194](https://github.com/Andres-back/Calificator/issues/194)

**Solicitud**: «perfeccionemos la vista boletín; debe ser un mosaico de los estudiantes y cuando seleccione un estudiante debe darme el boletín de sus notas, previsualizarlo».

Evoluciona la presentación docente del dominio responsable 008 (calificaciones y boletín), conservando sus reglas, permisos y registros. Mantiene la exportación de 090 y no modifica la vista estudiante de 091.

## Aclaraciones y aprobaciones

- 2026-10-08: el usuario respondió «aprove» a la propuesta de mosaico, previsualización de todas las notas de la materia, explicación y conservación de filtros/exportación. Alcance aprobado; el plan técnico, la fusión y el despliegue no están aprobados todavía.
- 2026-10-08: el usuario respondió nuevamente «aprove» a la presentación del plan técnico. Plan aprobado; fusión y despliegue siguen requiriendo autorización separada y CI verde.
- 2026-10-08: «autorizo» permite revisar los ocho requisitos de la lista de calidad y continuar. Revisión 8/8 sin inconsistencias; implementación autorizada, no fusión ni producción.

## Escenarios de usuario y pruebas

### Historia 1 - Encontrar un estudiante en el mosaico (Prioridad: P1)

El docente abre el boletín de una materia y encuentra fichas compactas de sus estudiantes, en lugar de tarjetas extensas con todas las notas desplegadas. Puede buscar por nombre y reconocer a cada persona antes de abrir su boletín.

**Razón de prioridad**: Es el acceso principal pedido por el usuario y reduce la información que debe recorrer el profesor desde el celular.

**Prueba independiente**: Abrir una materia ficticia con 30 estudiantes, incluidos nombres largos y homónimos, buscar uno y reconocer su ficha sin desplegar notas de otros alumnos.

**Aceptación**:

1. **Dada** una materia con alumnos matriculados, **cuando** el docente autorizado abre el boletín, **entonces** ve un mosaico con una ficha por alumno y no un boletín completo por cada persona.
2. **Dado** un nombre largo o compartido, **cuando** examina el mosaico, **entonces** puede leer el nombre completo y distinguir homónimos mediante un dato identificador disponible, sin necesidad de fotografías personales.
3. **Dado** un grupo con o sin notas, **cuando** busca por nombre o correo y limpia la búsqueda, **entonces** encuentra los alumnos coincidentes y recupera el grupo completo, incluidos quienes aún no tienen notas.
4. **Dado** el filtro por evaluación existente, **cuando** selecciona una evaluación, **entonces** las fichas resumen exclusivamente el resultado o estado de esa evaluación sin convertir pendientes en ceros.

### Historia 2 - Previsualizar las notas de un alumno (Prioridad: P1)

El docente toca una ficha y consulta el boletín de ese alumno en la materia: evaluación, nota, escala y estado. La explicación detallada de una nota se abre solo cuando la solicita.

**Razón de prioridad**: Permite consultar resultados sin abrumar ni confundir una sugerencia de IA con una decisión docente.

**Prueba independiente**: Abrir el boletín de un alumno con una nota publicada, una confirmada no publicada, una sugerencia, una calificación en proceso y una evaluación sin nota; contrastarlo con los datos originales.

**Aceptación**:

1. **Dada** una ficha visible, **cuando** el docente la selecciona, **entonces** abre una previsualización identificada por nombre del alumno y materia, con todas las evaluaciones no borrador de esa materia, aunque el mosaico estuviera filtrado por una evaluación.
2. **Dados** resultados de estados distintos, **cuando** consulta el boletín, **entonces** distingue «Publicada», «Confirmada · sin publicar», «Sugerencia IA · pendiente de revisión», «Calificando» y «Sin calificación», respetando el estado real.
3. **Dada** una nota guardada, **cuando** la ve en el boletín, **entonces** conserva su precisión disponible y escala; un cero real se muestra como cero y una ausencia no se muestra como cero.
4. **Dado** un resultado con explicación disponible y permisos suficientes, **cuando** solicita «Ver explicación», **entonces** llega al detalle existente del alumno y evaluación correctos, sin modificar la nota.
5. **Dado** un boletín abierto, **cuando** lo cierra, **entonces** vuelve al mosaico conservando la búsqueda, los filtros y la posición de desplazamiento.

### Historia 3 - Consultar desde celular sin perder herramientas (Prioridad: P2)

El docente utiliza el mosaico y la previsualización desde iPhone, Android o escritorio, conservando la exportación y los filtros actuales sin una nueva sección del programa.

**Razón de prioridad**: La consulta se realiza principalmente desde el celular y no debe perder las capacidades ya estables.

**Prueba independiente**: Recorrer mosaico, búsqueda, previsualización, cierre, explicación y exportación en anchuras de 360, 390, 768 y 1280 píxeles, con teclado y navegación táctil.

**Aceptación**:

1. **Dada** una pantalla pequeña, **cuando** consulta fichas y boletín, **entonces** nombres, notas y controles permanecen legibles, sin desbordamiento horizontal ni panel fijo que impida desplazarse.
2. **Dada** una persona que usa teclado o lector de pantalla, **cuando** abre o cierra la previsualización, **entonces** reconoce el alumno seleccionado, puede cerrarla y recupera el foco en la ficha original.
3. **Dado** un docente con permiso de lectura, **cuando** usa «Exportar notas», **entonces** conserva la selección de una o varias evaluaciones y el formato aprobado en 090.

### Casos límite

- Materia sin estudiantes: mostrar un estado vacío claro; no inventar fichas.
- Alumnos matriculados sin evaluaciones no borrador: mostrar el mosaico y, al seleccionarlos, «Todavía no hay notas»; no ocultar el grupo completo.
- Búsqueda sin coincidencias: ofrecer limpiar búsqueda y filtros sin perder matrículas.
- Nombres largos o iguales: no ocultar el nombre completo; distinguir alumnos por su identidad existente, nunca agruparlos por nombre.
- Consulta fallida: indicar error y reintento; no representar datos no cargados como «Sin calificación» ni mostrar un boletín completo si falta cargar parte de sus evaluaciones.
- Resultado que cambia mientras se consulta: mostrar el estado vigente al actualizarse, sin cerrar innecesariamente la previsualización ni alterar calificaciones.
- Cambio de materia, cierre de sesión o alumno ya no accesible: cerrar la previsualización anterior y no reutilizar datos privados fuera de su contexto.
- Evaluación seleccionada retirada: conservar el aviso existente y volver a todas las evaluaciones.
- Usuario sin permiso de lectura de notas: no mostrar notas, sugerencias, exportación ni acceso a explicación; conservar únicamente lo permitido por su rol.

## Requisitos

### Requisitos funcionales

- **FR-001**: El boletín docente dentro de cada materia DEBE presentar un mosaico compacto con una ficha por estudiante matriculado, identificado por su identidad existente, incluyendo a quienes no tienen notas.
- **FR-002**: Cada ficha DEBE mostrar el nombre completo, una identificación visual sin fotografía personal y un resumen breve; el detalle de evaluaciones y retroalimentación NO DEBE desplegarse en todas las fichas.
- **FR-003**: El mosaico DEBE conservar búsqueda por nombre/correo y filtros existentes de evaluación y seguimiento, con limpieza accesible y estados vacíos comprensibles. Los resúmenes y contadores DEBEN corresponder al filtro activo.
- **FR-004**: Seleccionar una ficha DEBE abrir una previsualización de solo lectura, claramente titulada con alumno y materia, que incluya todas sus evaluaciones no borrador de esa materia. El filtro del mosaico NO DEBE ocultar notas de la previsualización.
- **FR-005**: Cada resultado DEBE identificar evaluación, nota disponible, escala y estado real, diferenciando publicado, confirmado sin publicar, sugerencia pendiente, procesamiento y ausencia. NO DEBE redondear a una precisión menor que la nota guardada ni confundir ausencia con cero; los cálculos de promedio existentes permanecen sin cambios.
- **FR-006**: La previsualización DEBE permitir consultar la explicación mediante el detalle de calificación existente cuando los datos y permisos lo permitan. La consulta NO DEBE confirmar, publicar, recalificar ni modificar registros.
- **FR-007**: Cerrar la previsualización DEBE conservar búsqueda, filtros y posición del mosaico y devolver el foco a la ficha; cambiar de materia o identidad DEBE descartar la selección anterior.
- **FR-008**: El mosaico y la previsualización DEBEN funcionar desde 360 píxeles, en claro/oscuro, iPhone y Android, con controles de al menos 44 por 44 píxeles, nombres legibles, desplazamiento accesible y sin desbordamiento horizontal. La apertura/cierre DEBE ser operable por teclado y anunciar el contenido seleccionado.
- **FR-009**: Las cargas, errores y reintentos DEBEN distinguirse de ausencia real de notas. Una consulta parcial NO DEBE presentarse como boletín completo; abrir una ficha NO DEBE recargar los boletines de todos los demás alumnos.
- **FR-010**: El cambio DEBE conservar la exportación aprobada en 090, los permisos vigentes y la vista estudiante de 091, sin modificar notas, evidencias, usuarios, matrículas, proveedores de IA o criterios de evaluación.

### Entidades clave

- **Estudiante matriculado**: identidad existente, nombre y dato de identificación disponible; pertenece a la materia consultada y conserva sus vínculos y credenciales.
- **Resultado de evaluación**: evaluación no borrador, escala, nota o sugerencia disponible, estado y vínculo autorizado a su explicación; mantiene las reglas de 008.
- **Previsualización de boletín**: vista temporal de los resultados de un solo estudiante en una sola materia; no constituye un nuevo registro académico ni una calificación oficial distinta.

## Criterios de éxito

- **SC-001**: Con un grupo de 30 estudiantes, buscar un nombre y abrir su boletín requiere escribir la búsqueda y una sola selección, sin desplegar resultados de otros alumnos.
- **SC-002**: La previsualización representa el 100% de las evaluaciones no borrador del alumno en la materia; las notas, escalas y estados coinciden con los originales, incluidos cero real, nota decimal y nota ausente.
- **SC-003**: En 360, 390, 768 y 1280 píxeles, todos los controles críticos son accesibles, sin desbordamiento horizontal ni impedimentos para llegar al último resultado o cerrar la previsualización.
- **SC-004**: Tras abrir y cerrar el boletín, se conserva el 100% de la búsqueda, filtros y posición anterior; cambiar de materia no conserva una selección privada del contexto previo.
- **SC-005**: Con resultados ya cargados y 30 estudiantes, la apertura de la previsualización permite ver el boletín en menos de un segundo en las pruebas de interacción, sin esperar una recarga del grupo.
- **SC-006**: Las pruebas de consulta, explicación y exportación conservan el 100% de los registros académicos y rechazan accesos de roles no autorizados; la vista estudiante mantiene su funcionamiento previo.

## Supuestos

- «Boletín» se refiere a la pestaña docente dentro de una materia, no a un reporte institucional entre materias.
- El mosaico no necesita fotos de estudiantes: se usan iniciales e identificación disponible, sin incorporar datos personales nuevos.
- El profesor consulta todas las notas de la materia al seleccionar un alumno; el filtro por evaluación se mantiene para comparar al grupo en el mosaico.
- La previsualización no añade nuevos cálculos de nota final, ponderaciones, certificados, impresión ni nuevos formatos de exportación. La exportación ya existente se conserva.
- Se reutilizan las notas, estados y controles de autorización actuales. No se requiere generar contenido con IA para consultar el boletín.
- Aprobación humana de alcance y plan antes de implementar; fusión y producción requieren autorización separada y CI verde.
