# Plan: retroalimentación formativa y calidad medible

**Branch**: `codex/047-retroalimentacion-formativa` | **Date**: 2026-09-18 | **Spec**: [spec.md](spec.md)
**Estado**: Plan aprobado por el usuario el 2026-09-18 («sigue»). Issue [#94](https://github.com/Andres-back/Calificator/issues/94) y PR [#127](https://github.com/Andres-back/Calificator/pull/127) asociados; merge y despliegue condicionados a CI verde.

## Summary

Incluir las `reglas_feedback` existentes como preferencias de redacción en el prompt actual. Reutilizar `render_grader_prompt` también en `router_grader_agent`, que actualmente interpola la plantilla por separado. Conservar evidencia, criterios, pesos, esquema de salida, cálculo, verificadores, cola y publicación. Completar la rúbrica humana documental compatible con el contrato vigente 1–5; no añadir evaluador automático de calidad.

### Evolución posterior al piloto — issue #137

Fortalecer el mismo flujo sin añadir llamadas de IA ni migraciones: la visión debe copiar literalmente los números visibles; el verificador debe leer cada respuesta antes de considerar la propuesta principal; y una política local debe impedir que feedback, nota y componentes contradictorios se presenten como definitivos. La salida original se conserva en trazabilidad y los registros previos no se recalculan.

## Technical Context

**Language/Version**: Python del CI existente; runtime sin cambios.
**Primary Dependencies**: FastAPI, dataclasses, json y pytest existentes; ninguna nueva.
**Storage**: PostgreSQL/JSONB existentes, solo lectura de reglas; sin migraciones.
**Testing**: Pytest con clientes simulados y regresiones existentes.
**Target Platform**: Backend Linux/CI.
**Project Type**: Aplicación web, ajuste interno de prompt y documentación.
**Performance Goals**: Mismo número de llamadas a IA, sin nuevas esperas o evaluadores. Añadir texto puede aumentar tokens: no prometer latencia idéntica ni menos de 20 segundos sin medir.
**Constraints**: No reescribir notas o feedback históricos; no cambiar criterios, modelos, timeouts, cola, endpoints, permisos o UI. En ejecuciones nuevas, una incoherencia puede mantener el estado `requiere_revision`, reemplazar una devolución contradictoria por un borrador seguro y usar la suma verificable como nota sugerida sin confirmar ni publicar automáticamente.
**Scale/Scope**: Dos consumidores del prompt, pruebas existentes y documentos del instrumento.

## Constitution Check

- Roles: sin accesos o superficies nuevas.
- Integridad: reglas de redacción subordinadas a evidencia, criterios y pesos; decisión docente intacta.
- Asincronía: mismas colas y llamadas.
- Datos: sin migraciones, reetiquetado histórico o activación del módulo de estudio.
- Accesibilidad: sin cambios UI ni pasos obligatorios.
- IA y secretos: misma selección de proveedores; sin credenciales en documentos o pruebas.
- Gobernanza: especificación y plan aprobados. Issue debe asociarse antes de cambios versionados; tasks y análisis previos al ajuste local.
- Producción: solo PR y CI verde con autorización; nunca push directo a main.

Diseño compatible. Se prepara y prueba el ajuste local no versionado; gate de versionado/publicación cerrado hasta autorización y asociación del issue. El bloqueo externo no se considera resuelto por esta preparación.

## Project Structure

Documentación en `specs/047-retroalimentacion-formativa`: spec, plan, research, data-model, contracts/feedback, quickstart y rúbrica. Tasks se generan después de aprobar el plan.

Código previsto:
- `backend/app/modules/calificaciones/agents.py`: plantilla y constructor compartido.
- `backend/tests/unit/test_comparator_feedback.py`: ampliar pruebas existentes, sin nuevo servicio.
- `backend/tests/unit/test_vision_extractor.py`: regresión existente de contenido completo.
- `backend/tests/integration/test_explainable_grading_pipeline.py`: integridad y contrato de calidad.
- `specs/README.md`: índice de evolución sin transferir propiedad de módulos.

**Structure Decision**: Worktree aislado desde main, preservando cambios de criterios de aprendizaje del worktree principal.

## Diseño

1. Leer reglas del blueprint; ausencia, nulo, vacío o tipo incompatible no deben romper evaluaciones antiguas.
2. Serializarlas como datos JSON, sin ejecutar su contenido ni usarlo como plantilla. Excluir metadatos internos de trazabilidad, advertencias, publicación, digitalización y claves de prefijo `_`, sin modificar el blueprint original.
3. Añadir preferencias delimitadas y prioridad explícita: no autorizan inventar evidencia, omitir errores, modificar pesos/nota máxima o publicar.
4. Pedir orientación respetuosa, concreta y ligada a evidencia. Reconocer incertidumbre ante ilegibilidad; no inventar defectos si todo es correcto.
5. Si se solicita orientar sin respuesta, usar pistas/pasos en el texto de mejora; no modificar la clave interna ni su visualización existente.
6. Respaldo utiliza `render_grader_prompt(ctx)` en lugar de duplicar `.format`, evitando placeholders faltantes y reglas divergentes.
7. Mantener todo el procesamiento posterior y campos de salida.
8. Reforzar la extracción para que el contexto ubique la pregunta pero nunca suministre la respuesta: en operaciones debe copiar operandos, parciales y resultado visibles e indicar diferencias o ilegibilidad.
9. Hacer que el verificador contraste la imagen de forma independiente y devuelva una lectura visible por componente antes de comparar la propuesta principal.
10. Aplicar una guarda local en la persistencia del desglose: si hay bloqueos, desacuerdo material o diferencia entre la suma y la nota global, conservar el feedback original en trazabilidad, sustituir el texto visible por un aviso seguro y mantener revisión docente.
11. No actualizar calificaciones existentes. La política entra en vigor solo para nuevas ejecuciones; cualquier reintento histórico debe ser explícito.

Incluir instrucciones no garantiza cumplimiento semántico: el docente sigue revisando la propuesta.

## Validación y recuperación

- Regresión de reglas presentes, ausentes, nulas, vacías e inválidas; preferencias contradictorias subordinadas a integridad.
- Cliente simulado comprueba prompt del respaldo, una llamada y resultados preservados.
- Regresiones de texto largo, desglose/suma, feedback consolidado y cinco dimensiones 1–5.
- Ruff y revisión del diff; ninguna prueba llama APIs externas o usa datos reales.
- Sin batería frontend al no cambiar frontend; CI antes de merge.
- Reversión mediante revert del PR, sin migración o limpieza de datos.
- Regresión específica derivada del piloto: una imagen donde los operandos escritos difieren del enunciado y otra donde el mensaje afirma perfección pese a un componente pendiente.
- La guarda es determinista y no añade solicitudes, tokens ni espera del proveedor.
