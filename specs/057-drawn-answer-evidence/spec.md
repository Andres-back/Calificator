# Especificación: conservar respuestas dibujadas al calificar

**Rama**: `codex/057-drawn-answer-evidence` | **Creada**: 2026-09-21 | **Estado**: Aprobado como hotfix | **Issue**: [#113](https://github.com/Andres-back/Calificator/issues/113)

## Escenarios de usuario y pruebas

### Historia 1 - El dibujo también es una respuesta (Prioridad: P1)

Como docente, necesito que una respuesta dibujada en la fotografía llegue a la revisión de cada pregunta para que la IA no la declare ausente al valorar solo el texto manuscrito.

**Razón de prioridad**: en una prueba productiva una figura geométrica visible no se describió y la pregunta recibió cero por «falta de dibujo».

**Prueba independiente**: con la fotografía matemática autorizada, la cuarta respuesta conserva la descripción del trazado y la página de origen; el docente ve la sugerencia pendiente de revisión, sin publicación automática.

**Aceptación**:

1. **Dada** una pregunta que pide dibujar y una figura visible, **cuando** se extrae la evidencia, **entonces** se describe la figura por pregunta sin resolverla ni confundirla con la ilustración impresa.
2. **Dada** una pregunta que pide dibujar y una descripción visual incierta u omitida, **cuando** se prepara la valoración, **entonces** se señala revisión y no se afirma que la respuesta esté en blanco solo por faltar la descripción.
3. **Dada** una respuesta solo textual, **cuando** se extrae, **entonces** conserva su texto y su comportamiento anterior.

### Casos límite

- Figura parcialmente visible, borrosa o continuada en otra página: no inventar trazos; conservar origen y marcar revisión.
- Instrucción impresa que contiene un dibujo de ejemplo: no atribuirlo al estudiante.
- Respuesta realmente en blanco: solo declararla vacía cuando se haya comprobado también el área gráfica.

## Requisitos

### Requisitos funcionales

- **FR-001**: La extracción DEBE describir trazos, puntos, líneas, formas, etiquetas y relaciones visibles del estudiante cuando constituyen parte de una respuesta, identificando su pregunta y página.
- **FR-002**: La descripción visual DEBE acompañar la respuesta textual que reciben los evaluadores, sin inferir corrección ni completar lo ilegible.
- **FR-003**: Si una pregunta solicita una representación gráfica y esta no puede describirse con certeza, el resultado DEBE requerir revisión docente y NO DEBE interpretar automáticamente la ausencia de descripción como ausencia del dibujo.
- **FR-004**: Las respuestas textuales, el desglose por pregunta, la suma de puntajes y la decisión final docente DEBEN conservar su comportamiento vigente.
- **FR-005**: Una regresión automatizada y un ensayo con la foto real DEBEN comprobar la evidencia visual, el estado de revisión y la ausencia de publicación automática.

### Entidades clave

- **Respuesta extraída**: texto, descripción visual opcional, confianza, pregunta y páginas de origen.
- **Calificación sugerida**: desglose revisable; nunca equivale a nota publicada.

## Criterios de éxito

### Resultados medibles

- **SC-001**: El 100 % de las respuestas dibujadas reconocidas en los casos de regresión llegan al calificador asociadas a su pregunta y página.
- **SC-002**: En la fotografía de referencia, la pregunta 4 deja de justificarse como «sin dibujo» cuando el trazado está visible; si no es legible, queda marcada para revisión en lugar de afirmar ausencia.
- **SC-003**: El 100 % de las pruebas de respuestas textuales existentes continúa pasando y ninguna nota del ensayo se publica sin el docente.

## Supuestos

- Se reutilizan la imagen y los proveedores actuales; no se solicita una segunda inferencia en el caso normal.
- Un dibujo puede complementar texto manuscrito; ninguno debe sustituir al otro.
- La latencia externa se medirá, pero no se forzará un límite que descarte una inferencia en curso.
