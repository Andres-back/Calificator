# Hotfix: recuperar respuestas manuscritas antes de calificar

**Rama**: `codex/069-recuperar-respuestas-manuscritas`  
**Creada**: 2026-09-24  
**Estado**: Aprobado por el usuario como hotfix  
**Issue**: [#143](https://github.com/Andres-back/Calificator/issues/143)

## Impacto y reproducción

Una fotografía legible de comprensión lectora contiene respuestas a lápiz en las cinco preguntas. La extracción reconoció el cuento y los enunciados impresos, pero omitió las respuestas manuscritas. Al considerar la página utilizable por contener texto, no activó la contingencia visual. Los dos calificadores recibieron después el mismo contexto incompleto y sugirieron cero.

## Requisitos

- **FR-001**: Una extracción de entrega física NO DEBE considerarse completa únicamente por reconocer texto impreso cuando existen preguntas físicas esperadas y no se recuperó ninguna respuesta.
- **FR-002**: La ausencia de respuestas recuperadas DEBE activar las contingencias visuales configuradas antes de terminar la extracción.
- **FR-003**: Si ninguna lectura visual recupera respuestas, el resultado DEBE quedar inconcluso y reintentable, sin convertir la incertidumbre en una nota cero.
- **FR-004**: Los evaluadores visuales DEBEN recibir la evidencia real y distinguir una respuesta incorrecta de una respuesta ausente o ilegible.
- **FR-005**: El docente DEBE poder reanalizar la evidencia guardada mientras la sugerencia esté pendiente de revisión y no exista una decisión docente.
- **FR-006**: No se modifican automáticamente calificaciones confirmadas, ajustadas o publicadas ni se incorpora evidencia estudiantil real a las pruebas.

## Criterios de aceptación

1. Una primera lectura que devuelve texto impreso pero cero respuestas activa el modelo de contingencia.
2. Una contingencia que encuentra escritura produce respuestas estructuradas por pregunta y continúa hacia la calificación.
3. Si todos los lectores devuelven solo texto impreso, la nota sugerida queda vacía, la entrega requiere reintento y el docente ve una explicación clara.
4. El reintento reutiliza la misma entrega y calificación, sin duplicar registros ni alterar decisiones docentes.
5. Una regresión sintética reproduce texto impreso reconocido y respuestas manuscritas omitidas, sin datos personales.

## Causa y solución

El criterio de éxito visual aceptaba cualquier `page_text`, aunque proviniera únicamente del material impreso. La solución exige una señal real de respuesta para entregas físicas, refuerza la lectura de lápiz tenue, activa el respaldo ante una extracción sin respuestas y trata el agotamiento como lectura inconclusa. La verificación deja de asumir que la transcripción es completa y contrasta la imagen antes de confirmar ausencia.
