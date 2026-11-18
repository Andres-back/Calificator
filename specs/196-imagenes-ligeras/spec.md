# Especificación: Recursos con imagen que abren rápido

**Rama**: `codex/196-imagenes-ligeras` | **Creada**: 2026-11-16 | **Estado**: Aprobada e implementada | **Issue**: [#412](https://github.com/Andres-back/Calificator/issues/412)

**Entrada**: en la auditoría de herramientas (Spec 193) se vio que los cuentos y los dibujos para colorear pesan entre 1,5 y 2 MB cada uno. El usuario pidió seguir con esta mejora.

## Evidencia

| Medición | Antes | Después |
| --- | --- | --- |
| Datos del cuento que descarga el navegador | 1.975.202 caracteres | 6.528 bytes |
| Imagen del cuento | incluida en lo anterior | 112.230 bytes (WebP) |
| Datos del dibujo para colorear | 1.834.991 caracteres | 2.447 bytes |
| Imagen del dibujo para colorear | incluida en lo anterior | 153.976 bytes (WebP) |
| Segunda visita | todo otra vez | 0 bytes (respuesta 304) |

Medido en local con dos imágenes reales tomadas de producción en solo lectura.

## Escenarios de usuario y pruebas

### Historia 1 - El recurso abre rápido (Prioridad: P1)

**Aceptación**:
1. **Dado** un cuento con ilustración, **cuando** el docente o el estudiante lo abre, **entonces** los datos no incluyen la imagen incrustada y traen un enlace a ella.
2. **Dado** ese enlace, **entonces** entrega la imagen en WebP, con caché privada de un día y una huella para revalidar.
3. **Dada** una segunda visita, **entonces** la respuesta es 304 y no se descarga la imagen.

### Historia 2 - Nada se pierde (Prioridad: P1)

**Aceptación**:
1. **Dado** un docente que edita el contenido, **entonces** la imagen original guardada se conserva.
2. **Dado** el PDF, **entonces** sigue usando la imagen original con toda su calidad.
3. **Dada** una persona sin sesión o sin acceso al recurso, **entonces** no obtiene la imagen.

### Casos límite

- Recurso sin imagen o con imagen de reserva: no cambia.
- Si la conversión a WebP pesa más que la original (dibujos muy simples) o falla, se entrega la original.
- Imágenes con transparencia: se aplanan sobre blanco.
- Los recursos ya guardados no se modifican; no hay migración.

## Requisitos

### Requisitos funcionales

- **FR-001**: Las respuestas de la API que devuelven un recurso NO DEBEN incluir `imagen.b64_data`; DEBEN incluir `imagen.url` con el enlace a la imagen y su huella.
- **FR-002**: `GET /herramientas/{id}/imagen` DEBE entregar la imagen del recurso con las mismas reglas de acceso que el recurso, en WebP cuando reduce el peso, con `Cache-Control: private, max-age=86400` y `ETag`.
- **FR-003**: Con `If-None-Match` igual a la huella, DEBE responder 304 sin cuerpo.
- **FR-004**: Al actualizar el contenido, si llega la imagen sin sus datos, DEBE conservarse la imagen guardada.
- **FR-005**: La imagen guardada y el PDF NO DEBEN cambiar.
- **FR-006**: Sin recurso, sin imagen real o con imagen ilegible, DEBE responder 404.

## Criterios de éxito

- **SC-001**: Abrir un recurso con imagen transfiere menos del 10 % de lo que transfería.
- **SC-002**: Docente y estudiante ven la imagen igual que antes.
