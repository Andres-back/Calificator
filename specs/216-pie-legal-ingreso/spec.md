# Especificación: En «Ingresar», el pie legal no queda encima de la tarjeta

**Rama**: `codex/216-pie-legal-ingreso` | **Creada**: 2026-11-23 | **Estado**: Aprobada e implementada | **Issue**: [#454](https://github.com/Andres-back/Calificator/issues/454)

**Entrada**: revisión final de la entrada pública antes de la entrega del 2026-11-23, en un celular de 375 × 812 px.

## Hallazgo

En «Ingresar», el pie con los enlaces legales estaba fijado al borde inferior de la pantalla. La página le reservaba 80 px, pero en un celular los cinco enlaces ocupan dos renglones (unos 103 px). El pie quedaba encima de la tarjeta: su línea tachaba el texto «Tu contraseña nunca se guarda en este dispositivo» y los enlaces se dibujaban sobre el borde. Con letra más grande el pie crece y tapa más.

En la misma pantalla, el botón de tema claro u oscuro se dibujaba sobre la esquina superior derecha de la tarjeta.

Es la primera pantalla que ve un docente. Las otras pantallas públicas (registro y recuperación de contraseña) ya tenían el pie después del contenido.

## Escenarios de usuario y pruebas

### Historia 1 - Ingresar desde un celular sin elementos encimados (Prioridad: P1)

**Aceptación**:
1. **Dado** un celular de 320 a 430 px de ancho, **cuando** se abre «Ingresar», **entonces** el pie legal aparece debajo de la tarjeta y ningún texto de la tarjeta queda tachado ni tapado.
2. **Dado** el mismo celular, **entonces** el botón de tema no toca la tarjeta.
3. **Dado** un computador, **entonces** la pantalla conserva sus dos columnas y el pie al final.

## Requisitos funcionales

- **FR-001**: En «Ingresar», el pie legal va después del contenido en el flujo de la página y nunca se superpone a la tarjeta, en ningún ancho ni tamaño de letra.
- **FR-002**: En pantallas estrechas, la tarjeta empieza debajo del botón de tema.
- **FR-003**: Los cinco enlaces legales siguen visibles y la página no tiene desplazamiento lateral.
- **FR-004**: Sin cambios en el servidor, en los textos ni en el ingreso.

## Criterios de éxito

- **SC-001**: A 320 × 568 y 375 × 812 px, la distancia entre el borde inferior de la tarjeta y el pie es mayor o igual a cero.
- **SC-002**: A 1280 × 600 px la prueba pasa igual que antes del cambio.

## Fuera de alcance

Rediseñar la pantalla de ingreso o el pie legal.
