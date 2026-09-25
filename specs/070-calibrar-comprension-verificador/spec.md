# Especificación: Calibrar comprensión lectora y verificador

**Rama**: `codex/070-calibrar-comprension-verificador`

**Creado**: 2026-09-24

**Estado**: Aprobado como hotfix

**Issue**: [#145](https://github.com/Andres-back/Calificator/issues/145)

## Escenarios de usuario y pruebas

### Historia 1 - Calificación semántica justa (Prioridad: P1)

Como docente, quiero que una respuesta abierta de comprensión lectora reciba el puntaje correspondiente al contenido demostrado, sin perder puntos por ser breve, repetir contexto pertinente o no estar redactada como oración completa cuando eso no fue solicitado.

**Prueba independiente**: En la actividad «El viaje de Nico», las respuestas 1, 4 y 5 reciben un punto cada una; las respuestas 2 y 3, intercambiadas, reciben cero. La suma sugerida es 3/5 y continúa pendiente de decisión docente.

**Escenarios de aceptación**:

1. **Dado** que una respuesta identifica el hecho solicitado y el instrumento no asigna puntaje explícito a la forma de redacción, **cuando** se valora, **entonces** recibe el puntaje completo de contenido aunque sea breve, fragmentaria o incluya contexto pertinente.
2. **Dado** que una respuesta corresponde a otra pregunta, **cuando** se valora, **entonces** se califica como incorrecta en su ubicación actual y no se traslada silenciosamente.
3. **Dado** que hay errores ortográficos menores pero el significado es inequívoco, **cuando** la ortografía no tiene peso explícito, **entonces** se conserva el puntaje de contenido y el error puede mencionarse en la retroalimentación.

### Historia 2 - Verificación independiente acotada (Prioridad: P1)

Como docente, quiero que el segundo evaluador termine su revisión compacta sin agotar la salida en razonamiento interno, para recibir una segunda lectura útil y no una espera fallida.

**Prueba independiente**: El verificador configurado para la revisión secundaria recibe un modo de razonamiento bajo compatible con su proveedor, entrega el JSON completo y mantiene visible cualquier discrepancia.

**Escenarios de aceptación**:

1. **Dado** un verificador compatible con niveles de razonamiento, **cuando** se solicita una revisión compacta, **entonces** se usa el nivel bajo y no se envía un control incompatible.
2. **Dado** que el verificador aun así trunca o falla, **cuando** termina el intento, **entonces** la calificación exige revisión docente y nunca se presenta como consenso.

### Casos límite

- Una respuesta manuscrita ilegible continúa como no evaluable y no se convierte en cero seguro.
- Una rúbrica con puntaje explícito para ortografía, puntuación o forma sí puede descontar exactamente ese componente.
- El hotfix no modifica notas ya confirmadas, ajustadas o publicadas.
- La revisión de respuestas de opción múltiple y cálculos objetivos conserva sus reglas actuales.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE valorar primero el significado solicitado en cada respuesta abierta.
- **FR-002**: El sistema NO DEBE descontar contenido por brevedad, estructura fragmentaria, contexto adicional pertinente o errores menores de escritura salvo que exista un puntaje explícito para esa dimensión.
- **FR-003**: El sistema DEBE mantener como incorrecta una respuesta que contesta otra pregunta o contradice la referencia.
- **FR-004**: El sistema DEBE aplicar al verificador independiente el nivel de razonamiento más breve compatible con el modelo seleccionado.
- **FR-005**: El sistema DEBE conservar el estado de revisión cuando el verificador falle, trunque o discrepe materialmente.
- **FR-006**: El sistema NO DEBE confirmar, publicar ni reescribir automáticamente calificaciones históricas como resultado del hotfix.

## Criterios de éxito

### Resultados medibles

- **SC-001**: El caso de regresión «El viaje de Nico» produce una suma sugerida de 3/5 con tres respuestas correctas y dos incorrectas.
- **SC-002**: El 100 % de las solicitudes al verificador GLM 5.3 Flash usa razonamiento bajo y omite controles de pensamiento no admitidos.
- **SC-003**: Una salida truncada del verificador nunca conduce a confirmación o publicación automática.
- **SC-004**: Las pruebas existentes de cálculo, desglose, evidencia y revisión continúan verdes.

## Supuestos

- La respuesta esperada, los criterios y los pesos configurados por el docente siguen siendo la fuente de verdad.
- La forma escrita solo reduce puntaje cuando el instrumento define una asignación cuantitativa para ella.
- La decisión final y la publicación permanecen bajo control del docente.

