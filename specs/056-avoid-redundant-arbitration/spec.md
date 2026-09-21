# Especificación: arbitraje solo cuando aporta valor

**Rama**: `codex/056-avoid-redundant-arbitration` | **Creada**: 2026-09-21 | **Estado**: Aprobado como hotfix | **Issue**: [#111](https://github.com/Andres-back/Calificator/issues/111)

## Escenarios de usuario y pruebas

### Historia 1 - Revisión honesta sin tercera espera (Prioridad: P1)

Como docente, quiero ver pronto el desglose y las alertas cuando dos evaluadores coinciden, aunque alguno solicite revisión humana, para tomar mi decisión sin esperar una tercera valoración redundante.

**Razón de prioridad**: la prueba real tardó 32,4 segundos; 15,5 correspondieron a una tercera valoración pese a que las dos notas eran 4,17.

**Prueba independiente**: calificar la evidencia real de cuatro preguntas; las dos notas coincidentes se consolidan sin una tercera consulta y el caso continúa pendiente de revisión, con alertas visibles y la suma por pregunta intacta.

**Aceptación**:

1. **Dado** dos notas cercanas y confianza suficiente, **cuando** alguno pide revisión humana, **entonces** se muestra el resultado consolidado y la revisión pendiente sin una tercera valoración.
2. **Dado** dos notas con diferencia significativa, **cuando** se comparan, **entonces** se conserva la revisión adicional y la decisión final docente.
3. **Dado** confianza insuficiente, **cuando** las notas son cercanas, **entonces** se conserva la revisión adicional.
4. **Dado** una respuesta de referencia dudosa, **cuando** la IA coincide numéricamente, **entonces** las alertas no se ocultan ni se publica la nota.

### Casos límite

- Si falta una de las dos notas, se conserva la propuesta válida con revisión humana, sin fingir consenso.
- Una diferencia exactamente igual al umbral conserva la revisión adicional.
- Una alerta textual sin diferencia numérica sigue visible aunque no origine por sí sola otra llamada.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE evitar una tercera valoración cuando hay dos notas cercanas y ambas tienen confianza suficiente.
- **FR-002**: Una solicitud de revisión humana o alerta DEBE permanecer visible y pendiente de decisión docente aunque no se invoque un árbitro.
- **FR-003**: El sistema DEBE conservar la valoración adicional ante discrepancia significativa o confianza baja.
- **FR-004**: La nota propuesta DEBE continuar derivándose de la suma por pregunta, sin publicación automática ni alteración de notas confirmadas.
- **FR-005**: El sistema DEBE registrar si se invocó árbitro y la razón, para medir duración y analizar excepciones.

### Entidades clave

- **Calificación sugerida**: resultado pendiente, con componentes, confianza, alertas y decisión docente posterior.
- **Trabajo de calificación**: procesamiento asíncrono único con duración y estado observable.

## Criterios de éxito

- **SC-001**: En la ejecución de referencia con notas cercanas y confianza suficiente, se realizan dos valoraciones y cero consultas de arbitraje.
- **SC-002**: La calificación real de cuatro preguntas termina en menos de 20 segundos cuando los proveedores responden como en la medición inicial de sus dos valoraciones.
- **SC-003**: El 100 % de los casos marcados para revisión conservan esa marca y sus alertas, incluso sin tercera valoración.
- **SC-004**: Los casos de diferencia significativa o baja confianza mantienen la ruta de arbitraje en las pruebas de regresión.

## Supuestos

- Los umbrales de diferencia y confianza configurables se conservan.
- La IA propone; el docente decide y publica.
- La latencia externa fluctúa; el objetivo de tiempo se medirá en un caso real y no mediante un corte artificial de la solicitud.
