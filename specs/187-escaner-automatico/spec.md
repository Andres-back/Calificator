# Especificación: La hoja se endereza y gira sola al tomar la foto

**Rama**: `codex/187-escaner-automatico` | **Creada**: 2026-11-14 | **Estado**: Aprobada e implementada | **Issue**: [#394](https://github.com/Andres-back/Calificator/issues/394)

**Entrada**: el usuario pidió que, al tomar la foto, la hoja se enderece y quede derecha, tipo CamScanner. Hoy a veces hay que llevar las esquinas a mano.

## Evidencia

| Observación | Dato |
| --- | --- |
| Detección local (OpenCV) | Propone esquinas; con dos contornos parecidos (hojas apiladas) se abstiene. |
| Giro | Siempre manual («Girar»). En producción se vieron fotos de lado. |
| Primera vista en celular | Las esquinas, no la hoja preparada. |
| Ayuda visual de bordes | Existe, pero está apagada en producción (`EVIDENCE_CORNER_ASSISTANCE_ENABLED=False`). |
| Prueba del modelo de bordes pidiendo el ángulo | 3 de 4 aciertos; falla la foto real (la dejaría de cabeza). |
| Prueba eligiendo entre las 4 orientaciones | 16 de 16 aciertos (2 entregas reales × 2 hojas × 4 giros simulados). |
| Formato de los exámenes vistos | Impresos en horizontal: la meta es «texto derecho», no «vertical». |

## Escenarios de usuario y pruebas

### Historia 1 - La hoja queda lista sola (Prioridad: P1)

**Aceptación**:
1. **Dada** una foto con bordes detectados, **cuando** se abre el preparador, **entonces** se muestra primero la hoja enderezada, con «Usar esta hoja» como acción principal y «Ajustar bordes» como opción.
2. **Dada** una foto girada, **cuando** la ayuda visual está activa, **entonces** la hoja se gira para que el texto quede derecho y se avisa.
3. **Dado** que el docente gira a mano, **entonces** una sugerencia tardía no deshace su giro.
4. **Dada** una foto sin bordes detectados, **entonces** el preparador abre en las esquinas, como hoy.

### Casos límite

- Si la ayuda de giro falla o no responde, la hoja queda como estaba.
- Una página que ya venía girada o preparada no recibe sugerencia.
- Nada se envía sin que el docente acepte.

## Requisitos

### Requisitos funcionales

- **FR-001**: `POST /calificaciones/sugerir-orientacion` DEBE recibir la misma miniatura que la ayuda de bordes, armar las cuatro vistas (0, 90, 180 y 270 grados en sentido horario) y preguntar en cuál se lee derecho el texto.
- **FR-002**: La respuesta DEBE validarse (solo A–D o nulo) y devolverse como `rotacion` 0, 90, 180 o 270, con la misma autorización, bandera, caché privada y registro de uso que la ayuda de bordes, y un cupo diario propio.
- **FR-003**: El preparador DEBE pedir la orientación en cada foto nueva sin giro previo y aplicarla salvo que el docente gire o restablezca antes.
- **FR-004**: Con bordes detectados o sugeridos, el preparador DEBE abrir en la hoja preparada; sin bordes, en las esquinas.
- **FR-005**: Los textos DEBEN decir «Hoja enderezada automáticamente» y «Usar esta hoja», y la pestaña activa debe distinguirse.

## Criterios de éxito

- **SC-001**: Con la ayuda activa, una foto de lado queda derecha sin tocar «Girar».
- **SC-002**: Las pruebas existentes del escáner siguen pasando.
