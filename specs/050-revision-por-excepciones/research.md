# Investigación: Revisión docente por excepciones

## Decisión 1: Derivar riesgo sin otra llamada de IA

**Decisión**: Usar estados, bloqueos, explicaciones y valoraciones ya almacenados.

**Justificación**: Evita latencia, costo, divergencia y una segunda opinión opaca. La clasificación puede probarse con entradas deterministas.

**Alternativas consideradas**: Solicitar al LLM un resumen de riesgo; descartado porque podría contradecir la calificación y convertir la revisión en otro proceso lento.

## Decisión 2: Tres niveles con prioridad conservadora

**Decisión**: Bloqueada para imposibilidad objetiva de revisión rápida; atención para incertidumbre; segura para respuestas consistentes sin señales registradas.

**Justificación**: Separa un impedimento real de una señal que solo merece inspección. “Segura” significa sin alertas detectadas, no correcta de forma garantizada.

**Alternativas consideradas**: Dos niveles; descartado porque mezclar ilegibilidad con confianza media impide priorizar.

## Decisión 3: Confianza como señal, no como autorización

**Decisión**: Usar 0,70 como umbral de atención y mantener siempre la confirmación docente.

**Justificación**: Es coherente con la semántica ya visible en el workspace y evita calibrar un umbral nuevo sin datos del piloto.

**Alternativas consideradas**: Publicación automática por alta confianza; descartada por integridad académica y constitución.

## Decisión 4: Analítica mínima

**Decisión**: Registrar apertura, salto entre excepciones y finalización con conteos y duración.

**Justificación**: Permite medir utilidad y tiempo sin persistir respuestas, imágenes ni explicaciones.

**Alternativas consideradas**: Guardar cada componente visualizado; descartado por granularidad innecesaria y mayor exposición de comportamiento.
