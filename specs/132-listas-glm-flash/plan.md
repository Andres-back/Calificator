# Plan: listas con GLM Flash y errores comprensibles

**Rama**: `codex/132-listas-glm-flash` | **Fecha**: 2026-10-28 | **Spec**: [spec.md](spec.md) | **Issue**: #277

## Resumen

Hotfix independiente desde main: quitar el modelo retirado por omisión del consumidor061; enlazar las credenciales capturadas a los perfiles de transporte116; distinguir ausencia de nombres, respuesta inválida y fallo de servicio. Preparar la publicación operativa GLM solo para `importacion_estudiantes.extraccion`, después de integrar el código. No cambiar el escáner131, la calificación ni la retención de fotos.

## Contexto técnico

**Lenguajes/versiones**: Python3.11/FastAPI/SQLAlchemy; React18/TypeScript/TanStackQuery.
**Dependencias**: cliente, resolvedor y `resolve_api_credential` existentes; ninguna nueva.

Mantenimiento necesario para CI: `fpdf2`2.8.2→2.8.8, actualización autorizada expresamente por el usuario en la entrega131 y todavía ausente en main. Se traslada solo el pin, sin código del escáner; repetir regresiones PDF/exportación. La imagen local de pruebas ya contiene2.8.8 y con ella pasan1542 unitarias.
**Persistencia**: `resultado_json.codigo` del lote, sin migración; conserva `LoteRead`.
**Pruebas**: pytest con transporte simulado, PostgreSQL aislado, Vitest y E2E a360/1440; CI/gobernanza.
**Plataforma objetivo**: navegador celular y escritorio, worker Celery.
**Rendimiento y escala**: dos intentos de transporte como máximo existentes; rechazo permanente no dispara otra variante. Sin nuevas llamadas reales.

## Verificación de la constitución

- I: no cambiar ownership ni permisos; regresiones de acceso.
- II: no tocar notas ni evidencias académicas.
- III: conservar worker, claim, confirmación e idempotencia.
- IV: no cambiar esquema ni ampliar retención privada.
- V: mensajes cerrados y responsivos, sin excepciones técnicas.
- VI: modelo capturado; credenciales ligadas a conexión, fallo cerrado sin otra clave.
- VII: hotfix con issue aprobado, requisitos, tareas y regresión.
- VIII: PR/CI; no fusión ni despliegue manual. Postdiseño: sin excepciones.

## Estructura del proyecto

- `backend/app/modules/importacion_estudiantes/vision_service.py`: selección, credenciales, errores seguros.
- `backend/app/workers/tasks_roster_import.py`: persistir categoría sin cambiar limpieza.
- `frontend/src/modules/materias/{RosterImportDialog.tsx,rosterImportErrors.ts}`: mensajes por código y neutral legacy.
- Pruebas junto al consumidor, diálogo y recorrido existente.
- `specs/061-importar-estudiantes-lista/`: propietario funcional;132 registra la corrección.

## Decisiones y complejidad

No publicar GLM sobre el binario anterior: el perfil existe pero el importador no carga su credencial. Reparar primero el contrato. La selección operativa vive en configuración central, no en un `if` por modelo ni una migración que sobrescriba elecciones. Principal/respaldo se cargan por revisión y origen; si falta clave no se sustituye. Se conserva revisión docente y política temporal. Presupuesto de listas grandes fuera del hotfix; dobles no demuestran precisión OCR.

No hay `.specify/extensions.yml`, hooks ni incógnitas de diseño. Las interfaces se contrastan con061/116 y código existente, sin investigación externa.
