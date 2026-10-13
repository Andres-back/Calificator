# Plan: evaluación en dos pantallas

**Rama**: `codex/096-evaluacion-dos-pantallas` | **Fecha**: 2026-10-13 | **Spec**: [spec.md](./spec.md) | **Issue**: [#202](https://github.com/Andres-back/Calificator/issues/202)

**Estado**: alcance y plan aprobados por «aprove» el 2026-10-13; revisión de lista autorizada y continuación si está completa. Sin fusión ni despliegue autorizados. Base: main `9bc445589ce1ee98fe250a09583a15456368651b` (PR #201).

## Resumen

Evolucionar el asistente actual sin otro generador ni cambios de backend: opciones de etapas 1–4 en Preparar; generación exitosa abre Revisar y guardado desde ahí elimina la confirmación repetitiva 6. Reutilizar editores, documentos, contratos y permisos. Una entrega completa, sin desplegar etapas incompletas durante demo.

## Contexto técnico

**Lenguajes/versiones**: React/TypeScript, Tailwind y React Query según lockfile vigente; ninguna actualización.
**Dependencias**: GenerationWizard/modelo, PasosGuia, QuestionCard/RubricEditor, DBASelector, editor de criterios, digitalizador, Modal y documentos actuales; ninguna nueva.
**Persistencia**: API/tablas intactas; conservar borradores locales v7 por usuario/materia, TTL de siete días y reselección de archivo. Normalizar etapas anteriores sin eliminar contenido.
**Pruebas**: Vitest/Testing Library y Playwright actuales con contratos sintéticos; regresiones de permisos, guardado diferencial, borradores y responsive. CI completo antes de merge; sin alumnos reales ni inferencias LLM.
**Plataforma objetivo**: web/PWA Android/iPhone y computador; 360/390/768/1280/1440, claro/oscuro, teclado/foco. Chromium/WebKit no equivalen a certificación física.
**Rendimiento y escala**: 3–30 preguntas, una solicitud por generación explícita; no consultas PDF por pulsación, polling nuevo ni IA por navegar o desplegar controles.

## Verificación de la constitución

- Separación de roles: mantener guardas de creación/edición/materia/documentos/publicación; selector común no concede permisos. Pruebas de estudiante y permisos parciales.
- Integridad y trazabilidad: conservar respuestas/origen/confianza/alineación, puntajes y pesos; PATCH diferencial y expected_updated_at actuales. Guardar no publica, recalifica ni modifica notas/evidencias.
- Asincronía e idempotencia: preservar bloqueadores de doble clic, espera, error y reintento explícito; no regenerar al volver/desplegar. No rediseñar jobs en este cambio visual.
- Datos y secretos: sin migraciones; borradores aislados y recuperables; almacenamiento denegado permite trabajo en memoria. Pruebas/capturas sintéticas, sin archivos binarios o secretos adicionales.
- Accesibilidad: dos etapas compactas, resumen y errores visibles; foco a controles plegados que fallan; un scroll principal y safe-area/scroll-lock actuales, sin barras que tapen campos.
- Proveedores intercambiables: transporte y configuración vigentes; no cambiar modelos, prompts de calificación/digitalización ni embeddings.
- Gobernanza y pruebas: aprobación de este plan antes de Checklist, Tasks, Analyze y código; Converge y CI al cerrar. Autorización independiente antes de fusionar/desplegar.
- Main/demo protegidas: rama desde main saludable; sin push directo, reinicio de producción ni cambios reales.

Reevaluación tras diseño: sin excepciones ni hooks. Sin elecciones nuevas de tecnología o incógnitas que requieran agentes; investigación local de reutilización.

## Estructura del proyecto

- `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx`: dos pantallas, Personalizar, ayuda a petición y handlers actuales. Extraer solo secciones de presentación cohesionadas si hace falta, sin duplicar estado.
- `frontend/src/modules/evaluaciones/components/generationWizardModel.ts`: defaults nuevos, reparto de cantidad, normalización de etapas/borradores y validación agregada; preservar serialización de respuestas/v7.
- `frontend/src/modules/evaluaciones/components/PasosGuia.tsx`: indicador Preparar/Revisar; comprobar consumidores antes de retirar etiquetas.
- `frontend/src/modules/evaluaciones/components/EvaluationCreateMenu.tsx`: selector pequeño de métodos/callbacks, sin lógica de transporte. `MateriaEvaluaciones.tsx` y `EvaluacionesPage.tsx` mantienen sus diálogos manual/digitalización/IA, sin duplicar formularios ni tocar acciones 095.
- Pruebas de modelo/asistente/accesos, criterios y visor; extender E2E de creación/responsive existentes. Documentación propietaria 005, índice/baseline e inventario al entregar. Backend sin cambios previstos.

## Decisiones y complejidad

1. Dos pantallas, un único estado. Preparar agrega validaciones 1–4; Revisar conserva validaciones 5. Se elimina el resumen obligatorio 6, no los controles. Elegir método es un menú, no una tercera etapa.
2. Tema usa descripción/tema vigente; nombre sugerido solo en creación nueva no personalizada. Conservar nombres recuperados/históricos. Intención de nombre como metadato local opcional compatible, sin campo backend nuevo.
3. Defaults visibles/reversibles: cinco preguntas (tres de selección y dos abiertas), papel y escala 5; nunca aplicarlos al recuperar/editar. Presets 5/10 reparten enteros proporcionalmente entre tipos activos; Personalizar conserva contadores 3–30. Modalidad mixta permanece disponible. Resumen muestra reparto/criterios/modalidad.
4. Personalizar agrupa opciones; un error abre su sección y dirige foco. Alertas relevantes/selecciones siguen visibles al plegar. Xali cerrado hasta Necesito ayuda y aplicación confirmada vigente.
5. Revisión legible con preguntas y edición desplegable; Cómo se calificará agrupa criterios/rúbrica. Una columna en celular, ancho aprovechado en computador y scroll común. PDF/Word final se abre después de guardar; no mostrar un documento del servidor como si reflejara ediciones locales ni pedir PDF por pulsación.
6. Generar ya crea borrador mediante POST actual y conserva su ID. Guardar borrador hace PATCH validado, nunca publicar. Edición histórica usa Guardar cambios y payload diferencial/versionado. Guardado de criterios reutiliza su acción explícita sin reenviar preguntas innecesarias.
7. No regenerar al volver. Tras generar, cantidad/tipos se ajustan con el editor de preguntas; preparación conserva contenido. No añadir regeneración destructiva ni crear otro examen silenciosamente.
8. Compatibilidad: etapas anteriores 1–4 → Preparar; 5–6 con ID/preguntas → Revisar. Contenido incompleto se conserva para corregir. Mantener claves v7/TTL/reselección; validar identidad/permiso/versionado del ID restaurado con API actual sin sobrescribir ediciones locales. 403/404/conflicto no se resuelven con sobrescritura. Storage denegado no bloquea el editor.
9. Menú común IA/foto-PDF/manual según permisos. Acceso general requiere materia autorizada antes de foto/PDF. Procesos internos de extracción/manual, rutas y respuestas no se rediseñan.
10. Pruebas focalizadas primero, CI completo al cerrar. No consumir inferencias para distribución visual ni modificar registros reales. Checklist/tareas después de aprobar este plan.

Diseño: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md).
