# Investigación: Alineación de autorización efectiva

## Decisión 1: conservar autorización por objeto existente

**Decisión**: Mantener los helpers de materias, presentaciones, herramientas y evaluaciones como fuente efectiva de permiso, y cubrirlos con pruebas de rol y propiedad.

**Razón**: Las rutas señaladas no confían únicamente en autenticación. Delegan en comprobaciones que validan profesor propietario, administrador, matrícula activa, publicación o relación con la evaluación. Repetir esas reglas en cada router aumentaría la divergencia.

**Alternativas consideradas**:
- Añadir `require_role` sin comprobar propiedad: insuficiente, porque dos profesores comparten rol pero no ámbito.
- Reescribir todos los permisos en dependencias nuevas: más riesgo y duplicación sin beneficio funcional.
- Restringir toda lectura a profesor: rompería recursos y presentaciones publicados para estudiantes matriculados.

## Decisión 2: separar lectura estudiantil de gestión docente

**Decisión**: Representar como actores de lectura a profesor, estudiante y administrador cuando el servicio aplica filtros por objeto; las mutaciones mantienen actores docentes.

**Razón**: Un estudiante matriculado puede leer material publicado sin obtener edición, soluciones, estado administrativo ni acceso a objetos ajenos. Ese permiso es intencionalmente distinto de gestionar.

**Alternativas consideradas**:
- Crear endpoints duplicados solo para estudiante: añadiría contratos redundantes y no mejora la comprobación de propiedad.
- Eliminar lectura estudiantil del backend por ausencia de una pantalla específica: confundiría falta de consumidor actual con falta de autorización válida.

## Decisión 3: overrides auditados para límites del análisis estático

**Decisión**: Usar `permission-overrides.json` para las diez decisiones concretas y ampliar su validación con evidencia de prueba versionada.

**Razón**: El extractor actual reconoce llamadas directas a `require_role`, pero no sigue llamadas asíncronas a servicios ni el grafo de consumidores TypeScript. Un override explícito, enlazado al issue y a pruebas, es determinista y fue previsto por la especificación 013.

**Alternativas consideradas**:
- Implementar análisis interprocedural completo: complejidad desproporcionada, frágil ante SQL y helpers dinámicos.
- Cambiar la heurística para silenciar todo backend `authenticated`: ocultaría diferencias reales.
- Ignorar los hallazgos: incumple trazabilidad y dejaría ruido permanente.

## Decisión 4: catálogo de eventos analíticos por rol

**Decisión**: Crear un catálogo cerrado que determine nombre admitido, roles, referencias permitidas y claves de metadatos por evento.

**Razón**: El servidor ya deriva el actor de la sesión, pero cualquier usuario autenticado puede enviar un nombre arbitrario y asociarlo a UUID académicos no comprobados. Un catálogo por evento permite ampliar telemetría estudiantil sin conceder eventos docentes.

**Alternativas consideradas**:
- Restringir el endpoint completo a profesor/administrador: contradice el contrato transversal aprobado y dificulta métricas estudiantiles seguras.
- Aceptar cualquier nombre y limpiar solo metadatos: sigue permitiendo contaminación semántica.
- Devolver éxito y descartar silenciosamente en servidor: oculta errores de integración; el desacoplamiento ya se resuelve en el cliente.

## Decisión 5: validar referencias académicas por sesión

**Decisión**: Cuando un evento permita `evaluacion_id` o `calificacion_id`, comprobar existencia, coherencia y relación del actor; una calificación debe pertenecer a la evaluación indicada si ambas aparecen.

**Razón**: Aunque el evento no revela el objeto, referencias arbitrarias contaminan reportes y pueden atribuir actividad a ámbitos ajenos.

**Alternativas consideradas**:
- Guardar UUID sin comprobar: comportamiento actual inseguro para integridad analítica.
- Eliminar todas las referencias: perdería métricas útiles por evaluación y calificación.
- Validar referencias después en reportes: conserva datos contaminados y vuelve ambiguo su origen.

## Decisión 6: metadatos mínimos y acotados

**Decisión**: Admitir únicamente objetos JSON poco profundos, tamaño acotado, claves conocidas por evento y valores escalares; bloquear claves de identidad, rol, credenciales, respuestas y evidencia.

**Razón**: `metadata_json` no debe convertirse en almacenamiento paralelo de datos estudiantiles ni permitir cargas excesivas.

**Alternativas consideradas**:
- Eliminar metadatos: impediría medidas como tamaño de lote o variación de ajuste.
- Lista global de claves: mezcla necesidades de eventos distintos y amplía datos innecesarios.
- Cifrar metadatos arbitrarios: no corrige minimización ni contaminación.

## Decisión 7: sin cambios de esquema ni rutas

**Decisión**: Mantener cuerpos, URLs y tabla `analytics_eventos`; aplicar validación antes de persistir.

**Razón**: La estructura existente basta y evita migraciones en una corrección de autorización.

**Alternativas consideradas**:
- Nueva tabla de políticas: introduce estado administrable innecesario.
- Versionar un endpoint nuevo: duplicaría telemetría y prolongaría el contrato inseguro.
