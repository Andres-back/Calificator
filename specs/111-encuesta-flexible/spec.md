# Especificación: Encuesta opcional sin bloqueos numéricos

**Rama**: `codex/111-encuesta-flexible` | **Fecha**: 2026-10-21 | **Issue**: #230
**Estado**: Hotfix solicitado y aprobado expresamente por el usuario: «deja que todo sea opcional sin tanta restricción, necesito que llenen y puedan enviar».

## Escenarios de usuario y pruebas

### Historia 1 — Responder lo que se conoce (P1)
Un docente puede omitir todas las preguntas del diagnóstico, incluida institución, y enviar con su nombre, consentimiento y firma. Puede indicar minutos sin completar el método de obtención, marcar Otro sin explicación y combinar apoyos sin que se impida guardar.

**Aceptación**: un formulario vacío de respuestas llega a revisión y obtiene constancia; se conserva la omisión y no se inventan ceros. Sin autorización o firma no se recibe.

### Historia 2 — Porcentajes comprensibles (P1)
El docente escribe «50 %», «50,5» o «50.5» y continúa. Si escribe una aproximación no numérica, se conserva como texto, sin bloquear ni incluirla como medición numérica.

**Aceptación**: móvil y escritorio aceptan estos ejemplos, sin pérdida de contenido; el resumen estadístico utiliza solo números válidos con contexto suficiente.

### Historia 3 — Conservar lo ya recibido (P1)
El investigador distingue la nueva versión de las anteriores. Los originales y las pestañas abiertas de versiones 4.0 y 5.0 conservan su contrato y consentimiento.

**Aceptación**: versiones archivadas admitidas sin renombrar registros, informes separados y originales inmutables tras corrección administrativa.

## Requisitos funcionales

- **FR-001**: Todas las preguntas del nuevo diagnóstico DEBEN ser opcionales, sin dependencias que impidan avanzar o enviar. El nombre para la constancia, consentimiento y firma siguen siendo necesarios; la encuesta de experiencia del piloto no cambia.
- **FR-002**: Cantidades y porcentajes DEBEN aceptar coma decimal y, en porcentajes, símbolo %. Un valor incompleto o fuera de rango DEBE conservarse como texto breve con indicación no bloqueante; nunca convertirse silenciosamente en cero ni en una medición válida.
- **FR-003**: La nueva versión 5.1-web-flexible y consentimiento propio DEBEN conservar y distinguir omisiones, texto y números. Los informes solo calcularán tasas con minutos, entregas y método válidos; recuentos por versión sin mezclar.
- **FR-004**: Formularios y constancias anteriores DEBEN conservarse; se archivará exactamente la versión 5.0 antes del cambio. La corrección administrativa respetará el contrato original y permitirá los nuevos valores flexibles sin cambiar la firma.
- **FR-005**: Seguridad, permisos, límites de tamaño, protección de peticiones e idempotencia DEBEN mantenerse. No se modificarán respuestas reales ni datos académicos para probar.
- **FR-006**: El flujo DEBE funcionar desde 360 px en Chromium y WebKit hasta escritorio, con mensajes claros y confirmación verificable. Hotfix mediante PR y CI verde, nunca push directo a main.

## Criterios de éxito

- **SC-001**: Todos los ejemplos numéricos y omisiones de aceptación se reciben con constancia exacta en pruebas aisladas.
- **SC-002**: Cero alteraciones de originales y cero cambios en preguntas del piloto; rechazos de autorización y peticiones no permitidas conservados.
- **SC-003**: Formularios actuales y archivados, edición administrativa, informes y contenedor pasan regresiones; revisión móvil sin desbordamiento ni bloqueo de avance.

## Casos límite y alcance

Texto numérico breve ambiguo se conserva tal como se escribió, sin reinterpretarlo para estadísticas. Siguen límites de seguridad de texto. Un correo opcional mal formado puede dejarse vacío; no se elimina la comprobación del formato de contacto. No se reinterpreta una encuesta ya firmada ni se rescatan respuestas nunca enviadas. El cambio no elimina autorizaciones ni crea encuestas ficticias en producción.
