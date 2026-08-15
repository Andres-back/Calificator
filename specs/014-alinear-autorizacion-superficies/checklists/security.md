# Lista de calidad de requisitos: Autorización y analítica segura

**Propósito**: validar que los requisitos de rol, propiedad, publicación, telemetría e inventario sean claros y completos antes de implementar
**Creada**: 2026-08-14
**Especificación**: [spec.md](../spec.md)

> Los marcadores pertenecen al revisor. `[x]` significa que la calidad del requisito fue aprobada, no que la implementación esté terminada.

## Completitud

- [ ] CHK001 ¿Están enumeradas las diez superficies y la decisión de actores esperada para cada una? [Completitud, Spec §Decisiones de autorización esperada]
- [ ] CHK002 ¿Están diferenciadas lectura estudiantil, gestión docente y capacidad administrativa para materias, recursos y presentaciones? [Completitud, Spec §FR-003–FR-010]
- [ ] CHK003 ¿Están documentadas las condiciones de propiedad, matrícula activa y publicación que complementan el rol? [Completitud, Spec §FR-003–FR-008]
- [ ] CHK004 ¿Está definido qué información de una incidencia debe conservarse al resolverla? [Completitud, Spec §FR-011]
- [ ] CHK005 ¿Están especificados catálogo, roles, referencias y metadatos para cada evento analítico inicial? [Completitud, Spec §FR-012–FR-014, Contrato §Catálogo inicial]
- [ ] CHK006 ¿Está delimitado que tablas históricas y cobertura ajena a las diez superficies permanecen fuera de alcance? [Completitud, Spec §Supuestos]

## Claridad y consistencia

- [ ] CHK007 ¿El término “ámbito docente” tiene una definición única y verificable para cada objeto involucrado? [Claridad, Spec §Entidades clave]
- [ ] CHK008 ¿La expresión “administrador habilitado” es consistente con la decisión de no ampliar capacidades administrativas? [Consistencia, Spec §FR-003–FR-010, Spec §Supuestos]
- [ ] CHK009 ¿Las reglas de lectura estudiantil son consistentes entre historias, requisitos, matriz y modelo de autorización? [Consistencia, Spec §Historia 3, Spec §FR-006/FR-008, Modelo §Asignación estudiantil]
- [ ] CHK010 ¿Está inequívocamente separada la creación estudiantil de un reclamo de su resolución docente? [Claridad, Spec §FR-009–FR-011]
- [ ] CHK011 ¿Los límites de metadata están cuantificados de forma coherente en plan y contratos? [Claridad, Contrato §Límites globales]
- [ ] CHK012 ¿Está definida la relación entre referencias canónicas del evento y valores heredados enviados hoy como metadata? [Consistencia, Contrato §Compatibilidad del cliente]

## Cobertura de escenarios

- [ ] CHK013 ¿Los requisitos abarcan usuario sin sesión, rol incorrecto, profesor ajeno y estudiante no matriculado? [Cobertura, Spec §Historia 1 y Casos límite]
- [ ] CHK014 ¿Están cubiertos recurso no publicado, presentación no publicada y matrícula revocada? [Cobertura, Spec §Historia 3, Modelo §Asignación estudiantil]
- [ ] CHK015 ¿Está definido el resultado cuando la sesión expira entre lectura y mutación? [Cobertura, Spec §Casos límite]
- [ ] CHK016 ¿Están cubiertas referencias analíticas inexistentes, ajenas e incoherentes entre evaluación y calificación? [Cobertura, Spec §FR-012–FR-015, Modelo §Reglas de coherencia]
- [ ] CHK017 ¿Está definido el comportamiento frente a nombres de evento desconocidos, claves no permitidas y metadata excesiva o anidada? [Cobertura, Contrato §Límites globales]
- [ ] CHK018 ¿Está documentado que una denegación no deja cambios parciales ni altera la acción académica principal? [Cobertura, Spec §FR-015, Plan §Registro analítico seguro]

## Seguridad, privacidad y medición

- [ ] CHK019 ¿Los requisitos establecen al servidor como autoridad incluso ante invocación directa fuera de la interfaz? [Seguridad, Spec §FR-001–FR-002]
- [ ] CHK020 ¿Está definido cómo evitar que una denegación revele la existencia de un objeto sensible ajeno? [Privacidad, Spec §FR-016]
- [ ] CHK021 ¿Está explícitamente prohibido almacenar identidad declarada, credenciales, respuestas, retroalimentación y evidencia en metadata? [Privacidad, Spec §FR-013–FR-014, Contrato §Límites globales]
- [ ] CHK022 ¿Los criterios de éxito cuantifican cobertura permitida, denegada y de ámbito ajeno para todas las superficies? [Medición, Spec §SC-001–SC-004]
- [ ] CHK023 ¿Está definido que cada override requiere issue, razón, actores y evidencia de prueba versionada? [Trazabilidad, Plan §Inventario verificable, Modelo §Override]
- [ ] CHK024 ¿La definición de terminado exige cero hallazgos incluidos, regresión completa e inventario determinístico? [Medición, Spec §SC-008, Plan §Estrategia de pruebas]

## Notas

- Profundidad: puerta formal de revisión previa al PR.
- Audiencia: autor y revisor del cambio.
- Foco: autorización por objeto, privacidad analítica y trazabilidad del inventario.
- `$speckit-implement` puede leer este checklist, pero no debe cambiar sus marcadores.
