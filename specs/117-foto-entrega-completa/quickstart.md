# Validación del hotfix

## Reproducción y cambio

El 2026-10-22, los logs de producción confirmaron `NotNullViolationError` en `entregas.tipo` durante el autoflush de `grading_job_reference`. No se copian datos personales ni parámetros SQL a esta evidencia.

Antes de reparar, los dos casos de docente (foto/PDF de varias hojas) fallaron con la misma restricción PostgreSQL. Las pruebas unitarias también fallaron al comprobar el tipo en `db.add`. Después de inicializar `tipo` en ambas rutas físicas, pasan los cuatro casos HTTP: docente/estudiante × una/dos hojas. Conservan revisión, archivo, una sola entrega/encolado y notas sintéticas anteriores.

Pruebas locales:

- 57 unitarias de foto, evaluación mixta, cola, revisiones, lote y contexto visual: pasan.
- 73 unitarias de errores y autorización: pasan.
- Ruff F401/F821/F822/F823/F841 de archivos afectados: pasa.
- Constructores `Entrega` de la aplicación: ninguno omite `tipo`.
- Inventario: regenerado sin añadir ni quitar rutas.
- En Windows, el contrato visual completo tuvo 15 casos correctos y uno no ejecutable por faltar WeasyPrint; la validación final se realiza en Linux, sin ocultar esa limitación.
- En Linux/Python 3.11, el contrato visual completo termina con **18 pruebas correctas**, incluido PDF y los cuatro casos de envío nuevos (153 s). Solo queda un aviso de dependencia futura de HarfBuzz, no un fallo.

Convergencia de implementación: los cuatro requisitos están cubiertos por el código, las regresiones y este procedimiento. Las puertas externas de CI/fusión/despliegue siguen pendientes hasta que se registren resultados reales en el PR; no son una prueba ya superada por documentarlas.

El PostgreSQL local `xcal-spec117-postgres` contiene solo registros sintéticos de pruebas, con esquemas aleatorios eliminados al terminar cada caso. No se usa la base de la aplicación ni se llama a una API de IA. El contenedor Linux monta solo `app`, `tests` y `pytest.ini`, no archivos de secretos.

## Puerta de entrega (obligatoria, todavía no presumida)

1. Publicar PR que cierre #244 con Spec 117 y etiquetas `hotfix`, `spec-approved` y `plan-approved`.
2. Exigir los controles vigentes verdes del mismo HEAD: backend, calidad/build frontend, E2E general/contextual, agregado frontend, contenedores y gobernanza. No usar bypass ni omitir auditorías.
3. Fusionar por squash con `--match-head-commit` y comprobar el commit resultante en main.
4. Esperar el despliegue automático. Comparar commit fuente y SHA-256 del router tanto en fuente como dentro del backend; comprobar backend/web y `/health` público. No editar directamente el contenedor.
5. Registrar en el PR el resultado efectivo y cualquier limitación. Una coincidencia de código y salud no se presenta como una calificación nueva de un alumno. No volver a enviar la fotografía de la captura ni recalificar registros reales automáticamente.

Rollback: ante regresión, detener la entrega y preparar un revert por PR; no hay esquema, configuración de IA ni datos históricos que deshacer.
