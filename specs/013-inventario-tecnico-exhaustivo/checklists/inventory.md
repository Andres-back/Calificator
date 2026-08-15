# Lista de calidad de requisitos: Inventario técnico exhaustivo

**Propósito**: validar que los requisitos del inventario sean completos, inequívocos y aptos como gate de PR
**Creada**: 2026-08-14
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. [x] significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [X] CHK001 ¿Están enumerados todos los tipos de superficie que deben inventariarse y sus límites de actividad? [Completitud, Spec §FR-001–FR-006]
- [X] CHK002 ¿Están definidos por separado los permisos observables del backend y las guardas del frontend? [Completitud, Spec §FR-002–FR-003]
- [X] CHK003 ¿La ausencia de pruebas tiene un resultado documental explícito en lugar de ocultar la superficie? [Completitud, Spec §FR-008]
- [X] CHK004 ¿Las excepciones tienen todos los campos de responsabilidad y cierre exigidos? [Completitud, Spec §FR-010]

## Claridad

- [X] CHK005 ¿La definición de superficie activa permite decidir objetivamente qué se incluye? [Claridad, Spec §Supuestos]
- [X] CHK006 ¿La propiedad única diferencia claramente propietario de consumidores compartidos? [Claridad, Spec §FR-007]
- [X] CHK007 ¿El significado de salida equivalente excluye campos volátiles y diferencias de plataforma? [Claridad, Spec §FR-013, SC-002]
- [X] CHK008 ¿Los mensajes accionables tienen un resultado mínimo observable y verificable? [Clarity, Spec §FR-009, SC-003]

## Consistencia

- [X] CHK009 ¿Los requisitos de no cambiar funcionalidad son consistentes con el tratamiento de hallazgos y código huérfano? [Consistencia, Spec §FR-011]
- [X] CHK010 ¿El modelo de excepción es consistente con la obligación de asignar propietario a cada superficie? [Consistencia, Spec §FR-007, FR-010]
- [X] CHK011 ¿La terminología endpoint, ruta, llamada, tabla, job e integración se usa sin sinónimos contradictorios? [Consistencia, Spec §Entidades clave]

## Criterios de aceptación y medición

- [X] CHK012 ¿El objetivo de cobertura del 100 % especifica qué ocurre con superficies ambiguas o no cubiertas? [Medición, Spec §SC-001, SC-004]
- [X] CHK013 ¿Los límites temporales de generación y detección pueden medirse en local y CI sin servicios externos? [Medición, Spec §SC-003, Plan §Contexto técnico]
- [X] CHK014 ¿El criterio de cero diferencias distingue deriva real de cambios deliberadamente regenerados? [Medición, Spec §SC-002]

## Escenarios, riesgos y límites

- [X] CHK015 ¿Los requisitos cubren rutas parametrizadas, métodos múltiples, tablas históricas y permisos discordantes? [Cobertura, Spec §Casos límite]
- [X] CHK016 ¿La recuperación ante configuración inválida o extracción parcial está definida como fallo sin artefactos incompletos? [Gap, Recovery]
- [X] CHK017 ¿La prohibición de leer secretos y datos estudiantiles identifica las raíces permitidas y excluidas? [Seguridad, Spec §FR-012, Plan §Contrato]
- [X] CHK018 ¿Los hallazgos críticos tienen una condición inequívoca para exigir issue antes de aprobación? [Cobertura, Spec §SC-006]
## Recuperación y permisos ambiguos

- [X] CHK019 ¿La conservación atómica de artefactos válidos está especificada para fallos de extracción, validación y escritura? [Recovery, Spec §FR-015]
- [X] CHK020 ¿Los overrides de permisos ambiguos tienen identidad, actores, justificación e issue sin alterar la propiedad? [Security, Spec §FR-016]