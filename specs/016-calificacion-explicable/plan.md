# Plan: Calificación explicable y auditable

**Rama**: `codex/016-calificacion-explicable` | **Fecha**: 2026-08-21 | **Spec**: [spec.md](./spec.md) | **Issue**: #20

## Resumen

Evolucionar la calificación actual desde una nota global acompañada por criterios variables hacia un desglose canónico, versionado y reproducible por pregunta o criterio puntuable. El mapa de evaluación definirá primero los componentes esperados; visión y los evaluadores automáticos completarán esa misma estructura; una calculadora determinista aplicará puntajes, escala, ajuste explícito y redondeo. El profesor podrá revisar y corregir cada componente con trazabilidad y el estudiante recibirá, solo después de la publicación, una explicación pedagógica filtrada por la política de visibilidad.

La implementación será aditiva: `calificaciones` y `resultado_json` se conservarán para compatibilidad y telemetría, mientras nuevas tablas normalizadas almacenarán versiones inmutables del desglose, componentes y ajustes. Las notas históricas sin respaldo verificable no se reconstruirán.

DBA y rúbricas se conservan: el DBA documenta alineación curricular y ayuda a explicar qué aprendizaje se evaluó; solo los criterios de rúbrica que el profesor haya marcado como puntuables y ponderado entran en la fórmula. Toda nota continúa explicándose desde respuestas o criterios puntuables concretos, no desde la mera presencia de un DBA.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11; TypeScript 5.6; React 18.3.
**Dependencias**: FastAPI 0.139, Pydantic 2.10, SQLAlchemy async 2.0, Alembic 1.14, Celery 5.4, React Query 5, React Router 7, Tailwind CSS 3.4.
**Persistencia**: PostgreSQL 16 con UUID, `NUMERIC` y JSONB; Redis 7 para trabajos Celery; evidencia en almacenamiento local montado.
**Pruebas**: pytest 9.1 (unitarias e integración), Vitest 4.1 + Testing Library, Playwright 1.61, migraciones Alembic y construcción Docker en CI.
**Plataforma objetivo**: API y worker Linux en Docker; web responsive en Chromium/Brave, Safari iOS y navegadores modernos desde 360 px hasta escritorio, modo claro y oscuro.
**Rendimiento y escala**: conservar una sola calificación vigente por entrega; añadir como máximo 20 % al tiempo mediano de una calificación equivalente; carga del desglose mediante consulta indexada y sin consultas N+1; edición optimista con conflicto visible; trabajos idempotentes por ejecución.

## Verificación de la constitución

- Separación de roles: **cumple**. Los contratos separan el desglose docente completo del publicado para el estudiante; el backend valida propiedad de materia, identidad del estudiante y estado publicado.
- Integridad y trazabilidad: **cumple**. Cada nota se deriva de componentes canónicos; las ediciones crean una nueva versión y un ajuste auditable sin borrar la propuesta automática.
- Asincronía e idempotencia: **cumple**. El worker crea o reemplaza únicamente propuestas automáticas mediante una clave de ejecución; nunca sobrescribe una decisión docente ni duplica componentes.
- Datos y secretos: **cumple**. La migración es aditiva, no hace inferencias sobre notas históricas y persiste solo campos estructurados permitidos; se excluyen razonamiento privado, prompts, secretos y respuestas crudas no aprobadas.
- Accesibilidad: **cumple**. El desglose reutilizable se diseña primero para 360 px, controles táctiles, navegación por teclado, estados no dependientes del color y claro/oscuro.
- Gobernanza y pruebas: **cumple**. Issue #20, especificación aprobada y artefactos Spec Kit presentes; implementación condicionada a aprobación del plan, tareas, análisis, CI y pruebas de regresión.

### Revisión posterior al diseño

No se identifican excepciones constitucionales. La normalización evita convertir `resultado_json` en una segunda base de datos opaca; la compatibilidad heredada y la migración sin backfill reducen el riesgo sobre el flujo existente. Los contratos de estudiante aplican redacción del lado servidor, no solo ocultamiento visual.

## Estructura del proyecto

```text
backend/
├── alembic/versions/
│   └── 20260821xxxx_calificacion_desgloses.py
├── app/modules/calificaciones/
│   ├── agents.py
│   ├── breakdown_models.py
│   ├── breakdown_policy.py
│   ├── breakdown_service.py
│   ├── models.py
│   ├── orchestrator.py
│   ├── router.py
│   ├── schemas.py
│   └── service.py
├── app/workers/tasks_grading.py
└── tests/
    ├── integration/test_explainable_grading_flow.py
    └── unit/test_*breakdown*.py

frontend/src/
├── modules/calificaciones/
│   ├── api.ts
│   ├── CalificacionesWorkspace.tsx
│   └── components/
│       ├── GradeBreakdown.tsx
│       ├── GradeComponentEditor.tsx
│       └── GradeFormula.tsx
├── modules/evaluaciones/ResolverEvaluacionPage.tsx
├── types/api.ts
└── e2e/
    └── explainable-grading.spec.ts

specs/016-calificacion-explicable/
├── contracts/calificacion-explicable.openapi.yaml
├── data-model.md
├── plan.md
├── quickstart.md
├── research.md
└── spec.md
```

Los nombres exactos de pruebas pueden agruparse con suites existentes durante `tasks.md`, pero cada responsabilidad indicada debe conservar cobertura.

## Diseño por fases

### Fase 1 — Persistencia y dominio determinista

1. Añadir tablas versionadas de desglose, componentes y ajustes, más el vínculo opcional de una incidencia con un componente publicado.
2. Implementar una función pura con `Decimal` que valide cobertura, límites, duplicados, escala, ajuste y redondeo; la nota almacenada debe ser el resultado exacto de esa función.
3. Construir claves estables desde el blueprint (`pregunta:<id|numero>`, `rubrica:<id>`, `manual:<calificacion>`) antes de invocar IA.
4. Mantener `resultado_json` como compatibilidad y telemetría sanitizada, no como fuente canónica del nuevo desglose.

### Fase 2 — Evaluación automática por componente

1. Cambiar el contrato de ambos evaluadores para devolver exactamente los componentes solicitados, no criterios inventados ni una nota global libre.
2. Aplicar primero la validación objetiva determinista: una coincidencia correcta fija el puntaje completo y no puede degradarse por el modelo.
3. Comparar evaluadores por componente. Una diferencia material de puntaje, estado o evidencia crea discrepancia visible; la coincidencia de totales no la oculta.
4. Calcular la nota sugerida desde el consenso por componente. Los componentes ilegibles, ausentes o sin clave permanecen pendientes y bloquean confirmación/publicación.
5. Sanitizar mediante lista permitida antes de persistir: identidad, respuesta detectada, referencia aprobada, puntaje, estado, explicación breve, evidencia y telemetría mínima.

### Fase 3 — Decisión docente y auditoría

1. Ampliar el detalle docente con el desglose actual y el historial de versiones.
2. Guardar cambios de componentes y ajuste global de forma atómica usando `version_esperada`; un conflicto devuelve 409 sin sobrescribir.
3. Exigir por cada cambio un motivo interno y una explicación pedagógica estudiantil. Cada guardado crea una nueva versión inmutable y un registro antes/después.
4. Confirmar únicamente cuando la nota enviada coincide con la fórmula y no existen bloqueos. Publicar congela la versión visible hasta una nueva decisión docente y republicación.
5. Adaptar nota manual, ausencia y fuera de plazo a un componente manual explícito, sin fabricar respuestas.

### Fase 4 — Experiencia del estudiante y PQRS

1. Exponer un contrato estudiantil separado, disponible solo para la nota publicada y filtrado según entregas abiertas o liberación de claves.
2. Mostrar operación, puntos y explicaciones en “Ver entrega”, con referencias ocultas cuando corresponda.
3. Permitir que la solicitud de revisión apunte al identificador y versión de un componente publicado; conservar la solicitud general existente.
4. Mostrar las notas heredadas como “Detalle no disponible” sin generar componentes retroactivos.

### Fase 5 — Integración, accesibilidad y despliegue

1. Integrar componentes compartidos de visualización en el workspace docente y en la entrega estudiantil; conservar evidencia, guía de revisión, timeline e incidencias.
2. Probar 360×800, 390×844, 768×1024 y escritorio en claro/oscuro; controles de edición de al menos 44 px y sin desplazamiento horizontal.
3. Medir pipeline anterior/nuevo con fixtures equivalentes y verificar el límite de 20 %; comprobar idempotencia de reintentos y lotes.
4. Ejecutar migración adelante/atrás en base temporal, suites backend/frontend/E2E, compilación y Docker antes del PR.
5. Desplegar en etapas: primero esquema y lectura compatible sin cambiar notas; después escritura de desgloses en modo controlado; finalmente habilitar el cálculo canónico solo tras comparar resultados y conservar una ruta de reversión al flujo vigente mientras se estabiliza.

## Decisiones y complejidad

- **Versiones normalizadas en lugar de solo JSONB**: hacen consultables los componentes, permiten FK desde PQRS y evitan sobrescrituras silenciosas. JSONB queda limitado a metadatos variables y valoraciones automáticas sanitizadas.
- **Cálculo determinista fuera del LLM**: los modelos proponen puntajes y explicaciones por componente; Python valida y calcula la única nota canónica. Se rechaza confiar en una `nota_sugerida` global producida por el modelo.
- **Copiar componentes al editar**: cada decisión produce una versión inmutable completa. El costo es aceptable para evaluaciones escolares y simplifica auditoría, concurrencia y publicación.
- **Sin backfill inferido**: datos históricos conservan el flujo actual y una marca de detalle no disponible. Se rechaza reconstruir puntajes a partir de feedback o totales porque crearía evidencia falsa.
- **Redacción en backend**: profesor y estudiante reciben DTO distintos; se rechaza enviar claves al navegador y ocultarlas con CSS.
- **Compatibilidad gradual**: endpoints actuales de confirmar, ajustar y publicar permanecen, pero para desgloses nuevos aplican las validaciones y motivos adicionales definidos en el contrato. Clientes actualizados usan la versión del desglose para evitar pérdida de cambios.
- **Despliegue protegido**: una bandera de configuración separa lectura, generación y autoridad de cálculo. La migración no activa por sí sola el nuevo motor; las discrepancias durante validación se registran sin modificar notas publicadas, y retirar la bandera no requiere borrar datos.

## Artefactos de diseño

- [Investigación y decisiones](./research.md)
- [Modelo de datos](./data-model.md)
- [Contrato REST](./contracts/calificacion-explicable.openapi.yaml)
- [Guía de validación](./quickstart.md)
