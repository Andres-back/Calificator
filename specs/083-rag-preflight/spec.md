# Especificación: recuperación de contexto sin esperas inútiles

**Rama**: `codex/083-rag-preflight` | **Creada**: 2026-10-05 | **Estado**: Aprobada (hotfix) | **Issue**: #172

## Escenarios de usuario y pruebas

### Historia 1 - Calificar sin material de referencia indexado (Prioridad: P1)

El docente recibe la sugerencia de nota sin esperar por referencias inexistentes. Conserva preguntas, respuestas correctas, criterios y rúbricas seleccionadas.

**Razón de prioridad**: una prueba demo tardó 59.253 segundos, incluyendo aproximadamente 30 segundos de espera innecesaria de contexto.

**Prueba independiente**: calificar la misma evidencia demo antes y después, sin confirmar ni publicar la nota.

**Aceptación**:
1. **Dado** que no hay referencias indexadas accesibles, **cuando** se califica, **entonces** se continúa sin consultar el servicio de búsqueda semántica.
2. **Dado** que solo existen referencias de otro docente o materia, o excluidas para la operación, **cuando** se busca contexto, **entonces** se aplica la misma ausencia de referencias sin exposición cruzada.

### Historia 2 - Conservar referencias disponibles (Prioridad: P1)

El docente que tiene fuentes indexadas conserva la recuperación de contexto pertinente y su procedencia.

**Prueba independiente**: las referencias autorizadas habilitan la búsqueda, las incompatibles no se mezclan, y los errores siguen siendo recuperables.

**Aceptación**:
1. **Dado** material autorizado indexado, **cuando** se consulta, **entonces** continúa la búsqueda compatible habitual.
2. **Dado** un fallo de disponibilidad, **cuando** se consulta, **entonces** se declara la falta de contexto sin fabricarlo ni modificar notas anteriores.

### Casos límite

- Referencias sin vector, huérfanas, excluidas o fuera del alcance no habilitan búsqueda.
- Referencias globales autorizadas conservan su comportamiento actual.
- Una fuente agregada después de comprobar ausencia se recuperará en la siguiente consulta; no se conserva una caché de ausencia.
- Con referencias disponibles, la latencia del proveedor sigue siendo variable; no se promete un tiempo universal de 20 segundos.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE omitir la búsqueda semántica cuando no existe material indexado accesible para la consulta.
- **FR-002**: La comprobación DEBE respetar profesor, materia, tipo y exclusiones aplicables a la búsqueda habitual.
- **FR-003**: Con fuentes disponibles, DEBE conservar recuperación, compatibilidad del espacio y procedencia; ante fallos no DEBE fabricar contexto.
- **FR-004**: El cambio NO DEBE alterar evidencias, notas históricas, rúbricas, criterios, modelos ni decisiones docentes.
- **FR-005**: DEBE verificarse la regresión y medirse una calificación nueva en producción con la cuenta demo, sin publicar la nota.

### Entidades clave

- **Fuente y fragmento de referencia**: contenido autorizado de una materia o catálogo global, con fragmentos indexados.
- **Calificación sugerida**: resultado pendiente de revisión humana; permanece independiente del contexto opcional.

## Criterios de éxito

- **SC-001**: En todos los casos sin fuentes accesibles, no se solicita búsqueda semántica.
- **SC-002**: Los escenarios con fuentes y de aislamiento superan las pruebas de regresión.
- **SC-003**: La prueba demo posterior registra resultado y tiempos, y deja de perder los 30 segundos identificados por ausencia de fuentes.

## Supuestos

- Aprobación humana del alcance correctivo: «RESUELVELO», después del informe de la espera del embedding. Hotfix según constitución; se omite únicamente la pausa de aprobación del plan.
- El módulo canónico 009 conserva responsabilidad de RAG; 008 conserva responsabilidad de calificación. Sin migraciones ni cambios de API.
- La mejora no sustituye ni elimina los criterios explícitos enviados a los evaluadores.
