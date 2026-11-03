# Investigación local y decisiones

Inspección estática de main `5e32ceb`, sin entrar a producción ni usar datos reales. No son pruebas ejecutadas ni diagnóstico definitivo del caso reportado.

## R1 — El enlace no es solo una variable de pantalla

**Evidencia**: `FeedbackSharePanel` carga `listFeedbackAccesses`, clasifica accesos y llama a `copyFeedbackAccesses` en su efecto inicial. `prepared` es memoria de presentación; `feedbackPreparation` guarda identificadores de recuperación una hora, no credenciales. Backend conserva digest y copia cifrada en `FeedbackAccess`.

**Decisión**: recuperar desde servidor siempre al reingresar, sin depender de la variable ni del manifiesto finalizado. No prometer arreglarlo guardando URLs en localStorage.
**Alternativa descartada**: recrear el enlace cada vez que desaparece de pantalla, o almacenar credenciales sin límite en el navegador.

## R2 — Fricción de reentrada confirmada en el código

**Evidencia**: `ShareFeedbackDialog` inicia `detail=initialGradeId`, `shareIds=null`. Su detalle omite el CTA local cuando hay `initialGradeId`; la copia queda dentro de un details cerrado «Opciones de sus enlaces» o tras Compartir en la barra inferior.

**Decisión**: bloque individual permanente y mismo control de copia que en lista. Esto explica una dificultad visible, no demuestra que el enlace concreto del usuario exista o esté vigente.
**Alternativa descartada**: añadir otro botón que abra otro diálogo con una segunda lógica de enlaces.

## R3 — No confundir ausencia, cierre y recuperación fallida

**Evidencia**: `classifyAccesses` agrupa activo sin `copy_available` como closed; `recoverUrls` agrupa varios fallos como unavailable. `copy_available` indica texto cifrado presente, no descifrado exitoso. `credentials.py` puede rechazar copia antigua/corrupta o clave incompatible.

**Decisión**: modelo puro de disponibilidad, códigos conservados y errores accionables. Validar autorización al copiar; no exponer claves ni detallar secretos. Son posibilidades técnicas, no hechos de producción comprobados.
**Alternativa descartada**: llamar «vencido» a todo error o mostrar Generar antes de completar la consulta.

## R4 — Respuesta incierta y otro dispositivo

**Evidencia**: `create_access` bloquea la calificación y deduplica `(actor, request_id, calificacion)`. No deduplica automáticamente un request_id nuevo por falta de memoria en otro dispositivo.

**Decisión**: nuevo flujo con opción `solo_si_falta`; bajo el mismo bloqueo, reutilizar acceso vigente único compatible o pedir decisión ante ambigüedad/cierre/opciones diferentes. Reutilizar recibos/manifiestos de Spec135 antes de otra escritura. No nueva tabla ni ampliación automática de vigencia.
**Alternativa descartada**: afirmar que el frontend por sí solo evita toda carrera de dispositivos.

## R5 — Reaprobar sin cambiar el enlace ni el vencimiento

**Evidencia**: `manage_access(reactivate)` conserva token, crea otra publicación y calcula vencimiento nuevo. Eso no satisface conservar exactamente la fecha al republicar una suspensión vigente.

**Decisión**: opción explícita compatible `mantener_vencimiento`, solo para suspensión aún vigente/no revocada; preservar token, fecha y cuota. Probar invocación heredada sin opción. No usar días restantes redondeados para simular igualdad temporal.

## R6 — Alcance que no retrasa la copia

**Decisión**: no «Enviado/Visto» por copiar; listas masivas privadas. Mantener política de duración vigente. Dejar propuestas de 30 días institucionales, fin de periodo, extensión, QR, vista previa pública autenticada y aperturas para otra aprobación.
**Razón**: el modelo actual no identifica familias ni asegura entrega. En los modelos inspeccionados no hay institución/periodo que permita prometer esa configuración como un cambio solo visual. No inventar esas entidades para resolver la reentrada.

Sin consultas de precios/modelos, API externas o paquetes nuevos. Los contratos de navegador se comprobarán con mocks y pruebas de compatibilidad antes de implementar los canales.
