# Plan: lectura administrada y referencia histórica segura

**Rama**: `codex/133-lectura-recalificacion-configurable` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](spec.md) | **Issue**: #279

## Resumen

Eliminar cascadas de entorno para lectura de calificación admitida. Reutilizar perfiles116 y rutas capturadas; añadir controles versionados de lectura al panel y mostrar la nota histórica privada como referencia, nunca como nota actual. Hotfix separado del escáner131.

## Contexto técnico

**Lenguajes/versiones**: Python3.11/FastAPI/Pydantic2, SQLAlchemy, React18/TypeScript.
**Dependencias**: existentes; sin proveedores/SDK nuevos.
**Persistencia**: `ai_feature_routing.runtime_limits` JSONB nullable, migración aditiva `202610280001`; no backfill académico. Snapshot captura controles/credencial/conexión. Configuraciones antiguas usan60/2/10000; publicaciones antiguas que omiten el campo lo conservan.
**Pruebas**: RED→GREEN del transporte/rutas/presupuestos, PostgreSQL aislado de migración y publicación, Vitest/E2E admin/teacher/roles, suites/CI e inventario.
**Plataforma objetivo**: web desde360px a escritorio, workers Celery; APIs compatibles116 y Ollama nativo explícito.
**Rendimiento y escala**: máximo60s de inferencia por intento y2 intentos por página compartidos por principal/respaldo. Espera de capacidad conserva su mecanismo existente y se distingue de inferencia; ninguna tercera ruta. Se mantienen cobertura y control global multipágina existentes, sin aceptar trabajo incompleto.

## Verificación de la constitución

- I: controles solo `admin_ai.manage`; historial solo docente propietario/administrador autorizado. Sin proyección nueva para estudiantes.
- II: referencia histórica en UI, no restauración de campos ni auto-publicación. Cobertura incierta sigue en revisión.
- III: snapshots conservados y presupuesto total acotado; no relanzar trabajos reales.
- IV: migración nullable compatible; downgrade no borra controles ya utilizados sin rechazo explícito. Prueba de upgrade/retención/reversión aislada.
- V: edición/errores/referencia comprobados a360/1440, etiquetas claras y cero válido.
- VI: modelos como datos del administrador; credenciales por selección/conexión; sin fallback oculto por errores de resolución.
- VII/VIII: hotfix aprobado, requisitos/tareas/pruebas/Converge/PR/CI. No fusionar ni desplegar manualmente. Postdiseño sin excepciones.

## Estructura del proyecto

- `backend/app/services/vision_route_policy.py`: contrato y validación de límites, sin nombres de modelos.
- `backend/app/services/{vision_extractor,ai_configuration_resolver,ai_config_service,ai_api_connections}.py`: ejecución administrada, captura, persistencia/publicación compatible.
- `backend/app/modules/admin_ai_config/{schemas,router}.py` y `backend/alembic/versions/202610280001_vision_runtime_limits.py`.
- `backend/app/modules/calificaciones/orchestrator.py`: los jobs administrados no usan fallbacks globales adicionales ni defaults silenciosos.
- `backend/app/modules/analytics/usage_logger.py`: códigos finitos de error visual y uso disponible, sin contenido.
- `frontend/src/modules/admin/{api.ts,ai/utils/snapshots.ts,ai/sections/FunctionsSection.tsx}`: controles/draft/guardado.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y componente privado `PreviousGradeReference.tsx`: usar API de revisiones114 existente, sin nuevo endpoint de notas.
- Propietarios008/012/116 e inventario, con pruebas junto a cada contrato.

## Decisiones y complejidad

La ruta `calificacion.extraccion` es administrada incluso si falla su resolución: no volver a defaults. Perfiles API usan116; Ollama nativo solo si se seleccionó explícitamente. Principal/respaldo comparten presupuesto; con respaldo se prefiere éste después del primer fallo, sin respaldo solo se repiten fallos transitorios. El resto de consumidores legacy no cambia de contrato en este hotfix.

Controles por función, no timeout global del proveedor: evita alterar creación de recursos u otros servicios. JSON tipado con extra prohibido y límites claros; fuera de esta etapa se rechazan controles no consumidos. Preservar campos omitidos por clientes previos y comparar configuraciones ajenas tras publicar. Salida hasta10000 tokens es un tope, no consumo forzoso; detectar truncamiento antes de aceptar JSON.

La referencia histórica busca la última nota numérica válida entre revisiones privadas, no solo la última fila: hay reaperturas previas vacías. Consultar únicamente cuando no hay nota nueva y el actor puede revisar; error/ausencia no inventan un valor. No pasar esa referencia a exportación, publicación o estudiantes.

No hay hooks `.specify/extensions.yml` ni investigación externa necesaria: incidente/contratos se contrastan con código008/114/116 y metadatos productivos minimizados. La validación física Android reportada no acredita iPhone ni cierra131.
