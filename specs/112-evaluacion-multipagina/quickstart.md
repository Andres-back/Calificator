# Verificación
Pruebas sintéticas: lectura inicial con 17 marcadores vacíos seguida de respuestas, blanco/ilegible en ambos órdenes, dibujo y conflicto; texto parcial en prompts y exclusión de piso objetivo. Lectura pura no usa cascada en multipágina, timeout conserva páginas completas, todo fallido sigue error.
Recuperación real solo tras main/CI/despliegue: diagnóstico, respaldo, excluir notas existentes/decisiones, reanalizar con evidencia original e historial y comprobar agregados. No imprimir nombres ni responder con una nota inventada cuando falte hoja. Verificaciones y producción pendientes hasta terminar implementación.

## Resultados de desarrollo — 2026-10-21

- Regresiones reproducidas con marcadores vacíos de lectura y fragmentos posteriores; antes se borraban, ahora se conservan texto/dibujo, origen y parcialidad. También se reprodujo que el formateador ocultaba el fragmento bajo un mensaje genérico; corregido y probado.
- Suite unitaria completa: **1.162 pasaron, 2 omitidas**, con Pillow 13.0.0. Incluye pruebas de unión, timeout, prompts, piso objetivo, revisión, historial, persistencia y recuperación. Los skips existentes no se han añadido para este arreglo.
- Ruff, selección de CI F401/F821/F822/F823/F841: correcto. Fuente del checkpoint invalidada por versión de política 2 para no reutilizar uniones defectuosas.
- Dos pruebas PostgreSQL nuevas comprueban transacción/reintento y decisión docente concurrente en schema aleatorio aislado. Se ejecutarán en CI mediante SPEC101_TEST_DATABASE_URL existente; nunca se usa DATABASE_URL real como sustituto. Docker local no disponible: no se afirma haberlas ejecutado localmente.
- Convergencia: 7 FR, 3 SC y ambas historias cotejadas con código/pruebas. Un hallazgo parcial de checkpoint se añadió como T011 y fue resuelto. Sin otros faltantes funcionales ni hooks de extensión.

## Recuperación operativa acotada

1. Después de CI/fusión y despliegue, ejecutar `PYTHONPATH=backend python scripts/recover_multipage_grading.py --evaluation-id UUID --teacher-id UUID` en el entorno del backend. Sin `--execute` es solo lectura, sin respaldos, auditoría ni trabajos nuevos.
2. Revisar IDs elegibles del incidente; **no** volver a calificar sugerencias existentes, notas confirmadas, publicadas, ajustadas, anuladas o revisadas. Si hay un trabajo activo se omite.
3. Ejecutar únicamente IDs revisados mediante `--grade-id UUID` repetible, `--execute` y `--confirm-evaluation UUID` idéntico a la evaluación. Cada fila se vuelve a validar bajo bloqueo; una decisión concurrente prevalece.
4. Se guarda respaldo de entrega/resultado y SHA de evidencia en `.private/grading-recovery/`, fuera del acceso público, y auditoría con operador de mantenimiento, sin atribuir falsamente el clic a la docente. Se reutiliza la cola normal, preservando evidencia y referencias de versión. No hay llamada directa a modelos fuera de su configuración ni nota fabricada.
5. Verificar trabajos, notas sugeridas, originales (SHA), notas existentes y versiones de desglose después de procesar. Si falta una hoja del cuaderno, informar la carencia concreta y mantener revisión; no presentarla como incorrecta por un fallo técnico.

**Estado de entrega**: CI remoto, despliegue y recuperación real pendientes hasta su comprobación. Las pruebas locales no prueban que las notas de producción ya se hayan corregido.
