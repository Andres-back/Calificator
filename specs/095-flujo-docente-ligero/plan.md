# Plan: flujo docente ligero

**Rama**: `codex/095-flujo-docente-ligero` | **Fecha**: 2026-10-13 | **Spec**: [spec.md](./spec.md) | **Issue**: [#200](https://github.com/Andres-back/Calificator/issues/200)

**Estado**: aprobado por el usuario («adelante») el 2026-10-13; revisión de lista autorizada antes de implementar. Sin autorización de fusión/despliegue.

## Resumen

Refinar las pantallas existentes; no crear otro centro de calificación. Etapa A: cabecera de materia, menú de acciones y boletín compacto. Etapa B: mantener jerarquía de nota 094, vocabulario consistente, continuar revisión y progreso/siguiente alumno en captura. Una rama/PR, sin desplegar etapas incompletas ni cambiar registros académicos.

## Contexto técnico

**Lenguajes/versiones**: React/TypeScript, Tailwind y React Query con las versiones del lockfile vigente; no actualizar paquetes.
**Dependencias**: componentes UI, rutas, permisos, contexto de materia y APIs actuales; ninguna dependencia nueva.
**Persistencia**: sin tablas ni migraciones. Marcador de navegación local versionado y por docente, solo IDs y fecha, con caducidad de siete días; nunca nombres, fotos, respuestas, notas o credenciales. Se limpia al cerrar/perder sesión o cambiar de cuenta; almacenamiento denegado no impide usar la app.
**Pruebas**: Vitest/Testing Library y Playwright actuales; Chromium y WebKit con datos sintéticos; regresiones de permisos/suma cuando corresponda. Sin inferencias LLM ni pruebas de rendimiento con datos reales.
**Plataforma objetivo**: navegadores Android/iPhone y computador; matriz 360/390/768/1280/1440 claro/oscuro y foco por teclado.
**Rendimiento y escala**: grupo de 30 y nombres largos; sin aumentar polling ni llamadas por alumno. Continuar puede resolver una evaluación con la API existente y materia ya consultada; no descarga evidencia hasta abrir el detalle. El progreso usa colecciones ya consultadas y alumnos únicos del grupo.

## Verificación de la constitución

- Separación de roles: preservar comprobaciones existentes; acciones agrupadas conservan sus condiciones de permiso/estado. Continuar es exclusivo del docente con acceso de consulta válido, sin confundir un rol personalizado con uno estándar.
- Integridad y trazabilidad: conservar handlers de ajuste/publicación/envío, alertas activas, fórmula, datos históricos y protección de borradores. Ninguna consulta confirma o publica.
- Asincronía e idempotencia: capturas siguen en cola; siguiente sugerido aparece solo tras aceptación y nunca ante un fallo. Preservar elegibilidad, bloqueo durante refresco, reintentos y hojas sin guardar.
- Datos y secretos: no hay cambios persistentes académicos ni pruebas reales; marcador mínimo validado, aislado, descartable, sin importar datos del cliente como autoridad de permisos.
- Accesibilidad: menú reutilizado con teclado/foco, filtros con estado anunciado, nombres y grado legibles, objetivos táctiles de 44 px; barras y menús no tapan contenido.
- Portabilidad de IA: ningún modelo, prompt, proveedor ni embedding se toca.
- Gobernanza y pruebas: alcance aceptado; plan debe aprobarse antes de código. Después Checklist, Tasks y Analyze; Converge y CI al terminar; merge/despliegue requieren autorización separada.
- Demo protegida: trabajar desde main `547bdee`, cambios pequeños revisables, sin reinicios ni actualización automática de producción.

Revisión posterior al diseño: sin excepciones ni hooks. No hay incógnitas de tecnología que requieran agentes de investigación; se reutiliza el código actual y su documentación.

## Estructura del proyecto

- `frontend/src/modules/materias/MateriaDetailPage.tsx`: título/grado breves, información secundaria conservada, estudiante sin cambios innecesarios.
- `frontend/src/modules/materias/MateriaEvaluaciones.tsx`: principales por estado y menú secundario reutilizado, sin duplicar condiciones/handlers.
- `frontend/src/modules/materias/MateriaBoletin.tsx`: búsqueda visible, filtros desplegables con indicadores, mosaico/previsualización/exportación intactos.
- `frontend/src/modules/dashboard/DashboardPage.tsx`: acceso Continuar revisión validado por cuenta/contexto.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: registrar contexto únicamente después de una consulta válida; progreso derivado y propuesta del siguiente alumno; conservar estructura 094 y navegación protegida.
- `frontend/src/modules/materias/MateriaCalificar.tsx`: progreso y elección explícita de alumno sugerido; no alterar paquete, subida ni detección de calidad.
- `frontend/src/modules/calificaciones/teacherReviewResume.ts` y pruebas: módulo pequeño independiente del transporte/autenticación para serializar/validar/descartar IDs permitidos. Integrar limpieza en `frontend/src/stores/auth.ts` con regresiones de sesión; no duplicar la autenticación.
- Componentes UI actuales y pruebas de cada módulo; E2E existentes `frontend/e2e/mock/grading-review.mock.spec.ts`, `frontend/e2e/p2-responsive.spec.ts` y `frontend/e2e/explainable-grading.spec.ts`.
- `frontend/src/components/ui/Modal.tsx`: retorno del foco con `preventScroll` para preservar la posición del boletín; corrección descubierta por CI, sin modificar bloqueo de scroll, teclado ni aserciones existentes. Regresión en `Modal.test.tsx`.
- Especificaciones propietarias 003/004/005/008 y evolución 089/092/094: actualizar referencias pertinentes al terminar; inventario y baseline sin quitar controles.

## Decisiones y complejidad

1. Compactar sin ocultar contexto: materia/grado siempre visibles; descripción/estado administrativo en información desplegable. No reemplazar identidad con solo iconos ni fijar otra cabecera móvil.
2. Acciones apropiadas: publicados muestran Visualizar, Calificar por foto si procede y Ver notas; borradores conservan preparar/publicar. Menú conserva editar preguntas, criterios, opciones de entrega y eliminar, con permisos y confirmación actuales. No agrupar advertencias críticas ni inventar disponibilidad.
3. Boletín progresivo: búsqueda visible; filtros secundarios cerrados por defecto, abiertos si hace falta al restaurar un filtro, y resumen visible mientras estén aplicados. Exportar sigue localizable y no modifica notas.
4. Continuación segura: IDs/timestamp por usuario, destino construido con rutas propias y parámetros permitidos; sin aceptar URLs arbitrarias. Validar acceso con consultas actuales antes de mostrar contexto; si alumno ya no está disponible, volver al grupo con aviso sencillo. Borradores/fotos nunca se guardan en el marcador.
5. Progreso comprobable: intersección de IDs del grupo con registros existentes/aceptados; deduplicar y evitar usar una página parcial como total. Donde no pueda distinguirse entrega de nota manual, usar «Con entrega o nota registrada» o equivalente veraz; nunca «Fotos calificadas» por inferencia.
6. Siguiente sugerido, no autoasignado: nombre visible y botón explícito para elegir entre pendientes del grupo actual. Conservar orden de lista, comprobar elegibilidad vigente y no transferir hojas; no abrir cámara ni enviar por selección.
7. Copia común coherente, sin un refactor masivo de todos los módulos. Reusar la presentación de nota 094 ya probada y cambiar solo textos o distribución necesarios. Cualquier fallo ajeno al alcance se documenta y no amplía el trabajo silenciosamente.

Diseño: [research.md](./research.md), [data-model.md](./data-model.md), [contracts/ui.md](./contracts/ui.md), [quickstart.md](./quickstart.md). La siguiente fase requiere aprobación de este plan, después lista UX, tareas y análisis.
