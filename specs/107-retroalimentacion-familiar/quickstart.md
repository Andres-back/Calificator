# Guía de validación propuesta — Spec 107

Esta guía define escenarios; la evidencia real y el estado parcial están en [validation.md](./validation.md). Los fundamentos y parte del backend ya existen, pero no toda la implementación. No usar producción, usuarios reales o claves de proveedor para la validación ordinaria.

## Preparación

1. Obtener aprobación de plan; completar Checklist, Tasks y Analyze. Trabajar en la rama 107 sin incorporar cambios ajenos de 101/098.
2. Crear base PostgreSQL/Redis **aislados**, con credenciales locales no versionadas; verificar DSN y que no coincida con producción antes de migrar. Arrancar backend/worker/frontend según entorno local del proyecto, con IA simulada y bandera nueva deshabilitada inicialmente.
3. Fixture sintética: dos docentes, tres estudiantes (dos con igual apellido, otro en dos materias), dos evaluaciones, una calificación confirmada con desglose, una histórica manual sin Entrega, una sugerida, una inconsistente, otra con feedback largo. No copiar datos de alumnos a Git.
4. Conservar digest/cantidades de notas, evidencias, cuentas y publicaciones previas antes del upgrade; probar migración aditiva y compatibilidad con bandera apagada. Confirmar Alembic heads reales antes de asignar nueva revisión.

## Comandos de referencia actuales

Ejecutar desde raíz de este worktree, en el entorno Python/Node del proyecto; no ejecutar el bloque de migración hasta disponer de implementación y DB aislada verificada.

```powershell
python -m pytest tests/spec_governance -q
python scripts/build_system_inventory.py --check
```

Desde `backend/`, con dependencias de `requirements.txt`/`requirements-dev.txt` instaladas y variables locales de prueba:

```powershell
python -m ruff check app tests
python -m pytest tests/unit/test_xali_guidance_policy.py tests/unit/test_breakdown_visibility.py tests/unit/test_breakdown_authorization.py tests/unit/test_breakdown_teacher_adjustment.py -q
python -m alembic heads
# Solo tras implementar, revisar DSN y disponer de base aislada:
python -m alembic upgrade head
```

Desde `frontend/`:

```powershell
npm ci
npm run typecheck
npm run lint
npm run test:run
npm run build
npm run test:mock
```

Tasks añadirá rutas exactas de nuevas pruebas, configuración de consumo de cola feedback y comandos de migración/integración aislados. Los comandos existentes no sustituyen esas pruebas nuevas ni certifican producción. CI deberá cubrir builds de backend/web/worker y gobernanza con las aprobaciones reales, no un evento falsificado.

Pruebas nuevas ya disponibles (requieren `SPEC107_TEST_DATABASE_URL` en el servidor temporal exacto `127.0.0.1:55417/spec107`, nunca el DSN configurado de producción):

```powershell
python -m pytest tests/integration/test_feedback_sharing_migration.py tests/integration/test_feedback_sharing_authorization.py tests/integration/test_feedback_sharing_routes.py tests/integration/test_feedback_sharing_evidence.py tests/integration/test_feedback_sharing_quota.py -q
```

Incremento de vigencia/chat: `test_feedback_sharing_lifecycle.py` y `test_feedback_sharing_chat.py` usan el mismo DSN aislado, proveedor y broker simulados. Para la regresión completa desde `backend/`:

```powershell
$integrationFiles = (Get-ChildItem tests/integration/test_feedback_sharing*.py).FullName
python -m pytest tests/unit @integrationFiles -q --tb=short -o faulthandler_timeout=60
```

En Windows estas pruebas async requieren acceso al bucle local para `socketpair`; si el entorno restringido bloquea la creación del event loop, no atribuirlo al código ni sustituir PostgreSQL. Las conversaciones sintéticas de cada fixture se eliminan al terminar la prueba, solo para los UUID de alumnos creados por ella; no se consulta producción.

El nuevo consumidor previsto en Compose es `worker-feedback`, cola exclusiva `feedback`, concurrencia 1; la reclamación DB permite como máximo dos inferencias de chat simultáneas incluso con varios consumidores. Ni el worker grading ni sus rutas se sustituyen. El beat recupera despacho pendiente cada 60 s; inferencia incierta tras 90 s y espera de cola de 300 s se cierran con un mensaje seguro, sin reenvío de proveedor. Contexto máximo 24 000 caracteres, respuesta acotada y timeout de inferencia 45 s. La API admite como máximo 60 peticiones pendientes globales, además del cupo individual de cinco cada 600 s; el reintento idempotente no es otra admisión. Son límites implementados, no mediciones de latencia real de modelos ni prueba de un despliegue. Bandera deshabilitada por defecto.

El script `scripts/benchmark_feedback_models.py` compara offline un manifiesto JSON con `reference` y `runs` mediante `--baseline` y `--candidate`; no llama APIs ni activa configuraciones. Cada referencia tiene ID seudónimo único, escala, puntos obtenidos/máximos por pregunta y constancia de referencia docente independiente. Cada ejecución conserva configuración, puntos/nota, tiempos reales por etapa, rutas de proveedor/modelo/versión y revisión de cinco dimensiones con evaluador UUID, versión e incidencias separadas. No introducir fotos, nombres, respuestas libres ni claves. Los tests sintéticos documentan el formato; no cuentan como corpus humano.

## Recorridos y resultados esperados

| Escenario | Validación observable |
|---|---|
| 1. Emisión elegible | Docente ve preview exacta, elige tres días y genera enlace; nota/desglose originales no cambian. Sugerida/inconsistente queda excluida con causa. |
| 2. Histórico manual | Comparte nota/explicación ya confirmadas sin Entrega/desglose, sin recalificar, inventar preguntas o crear evidencia. |
| 3. Permisos | Otro docente, estudiante y anónimo no gestionan accesos ni descargan hoja grupal. Backend rechaza petición directa aunque exista botón oculto. |
| 4. Sin login | Navegador limpio abre enlace individual; navegador con sesión profesor también, sin heredar cookies/JWT ni modificar su sesión. |
| 5. Aislamiento | Token A nunca permite cambiar ID para ver B; dos apellidos iguales y varias materias no agrupan accesos ni conversaciones. |
| 6. Tiempo | Reloj controlado prueba justo antes/en/después de expires_at y 72 h exactas. Reanudar confirma nueva vigencia; renovar invalida anterior sin resetear cuota. |
| 7. Edición | Cambiar nota, componente o feedback por cada ruta (incluidos lotes/manual/PQRS si modifica nota) suspende revisión compartida; emisión concurrente no mezcla estados. Pérdida de permiso/matrícula bloquea inmediatamente nuevas consultas. |
| 8. Respuesta tardía | Proveedor simulado en pausa: desactivar/expirar/cambiar revisión y luego liberarlo. No se entrega texto ni evidencia, ni con poll de una respuesta ya completada. |
| 9. Cupo | Admitir cinco, sexta 429 sin proveedor; a 599 s sigue bloqueada, a 600 s libera la aceptación correspondiente. Lectura funciona durante espera válida. |
| 10. Concurrencia/idempotencia | Seis POST realmente concurrentes → cinco aceptaciones máximo. Repetir mismo request/mensaje no consume ni infiere otra vez; otro mensaje con mismo ID da conflicto. Probar varios procesos/dispositivos/enlaces y renovación/reactivación. |
| 11. Fallos | Caída DB impide admisión sin fail-open local; broker caído conserva despacho pendiente sin duplicación. Worker redespachado no llama dos veces. Fallo externo consume una pregunta aceptada y deja estado claro. |
| 12. Contexto | Capturar prompt del proveedor simulado: solo revisión permitida, sin respuesta de referencia oculta, blueprint, notas internas ni datos ajenos. Solicitud de cambiar nota/consultar otro alumno se rechaza sin mutación. |
| 13. Privacidad cliente/proxy | Token no aparece en path/query HTTP, logs, analítica, error reporter, metadata, caché, localStorage o archivos CI. Sin enlaces permanentes a uploads. Navegación/cambio de token limpia UI anterior. |
| 14. Impresión | 30 fichas con mensajes autorizados breves y de hasta 1500 caracteres, nombres largos y varias continuaciones: A4/Carta con texto íntegro legible, nota y nombre correctos y corte sin mezcla. Feedback vacío se excluye con causa, sin inventarlo. Sin lista de enlaces ni datos de cuentas. Capturar PDF de impresión de prueba e inspeccionar todas las páginas. |
| 15. Responsive | Playwright Chromium/WebKit 360/390/1440, ambos temas, teclado reducido y zoom; cero overflow horizontal y envío visible. Registrar aparte prueba física iPhone/Android cuando se disponga, sin simular su aprobación. |
| 16. Carga y prioridad | 30 lecturas/aceptaciones sintéticas concurrentes, registrar p50/p95 y hardware; asegurar que cola feedback se consume y no ocupa workers grading. No atribuir al proveedor tiempos simulados. |
| 17. Regresión y apagado | Comparar digest/cantidades previos; compartir/reintentar/expirar/rotar no altera notas, evidencias o cuentas. Bandera apagada bloquea superficie nueva sin romper flujos actuales. Probar retención solo de tablas nuevas con reloj controlado. |

## Validación de modelos y retroalimentación

La revisión textual opcional autorizada después del plan conserva `FEEDBACK_REFINEMENT_ENABLED=false`. Pruebas sin gasto: `python -m pytest tests/unit/test_feedback_usefulness.py tests/unit/test_feedback_refinement.py tests/unit/test_comparator_feedback.py -q`. Incluyen selección de explicación específica frente a elogio más confiado, reescritura con una sola petición simulada, sin alterar puntajes, timeout, falta de evidencia y salida no autorizada. Son pruebas de funcionamiento del control, no valoraciones humanas ni llamadas reales al proveedor. Las señales automáticas nunca producen un certificado de «retroalimentación correcta».

Preparar al menos 20 actividades variadas con corrección docente independiente y permisos de uso, sin equiparar réplicas de una hoja a veinte actividades. Incluir respuesta breve correcta, OCR dudoso, cálculo, lectura, dibujo/secuencia cuando haya criterios apropiados, total discrepante y componentes incompletos. La referencia se define antes de comparar y registra desacuerdos.

Ejecutar vigente/candidata con mismos insumos y parámetros registrados. Medir por etapa y extremo a extremo (cola, extracción, valoración, verificación/arbitraje si aplica, persistencia/UI), error por pregunta, coherencia del total, revisión humana y cinco dimensiones de feedback (1..5) con evaluador/versión. No mezclar las mediciones de una sola llamada con una promesa de tiempo total.

El conjunto autorizado exige al menos 4/5 en cada dimensión y cero incidencias académicas graves pendientes según SC-003. Ningún resultado experimental se rellena ficticiamente ni se activa candidato con menor concordancia/errores graves. Si no hay corpus/revisor, dejar esa puerta pendiente y mantener defaults, informando la limitación al usuario.

## Evidencia de cierre

Informe con comandos/fechas/resultados, migración y regresión, pruebas API permitidas/denegadas, concurrencia real, capturas responsive, impresión revisada, comparación docente y límites conocidos. Sin tokens/evidencias reales en artefactos públicos. Completar tareas solo con evidencia; no confundir diseño con pruebas ejecutadas. CI verde y autorización de merge/despliegue siguen siendo necesarias.
