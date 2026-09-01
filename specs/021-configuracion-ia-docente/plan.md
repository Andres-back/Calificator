# Plan: Configuración de IA global y por docente

**Rama**: codex/021-configuracion-ia-docente | **Fecha**: 2026-08-25 | **Spec**: [spec.md](./spec.md) | **Issue**: #29

**Ampliación aprobada**: 2026-08-30 | **Issue**: #60 | Ollama Cloud institucional/personal y conector local Windows

## Resumen

Completar el panel global para seleccionar proveedor y modelo por capacidad y añadir una configuración personal opcional para docentes. Un nuevo resolvedor central producirá una selección efectiva inmutable y no sensible al crear cada trabajo: preferencia docente válida, configuración institucional y fallback autorizado. La incorporación será compatible con los valores actuales y se activará progresivamente por capacidad para no alterar de golpe el flujo estable de calificación.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11, TypeScript 5.6, React 18
**Dependencias**: FastAPI 0.139, Pydantic 2.10, SQLAlchemy 2.0, Alembic 1.14, cryptography 50, Redis/Celery 5, React Query 5
**Persistencia**: PostgreSQL con migración Alembic; Redis solo para caché invalidable
**Pruebas**: pytest unitario/integración, Vitest, Playwright E2E, accesibilidad y viewport móvil
**Plataforma objetivo**: navegador web 360 px–escritorio, API/worker Docker en VPS Linux
**Rendimiento y escala**: resolución local/caché menor a 100 ms p95 sin contar la prueba externa; tres o más docentes concurrentes con aislamiento; publicación atómica; cero secretos en respuestas o telemetría

## Verificación de la constitución

- Separación de roles: cumple; endpoints globales siguen limitados a admin y los personales solo aceptan al docente propietario. Se añaden pruebas 200/403/404 sin confiar en controles visuales.
- Integridad y trazabilidad: cumple; cada trabajo captura proveedor, modelo, origen, versión y política de fallback sin copiar claves. La decisión docente sobre notas no cambia.
- Asincronía e idempotencia: cumple; la selección se resuelve antes de encolar y el worker consume la instantánea. Guardados usan versión esperada y transacción para evitar mezclas parciales.
- Datos y secretos: cumple; migración compatible, Fernet existente, valores enmascarados y auditoría por presencia/cambio, nunca por contenido. No se envían claves en Celery ni `ai_jobs`.
- Accesibilidad: cumple; modo básico primero, avanzado plegable, estados visibles y objetivo móvil de 360 px.
- Gobernanza y pruebas: cumple; issue #29, rama 021, spec aprobada y matrices de regresión por capacidad antes del PR.

**Reevaluación posterior al diseño**: sin excepciones. Los contratos mantienen la configuración institucional como valor predeterminado, ofrecen reversión y evitan dependencia directa de un modelo concreto.

## Estructura del proyecto

```text
backend/
├── alembic/versions/                 # migración compatible de catálogo, rutas y preferencias
├── app/modules/admin_ai_config/      # contratos/endpoints globales y docentes
├── app/services/                     # resolvedor efectivo, credenciales, routers IA
├── app/modules/jobs/                 # instantánea sanitizada en input_json
├── app/modules/{calificaciones,evaluaciones,presentaciones,herramientas,xali}/
│                                      # adopción progresiva del resolvedor
└── tests/{unit,integration}/          # permisos, secretos, precedencia, snapshots y regresión

frontend/
├── src/modules/admin/                # catálogo y modelo principal/fallback por capacidad
├── src/modules/profesor_ai/          # configuración personal básica/avanzada
├── src/config/{nav,routes}.ts        # acceso docente único y no redundante
└── {src,e2e}/**/*test*               # responsive, accesibilidad y flujos
```

## Decisiones y complejidad

- Un proveedor y un modelo son conceptos separados. `ai_provider_settings` conserva conexión y política; `ai_provider_models` cataloga capacidades; `ai_feature_routing` selecciona modelos concretos.
- Las claves personales se normalizan por proveedor. La tabla existente `profesor_ai_configs` conserva el modo, consentimiento y versión; las columnas heredadas se adaptan durante la transición y quedan documentadas para retiro en esta misma especificación cuando no tengan consumidores.
- No se permiten URLs arbitrarias aportadas por docentes. El administrador controla endpoints y proveedores autorizados para impedir SSRF y configuraciones inalcanzables. Qwen puede aparecer como proveedor autorizado o como modelo de OpenCode; Ollama debe estar accesible desde el servidor.
- La instantánea del trabajo contiene solo identificadores y política. La credencial se resuelve por docente/origen al ejecutar; si fue revocada se aplica el fallback capturado o el trabajo queda reintentable.
- La publicación global y personal usa control optimista por versión y una sola transacción. Se rechaza el conjunto completo si una ruta es incompatible.
- La configuración actual es el perfil institucional inicial. Un interruptor de adopción por capacidad permite volver al comportamiento anterior sin migrar ni recalificar trabajos.
- Se rechaza guardar una única clave/modelo universal porque visión, texto, imágenes y embeddings tienen contratos incompatibles.

## Ampliación técnica: Ollama Cloud y conector Windows

- El proveedor global Ollama del VPS usa exclusivamente https://ollama.com/api con credencial institucional cifrada.
- La configuración guardada es la fuente efectiva de dirección, clave, modelo, timeout y fallback; el adaptador no sustituye esos valores por constantes del entorno.
- El docente puede registrar una credencial Cloud propia usando el almacén cifrado existente; Ollama requiere clave cuando el origen sea Cloud.
- Los modelos se descubren con tags y se inspeccionan con show para registrar capacidades como completion o vision.
- El origen local se representa como conector y no como URL editable por el navegador, evitando SSRF y errores de localhost remoto.
- El conector Windows se distribuye como ejecutable firmado, se empareja con código temporal y protege su token mediante el almacén seguro del sistema.
- La comunicación usa HTTPS saliente con reclamación de trabajos y espera larga. No se abre el puerto local de Ollama.
- Los trabajos locales son persistentes, idempotentes y tienen lease renovable. Una desconexión permite reintento o fallback autorizado.
- La cola principal no espera bloqueada: persiste el trabajo local y finaliza la etapa; la respuesta del conector reanuda el trabajo original con la misma identidad.
- El conector consulta únicamente 127.0.0.1:11434, anuncia modelos y capacidades y elimina contenido temporal al confirmar la entrega.
- Por minimización de datos, la primera versión solo enruta Presentaciones al conector local. Fotos, PDF, entregas, respuestas, digitalización, visión y calificación quedan restringidas a proveedores Cloud autorizados.
- Una compilación Windows sin firma requiere una bandera explícita de desarrollo y no es distribuible. El empaquetado de publicación exige certificado válido de firma de código y reporta SHA-256.
- Windows es la única plataforma inicial; el contrato permitirá añadir macOS y Linux después.

## Estructura adicional

- backend/app/modules/ollama_connector: emparejamiento, dispositivos, modelos, trabajos, leases y callbacks.
- backend/app/services/ollama_provider.py: cliente Cloud y normalización del API oficial.
- backend/app/workers: reanudación idempotente de trabajos atendidos por conector.
- frontend/src/modules/profesor_ai: selector Cloud/local, emparejamiento, estado y modelos.
- frontend/src/modules/admin: credencial institucional Cloud y catálogo.
- connector/windows: agente local, Ollama loopback, empaquetado e instalador.
- backend/tests, frontend/src y frontend/e2e: aislamiento, secretos, reconexión y regresión.
