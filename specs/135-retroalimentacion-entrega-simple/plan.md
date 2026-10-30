# Plan: retroalimentación clara y entrega en una confirmación

**Rama**: `codex/135-retroalimentacion-entrega-simple` | **Fecha**: 2026-10-29 | **Spec**: [spec.md](./spec.md) | **Issue**: #287

## Resumen

Diseño aprobado en la conversación: normalización conservadora compartida del mensaje, operación docente compuesta y explícita para aprobar/preparar, copia aparte, presentación por bloques y motivos existentes. No cambia evaluación IA ni crea APIs/migraciones nuevas. Preparar enlaces se orquesta en cliente sobre los contratos transaccionales/idempotentes actuales; cada etapa conserva su recibo y nunca se oculta un resultado incierto.

## Contexto técnico

**Lenguajes/versiones**: Python3.11+, FastAPI/SQLAlchemy2; TypeScript/React18, Vite8, Tailwind, Zustand y React Query existentes.
**Dependencias**: sin incorporaciones. Lucide para jerarquía y motivos PNG curados de Specs122/123. No GSAP, generación nueva ni nuevas llamadas IA.
**Persistencia**: tablas actuales de revisiones, publicaciones, lotes y accesos; manifiestos de recuperación actuales en sessionStorage sin URL/token/fotografía. Las notas se aceptan solo ante la confirmación expresa; originales del análisis y evidencia no se reescriben.
**Pruebas**: pytest unitario/contratos aislados, Vitest, TypeScript/lint/build, Playwright Chromium/WebKit y auditorías/inventario/gobernanza vigentes.
**Objetivo**: PC y celular 360/390/768/1440, claro/oscuro, texto ampliado, foco/teclado/zona segura. Emulación no se presenta como prueba física.
**Rendimiento/escala**: 40 estudiantes en prueba; lotes secuenciales de25 aprobaciones y100 consultas/accesos como hoy. Una intención por etapa, sin peticiones en paralelo masivas. Imágenes pequeñas/lazy y ningún modelo consultado por decorar/abrir/copiar.

## Verificación de la constitución

- I Roles: conservar `grading.read`, `grading.grade`, `grading.publish`, titularidad/evaluación y vigencia de cuenta; callbacks tardías no reutilizables.
- II Integridad: decisiones explícitas; preservar notas ajustadas, originales y auditoría. Un resumen no publica el desglose dudoso. Guardas de coherencia/utilidad intactas.
- III Asincronía: componer aprobar→consultar proyección vigente→emitir faltantes, con recibos y solicitudes estables; recuperación antes de repetir escritura incierta. Abrir no muta.
- IV Evolución de datos: sin esquema nuevo. No borrar/alterar accesos cerrados ni convertirlos automáticamente en nuevos.
- V Accesibilidad: quitar altura fija anidada integrada; estados/acciones visibles y objetivos≥44px, ambos temas y teclado.
- VI Portabilidad/secretos: no cambiar proveedores, credenciales, modelos ni transportar contexto adicional a IA.
- VII/VIII Gobernanza: #287 y alcance/diseño aprobados «SI ADELANTE». Specify→Plan→Tasks→Analyze→Implement→Converge, pruebas y PR; CI antes de eventual autorización de fusión. No producción en este trabajo.

## Estructura del proyecto

- `backend/app/modules/feedback_sharing/{batch_policy,service,projection,quality_policy}.py`: reutilizar regla pura de envoltorio conocido en todas las candidatas; no ciclos entre política/proyección y no cambiar huellas de contenido sano.
- `frontend/src/modules/feedback_sharing/`: estado de preparación compuesta, `FeedbackSharePanel`, diálogo/espacio integrado, formulario de revisión y mensajes presentados; contratos existentes en `api.ts` y recuperación de `feedbackPreparation.ts`.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: separar operación pendiente de edición real al integrar retroalimentación; cabecera/acciones compactas sin alterar edición de nota de134.
- `frontend/src/modules/feedback_sharing/{FeedbackMessage,feedbackSections,FeedbackPrintSheet}.tsx/ts` y consumidor público: presentación común conservando impresión y mensajes antiguos; motivos locales curados.
- Tests unitarios/de contrato en `backend/tests/`, pruebas de componentes junto a módulos y `frontend/e2e/feedback-*.spec.ts`; índices/inventario/validación de135.

## Decisiones y complejidad

1. **Mensaje común**: extraer/compartir el separador del prefijo conocido. No sustituir texto editado ni aplicar un borrado genérico de palabras como «provisional». La aprobación muestra exactamente qué mensaje autoriza.
2. **Operación compuesta, no transacción ficticia**: usar `aceptar-publicar`, volver a consultar fuentes y crear accesos mediante los contratos existentes. Sin nuevo endpoint. La confirmación incluye notas/mensajes, duración y evidencia. Si una etapa falla, se informa lo que sí quedó guardado; un retry incierto conserva su request_id y parámetros.
3. **Enlaces existentes**: reutilizar solo los activos y coherentes. Los cerrados se mantienen aparte; no usar la composición como renovación. Copiar nunca escribe ni constituye aprobación.
4. **Estados distintos**: edición, operación y recuperación independientes. Proteger la operación en curso sin llamarla «Sin guardar»; borradores reales conservan su protección.
5. **Formato conservador**: agrupar etiquetas y fragmentos explícitos en logros documentados/aspectos por mejorar/práctica; no derivar logros de la nota. Conservar íntegro texto sin estructura, contexto de pregunta y orden. No pedir otro LLM para reformatear.
6. **Decoración contenida**: motivos existentes pequeños (máximo64px en pantalla), alt vacío y sin dependencia del puntaje; texto completo ante error. La impresión mantiene opción sin decoración y su paginación actual.
7. **Sin doble viewport**: integración usa el scroller de detalle; modal de grupo conserva su propio viewport y barra de acciones. Conservar foco/selección/recuperación de129.

## Fases y validación

1. Preparar artefactos, revisión de calidad integrada y análisis sin modificaciones de código.
2. RED/GREEN de preparación común y rechazo de incertidumbre desconocida.
3. RED/GREEN de aprobación/preparación compuesta, recuperación, permisos y copia; después integrar estados.
4. RED/GREEN del mensaje, motivos y distribución responsiva con impresiones sin pérdida.
5. Suite aplicable completa, contratos aislados, E2E y comprobación visual de capturas, inventario, Converge y PR. No afirmar entrega en producción por resultados locales.

Post-diseño: sin excepciones constitucionales, dependencias nuevas o aclaraciones materiales pendientes. Aprobación corresponde al alcance presentado; no autoriza omitir guardas de calidad para reducir pasos.
