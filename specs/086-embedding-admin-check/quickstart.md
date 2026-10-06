# Validación

Desde `backend`: `python -m pytest tests/unit/test_admin_embedding_check.py tests/unit/test_ai_credentials_service.py tests/unit/test_teacher_ai_credentials.py tests/unit/test_rag_embedding_space.py`.

Desde `frontend`: `npm run test:run -- src/modules/admin/ai/sections/ProvidersSection.test.tsx`; `npm run typecheck`; `npm run lint:strict`; `npm run build`.

Desde raíz: pruebas `tests/spec_governance` e inventario en modo check. PR con issue #178 y etiquetas `hotfix`, `spec-approved`; todos los controles obligatorios verdes antes de merge.

Producción: comprobación sintética autorizada del servicio sin persistir vectores ni información personal; verificación de versión y salud tras despliegue autorizado. No usar calificaciones reales para diagnosticar este panel.

## Evidencia local (2026-10-06)

- Regresión inicial: helper interno devolvía `unknown`, endpoint no reconocía proveedor y tarjeta mostraba «Sin configurar». Los nuevos tests fallaron antes de corregir; se corrigieron también dos dobles de prueba, no fallos del producto.
- Backend enfocado: 48 pruebas correctas; Ruff sin nombres indefinidos/imports sin uso. Advertencia preexistente de dateutil.
- Tarjeta: 7 pruebas correctas; TypeScript y lint estricto correctos; build de producción correcto, con aviso preexistente de chunk principal mayor de 500 kB.
- Analyze: 6 requisitos y 3 criterios mapeados a 8 tareas, sin contradicciones críticas; responsabilidad canónica verificada en 021.
- Converge: 6 requisitos, 3 criterios, 6 escenarios y 4 decisiones revisados; sin trabajo de implementación pendiente. No se añaden tareas vacías.
- Gobernanza: 41 pruebas correctas; inventario vigente de 573 superficies y `git diff --check` correcto. CI remoto y despliegue son gates externos; no certificados por este archivo.
