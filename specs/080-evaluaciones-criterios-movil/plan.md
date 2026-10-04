# Plan de implementación

Spec: [spec.md](spec.md). Issue #167. Rama `codex/080-evaluaciones-criterios-movil`.
Autorización: solicitud expresa del usuario de corregir y subir a producción (2026-10-04).

## Contexto técnico

FastAPI/Python, PostgreSQL/pgvector, React/TypeScript/TanStack Query/Tailwind existentes.
Pruebas pytest, Vitest y Playwright. Se mantiene `POST /api/evaluaciones/generar-borrador`.
Sin dependencias, migraciones, tablas o rutas nuevas.

## Constitución: verificación previa y diseño

Separación de roles y ownership existentes conservados; notas históricas intactas.
Revisión docente obligatoria; no publicar automáticamente. Secretos fuera del código.
UI móvil accesible, PR/issue/artefactos y CI antes de main. Sin violaciones.

## Diseño

1. Validar URL Ollama por componentes y hostname exacto incluyendo `xcalificator_ollama`.
2. Capturar exclusivamente `EmbeddingUnavailableError` en generación; guardar estado RAG
   y advertencia en trazabilidad existente. Errores LLM siguen visibles y recuperables.
3. Aplicar propiedad docente al contexto; excluir fragmentos de tipo catálogo `dba`, cuyos
   documentos no están enlazados a IDs seleccionados. Los criterios elegidos se transmiten
   directamente, y el material de la materia puede complementar su contexto sin sustituirlos.
4. Selector con búsqueda, contador y selección estable; etiquetas humanas nuevas sin renombrar contratos.
5. Modal sin scroll exterior, contenido flexible con un scroll, progreso y footer compactos,
   ayuda opcional fuera de columnas que quitan espacio. Mantener seis pasos y edición de rúbrica.

## Verificación y entrega

Regresiones de URL, caída semántica, filtros de contexto, selección exacta, restauración y
edición existentes. Prueba responsive en 360×800/390×844 y escritorio. Ejecutar tipos/lint,
pruebas focalizadas y CI completo. PR con aprobaciones documentadas, merge solo verde.
Confirmar despliegue y crear borrador demo aislado; no tocar datos de profesores reales.
