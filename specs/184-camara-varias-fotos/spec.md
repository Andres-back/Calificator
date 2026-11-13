# Especificación: Tomar varias fotos seguidas no pierde la foto ni bloquea el envío

**Rama**: `codex/184-camara-varias-fotos` | **Creada**: 2026-11-13 | **Estado**: Aprobada e implementada | **Issue**: [#390](https://github.com/Andres-back/Calificator/issues/390)

**Entrada**: una docente reportó desde un celular Android que, al tomar varias fotos seguidas para calificar, la pantalla «como que la intenta sacar», y que aunque toma la foto y pulsa enviar no pasa nada, así que tiene que repetir el proceso.

## Evidencia (código, sin entrar a producción)

| Observación | Dato |
| --- | --- |
| Preparación con 0 hojas | Depende de que la lista de quién falta esté verificada y sin consultarse. |
| Consulta de fondo | Se repite cada vez que termina la calificación de una entrega anterior y al enviar una entrega. |
| Efecto en la cámara nativa | Encender o apagar la preparación reiniciaba el selector: quitaba el control de la cámara abierta y la foto que volvía se descartaba sin aviso. |
| Efecto en el envío | Durante cada consulta de fondo se deshabilitaban el envío y el selector de estudiante, y un aviso aparecía y desaparecía. |
| Hoja sin preparar | Al cerrar la preparación sin decidir, la hoja quedaba con «Comprobando la calidad de las fotos…» para siempre y el envío deshabilitado. |
| Gesto Atrás | Con la cámara o la preparación abiertas cambiaba la dirección; aparecía «Cambios sin guardar · Descartar y continuar», que borra las hojas. |

## Escenarios de usuario y pruebas

### Historia 1 - La foto tomada siempre llega (Prioridad: P1)

**Aceptación**:
1. **Dada** la cámara nativa abierta, **cuando** termina de calificarse una entrega anterior y la lista de quién falta se consulta de nuevo, **entonces** la foto tomada aparece en la lista al volver.
2. **Dada** la cámara abierta, **cuando** cambio de estudiante o la carga se deshabilita, **entonces** la foto tardía se descarta, como antes.

### Historia 2 - El envío no se bloquea por consultas de fondo (Prioridad: P1)

**Aceptación**:
1. **Dada** la lista de quién falta ya verificada en esta pantalla, **cuando** se vuelve a consultar en segundo plano, **entonces** el envío, el selector de estudiante y la preparación siguen como estaban.
2. **Dada** una consulta que falla, **entonces** el envío se deshabilita, como antes.

### Historia 3 - Qué hoja falta por preparar (Prioridad: P2)

**Aceptación**:
1. **Dada** una hoja cuya preparación cerré sin decidir, **entonces** veo «Prepara la hoja N o usa la original» y un botón para abrirla, en vez de «Comprobando la calidad».

### Historia 4 - Atrás cierra la cámara o la preparación (Prioridad: P2)

**Aceptación**:
1. **Dada** la cámara o la preparación abiertas, **cuando** hago el gesto Atrás, **entonces** se cierran, sigo en la misma pantalla y conservo las hojas.

### Casos límite

- Apagar la preparación a propósito («Continuar sin escaneo») sigue cerrando el editor y rechazando una aceptación tardía.
- Cerrar la cámara y abrir enseguida la preparación no deja entradas de más en el historial.
- La primera consulta al entrar sigue siendo obligatoria antes de habilitar el envío.

## Requisitos

### Requisitos funcionales

- **FR-001**: La foto que vuelve de la cámara o del selector de archivos DEBE agregarse aunque la preparación se encienda o apague mientras están abiertos; solo se descarta al cambiar de estudiante, deshabilitar la carga o salir.
- **FR-002**: Una vez verificada en esta pantalla la lista de quién falta, las consultas de fondo NO DEBEN deshabilitar el envío ni el selector de estudiante, ni mostrar el aviso de consulta. Si la consulta falla, el envío se deshabilita.
- **FR-003**: La preparación de las fotos de un estudiante NO DEBE apagarse por una consulta de fondo.
- **FR-004**: Una hoja pendiente de preparar NO DEBE mostrarse como «Comprobando la calidad»; DEBE indicarse «Prepara la hoja N o usa la original» con un botón que la abre.
- **FR-005**: Con la cámara o la preparación abiertas, Atrás DEBE cerrarlas sin cambiar la dirección ni perder hojas; al cerrarlas con sus botones, el historial DEBE quedar como estaba.
- **FR-006**: Apagar la preparación a propósito DEBE seguir cerrando el editor y rechazando su aceptación tardía.

## Criterios de éxito

- **SC-001**: Tomar varias fotos seguidas mientras se califican entregas anteriores no pierde ninguna foto ni obliga a repetir.
- **SC-002**: Las pruebas existentes del selector de hojas, la carga y las calificaciones siguen pasando.
