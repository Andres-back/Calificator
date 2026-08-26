# Lista de calidad: seguridad y operación de configuración IA

**Propósito**: revisar que los requisitos cubran secretos, aislamiento, fallback, concurrencia y continuidad operativa
**Creada**: 2026-08-25
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [x] CHK001 ¿Están definidos los permisos separados de administrador, docente propietario y estudiante para todas las configuraciones? [Completitud, Spec §FR-015]
- [x] CHK002 ¿Están enumeradas las capacidades que requieren rutas de modelo independientes? [Completitud, Spec §FR-003]
- [x] CHK003 ¿Se define qué información no sensible debe conservar cada trabajo y qué datos quedan excluidos? [Completitud, Spec §FR-012–FR-014]
- [x] CHK004 ¿Está documentado el ciclo completo de crear, sustituir, probar y eliminar una credencial personal? [Cobertura, Spec §FR-005, §FR-007]

## Claridad y consistencia

- [x] CHK005 ¿La precedencia personal → institucional es inequívoca y consistente con el consentimiento de fallback? [Consistencia, Spec §FR-009–FR-011]
- [x] CHK006 ¿La compatibilidad entre capacidad y modelo tiene un criterio explícito y comprobable? [Claridad, Spec §FR-004]
- [x] CHK007 ¿La distinción entre OpenAI API y ChatGPT y la limitación de Ollama están expresadas sin inducir expectativas incorrectas? [Claridad, Spec §FR-021]
- [x] CHK008 ¿La restauración y el rollout progresivo preservan explícitamente trabajos iniciados y el comportamiento institucional? [Consistencia, Spec §FR-012, §FR-017–FR-018]

## Excepciones y recuperación

- [x] CHK009 ¿Están cubiertos credencial revocada, modelo retirado, proveedor desactivado y fallo temporal? [Cobertura, Spec §Casos límite]
- [x] CHK010 ¿Está definido el resultado cuando el docente no autoriza fallback institucional? [Excepción, Spec §Historia 4]
- [x] CHK011 ¿Está definido cómo resolver guardados concurrentes sin publicar combinaciones parciales? [Recuperación, Spec §FR-019]
- [x] CHK012 ¿Se especifica el tratamiento de configuraciones heredadas sin modelos por capacidad? [Compatibilidad, Spec §Casos límite]

## Medición y trazabilidad

- [x] CHK013 ¿Los tiempos objetivo de configuración y resolución son medibles y separan latencia externa de resolución local? [Medición, Spec §SC-001–SC-002, Plan §Contexto técnico]
- [x] CHK014 ¿La ausencia de secretos en interfaz, trabajos, auditoría y logs puede verificarse objetivamente? [Medición, Spec §SC-004]
- [x] CHK015 ¿La concurrencia de tres o más docentes y el aislamiento entre configuraciones tienen un resultado verificable? [Medición, Spec §SC-009]
- [x] CHK016 ¿Cada requisito funcional puede mapearse a una historia, un contrato y una tarea de implementación o prueba? [Trazabilidad, Spec §Requisitos]

## Notas

- Checklist de revisión previa a implementación; `$speckit-implement` no modifica estos marcadores.
