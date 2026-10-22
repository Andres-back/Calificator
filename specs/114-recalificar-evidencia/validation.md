# Validación — Spec 114 / issue #240

Fecha: 2026-10-22. Entrega inicial autorizada: rama y PR. Autorización posterior del usuario: «fusion», con CI verde y sin operaciones manuales de producción.

## Comprobado localmente

- Backend: pasada final con **1291 pruebas aprobadas y 11 omitidas** (2 preexistentes y 9 PostgreSQL sin base local). Incluye los dos casos de retirada de migración y motivo opcional. Ruff E9/F63/F7/F82/F401/F841 sin errores.
- Frontend: **843 pruebas aprobadas**, TypeScript, lint estricto, build y auditorías de acciones/recursos correctos. El componente nuevo tiene 7 pruebas (confirmación de cero real, motivo vacío, reemplazo, cancelación, error/reintento, historial y procesamiento).
- Migración: Alembic generó el DDL PostgreSQL de `202610200001:head` correctamente; solo crea tabla/índices, sin backfill ni modificación de notas. La prueba de downgrade niega borrar historial material y permite retirar la tabla vacía.
- Navegador real mediante Playwright CLI, **API completamente simulada**: 360×800 y 1366×900, temas claro/oscuro, nombres largos, apertura/cancelación de ambos diálogos, confirmación sin motivo, historial con nota cero y envío HTTP 202. El diálogo se cierra y aparece «Calificando en segundo plano» sin nota cero artificial; no hay desbordamiento horizontal.
- Capturas locales, fuera de Git: `output/playwright/revision114/{regrade-360-light,replace-360-light,replace-1366-dark,regrade-360-dark}.png`. Inspección visual realizada. No equivalen a prueba física de cámara iPhone/Android.
- Inventario regenerado con el comando oficial y comprobado: 624 superficies. La propiedad de calificaciones sigue en Spec 008; Spec 114 describe esta evolución.

## Verificaciones de CI obligatorias antes de fusionar

Docker Desktop local está abierto pero su motor no respondió a las consultas acotadas; no se reinició ni se utilizaron servicios productivos como alternativa.

Las **9 pruebas de integración** nuevas de `backend/tests/integration/test_grading_revisions_persistence.py` usan exclusivamente `SPEC107_TEST_DATABASE_URL`, limitado a `127.0.0.1:55417/spec107`. Localmente no se dispone de esta base: **no se declaran aprobadas**. CI ya migra y utiliza esa base sintética. Cubren permisos (incluido archivo privado), publicación suspendida, nota cero, idempotencia/reuso distinto, archivo inválido, rollback, dos reemplazos, parte online conservada, trabajo activo y concurrencia con sesiones independientes. Un esquema sintético nuevo, revertido por transacción, permite comprobar upgrade/downgrade/upgrade y rechazo de downgrade con historial material sin tocar las tablas académicas existentes.

Exigir resultados verdes de backend/integración, frontend/E2E, contenedores y gobernanza. La migración PostgreSQL real queda pendiente de esa ejecución; la comprobación DDL/guardia local no sustituye una prueba contra PostgreSQL. No afirmar producción actualizada.

## Trazabilidad y revisión

FR-001/003/005/006: política de reapertura, versión esperada y solicitud UUID; bloqueo de calificación/entrega y cola persistida reutilizada. FR-002/004/007/008: instantánea independiente previa, archivos protegidos, paquete ordenado/girado, contenido fijado y parte online intactos. FR-009: componente aislado y pruebas de interacción/responsive. FR-010: migración aditiva y validación sin datos reales.

Analyze: 10 requisitos funcionales y 4 criterios de éxito con cobertura en 15 tareas, 0 contradicciones documentales bloqueantes y 0 tareas funcionales sin requisito. Converge: código de 3 historias, 10 FR, 4 SC y 5 decisiones técnicas revisado contra los 8 principios constitucionales; sin trabajo de implementación omitido. La aprobación para fusionar depende de los resultados de CI, no de marcar las tareas de implementación.

Se conservan fuera de este PR los cambios pendientes de Spec 034 (panel de IA). No se consultaron ni modificaron alumnos, notas, evidencias o configuración productivos; no se realizaron llamadas a modelos.

## Operación y recuperación

La nueva evidencia genera una sugerencia pendiente de decisión docente. El historial conserva el archivo y resultado previo; no hay restauración automática ni nueva publicación automática de enlaces. La ruta general de alta de fotos responde 409 si ya existe calificación para dirigir a «Cambiar evidencia» y evitar sobrescribir sin historial.

Un fallo previo al commit revierte los cambios de base. Ante un commit incierto no se elimina el archivo recién escrito: podría estar referenciado por un trabajo ya admitido; un posible archivo huérfano privado se conserva para limpieza posterior verificada, priorizando no borrar evidencia válida. La cola existente gestiona la recuperación de publicación al worker.

Rollback: volver al código anterior manteniendo tabla y archivos; no ejecutar downgrade con historial material. No se autoriza eliminar revisiones ni reescribir notas como parte de este PR.

## Correcciones después de la primera ejecución de CI

La ejecución `39801772185` aprobó las nueve pruebas PostgreSQL nuevas, incluida la migración real en un esquema desechable, concurrencia, permisos e historial. Falló una regresión antigua de feedback que ejecutaba `upgrade head` pero exigía la versión de octubre 20: ahora prueba explícitamente `202610200001` manteniendo la comparación completa de la nota antes/después. El head de la aplicación sigue comprobándose por separado.

Se registró Spec 114 en `ALL_SPECS` sin quitar comprobaciones de gobernanza. Los siete documentos ajenos pendientes de Spec 034 permanecen fuera del PR; la prueba global local detecta legítimamente sus requisitos no implementados, por lo que la comprobación final del candidato se realiza sobre un archivo limpio del commit y CI.

El E2E móvil original pasa en 360, 390 y 1366 px sin cambiar sus aserciones: las acciones nuevas se pliegan y quedan después de la navegación principal. Se conserva acceso a recalificar, evidencia e historial.

WebKit reprodujo el fallo original (1 de 3 intentos). El diagnóstico detectó autofoco tardío del diálogo de fondo; una nueva regresión unitaria falló reproduciendo exactamente que el foco terminaba en «Cerrar diálogo» y pasó con la guardia de diálogo superior. El E2E WebKit original, sin instrumentación ni relajación, pasó 6/6 repeticiones tras el ajuste. No se aceptan imágenes ni materiales automáticamente.

Converge posterior a las correcciones: 4 hallazgos parciales registrados en T016–T019 y resueltos. Se mantienen los 10 FR, 4 SC y las mismas garantías de datos. La nueva ejecución de CI y la verificación exacta de HEAD siguen siendo condición de fusión; no se presuponen aprobadas por estas pruebas locales.

Regresión frontend posterior: 845 pruebas aprobadas, TypeScript, lint estricto y build correctos. Los E2E móviles originales aprobaron 3/3 tamaños; WebKit aprobó 6/6 sin cambiar sus aserciones. Captura compacta a 360 px inspeccionada visualmente en `output/playwright/revision114/compact-360-light.png`.
