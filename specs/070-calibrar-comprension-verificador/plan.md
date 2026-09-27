# Plan de implementación: Calibrar comprensión lectora y verificador

**Rama**: `codex/070-calibrar-comprension-verificador` | **Fecha**: 2026-09-24 | **Especificación**: [spec.md](spec.md)

## Resumen

Se reforzarán las instrucciones de los dos evaluadores para que el contenido semánticamente correcto conserve su puntaje salvo pesos formales de escritura. El cliente de calificación enviará razonamiento bajo a GLM 5.3 Flash y conservará un techo de salida compacto, manteniendo la detección de truncamiento y la revisión humana.

## Contexto técnico

**Lenguaje/versión**: Python 3.12

**Dependencias principales**: FastAPI, httpx, Pydantic

**Almacenamiento**: Sin cambios de esquema ni migraciones

**Pruebas**: pytest unitario y gobernanza Spec Kit

**Plataforma objetivo**: backend y workers Linux en contenedores

**Tipo de proyecto**: aplicación web con procesamiento asíncrono

**Metas de rendimiento**: evitar que el verificador compacto agote su salida por razonamiento interno

**Restricciones**: no alterar notas confirmadas/publicadas; no cambiar API pública; conservar revisión docente

**Escala/alcance**: prompts y transporte OpenCode usados por calificación

## Verificación constitucional

- Integridad y trazabilidad: pasa; solo cambia la sugerencia y mantiene revisión humana.
- Procesamiento recuperable: pasa; se conserva el manejo de truncamiento/fallo.
- Proveedores intercambiables: pasa; el control se resuelve por capacidad del modelo.
- Datos y API: pasa; no hay migraciones ni contratos públicos nuevos.
- Pruebas y PR: pasa; incluye regresión, issue, rama y CI.

## Estructura afectada

```text
backend/app/core/config.py
backend/app/services/llm_router.py
backend/app/modules/calificaciones/agents.py
backend/tests/unit/test_llm_router_output_budget.py
backend/tests/unit/test_opencode_model_gateway.py
backend/tests/unit/test_photo_grading_failures.py
specs/070-calibrar-comprension-verificador/
```

**Decisión de estructura**: cambio interno del backend y sus pruebas existentes; no se crean módulos de negocio, endpoints ni entidades.

## Decisiones

- El modo bajo de razonamiento se agrega mediante una función de capacidad reutilizada por el router general y el cliente de calificación.
- El prompt diferencia contenido, forma y ubicación de la respuesta; los descuentos de escritura requieren pesos explícitos.
- El techo de salida del verificador permanece en 2048; la mejora reduce razonamiento interno en vez de ampliar la espera posible.
- No se añade reintento automático con un tercer modelo para evitar más latencia.

