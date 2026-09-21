# Especificación: Digitalización confiable y señales de revisión visibles

**Issue**: #107  
**Tipo**: Hotfix productivo  
**Aprobación**: `spec-approved`

## Contexto

Una evaluación real puede extraerse correctamente y fallar después porque la estructuración usa una ruta heredada con un límite de salida insuficiente. En calificación, los dos modelos completan su trabajo, pero una advertencia del verificador sobre la clave docente puede quedar oculta detrás de un mensaje de consenso.

## Historias de usuario

### US1 — Digitalizar una evaluación real (P1)

Como docente, quiero que la foto o PDF extraído se convierta en un borrador editable usando la ruta de estructuración configurada, para no perder el trabajo por un límite de salida ajeno a la imagen.

**Aceptación**:

1. Dada una evidencia legible, cuando finaliza la extracción, la estructuración usa la configuración específica de esa etapa.
2. La respuesta estructurada dispone de capacidad suficiente para preguntas, puntajes y clave completa.
3. Un reintento reutiliza la extracción persistida y no crea evaluaciones duplicadas.

### US2 — Revisar advertencias del segundo modelo (P1)

Como docente, quiero ver las observaciones del verificador independiente antes de confirmar, para detectar claves o criterios posiblemente incorrectos sin que la IA los cambie silenciosamente.

**Aceptación**:

1. Si el verificador solicita revisión o emite alertas, la calificación permanece pendiente de revisión docente.
2. El resumen no afirma consenso pleno mientras existan alertas.
3. Las preguntas mencionadas explícitamente por el verificador aparecen en la cola de atención; las alertas generales se muestran como advertencias globales.
4. La suma de puntos por pregunta continúa siendo la nota calculada y ninguna clave docente se modifica automáticamente.

## Requisitos funcionales

- **FR-001**: La estructuración DEBE usar `digitalizacion.estructura` y su instantánea inmutable de proveedor/modelo.
- **FR-002**: La estructuración DEBE disponer de un presupuesto de salida suficiente para una evaluación completa y detectar respuestas truncadas.
- **FR-003**: La reparación de claves faltantes DEBE usar la misma ruta de estructuración, limitada a las preguntas faltantes.
- **FR-004**: El resultado persistido DEBE conservar alertas y solicitud de revisión del verificador secundario.
- **FR-005**: Una alerta del verificador DEBE impedir el mensaje visual de consenso sin observaciones.
- **FR-006**: El triage DEBE relacionar alertas que nombren preguntas con sus componentes sin alterar puntajes.
- **FR-007**: Alertas no asociables a una pregunta DEBEN mostrarse como advertencias globales.
- **FR-008**: La nota final DEBE seguir derivándose del desglose por pregunta; la decisión final pertenece al docente.

## Casos límite

- El verificador menciona varias preguntas dentro de una sola alerta.
- El verificador solicita arbitraje sin alertas textuales.
- Una alerta no contiene número de pregunta.
- La ruta principal de estructuración falla y existe un respaldo real configurado.
- La respuesta del proveedor termina por límite de salida.

## Criterios de éxito

- **SC-001**: La evidencia real usada para reproducir el incidente termina en un borrador editable sin volver a leer la imagen durante el reintento.
- **SC-002**: Una calificación con alerta de clave muestra una advertencia visible y nunca el mensaje de consenso pleno.
- **SC-003**: La prueba real conserva el mismo desglose numérico y no publica la nota.
- **SC-004**: Las pruebas focalizadas de digitalización, desglose y triage quedan verdes.

## Fuera de alcance

- Corregir automáticamente claves o rúbricas del docente.
- Cambiar modelos globales elegidos por el administrador.
- Publicar o confirmar calificaciones de demostración.

## Supuestos

- DeepSeek V4 Flash Vision Exp continúa como extractor visual.
- GLM 5.3 Flash continúa como verificador independiente.
- El hotfix puede omitir la pausa de aprobación del plan, pero conserva pruebas, PR y CI.
