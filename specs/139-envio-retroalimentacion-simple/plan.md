# Plan: enlaces guardados, visibles y fáciles de copiar

**Rama**: `codex/139-envio-retroalimentacion-simple` | **Fecha**: 2026-10-31 | **Spec**: [spec.md](./spec.md) | **Issue**: #297

**Estado**: diseño y alcance aprobados mediante «aprobado»; implementación y verificación local completas, preparado para PR/CI. Sin autorización de fusión o despliegue. Base inspeccionada: main `5e32cebd153b0775eb18ad42a5eac062f3c53f44`.

## Resumen

El objetivo no es generar más enlaces, sino encontrar y copiar el que ya existe. Dentro de la retroalimentación individual habrá siempre un bloque «Enlace para el estudiante»:

| Situación | Qué ve el profesor | Acción principal |
| --- | --- | --- |
| Consulta pendiente | Buscando su enlace… | Esperar sin crear |
| No existe y el contenido es apto | Aún no has generado su enlace | Generar enlace |
| Existe y está vigente | Enlace disponible · vence [fecha] | Copiar enlace |
| Cambió lo compartido | Necesita reenvío | Revisar y aprobar |
| Vencido o desactivado | Vencido / Desactivado | Decisión explícita en opciones |
| No se pudo consultar/recuperar | No pudimos consultar/recuperar su enlace | Reintentar |

Recorrido nuevo: Revisar → confirmar «Generar enlaces» una sola vez → Copiar y compartir. Recorrido de vuelta: abrir estudiante → «Copiar enlace». El enlace completo se puede seleccionar manualmente; no se abre otra pantalla para encontrarlo.

## Contexto técnico

**Lenguajes/versiones**: TypeScript/React18, React Router7 y TanStack Query5 del package.json existente; Python/FastAPI/SQLAlchemy del backend actual. No actualización de librerías.
**Dependencias**: ninguna nueva para el incremento. Canales externos solo al hacer clic; no contactos ni automatización de mensajes.
**Persistencia**: reutilizar FeedbackAccess, FeedbackPublication, credencial cifrada y operaciones/recibos existentes. Sin nuevas tablas, migraciones, rotación de claves, enlaces en almacenamiento persistente del navegador ni configuración de producción.
**Pruebas**: Vitest/RTL, Playwright Chromium/WebKit y pruebas backend en base aislada, con fixtures sintéticos. Mocks de portapapeles, compartir y WhatsApp; sin IA ni datos reales.
**Plataforma objetivo**: 360/384/390/768/1440 px, claro/oscuro, texto200 %, teclado y controles44px. Emulación no sustituye validación física.
**Rendimiento y escala**: cargar metadatos de accesos por evaluación con la paginación existente; recuperar URLs por lotes de hasta100, no una llamada por fila. No añadir polling. Al recuperar foco/volver, invalidar y reconciliar sin emitir accesos ni operaciones académicas.

## Verificación de la constitución

- I, roles: permisos efectivos actuales, propiedad de evaluación y autorización del servidor; no elevar `grading.read` a publicar/copiar. Descartar respuestas de otra cuenta/contexto.
- II, integridad: abrir/volver/copiar no confirman ni publican notas. La confirmación compuesta sigue siendo expresa, conserva ajustes y no autoriza un detalle dudoso al aprobar solo resumen.
- III, recuperación: mismos request_id/manifiestos de Spec135; estados de error separados de ausencia. Guardia del servidor contra crear otro acceso por una reentrada o carrera de dispositivos.
- IV, datos: reutilizar tablas/credenciales; conservar enlaces existentes e historial, sin backfill ni migración. Campos privados adicionales compatibles y opcionales, descritos en contrato.
- V, accesibilidad: acciones cercanas y un scroller útil, nombres largos, foco, teclado y zonas seguras; estado con texto, no solo color.
- VI, IA: cero cambios de proveedor, modelos, cuotas o nuevas inferencias.
- VII, gobernanza: aprobación e issue297 registrados; lista de requisitos existente16/16. Tasks/Analyze, maqueta, código, pruebas y Converge preceden al PR. No presentar esos pasos como ejecutados antes de realizarlos.
- VIII, producción: PR y CI íntegros antes de fusión autorizada; nada de despliegue manual. Reversión de código compatible, no restauración de notas.

## Estructura del proyecto

```text
frontend/src/modules/feedback_sharing/
  ShareFeedbackDialog.tsx        # bloque individual y lista, sin copia escondida
  FeedbackSharePanel.tsx         # generación explícita y copia/reentrada común
  FeedbackLinkActions.tsx        # mismo control reutilizable, no tercer circuito
  FeedbackAccessList.tsx         # opciones avanzadas, revocar/reemplazar separados
  FeedbackStudentList.tsx        # acción de copia por fila
  FeedbackSelectionBar.tsx       # generación/copia del conjunto junto al resultado
  feedbackPreparation.ts         # clasificación y recuperación, sin credenciales
  api.ts + tests                # accesos existentes y opciones privadas compatibles
  deliveryAvailability.ts + tests # estado puro: consulta ≠ ausencia ≠ autorización
frontend/e2e/feedback-link-reentry.spec.ts
frontend/e2e/feedback-share-review.spec.ts
frontend/e2e/feedback-workspace-responsive.spec.ts
backend/app/modules/feedback_sharing/{schemas,service,router,link_service}.py
backend/tests/                  # regresiones en las suites de feedback existentes
specs/135-retroalimentacion-entrega-simple/ # contrato dueño se actualizará al aprobar
specs/139-envio-retroalimentacion-simple/
```

No copiar el workspace ni abrir un segundo modal de compartir. Reutilizar la navegación y los guards de Spec138.

## Decisiones y complejidad

1. **Fuente de verdad**: consultar accesos guardados al abrir estudiante/grupo y al regresar con foco. `prepared` es caché de presentación, no prueba de existencia. El manifiesto temporal recupera operaciones inciertas, no almacena el enlace.
2. **Disponibilidad separada**: estados loading/error/loaded; solo loaded completo y sin accesos significa ausencia. `copy_available` es una pista, no prueba de descifrado; conservar códigos por destinatario y explicar copias antiguas/fallos sin fingir caducidad.
3. **Recuperar antes de copiar**: recuperar credenciales privadas autorizadas sin emitir; URL solo en memoria del contexto. No escribir automáticamente al portapapeles. Al pulsar Copiar se reconfirma acceso vigente en servidor antes de anunciar éxito; fallback manual sin regenerar.
4. **Varios enlaces**: si hay uno único vigente recuperable, usarlo. Si hay varios, presentarlos para elección explícita con vigencias, sin crear otro ni tomar el primero de una respuesta arbitraria. La selección puede mantenerse en memoria, siempre validada al volver.
5. **Carrera entre dispositivos**: el servidor ya bloquea la calificación al emitir, pero hoy deduplica por request_id. Añadir una opción privada compatible `solo_si_falta` para el nuevo flujo: dentro del bloqueo, reconsultar accesos autorizados; devolver el único vigente compatible o un conflicto accionable, nunca crear otro por usar un request_id nuevo. Los llamadores antiguos mantienen su contrato; la recuperación de request_id existente tiene precedencia.
6. **Suspensión**: nueva opción privada compatible `mantener_vencimiento` en la reaprobación explícita. Solo aplica al acceso activo, aún vigente, suspendido por cambio de contenido y no desactivado voluntariamente. Cambia la publicación autorizada, no token, vencimiento, generación de credencial ni cuota. Casos cerrados permanecen en las decisiones explícitas actuales.
7. **Canales**: mensaje individual sin nota. Copiar lista produce material privado para reparto, no publicación en grupo. Abrir WhatsApp, cancelar compartir o lanzar impresión no prueba envío/lectura; no introducir tabla de «enviados» ni tracking.

Las dos opciones backend son guardias localizadas, no una nueva API pública ni un cambio de modelos. Deben probarse con y sin opción, versiones concurrentes y consumidores antiguos.

## Reducción y validación visual

- Quitar copia escondida en «Opciones de sus enlaces» de la lectura principal; el bloque permanente reutiliza la copia existente. Allí quedan únicamente decisiones de revocar/reemplazar/gestionar.
- Sustituir «preparar/recuperar solicitud/enlaces guardados» por generar/copiar/volver a intentar. Las advertencias concretas y conflictos no se eliminan.
- No obligar a confirmar/generar para volver a copiar. Barra fija con selección y resultado en el mismo sitio; revisión en contexto conserva posición y borradores.
- Maqueta384/1440 previa a implementación, después capturas reales claro/oscuro de enlace listo al volver, error de recuperación y fallo parcial. Regresiones de selección, teclado, scroll, ajustes y permisos obligatorias.

## Secuencia propuesta y condiciones de paso

1. Aprobación de esta revisión, issue y tareas/análisis. Sin cambios productivos mientras solo se revisa documentación.
2. Maqueta y pruebas que fallen para generar → salir → volver → copiar mismo enlace, con datos locales vacíos; documentar los fallos reproducidos sin atribuir el caso real a una causa aún no probada.
3. Primero recuperación/visibilidad individual y estados; después lista y confirmación común; integrar guardias backend compatibles y canales sin contactos.
4. Pruebas completas de Spec135/138, nuevos casos de reentrada y concurrencia; tipos/lint/build/auditorías, inventario, gobernanza y revisión visual. CI remoto no se sustituye por pruebas locales.
5. PR para revisión y fusión solo con autorización y todo CI verde. Verificar despliegue automático aparte; no afirmar arreglo de producción antes de comprobarlo.

## Propuestas conservadas para después

30 días por defecto configurable, fin de periodo, extensión, QR en fichas, «Ver como estudiante» sin contar apertura y métricas de apertura no desaparecen de la propuesta original. Requieren una entrega/decisión posterior: duración y extensión cambian política backend; QR añade acceso al papel; aperturas requieren política de privacidad y no identifican personas. No deben retrasar ni confundirse con arreglar el enlace que ya existe.

**Constitution Check posterior al diseño**: sin excepciones. No hay schema nuevo ni ruptura de contratos. Aprobación y validación son condiciones futuras, no controles omitidos ni resultados acreditados.
