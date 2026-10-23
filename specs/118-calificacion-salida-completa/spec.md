# Especificación: calificación completa de evaluaciones extensas

**Rama**: `codex/118-calificacion-salida-completa` | **Creada**: 2026-10-23 | **Estado**: Hotfix aprobado | **Issue**: #251

## Escenarios de usuario y pruebas

### Historia 1 - Obtener una propuesta completa (Prioridad: P1)

Como docente necesito que una evaluación de 24 preguntas pueda calificarse sin que la respuesta del evaluador se corte por un límite fijo pensado para actividades pequeñas.

**Razón de prioridad**: Hay entregas reales sin nota aunque la evidencia se conserva y su lectura terminó.

**Prueba independiente**: Una prueba con 24 componentes produce la solicitud completa y recibe una valoración íntegra; una salida cortada nunca se guarda como nota válida.

**Aceptación**:
1. **Dada** una evaluación extensa, **cuando** se valora o verifica, **entonces** se reserva espacio de respuesta acorde con sus componentes, dentro de un tope finito.
2. **Dada** una evaluación pequeña, **cuando** se califica, **entonces** se conserva su presupuesto habitual salvo que el desglose requiera más espacio.
3. **Dada** una respuesta cortada, **cuando** vuelve del evaluador, **entonces** no se convierte en una nota ni en cero y se conserva la posibilidad de reintentar.

### Historia 2 - Diagnosticar sin perder la evidencia (Prioridad: P2)

Como responsable necesito distinguir si la respuesta terminó por falta de espacio u otro error, sin divulgar el examen, datos personales o claves.

**Razón de prioridad**: El error genérico actual no permite confirmar la causa y puede repetirse en recuperación.

**Prueba independiente**: Los fallos sintéticos de límite, rechazo y fallo indeterminado tienen códigos distintos y no contienen la respuesta original.

**Aceptación**:
1. **Dado** un límite agotado confirmado por el proveedor, **cuando** falla la valoración, **entonces** el registro técnico conserva esa causa y los conteos de uso disponibles, sin texto sensible.
2. **Dada** una recalificación, **cuando** se solicita, **entonces** siguen vigentes los permisos, control de versión, historial y conservación de la foto anteriores.

### Casos límite

- Evidencia sin reverso o con respuestas ilegibles: continuar exigiendo revisión; no inventar respuestas.
- Evaluación sin preguntas pero con rúbrica: estimar según los componentes reales de la rúbrica.
- Cantidades extremas: respetar el techo de salida; no ejecutar llamadas ilimitadas ni aceptar respuestas parciales.
- Rechazo, fallo de autenticación o error no clasificado: no confundirlos con falta de espacio.

## Requisitos

### Requisitos funcionales

- **FR-001**: El sistema DEBE dimensionar de forma acotada la respuesta esperada según los componentes de la actividad en valoración, verificación y recuperación existentes.
- **FR-002**: El sistema DEBE conservar los modelos, proveedores, formatos y credenciales seleccionados, sin condiciones por nombre comercial.
- **FR-003**: El sistema DEBE rechazar respuestas incompletas y distinguir el agotamiento explícito del límite de otros motivos de terminación.
- **FR-004**: El registro técnico DEBE conservar únicamente códigos permitidos y conteos numéricos disponibles; nunca texto del examen, razonamiento privado, identidad o secretos.
- **FR-005**: El cambio NO DEBE modificar notas, evidencias, usuarios ni evaluaciones existentes, ni iniciar recalificaciones masivas. Una nueva recalificación sigue requiriendo la operación docente autorizada.
- **FR-006**: Se DEBEN comprobar las regresiones de cálculo, errores, reintentos y conservación de datos antes de fusionar; la prueba real usa solo una copia anónima y el límite de llamadas aprobado.

### Entidades clave

- **Componente evaluable**: pregunta o criterio que exige un elemento en el desglose.
- **Valoración**: propuesta completa del evaluador, su cobertura y estado de revisión; no sustituye la decisión docente.
- **Registro de uso**: causa segura de terminación y conteos disponibles relacionados con la etapa, sin contenido educativo.

## Criterios de éxito

- **SC-001**: El 100 % de las pruebas de 1, 8, 24 y 100 componentes usa un presupuesto finito y no decreciente con la cantidad de componentes.
- **SC-002**: Cero salidas truncadas aceptadas como nota y cero modificaciones a registros académicos de producción durante la validación.
- **SC-003**: Las tres familias de formato de respuesta diferencian el agotamiento confirmado de una terminación desconocida, sin revelar el contenido original.
- **SC-004**: La prueba autorizada documenta el resultado real, duración, cobertura y limitaciones; no promete exactitud absoluta ni tiempos universales.

## Supuestos

- Es una corrección de incidente, no un cambio de calidad pedagógica ni de modelos.
- Se mantienen los reintentos y límites de concurrencia existentes; no se añade una nueva llamada automática.
- Se usará un techo inicial de 16 384 unidades de salida, configurable por operación del servidor; un proveedor con menor capacidad necesita un ajuste compatible, no una aceptación silenciosa.
- El usuario aprobó este hotfix y dos nuevas llamadas con la misma copia anónima el 2026-10-23; no implica permiso de despliegue ni recuperación masiva.
