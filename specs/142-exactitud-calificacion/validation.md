# Validación de la candidata — Spec 142

## Entorno y límites

Rama aislada desde `28c1fa7`; solo datos sintéticos, sin red a proveedores, sin claves de API, sin base real y sin cambios en producción. El gate `GRADING_SAFE_OBJECTIVE_ENABLED` vale `false` por defecto. No se cambiaron los modelos, prompts o tiempos del sistema.

El plan aprobado se transcribió al issue #303 y a esta spec. No se creó una nueva exigencia de validación física: no cambia el frontend, la captura ni el editor de fotos. Se conserva el renderizado existente de respuesta, explicación, estado y páginas. El detalle técnico nuevo queda en el resultado privado versionado.

## Ejecuciones

- Primera comparación/regla/consenso: 54 pruebas aprobadas.
- Gate, orquestación sintética, conservación de decisión docente y replay: 6 pruebas aprobadas.
- Regresión ampliada: 215 pruebas aprobadas (regla, consenso, comparación, orquestación, desglose, permisos, ajustes docentes, modalidades, compatibilidad, recuperación y extractor). Solo advertencias de deprecación preexistentes.
- Ruff del backend en las reglas usadas por CI: aprobado.
- Regresión final después de conservar lecturas dudosas y flags de corrección en checkpoints: 216 pruebas aprobadas en 18,49 s; Ruff aprobado. La comparación offline se repitió con los mismos resultados.
- Suite unitaria completa en Windows/Python 3.13: 1972 aprobadas, 5 omitidas y 13 fallos. Los mismos 13 fallos se reprodujeron ejecutando sus cuatro archivos en una copia intacta del commit base `28c1fa7` (106 aprobadas). Afectan a escaneo/subprocesos/reconciliación y al pin de fpdf2, no a esta candidata. El entorno local tiene Pillow 11.3 y fpdf2 2.8.1, distintos a los pines del proyecto, y no dispone de permisos de symlink. No se cambiaron dependencias ni pruebas para eludirlos. Docker local no está disponible; la suite Linux con las dependencias fijadas debe completarse en CI.
- Inventario técnico regenerado y comprobado: 687 superficies. La primera ejecución de gobernanza pasó 60 pruebas y detectó únicamente la tarea T006 aún abierta; tras registrar la validación, la ejecución final pasó las 61 pruebas en 18,46 s. El validador con contexto de PR (`codex/142-exactitud-calificacion`, etiquetas del plan aprobado y `Closes #303`) también pasó.

## Comparación offline

Reproducible desde `backend`: `python -m tests.unit.test_objective_accuracy_comparison`.

| Medida sintética | Baseline | Candidata |
|---|---:|---:|
| Coincidencias con referencia en 4 casos puntuables | 2 | 4 |
| Abstenciones en los 5 casos que debían quedar pendientes | 0 | 5 |
| Ceros indebidos en esos casos pendientes | 4 | 0 |

Nueve casos de regresión deliberadamente pequeños, con la misma lectura y valoraciones de modelo congeladas. El caso abierto conserva el puntaje de sus valoraciones; no recibe corrección binaria. La ejecución conjunta de ambas reglas tardó aproximadamente 2 ms en esta máquina; no mide OCR, latencia de IA, colas ni el tiempo total de calificar.

La referencia fue escrita en el fixture por desarrollo, **no validada por docentes**. El resultado prueba esos escenarios, no una tasa de exactitud real ni superioridad estadística. No corresponde calcular Kappa con esta referencia. El protocolo de validación independiente, la comparación ciega de abiertas y los criterios de activación están en `quickstart.md`; quedan como etapa futura expresamente no ejecutada.

## Seguridad de adopción

No migración, endpoint, dato público ni llamadas nuevas. El modo apagado conserva la ruta anterior. Al activar para una ejecución futura, no se sustituye una decisión humana ni un desglose ya editado/publicado y la incertidumbre sigue impidiendo la publicación automática. No se recalificaron entregas reales.

El endpoint de detalle conserva `grading.read` y `ensure_can_manage_evaluation`. La proyección de enlaces públicos usa una lista permitida de campos, no `resultado_json`; no se añade la traza privada a esa proyección. Las referencias siguen sujetas a `answers_released`.

La lista de calidad se adjunta para revisión del PR, después de la implementación, sin marcar aprobaciones retroactivas. El plan y la implementación no equivalen a aprobación de esa lista ni a autorización de activar el gate. El CI remoto, la revisión y la comparación docente siguen siendo condiciones separadas antes de adoptar la candidata.
