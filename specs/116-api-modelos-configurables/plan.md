# Plan: APIs y modelos configurables

**Rama**: `codex/116-api-modelos-configurables` | **Fecha**: 2026-10-22 | **Spec**: [spec.md](./spec.md)

## Resumen

Implementar el alcance aprobado en el chat: conexiones seguras, catálogo actualizable, perfiles explícitos de Chat Completions/Responses/Messages, pruebas sintéticas y rutas realmente consumidas. Entregar por PR/CI y comprobar producción. El usuario pidió continuar hasta la reparación en producción; no se interpreta como permiso para omitir CI o modificar calificaciones.

La admisión urgente de fotos se entrega primero y de forma independiente en Spec 117 / PR #245. Este plan parte de main con ese hotfix integrado y no atribuye su error de base de datos a la API de IA.

1. Perfil no secreto por modelo (formato, ruta relativa opcional, razonamiento y capacidades) y secretos cifrados versionados para conexiones compatibles adicionales. Migración aditiva, IDs y contratos anteriores conservados. Una rotación no envía una clave nueva a un destino antiguo capturado en un trabajo; una revisión revocada falla de forma recuperable.
2. Compartir construcción/normalización de formatos, imágenes, usage y errores. El cliente conserva reintentos/telemetría. URL y perfil administrativos se capturan en snapshots nuevos.
3. Conectar perfiles a calificación, extracción y texto; preservar Ollama, imágenes y embeddings. APIs adicionales usan IDs `api_...` y secreto institucional independiente, sin credenciales docentes nuevas.
4. Descubrir catálogo completo, rechazar paginación truncada, conservar ante fallo; edición de formato/capacidad. Capacidad desconocida no se inventa; visión requiere prueba sintética.
5. Preflight sintético con comprobante verificable por el servidor, ligado a URL/modelo/perfil/revisión de credencial; cambios de formato/capacidad invalidan prueba. No confiar en una marca de visión enviada por el navegador. Validar dependencias cambiadas sin bloquear por rutas históricas ajenas; credenciales resueltas en servidor.
6. UI: conexión compatible, formato de modelo, prueba, errores de publicación por función y evaluador principal en resumen. Borrador/versión conservados, móvil/escritorio.
7. CI y base aislada antes de despliegue; prueba sintética y publicación atómica de las cinco rutas aprobadas tras la comparación: extracción y estructuración de digitalización con Luna y respaldo GLM; valoración con Luna; verificación con GLM; revisión adicional con Luna. Mantener intactas las condiciones de activación de verificación/arbitraje y la consolidación determinista. No cambiar Privacy, extracción de respuestas del alumno, imágenes, embeddings ni otras funciones. Snapshot previo para reversión y comprobación de commit/configuración backend/worker. La activación no se da por hecha al actualizar estos documentos.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 y TypeScript fijados en el proyecto.
**Dependencias**: FastAPI/Pydantic, SQLAlchemy/Alembic, httpx, React/Query existentes; sin SDK nuevo.
**Persistencia**: PostgreSQL, JSONB de perfil y tabla de secretos cifrados; caché Redis existente.
**Pruebas**: pytest unit/integración, Vitest, TypeScript, ESLint, Playwright, contenedores y gobernanza.
**Plataforma objetivo**: Linux y navegador/PWA desde 360 px.
**Rendimiento y escala**: no aumentar llamadas normales; preflight de una llamada sin reintentos; presupuestos de jobs existentes.

## Verificación de la constitución

- Roles: CRUD/preflight con `admin_ai.manage` y pruebas de denegación.
- Integridad: notas/evidencia/snapshots previos y fórmula intactos.
- Asincronía: jobs/recuperación sin duplicados; salidas incompletas no publicadas.
- Secretos: cifrado, errores seguros, HTTPS público sin redirects; excepción local solo de servicios existentes.
- Accesibilidad: 360/1366 px, etiquetas, foco y errores claros.
- Gobernanza: Spec 116 separada de 034/115, issue, tareas/regresión/PR/CI. Usuario aprobó el plan general en el chat y pidió completarlo en producción; sin excepción a controles.

## Estructura del proyecto

`backend/app/services/{ai_api_transport,ai_api_connections,ai_model_discovery,ai_configuration_resolver,ai_config_service,llm_router,vision_extractor}.py`; agentes/orquestador y módulo admin; migración y pruebas. `frontend/src/modules/admin/{api,AdminAIConfigPage,ai/}` y pruebas. Sin reestructuración general.

## Decisiones y complejidad

Actualización de alcance aprobada en el chat el 22-10-2026: la elección ya no está acotada solo al evaluador principal. «Respaldo» de digitalización no equivale a segundo evaluador y «confirmador» no equivale a una tercera llamada obligatoria. La publicación reutiliza el control de versiones administrativo y conserva las notas y trabajos previos. El perfil Responses de Luna debe funcionar en agentes, extracción y estructuración antes de ofrecerlo como selección ejecutable desde el panel.

Auditoría solo lectura: 32 calificaciones exitosas, ledger sin fallos recientes, servicios saludables. No declarar causa universal de caída sin evidencia. Sí están demostrados huecos de protocolo, URL efectiva y catálogo. No confundir catálogo con disponibilidad ni preflight con calidad pedagógica. El soporte genérico se limita a formatos compatibles, no APIs arbitrarias.
