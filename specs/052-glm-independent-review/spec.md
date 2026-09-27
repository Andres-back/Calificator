# Especificación: Revisión independiente con GLM

**Rama**: `codex/052-glm-independent-review` | **Creada**: 2026-09-20 | **Estado**: Aprobada | **Issue**: [#103](https://github.com/Andres-back/Calificator/issues/103)

## Escenarios de usuario y pruebas

### Historia 1 - Segunda opinión realmente independiente (Prioridad: P1)

Como docente, quiero que la verificación de una nota use una familia de modelo diferente a la que realizó la extracción y valoración principal, para reducir errores compartidos y recibir una segunda opinión útil sin aumentar de forma perceptible la espera.

**Razón de prioridad**: La independencia del verificador mejora la confianza y la transparencia del flujo central de la tesis.

**Prueba independiente**: Calificar una evidencia con una respuesta incorrecta y comprobar que el verificador alternativo detecta la discrepancia, devuelve un desglose válido y no modifica ni publica la nota por sí mismo.

**Aceptación**:

1. **Dada** una calificación principal producida por el modelo visual institucional, **cuando** se ejecuta la verificación, **entonces** se utiliza una familia de modelo diferente y se conserva la suma determinista como autoridad de la nota.
2. **Dada** una propuesta principal incompatible con los puntajes por pregunta, **cuando** el verificador analiza el desglose, **entonces** informa la discrepancia y solicita arbitraje cuando corresponda.
3. **Dada** una verificación exitosa, **cuando** termina el flujo, **entonces** la nota sigue requiriendo confirmación docente antes de publicarse.

### Historia 2 - Respaldo visual sin penalizar el caso normal (Prioridad: P2)

Como docente, quiero que una segunda familia multimodal pueda extraer la evidencia cuando el extractor principal falle o deje cobertura insuficiente, sin ejecutar dos modelos en todas las entregas.

**Razón de prioridad**: Aumenta la recuperación ante fallos conservando el tiempo rápido del extractor principal.

**Prueba independiente**: Simular un fallo o salida incompleta del extractor principal y comprobar que el respaldo procesa la misma evidencia una sola vez, conserva el orden de páginas y devuelve una salida compatible.

**Aceptación**:

1. **Dada** una extracción principal completa, **cuando** continúa la calificación, **entonces** el respaldo visual no se ejecuta.
2. **Dado** un fallo recuperable o cobertura incompleta, **cuando** actúa el respaldo, **entonces** procesa la evidencia sin crear otra entrega ni otra calificación.
3. **Dado** que ambos proveedores fallen, **cuando** termina el trabajo, **entonces** la evidencia permanece guardada y la calificación queda visible para revisión o reintento.

### Casos límite

- El proveedor alternativo está temporalmente indisponible o devuelve un formato no estructurado.
- El catálogo remoto cambia y deja de anunciar temporalmente el modelo configurado.
- La evidencia tiene varias páginas y el respaldo debe respetar el mismo orden y cobertura.
- Un docente usa credenciales propias: el respaldo institucional solo se usa cuando su política lo autoriza.
- Una configuración histórica sigue apuntando al mismo modelo en ambas etapas; el sistema debe resolver los nuevos valores por defecto sin reescribir calificaciones anteriores.

## Requisitos

### Requisitos funcionales

- **FR-001**: El extractor visual principal DEBE continuar usando el modelo visual rápido actualmente validado.
- **FR-002**: La verificación de la calificación DEBE usar por defecto una familia distinta a la del extractor y calificador principal.
- **FR-003**: La revisión adicional DEBE usar la misma ruta independiente de verificación, salvo configuración explícita válida del administrador.
- **FR-004**: El sistema DEBE reconocer al modelo alternativo como capaz de procesar texto e imágenes cuando el proveedor lo soporte.
- **FR-005**: El modelo alternativo DEBE ejecutarse como respaldo visual únicamente ante fallo, salida no utilizable o cobertura insuficiente del extractor principal.
- **FR-006**: La suma validada de los puntajes por pregunta DEBE seguir siendo la autoridad de la nota cuando el desglose esté completo.
- **FR-007**: Ningún cambio de proveedor DEBE publicar, confirmar o modificar automáticamente una nota existente.
- **FR-008**: Cada llamada DEBE conservar telemetría de proveedor, modelo, etapa, tiempo, resultado y uso de respaldo sin registrar evidencia sensible.
- **FR-009**: La configuración DEBE seguir siendo administrable y permitir reemplazar modelos sin acoplar la lógica de negocio a uno específico.
- **FR-010**: Los fallos del respaldo DEBEN producir un estado recuperable y comprensible, sin perder la evidencia ni duplicar trabajos.

### Entidades clave

- **Ruta de IA por función**: Selección versionada de proveedor y modelo principal, respaldo y capacidad requerida para una etapa.
- **Ejecución de IA**: Registro técnico de etapa, modelo efectivo, latencia, resultado y uso de respaldo, sin contenido educativo.
- **Resultado de verificación**: Segunda opinión estructurada sobre puntajes y discrepancias que nunca sustituye la decisión docente.

## Criterios de éxito

- **SC-001**: En una prueba controlada, el verificador alternativo detecta una respuesta incorrecta y devuelve la suma correcta de cuatro componentes.
- **SC-002**: La verificación independiente completa su respuesta válida en menos de 10 segundos en el escenario de referencia.
- **SC-003**: Una evidencia real con diez respuestas mantiene 100 % de cobertura tanto con el extractor principal como con el respaldo visual.
- **SC-004**: El caso normal realiza una sola extracción visual y no incurre en la latencia del respaldo.
- **SC-005**: El 100 % de los fallos simulados conserva una entrega, una calificación y un trabajo recuperable, sin duplicados.
- **SC-006**: Todas las pruebas de integridad del desglose y publicación docente continúan pasando.

## Supuestos

- DeepSeek V4 Flash Vision Exp permanece como extractor visual principal por su mejor latencia observada.
- GLM 5.3 Flash se usa como verificador independiente y respaldo visual porque demostró salida estructurada, cobertura completa y una familia de razonamiento distinta.
- El respaldo visual no se ejecuta en paralelo en el recorrido normal.
- Las configuraciones explícitas válidas del administrador conservan precedencia sobre los valores por defecto.
