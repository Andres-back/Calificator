## Trazabilidad

Closes #279

- Especificación: `specs/133-lectura-recalificacion-configurable/spec.md`
- Tipo: hotfix aprobado directamente por el usuario.
- Propietarios: 008 / 012 / 116. No incluye el escáner131.

## Cambio

La extracción de evidencias de calificación deja de recorrer modelos del entorno: usa exclusivamente principal/respaldo capturados desde Administración, con perfil y credencial propios. Añade controles persistidos/versionados por hoja: 5–60 s por intento, 1–2 intentos compartidos y 1024–10000 tokens; valores iniciales60/2/10000. Los límites de conexión compartidos no se alteran.

Se rechaza lectura cortada, incompleta o configuración inválida antes de aceptar una calificación. Diagnósticos cerrados distinguen capacidad, autenticación, HTTP, timeout y formato, sin contenido del estudiante.

Si falta resultado nuevo tras recalificar, el docente autorizado ve la última nota histórica válida como referencia. Nunca restaura, confirma, publica ni exporta esa nota; cero no se confunde con ausencia.

## Verificación

Resultados locales y RED→GREEN: `specs/133-lectura-recalificacion-configurable/quickstart.md`. Incluye 20 regresiones específicas de lectura, 3 contratos PostgreSQL, suite frontend1038/168, matriz E2E24 Chromium/WebKit claro/oscuro360/1440 y suites generales. CI remoto se consulta por el HEAD publicado; no se afirma completado al abrir el PR.

## Datos y reversión

Migración aditiva nullable `202610280001`; no backfill de calificaciones ni evidencias. Clientes anteriores que omiten controles los conservan. Jobs capturan conexión/límites sin secretos y no se reescriben. Downgrade utilizado se rechaza para no perder datos; revertir mediante configuración versionada conservando la columna.

No se ha cambiado producción, llamado a IA con evidencias reales ni recalificado entregas. Tras una nueva autorización de fusión y despliegue verificado se podrá publicar únicamente lectura Luna principal / GLM respaldo desde Administración; evaluadores, listas, imágenes y embeddings quedan intactos. No restaurar como solución una ruta retirada.

## Entrega

- Hotfix con `spec-approved`; no omitir gobernanza ni auditorías.
- Este PR no autoriza merge, despliegue manual, reinicio de servicios ni modificación de notas reales.
- Requeridos todos los controles de CI verdes antes de solicitar fusión.
