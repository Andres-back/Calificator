# Lista de calidad de requisitos: Recursos y calificación fluida

**Propósito**: validar claridad, completitud, consistencia y medición antes de implementar
**Creada**: 2026-08-22
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. [x] significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud del ciclo de recursos

- [ ] CHK001 ¿Está especificado que seleccionar materia asocia inmediatamente el borrador y lo muestra al profesor en esa materia? [Completitud, Spec §Clarificaciones, FR-002, FR-004]
- [ ] CHK002 ¿Están diferenciados borrador, apoyo y actividad, incluida la visibilidad estudiantil de cada estado? [Claridad, Spec §FR-003–FR-006]
- [ ] CHK003 ¿Está definido que biblioteca y materia representan una sola identidad y estado, no copias? [Consistencia, Spec §FR-001, FR-004]
- [ ] CHK004 ¿Están descritas las consecuencias de cambiar materia cuando ya existe actividad o consumo estudiantil? [Cobertura, Spec §Casos límite]
- [ ] CHK005 ¿Está definido qué tipos de recurso no son respondibles y qué alternativa recibe el profesor? [Claridad, Spec §Casos límite]
- [ ] CHK006 ¿La relación entre visibilidad, publicación, pausa y cierre evita interpretaciones contradictorias? [Consistencia, Spec §FR-005–FR-007, Supuestos]

## Rendimiento, resiliencia y privacidad

- [ ] CHK007 ¿La confirmación menor a dos segundos y los objetivos 120/180 segundos están definidos para una carga de referencia concreta? [Medición, Spec §SC-004–SC-006, Supuestos]
- [ ] CHK008 ¿Está definido el resultado cuando principal o contraste exceden su presupuesto, sin permitir publicación automática insegura? [Cobertura, Spec §FR-015–FR-016]
- [ ] CHK009 ¿Los requisitos distinguen intentos, fallbacks y deadline total de forma inequívoca? [Claridad, Spec §FR-013–FR-016]
- [ ] CHK010 ¿La idempotencia cubre todos los objetos que podrían duplicarse en digitalización y calificación? [Completitud, Spec §FR-019]
- [ ] CHK011 ¿La telemetría permitida y prohibida está delimitada para tiempos, errores y datos estudiantiles? [Privacidad, Spec §FR-012, FR-020]
- [ ] CHK012 ¿Está especificado cómo escala el presupuesto para PDF y evidencia multihoja sin contradecir el límite de una llamada fallida? [Cobertura, Spec §Supuestos, Gap]
- [ ] CHK013 ¿La equivalencia de calidad antes/después está cuantificada por componente y nota? [Medición, Spec §SC-007]

## Edición transparente de componentes

- [ ] CHK014 ¿Está definido el contexto que debe permanecer visible al editar una pregunta? [Completitud, Spec §Historia 3, FR-021–FR-023]
- [ ] CHK015 ¿La previsualización está claramente separada de la nota oficial auditada? [Consistencia, Spec §FR-024]
- [ ] CHK016 ¿Están especificados los campos auditables obligatorios de todo ajuste docente? [Completitud, Spec §FR-023, Historia 3.4]
- [ ] CHK017 ¿Están cubiertos cambio sin guardar, fallo de red y conflicto concurrente? [Cobertura, Spec §Historia 3.5–3.6, Casos límite]
- [ ] CHK018 ¿El criterio de menos de 30 segundos es objetivamente medible para cualquier componente visible? [Medición, Spec §SC-009]

## Desplazamiento y accesibilidad

- [ ] CHK019 ¿Está definido un único propietario de desplazamiento para lista, detalle y editor en cada estado responsive? [Claridad, Spec §FR-027]
- [ ] CHK020 ¿Están enumerados tamaños, modos, dispositivos de referencia, teclado virtual y áreas seguras? [Completitud, Spec §FR-028–FR-031, SC-011–SC-012]
- [ ] CHK021 ¿Está definido cómo se restaura el bloqueo del cuerpo en cierre, cambio de ruta y error? [Cobertura, Spec §FR-029]
- [ ] CHK022 ¿La conservación de filtros, selección y posición tiene un resultado comprobable? [Claridad, Spec §FR-030]
- [ ] CHK023 ¿Los requisitos de foco, contraste y objetivo táctil cubren todos los controles nuevos? [Accesibilidad, Spec §Historia 4.5–4.6, FR-031]
- [ ] CHK024 ¿Los requisitos cubren WebKit/iPhone además de navegadores Chromium sin depender de un navegador específico? [Compatibilidad, Spec §SC-012]

## Integridad y trazabilidad

- [ ] CHK025 ¿Los permisos están definidos tanto para administración docente como para lectura estudiantil? [Seguridad, Spec §FR-009–FR-010]
- [ ] CHK026 ¿Está preservada una sola Evaluación por recurso y una sola nota vigente por entrega? [Consistencia, Spec §FR-006, FR-008, FR-032]
- [ ] CHK027 ¿Los criterios de éxito funcionales, de rendimiento y móviles se pueden mapear a pruebas y tareas? [Trazabilidad, Spec §SC-001–SC-012]
- [ ] CHK028 ¿Las exclusiones —sin publicación automática, sin eliminar historial y sin sustituir autoridad docente— son consistentes con todos los flujos? [Consistencia, Spec §Supuestos]

## Notas

- Esta lista valida la calidad de lo escrito. No sustituye las pruebas de implementación.
- speckit-implement debe leer estos marcadores, pero no modificarlos.
