# Índice de especificaciones de XCalificator

Este índice asigna una única especificación viva a cada superficie del sistema. Un cambio debe
actualizar la especificación propietaria, su plan y sus tareas; no debe crear documentación paralela.

| ID | Dominio | Backend propietario | Frontend / rutas | Tablas o datos principales | Issue |
|---|---|---|---|---|---|
| 001 | [Adopción de Spec Kit](001-adopt-spec-kit/spec.md) | `.specify`, scripts de gobernanza | GitHub Issues, PR y CI | Sin tablas de aplicación | [#2](https://github.com/Andres-back/Calificator/issues/2) |
| 002 | [Arquitectura, roles y seguridad](002-arquitectura-roles-seguridad/spec.md) | `api.py`, shared, auth guards | `router.tsx`, AppShell, RouteGuards | `users`, roles y pertenencias | [#3](https://github.com/Andres-back/Calificator/issues/3) |
| 003 | [Usuarios, materias y matrículas](003-usuarios-materias-matriculas/spec.md) | auth, users, materias, matriculas | Login, Mis materias, detalle e inscripción | `users`, `materias`, `matriculas` | [#4](https://github.com/Andres-back/Calificator/issues/4) |
| 004 | [DBA, asistencia y currículo](004-dba-asistencia-curriculo/spec.md) | dba, asistencia | pestañas DBA y Asistencia | `dba_catalog`, `dba_personalizados`, `asistencia_registros` | [#5](https://github.com/Andres-back/Calificator/issues/5) |
| 005 | [Evaluaciones](005-evaluaciones/spec.md) | evaluaciones | creación, digitalización, edición y resolución | `evaluaciones`, `evaluacion_blueprints` | [#6](https://github.com/Andres-back/Calificator/issues/6) |
| 006 | [Recursos y actividades](006-recursos-actividades/spec.md) | herramientas | herramientas, detalle y recurso estudiante | materiales y evaluaciones vinculadas | [#7](https://github.com/Andres-back/Calificator/issues/7) |
| 007 | [Entregas y experiencia estudiante](007-entregas-estudiante/spec.md) | entregas en calificaciones/evaluaciones | resolver, selector multihoja y ver entrega | `entregas`, metadatos de evidencia | [#8](https://github.com/Andres-back/Calificator/issues/8) |
| 008 | [Calificaciones, PQRS y boletín](008-calificaciones/spec.md) | calificaciones, incidencias | bandeja, workspace, detalle, PQRS y boletín | `calificaciones`, `calificacion_incidencias`, salón | [#9](https://github.com/Andres-back/Calificator/issues/9) |
| 009 | [Xali, RAG y refuerzos](009-xali-rag-refuerzos/spec.md) | xali, rag | tutor y recursos persistentes | `rag_sources`, `rag_chunks`, `xali_*` | [#10](https://github.com/Andres-back/Calificator/issues/10) |
| 010 | [Presentaciones e imágenes](010-presentaciones-imagenes/spec.md) | presentaciones, imagenes | progreso, vista previa y exportación | `presentaciones`, `imagenes_generadas` | [#11](https://github.com/Andres-back/Calificator/issues/11) |
| 011 | [Reportes, analítica e impacto](011-reportes-analitica-impacto/spec.md) | reportes, analytics, impacto_tesis | paneles y exportaciones | `analytics_eventos` y agregados | [#12](https://github.com/Andres-back/Calificator/issues/12) |
| 012 | [IA, jobs y producción](012-ia-jobs-produccion/spec.md) | admin_ai_config, jobs, services, worker | configuración IA y estados de job | jobs, auditoría, Redis y configuración cifrada | [#13](https://github.com/Andres-back/Calificator/issues/13) |
| 062 | [Evidencia multimodal para evaluador y verificador](062-multimodal-grader-verifier/spec.md) | calificaciones, agentes y orquestador | workspace de revisión | sin tablas nuevas; contexto de evidencia | [#123](https://github.com/Andres-back/Calificator/issues/123) |
| 063 | [Calificación móvil y digitalización segura](063-mobile-grade-digitization/spec.md) | digitalización de evaluaciones | búsqueda y carga móvil en workspace docente | sin tablas nuevas; no modifica históricos | [#125](https://github.com/Andres-back/Calificator/issues/125) |
| 065 | [Retirar evidencia ya enviada](065-retirar-foto-enviada/spec.md) | calificaciones existentes y carga de evidencia | selector “Añadir entregas” | sin tablas nuevas; no modifica históricos | [#135](https://github.com/Andres-back/Calificator/issues/135) |
| 067 | [Base legal, privacidad y aceptación versionada](067-privacidad-legal/spec.md) | auth y registro de aceptaciones legales | `/privacidad`, `/terminos`, `/cookies`, `/aviso-privacidad`, `/piloto` y registro | `legal_acceptances`; sin backfill ni cambios a usuarios existentes | [#139](https://github.com/Andres-back/Calificator/issues/139) |
| 069 | [Recuperar respuestas manuscritas antes de calificar](069-recuperar-respuestas-manuscritas/spec.md) | extracción visual, agentes, orquestador y reintento | workspace docente de calificaciones | sin migración; conserva entregas y calificaciones existentes | [#143](https://github.com/Andres-back/Calificator/issues/143) |
| 070 | [Calibrar comprensión lectora y verificador](070-calibrar-comprension-verificador/spec.md) | prompts de calificación, verificador y transporte OpenCode | flujo existente de calificación; sin rutas nuevas | sin migración; no altera notas confirmadas o publicadas | [#145](https://github.com/Andres-back/Calificator/issues/145) |
| 071 | [Reconocer claves literales en respuestas abiertas](071-respuesta-abierta-literal/spec.md) | validación objetiva y consenso de calificación | flujo existente de calificación; sin rutas nuevas | sin migración; no altera notas históricas por sí mismo | [#147](https://github.com/Andres-back/Calificator/issues/147) |
| 014 | [Alineación de autorización y superficies](014-alinear-autorizacion-superficies/spec.md) | autorización por objeto, analítica y contratos | AppShell, actividad estudiante y telemetría | sin tablas nuevas; políticas e inventario canónico | [#17](https://github.com/Andres-back/Calificator/issues/17) |
| 016 | [Calificación explicable y auditable](016-calificacion-explicable/spec.md) | calificaciones, visión, ajustes, publicación y PQRS | workspace docente, ver entrega y resultados | `calificaciones`, `entregas`, historial y desglose | [#20](https://github.com/Andres-back/Calificator/issues/20) |
| 017 | [Decoración visual y orientación contextual](017-decoracion-frontend/spec.md) | sin cambios de backend; gobernanza de controles frontend | AppShell, cabeceras, inicios, recorridos y estados vacíos | preferencia local de recorridos, sin datos de negocio | [#22](https://github.com/Andres-back/Calificator/issues/22) |

| 018 | [Recursos y calificación fluida](018-recursos-calificacion-fluida/spec.md) | herramientas, evaluaciones y calificaciones | recurso en materia, edición contextual y revisión responsive | sin tablas nuevas; estados y jobs existentes | [#24](https://github.com/Andres-back/Calificator/issues/24) |

| 020 | [Extracción visual robusta con DeepSeek](020-deepseek-vision/spec.md) | adaptador de visión, calificaciones, digitalización y workers | estados de calificación/digitalización existentes | extracción visual, respuestas por página y telemetría | [#27](https://github.com/Andres-back/Calificator/issues/27) |
| 021 | [Configuración de IA global y por docente](021-configuracion-ia-docente/spec.md) | configuración, catálogo, credenciales y resolvedor de IA | `/app/admin/configuracion-ia` y `/app/configuracion-ia` | `ai_provider_*`, `ai_feature_routing`, `profesor_ai_*` | [#29](https://github.com/Andres-back/Calificator/issues/29) |
| 022 | [Hotfix de recuperación de trabajos IA](022-recuperar-trabajos-ia/spec.md) | corrección del ciclo de vida propiedad de 012 | estados existentes de calificación y digitalización | sin tablas nuevas; `ai_jobs`, entregas y resultados existentes | [#31](https://github.com/Andres-back/Calificator/issues/31) |
| 023 | [Hotfix de calificación visual rápida](023-calificacion-vision-rapida/spec.md) | corrección de enrutamiento propiedad de 008, 012 y 020 | jobs de calificación, selección de modelos y estados terminales | migración condicional de rutas IA; sin cambios de API | [#33](https://github.com/Andres-back/Calificator/issues/33) |

| 024 | [Landing pública, solicitudes docentes y mapas conceptuales](024-landing-publica-mapas/spec.md) | auth, users y herramientas | `/`, `/registro`, `/app/admin/usuarios` y vista de mapa | `users` y metadatos de mapas | [#35](https://github.com/Andres-back/Calificator/issues/35) |

| 025 | [Recuperación segura de contraseña](025-recuperar-contrasena/spec.md) | auth, correo transaccional y worker | rutas públicas de recuperación y panel admin de correo | users.auth_version, password_reset_requests, mail_global_config | [#37](https://github.com/Andres-back/Calificator/issues/37) |
| 026 | [Perfeccionamiento de recursos pedagógicos](026-perfeccionar-recursos/spec.md) | herramientas y renderizado PDF | creación, edición, vista y exportación de recursos | materiales existentes; sin tablas nuevas | [#39](https://github.com/Andres-back/Calificator/issues/39) |
| 027 | [Listas y botones personalizados](027-listas-botones-personalizados/spec.md) | componentes UI y biblioteca de recursos | botones, barra de colección, filtros y menú de acciones | estado local de vista; sin tablas nuevas | [#55](https://github.com/Andres-back/Calificator/issues/55) |
| 028 | [Pulido de navegación y presentaciones](028-pulir-navegacion-presentaciones/spec.md) | layout y presentaciones | topbar, tarjeta lateral y generación pedagógica | sin tablas nuevas ni cambios de API | [#57](https://github.com/Andres-back/Calificator/issues/57) |
| 029 | [Usuarios, roles y permisos modulares](029-roles-permisos-modulares/spec.md) | administración y autorización | usuarios, roles, permisos, navegación y rutas protegidas | users y nuevas relaciones de autorización | [#59](https://github.com/Andres-back/Calificator/issues/59) |
| 030 | [Identidad web, favicon y SEO técnico](030-identidad-seo/spec.md) | identidad pública, metadatos por ruta y política de indexación | `/`, autenticación y títulos seguros de `/app` | archivos estáticos y configuración declarativa; sin persistencia | [#63](https://github.com/Andres-back/Calificator/issues/63) |
| 031 | [Aceleración de pipelines de IA](031-acelerar-pipelines-ia/spec.md) | jobs, calificaciones, digitalización, presentaciones y routing IA | progreso, cola grupal, estados de nota y métricas por modelo | `ai_jobs`, `entregas`, `calificaciones`, `presentaciones`, telemetría | [#64](https://github.com/Andres-back/Calificator/issues/64) |
| 032 | [Calificación confiable e impacto docente medible](032-calificacion-impacto-docente/spec.md) | calificaciones, jobs, analytics, rag e impacto_tesis | revisión explicable, tiempos observados y estudio autorizado | `calificaciones`, `ai_jobs`, `analytics_work_sessions`, `impacto_studies`, `impacto_observations` | [#65](https://github.com/Andres-back/Calificator/issues/65) |
| 034 | [Administración efectiva de herramientas e IA](034-administracion-herramientas-ia/spec.md) | coordinación de admin_ai_config, jobs, routing IA y catálogo de herramientas | `/app/admin/configuracion-ia` y creación de recursos | `ai_feature_routing`, `ai_tool_settings`, `ai_usage_events`; sin trasladar propiedad de 006/012/021 | [#70](https://github.com/Andres-back/Calificator/issues/70) |
| 035 | [Catálogo dinámico de modelos IA](035-modelos-dinamicos-api/spec.md) | descubrimiento y sincronización de modelos por proveedor | `/app/admin/configuracion-ia` | `ai_provider_models`; amplía 034 sin cambiar rutas publicadas | [#72](https://github.com/Andres-back/Calificator/issues/72) |
| 036 | [Respaldo visual con Ollama Cloud](036-ollama-cloud-vision-fallback/spec.md) | extracción visual, orquestación de calificaciones y cliente Ollama Cloud | selector de respaldo en `/app/admin/configuracion-ia` | rutas y catálogo IA existentes; sin migración | [#74](https://github.com/Andres-back/Calificator/issues/74) |
| 037 | [Estabilización de evidencia y calidad backend](037-stabilize-backend-quality/spec.md) | calificaciones, evaluaciones y control estático incremental | visor de evidencia y validación de estructura existentes | sin cambios de esquema; contratos y CI | [#76](https://github.com/Andres-back/Calificator/issues/76) |
| 038 | [Higiene incremental del backend](038-backend-hygiene/spec.md) | residuos comprobables en aplicación y pruebas; control estático | sin cambios de frontend ni rutas | sin cambios de esquema; CI Ruff ampliado | [#78](https://github.com/Andres-back/Calificator/issues/78) |
| 039 | [Modularización segura de evidencia](039-modularizar-evidencia/spec.md) | presentación, metadatos y limpieza de evidencia de calificación | rutas de evidencia existentes, sin cambios públicos | entregas y archivos existentes; sin migraciones | [#80](https://github.com/Andres-back/Calificator/issues/80) |
| 040 | [Encolado seguro de calificaciones](040-modularizar-cola-calificaciones/spec.md) | coordinación individual entre calificaciones, jobs y worker | rutas diferidas existentes, sin cambios públicos | entregas, calificaciones y trabajos existentes; sin migraciones | [#82](https://github.com/Andres-back/Calificator/issues/82) |
| 041 | [Estabilización E2E de carga multihoja](041-estabilizar-e2e-multihoja/spec.md) | prueba automatizada de dos entregas consecutivas | sin cambios en rutas o frontend productivo | sin cambios de datos; solo regresión E2E | [#84](https://github.com/Andres-back/Calificator/issues/84) |
| 048 | [Retroalimentación animada con Xali](048-retroalimentacion-animada/spec.md) | política y autorización de eventos estudiantiles en analytics | resolución estudiantil, historia Xali y desglose publicado | `analytics_eventos` existente; sin migraciones ni cambios de nota | [#95](https://github.com/Andres-back/Calificator/issues/95) |
| 049 | [Auditoría npm estable en CI](049-reparar-npm-audit/spec.md) | cliente de auditoría y resiliencia del trabajo frontend | sin cambios de producto | workflow de CI; sin cambios de datos ni API | [#97](https://github.com/Andres-back/Calificator/issues/97) |
| 050 | [Revisión docente por excepciones](050-revision-por-excepciones/spec.md) | priorización derivada sobre calificaciones explicables y analítica segura | workspace docente de calificaciones | `analytics_eventos` existente; sin migraciones ni cambios de nota | [#99](https://github.com/Andres-back/Calificator/issues/99) |
| 051 | [Suma verificable como nota sugerida](051-nota-desglose-autoridad/spec.md) | reconciliación entre desglose explicable y nota sugerida | workspace docente y confirmación de calificaciones | `calificaciones` y `calificacion_desgloses`; backfill de sugerencias no confirmadas | [#101](https://github.com/Andres-back/Calificator/issues/101) |
| 052 | [Revisión independiente con GLM 5.3 Flash](052-glm-independent-review/spec.md) | calificaciones, visión, catálogo y routing IA | configuración administrativa existente; sin rutas nuevas | `ai_provider_models`, `ai_feature_routing`; sin tablas nuevas | [#103](https://github.com/Andres-back/Calificator/issues/103) |
| 053 | [Capacidades correctas por etapa de IA](053-fix-ai-stage-capabilities/spec.md) | hotfix de capacidades persistidas en routing IA | configuración administrativa existente; sin rutas nuevas | `ai_feature_routing`; migración de datos sin cambios de esquema | [#105](https://github.com/Andres-back/Calificator/issues/105) |
| 054 | [Digitalización confiable y señales de revisión visibles](054-fix-digitalization-review-signals/spec.md) | digitalización y calificación explicable | workspace docente existente; sin rutas nuevas | resultado JSON y desglose existentes; sin migración | [#107](https://github.com/Andres-back/Calificator/issues/107) |
| 055 | [Respuesta estructurada y rutas rápidas](055-fast-json-routing/spec.md) | clientes OpenCode, verificación y configuración operativa | rutas existentes de digitalización y calificación; sin rutas nuevas | configuración IA y resultados existentes; sin migración | [#109](https://github.com/Andres-back/Calificator/issues/109) |
| 056 | [Arbitraje solo cuando aporta valor](056-avoid-redundant-arbitration/spec.md) | orquestación y consolidación de calificaciones | revisión docente existente; sin rutas nuevas | resultado JSON existente; sin migración | [#111](https://github.com/Andres-back/Calificator/issues/111) |
| 061 | [Importar estudiantes desde una lista fotografiada](061-importar-estudiantes-lista/spec.md) | usuarios, materias, matrículas, visión y trabajos | estudiantes de materia, asistencia y cambio inicial de clave | `users`, `matriculas`, `importacion_estudiantes_lotes`, `importacion_estudiantes_filas`, `ai_jobs` | [#121](https://github.com/Andres-back/Calificator/issues/121) |

## Reglas de propiedad

- Cada módulo backend, módulo frontend, familia de endpoints y tabla activa pertenece a una fila.
- Los componentes compartidos se documentan en 002; su comportamiento de negocio se documenta en el dominio consumidor.
- Una nueva superficie requiere actualizar este índice dentro del mismo PR.
- Las inconsistencias detectadas se registran como issues; la línea base no cambia funcionalidad silenciosamente.
## Evolución 032: implementación local completada bajo banderas

- [Calificación confiable e impacto docente medible](032-calificacion-impacto-docente/spec.md) — [issue #65](https://github.com/Andres-back/Calificator/issues/65), alcance y [plan](032-calificacion-impacto-docente/plan.md) aprobados el 2026-09-09; historias US1–US5 implementadas y verificadas localmente. Banderas apagadas; sin piloto real ni despliegue.
- Coordina 008/016, 009, 011, 020 y 012/031 sin trasladar propiedad de módulos, endpoints o tablas; su matriz identifica los requisitos de cada dominio.
- No activa el piloto ni acredita metas de tiempo, Kappa o impacto antes de una medición real autorizada.

## Evolución 033: diseño para revisión

- [Centro unificado de calificación](033-centro-calificacion/spec.md), [plan y distribución](033-centro-calificacion/plan.md), [issue #68](https://github.com/Andres-back/Calificator/issues/68). Creación del diseño autorizada; implementación pendiente.
- Coordina 002, 008/016, 007, 012/031 y 011/032. La navegación y alertas se consolidarán sin transferir propiedad de notas ni tablas. Los comportamientos actuales de las bases no se cambian por documentar este diseño.

## Evolución 034: centro administrativo efectivo

- [Administración efectiva de herramientas e IA](034-administracion-herramientas-ia/spec.md) coordina las propiedades vigentes de 006, 008/016, 010, 012/031 y 021.
- Añade visibilidad de configuración guardada, resolución efectiva y ejecución observada por etapa; controla generaciones nuevas de herramientas sin afectar recursos existentes.
- `unir_columnas` es el identificador canónico visible y `emparejar` continúa como alias compatible para enlaces y datos históricos.

## Hotfix 043: navegación sin bloqueo

- [043-corregir-scroll-navegacion](043-corregir-scroll-navegacion/spec.md), [issue #86](https://github.com/Andres-back/Calificator/issues/86): coordina bloqueo compartido, menú adaptable y scroll natural de respuestas sin alterar notas ni desplegar el módulo 042 incompleto. Aprobación humana para PR y despliegue: 2026-09-16.


## Hotfix 044: sesión estable para OpenCode Go

- [044-opencode-session](044-opencode-session/spec.md), [issue #88](https://github.com/Andres-back/Calificator/issues/88): restaura las llamadas de calificación, visión, digitalización y administración que el gateway rechazaba por ausencia de una sesión estable; no cambia notas, datos ni API pública.

## Hotfix 045: RAG no bloqueante en calificación

- [045-rag-grading-fallback](045-rag-grading-fallback/spec.md), [issue #90](https://github.com/Andres-back/Calificator/issues/90): permite que una falla del contexto RAG complementario no aborte la calificación; continúa con evaluación y evidencia, registrando un estado técnico sanitizado.

## Evolución 046: embeddings institucionales con Qwen

- [046-qwen-embeddings](046-qwen-embeddings/spec.md), [issue #92](https://github.com/Andres-back/Calificator/issues/92): sirve Qwen3 Embedding 0.6B en la red privada, unifica persistencia y consulta en 1024 dimensiones y conserva la degradación segura de calificación.

## Evolución 047: retroalimentación formativa y calidad medible

- [047-retroalimentacion-formativa](047-retroalimentacion-formativa/spec.md), [issue #94](https://github.com/Andres-back/Calificator/issues/94): especificación y plan aprobados el 2026-09-18; ajuste probado sin nuevas llamadas de IA ni cambios al cálculo o publicación.
- Coordina 008/016 y 011/032 sin transferir propiedad de módulos, endpoints o tablas. Conecta preferencias existentes al evaluador principal y respaldo.
- [Rúbrica humana 1–5](047-retroalimentacion-formativa/rubrica-calidad.md): 25 descriptores, instrumento borrador sujeto a revisión y calibración académica; no mide automáticamente calidad ni acredita impacto de la tesis.

## Evolución 048: retroalimentación motivacional con Xali

- [048-retroalimentacion-animada](048-retroalimentacion-animada/spec.md), [issue #95](https://github.com/Andres-back/Calificator/issues/95): presenta máximo cuatro escenas derivadas del desglose publicado y mantiene la explicación completa inmediatamente disponible.
- Xali se compone como SVG modular con 120 combinaciones posibles, controles explícitos y alternativa sin movimiento; no genera imágenes por estudiante ni añade llamadas de IA.
- La implementación fue fusionada en `main`. Comprensión, motivación y primer cuadro útil siguen siendo resultados del piloto, no afirmaciones de laboratorio.

## Hotfix 049: auditoría npm estable en CI

- [049-reparar-npm-audit](049-reparar-npm-audit/spec.md), [issue #97](https://github.com/Andres-back/Calificator/issues/97): fija un cliente npm compatible con el endpoint moderno de auditoría y reintenta únicamente fallos transitorios sin ocultar vulnerabilidades ni errores persistentes.

## Evolución 050: revisión docente por excepciones

- [050-revision-por-excepciones](050-revision-por-excepciones/spec.md), [issue #99](https://github.com/Andres-back/Calificator/issues/99): prioriza respuestas bloqueadas o inciertas y conserva el desglose completo, la evidencia y la confirmación final docente.
- La clasificación es determinista, no añade llamadas de IA, no modifica puntajes y registra únicamente conteos y navegación agregados para medir el flujo del piloto.

## Hotfix 051: suma verificable como nota sugerida

- [051-nota-desglose-autoridad](051-nota-desglose-autoridad/spec.md), [issue #101](https://github.com/Andres-back/Calificator/issues/101): hace autoritativa la suma por pregunta cuando el desglose está completo y conserva cualquier diferencia con la nota global del modelo para auditoría.
- No altera notas confirmadas, ajustadas o publicadas; alinea únicamente sugerencias automáticas pendientes y muestra la precisión necesaria para distinguir su resultado.

## Hotfix 054: digitalización y revisión independiente visibles

- [054-fix-digitalization-review-signals](054-fix-digitalization-review-signals/spec.md), [issue #107](https://github.com/Andres-back/Calificator/issues/107): separa extracción visual y estructuración textual, conserva alertas de GLM y evita mostrar consenso pleno cuando el verificador solicita revisión.
- Mantiene la suma por pregunta y la decisión final docente; no corrige claves ni publica notas automáticamente.

## Hotfix 055: respuestas estructuradas y rutas rápidas

- [055-fast-json-routing](055-fast-json-routing/spec.md), [issue #109](https://github.com/Andres-back/Calificator/issues/109): detecta salidas truncadas, compacta la verificación independiente y evita una tercera inferencia cuando falta una nota verificadora.
- Conserva el desglose y la nota principal como sugerencia pendiente de revisión; no fabrica consenso ni publica automáticamente.

## Hotfix 056: arbitraje solo cuando aporta valor

- [056-avoid-redundant-arbitration](056-avoid-redundant-arbitration/spec.md), [issue #111](https://github.com/Andres-back/Calificator/issues/111): evita una tercera valoración ante notas cercanas y confiables, conserva alertas y revisión docente, y mantiene arbitraje por discrepancia o baja confianza.
- La nota continúa basada en la suma por pregunta y nunca se publica automáticamente.

## Hotfix 057: evidencia de respuestas dibujadas

- [057-drawn-answer-evidence](057-drawn-answer-evidence/spec.md), [issue #113](https://github.com/Andres-back/Calificator/issues/113): conserva la descripción literal de trazos por pregunta y página; una descripción visual incierta exige revisión docente y no prueba que la respuesta esté en blanco.
- Mantiene la suma por pregunta, las respuestas textuales y la publicación exclusivamente docente.

## Hotfix 058: coherencia de nota sugerida bajo revisión

- [058-grade-sum-review](058-grade-sum-review/spec.md), [issue #115](https://github.com/Andres-back/Calificator/issues/115): cuando todas las preguntas tienen puntaje, la sugerencia muestra su suma aunque existan alertas; la revisión docente sigue obligatoria y un componente pendiente nunca se toma como cero.

## Hotfix 059: discrepancias del verificador por pregunta

- [059-verifier-component-contract](059-verifier-component-contract/spec.md), [issue #117](https://github.com/Andres-back/Calificator/issues/117): interpreta el formato compacto del verificador y evita presentar un cero como seguro si otra valoración o una alerta específica contradice el puntaje o la clave.

## Hotfix 060: claridad de proveedores en calificación

- [060-admin-grading-route-clarity](060-admin-grading-route-clarity/spec.md), [issue #119](https://github.com/Andres-back/Calificator/issues/119): separa la contingencia de lectura visual en Ollama de la verificación y el arbitraje GLM en el panel administrador, sin cambiar rutas de IA ni notas.

## Hotfix 063: calificación móvil y digitalización segura

- [063-mobile-grade-digitization](063-mobile-grade-digitization/spec.md), [issue #125](https://github.com/Andres-back/Calificator/issues/125): difiere la búsqueda remota para evitar bloqueos al escribir, permite localizar al estudiante al cargar evidencia y separa los manuscritos de la clave esperada.
- Las operaciones aritméticas de tipo completar se verifican contra el enunciado final y dejan advertencia si se corrige la propuesta de IA; no se alteran evaluaciones históricas.

## Evolución 043: flujo docente móvil de calificación

- [043-flujo-docente-movil](043-flujo-docente-movil/spec.md), [issue #131](https://github.com/Andres-back/Calificator/issues/131): compacta el contexto, mantiene búsqueda y filtros accesibles y permite confirmar, publicar o continuar desde una barra móvil asociada al estado real.
- No cambia el cálculo, la persistencia, los permisos ni los contratos de calificación; añade cobertura funcional y visual en 360×800 y 390×844.

## Evolución 065: retirar evidencia ya enviada

- [065-retirar-foto-enviada](065-retirar-foto-enviada/spec.md), [issue #135](https://github.com/Andres-back/Calificator/issues/135): elimina del selector de carga al estudiante cuya evidencia ya fue aceptada o que tiene una calificación existente.
- Los fallos conservan estudiante y hojas para reintento; no cambia entregas, notas, reemplazos ni contratos HTTP.

## Hotfix 068: rutas legales realmente públicas

- [068-rutas-legales-publicas](068-rutas-legales-publicas/spec.md), [issue #141](https://github.com/Andres-back/Calificator/issues/141): evita que el arranque de autenticación consulte la sesión y redirija al login al visitar privacidad, términos, cookies, aviso de privacidad o información del piloto.
- Las rutas académicas y administrativas continúan protegidas sin cambios.

## Hotfix 070: comprensión semántica y verificación acotada

- [070-calibrar-comprension-verificador](070-calibrar-comprension-verificador/spec.md), [issue #145](https://github.com/Andres-back/Calificator/issues/145): valora el significado solicitado sin penalizar formas no exigidas y ejecuta la revisión GLM con razonamiento bajo.
- Conserva el presupuesto compacto, la detección de truncamiento y la decisión final docente; no reescribe notas confirmadas ni publica automáticamente.

## Hotfix 071: claves literales en respuestas abiertas

- [071-respuesta-abierta-literal](071-respuesta-abierta-literal/spec.md), [issue #147](https://github.com/Andres-back/Calificator/issues/147): garantiza puntaje objetivo cuando una respuesta abierta es igual a la clave o comienza con ella completa.
- No usa similitud difusa, no acepta menciones internas y conserva la revisión docente para cualquier caso no inequívoco.

## Inventario técnico global

- [Inventario canónico JSON](system-inventory/current.json)
- [Especificación del generador y gate de deriva](013-inventario-tecnico-exhaustivo/spec.md)
