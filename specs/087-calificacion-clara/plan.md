# Plan: revisión de calificaciones clara y compacta

**Rama**: `codex/087-calificacion-clara` | **Fecha**: 2026-10-06 | **Spec**: [spec.md](./spec.md) | **Issue**: #180

**Estado**: alcance y plan aprobados por el usuario el 2026-10-06; revisión de checklist pendiente antes de implementar.

## Resumen

Pulir el interior del detalle docente existente: una cabecera de nota y estado, cálculo resumido, un bloque de avisos comprensibles y secciones progresivas. Corregir la contradicción entre alertas generales y ausencia de excepciones individuales. Conservar evidencia, respuestas, criterios, edición por pregunta, reanálisis, historial y controles de guardado actuales. Todo el cambio funcional se limita a presentación frontend; no cambiar backend ni recalificar registros.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18.3; versiones instaladas fijadas por lockfile existente.
**Dependencias**: React Router 7, TanStack Query 5, componentes UI y Tailwind existentes. Sin paquetes nuevos ni llamadas adicionales a LLM.
**Persistencia**: ninguna nueva. Leer `CalificacionDetalle`, `GradeBreakdownData`, fórmula, timeline y resultado existentes. Abrir detalles no hace escrituras.
**Pruebas**: Vitest/Testing Library, Playwright mock, accesibilidad y regresión visual existentes; CI obligatorio del repositorio.
**Plataforma objetivo**: navegador móvil primero; cinco tamaños de FR-007, claro/oscuro y humo Chromium/WebKit de foco y scroll.
**Rendimiento y escala**: procesamiento lineal del desglose ya cargado, sin consultas por pregunta ni montar evidencia pesada hasta abrirla. Cada detalle principal en una acción, editor por pregunta en dos; sin alterar tiempos de inferencia ni afirmar mejoras de velocidad del modelo.

## Verificación de la constitución

- Separación de roles: conservar `canGrade`, `canPublish`, permisos, rutas y autorización de servidor; `GradeBreakdown` compartido no cambia su modo estudiante. Probar lector sin permiso de edición.
- Integridad y trazabilidad: no modificar fórmula, bloqueo, notas, resultado o evidencia; conserva versión y conflictos al guardar. Los motivos originales siguen consultables, incluso desconocidos.
- Asincronía e idempotencia: mantener jobs, polling, carga y reintentos; ninguna operación asíncrona nueva ni reanálisis al consultar.
- Datos y secretos: fixtures sintéticas locales; nada de alumnos reales, secretos o trazas sensibles en documentación/capturas. Sin migración ni consulta productiva durante el diseño.
- Accesibilidad: un propietario de scroll de página, controles de 44 px, foco administrado, títulos y estados accesibles; ninguna barra alta fija tapando contenido.
- Gobernanza y pruebas: issue #180, `spec-approved` y `plan-approved` registrados. Checklist, Tasks y Analyze antes de Implement, Converge y PR con CI verde. No push a main ni despliegue implícito.

Resultado de revisión inicial y posterior al diseño: compatible con los ocho principios; sin excepciones. La compatibilidad de diseño no certifica pruebas ni implementación.

## Estructura del proyecto

- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: integrar resumen, avisos y acciones, reutilizando callbacks y protección de borradores.
- `frontend/src/modules/calificaciones/review-triage/buildReviewTriage.ts`: catálogo determinista de mensajes de presentación; conservar clasificación y motivos originales.
- `frontend/src/modules/calificaciones/review-triage/ReviewTriagePanel.tsx`: distinguir avisos generales y respuestas, eliminar texto contradictorio y tarjetas de cero redundantes en modo compacto.
- `frontend/src/modules/calificaciones/gradePresentation.ts`: reutilizar resolución de nota/procesamiento; ampliar presentación de estado solo si hace falta y con pruebas del comportamiento actual.
- `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx`: cambios únicamente bajo `compactTeacher` si hacen falta; edición y vista estudiante preservadas. `GradeFormula` compartido sigue disponible en detalle.
- Pruebas existentes: `gradePresentation.test.ts`, `CalificacionesWorkspace.mobile.test.tsx`, `review-triage/*.test.*`, `components/GradeBreakdown.test.tsx` y suites E2E de revisión/edición. Reutilizar archivos, no crear módulos redundantes.
- Especificación canónica 008, índice, inventario y documentación 087: actualizar trazabilidad al implementar, sin reasignar endpoints o tablas.

## Decisiones y complejidad

### 1. Mensajes y alertas

Reutilizar el constructor del triage para proyectar motivos conocidos con título, explicación y destino de revisión. Mantener `globalBlockers` compatible; añadir datos de presentación solo si necesarios sin cambiar la clasificación de respuestas. «Sin alertas individuales» no equivale a «correctas» ni «publicable».

Motivos a cubrir: diferencia global/suma; retroalimentación incompatible; evidencia/componentes pendientes; cobertura incompleta/inconsistente; componentes duplicados; petición del verificador. No deducir un puntaje correcto ni una pregunta concreta a partir de un aviso global. Motivo desconocido: «Hay un aviso que necesita revisión», acción para comprobar la evaluación y detalle original bajo demanda.

Consolidar los avisos de triage, clave incompleta, revisión manual y alertas A/B en un bloque visible cuando sean pertinentes. No depender de que exista desglose: banderas `requiere_revision_docente`, `arbiter_reason=verifier_requested` y revisión requerida sin texto también producen aviso prudente. No borrar motivos distintos ni añadir coincidencias débiles que los confundan. Fuentes duplicadas exactas se agrupan; un aviso de tipo desconocido no se omite.

### 2. Distribución y acciones

Cabecera con nombre, evaluación, nota y un único estado actual. Debajo, una línea breve del cálculo y bloque de revisión con acción. Evitar avisos genéricos como «No se asignó cero» cuando existe una nota y no explicar una discrepancia mediante frases tranquilizadoras.

Reutilizar detalles existentes: evidencia; respuestas y puntajes; criterios si registrados; retroalimentación; cálculo e historial. No obligar a recorrer pestañas adicionales para confirmar. Apertura de un aviso individual usa el callback existente a su pregunta; aviso general lleva al desglose o evidencia pertinente, sin seleccionar preguntas arbitrarias.

Conservar barra de acciones compacta actual solo si no tapa controles; no añadir una segunda barra fija. Verificar el espaciado inferior y safe-area con teclado móvil. Editor inline sigue junto a la pregunta y conserva versión, confirmación de descarte y error 409.

### 3. Nota y cálculo

La cifra visible procede de la resolución existente, no de recomputar en frontend. Fórmula y ajustes provienen del registro; detalle completo bajo «Ver cálculo». Si existe una nota docente distinta, mostrar su procedencia y acceso a historial sin afirmar que corresponde al cálculo original. Sin fórmula o explicación: reconocer ausencia, nunca rellenarla con IA.

Estado confirmado/publicado prevalece en la cabecera; avisos antiguos se identifican como «Avisos del análisis original» en detalle sin reabrir la nota ni quitar bloqueos de backend. No interpretar un aviso histórico como incidencia resuelta si no hay decisión registrada.

### 4. Validación y entrega

Primero regresión del caso de la captura y pruebas de mensajes. Luego integración de estado, edición y controles; por último pruebas reales de DOM, scroll, foco y capturas en cinco tamaños/dos temas. Adaptar selectores obsoletos al contrato aprobado, no eliminarlos para obtener verde. Revisar visualmente las capturas antes de actualizar referencias.

La validación humana SC-005 queda pendiente en piloto con tres docentes y no se marca completa por CI. Los demás criterios deben cerrarse antes de solicitar fusión. El PR enlaza #180, solicita aprobaciones necesarias y producción solo se actualiza tras autorización de fusión y CI verde.

Las suites visual/accesibilidad existentes contienen selectores anteriores y umbral táctil de 40 px. Se actualizarán a contrato vigente y 44 px, incorporando ambos temas, controles finales y scroll real. Una apertura puede mantener telemetría existente, pero nunca solicitudes de mutación de nota/confirmación/publicación.

Alternativas rechazadas: rediseño global o rutas nuevas, generar mensajes con otro LLM, modificar bloqueos backend, ocultar avisos para limpiar la vista y sustituir estado de revisión por confianza numérica. Son innecesarias o reducen trazabilidad.
