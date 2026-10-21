# Evidencia de implementación · 2026-10-20

## Alcance y aprobación

El usuario autorizó corregir firma/recepción, conservar respuestas y asegurar producción. Amplió explícitamente a versionado, minutos numéricos y entregas, proporción de abiertas, legibilidad/cámara, entrega/respaldo y duración por comprobar. Se archiva 4.0 y se publica 5.0; no se presume aprobación ni ejecución de una preprueba humana.

## Evidencia local

- 59 pruebas unittest de recepción, firma, consentimiento, permisos, persistencia, contexto 4.0, resumen 5.0, 24 preguntas numeradas y exportaciones: PASS.
- Node: tres grupos, firma mínima/longitud, confirmación completa/ajena, timeout, fallo de red y respuesta no JSON: PASS.
- Python Ruff F401/F821/F822/F823/F841 y compilación; JS sintaxis: PASS.
- Docker encuesta-docente:qa109 construido. Recepción sin red, base temporal, misma constancia y una fila tras dos envíos; huella y acceso administrativo denegado sin autorización: PASS.
- Playwright CLI/WebKit móvil: firma de 11 puntos demasiado corta detenida antes de cualquier POST. Firma válida, pérdida de respuesta después de persistir, estado pendiente y reintento recuperado: una sola fila sintética. Confirmación a 360 px sin desbordamiento. No es prueba de iPhone físico.
- Playwright CLI/Chrome escritorio 1280 px: sesión privada, recuento 5.0, 1.3 minutos por entrega del caso ficticio (32.5/25) y métricas del formulario, sin desbordamiento. Capturas revisadas en output/playwright/qa109/.
- Copia archivada de 4.0 y versiones previas sin reescribir datos productivos. Inventario académico vigente: 596 superficies, sin cambios.
- Gobernanza: 49/49 pruebas PASS (12.98 s, ejecución con permisos de Windows para Bash). Lista de calidad 16/16 revisada, cobertura FR-001 a FR-013 y 13 tareas completadas de implementación/preparación. Sin extensiones/hook configurados. La verificación productiva sigue condicionada a CI/merge.

## Dependencia de CI

main todavía contiene follow-redirects 1.16.0, cuyo bloqueo alto ya fue diagnosticado en el PR #225. Se incluye solo el mismo parche transitorio 1.16.1 (tres líneas de lockfile), no los cambios de cuentos de ese PR. npm ci offline reproduce el lockfile; auditoría online moderada/de producción: exit 0, cuatro avisos bajos heredados de KaTeX. No se cambia el umbral ni la excepción 503. Typecheck, lint:strict y build (3123 módulos, Vite 3.94 s): PASS. El aviso de chunks grandes es heredado. CI remoto debe ser verde antes de merge.

## Procedimiento de producción preparado, aún no ejecutado

1. Conservar imagen vigente, snapshot SQLite privado y huellas agregadas/por registro, sin exportar identidades.
2. Únicamente con el commit de main aprobado, construir la encuesta desde una copia de release aislada; no cambiar el checkout académico ni fusionar la antigua rama de encuesta.
3. Mantener .env, nombres de bases, volumen y red. Arrancar únicamente encuesta-docente con la nueva imagen y posibilidad de volver a la anterior.
4. Verificar health público, versión 5.0/release y módulos JS; rechazar acceso sin sesión al resumen. Validar recepción con imagen y base temporal, nunca con fixtures en la muestra real.
5. Leer resumen privado real y comparar integridad de todas las constancias previas. Anotar recuentos por versión y commit/imágenes. No afirmar recepción de docentes que no tengan una constancia almacenada.

## Pendiente de entrega

PR/CI/merge y verificación productiva no se consideran realizados por completar el código. La preprueba humana de duración requiere docentes y se realizará posteriormente; no se sustituye por los tiempos de automatización.
