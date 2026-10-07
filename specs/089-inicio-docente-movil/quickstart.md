# Guía de validación y resultados

Estado: implementación verificada localmente el 2026-10-06; CI completo y entrega productiva todavía pendientes. Alcance, plan y revisión asistida del checklist aprobados. Datos exclusivamente ficticios.

## Preparación

Desde `E:/tesis/.worktrees/rag-preflight/frontend`, usar dependencias del lockfile. Si no están instaladas: `npm ci`. Instalar motores de prueba solo si faltan: `npx playwright install chromium webkit`. Los mocks existentes permiten validar sin Docker, credenciales o producción.

## Comprobaciones focalizadas

1. `npm run typecheck` y `npm run lint:strict`.
2. `npx vitest run src/components/auth/RouteGuards.test.tsx src/modules/auth/LandingPage.test.tsx src/modules/dashboard/DashboardPage.test.tsx`, más la prueba contigua del helper si se crea.
3. Los casos `inicio docente móvil` están implementados en `e2e/p2-responsive.spec.ts`, con proyectos focalizados Chromium/WebKit. Ejecutar: `npx playwright test e2e/p2-responsive.spec.ts --grep "inicio docente móvil" --project=chromium --workers=1`, seguido del mismo comando con `--project=webkit`.
4. `npm run build` y `npm run audit:build`. CI requerido completo, incluida gobernanza, antes de solicitar fusión; evitar repetir suites generales localmente sin un fallo o riesgo que lo justifique.

## Matriz de aceptación

| Área | Datos/acción | Resultado medible |
|---|---|---|
| Entrada | Simular media standalone y, por separado, navigator.standalone iOS; sesión válida/ausente/expirada, tres roles y clave temporal | Destinos de contracts/ui.md; ningún login prematuro mientras se comprueba sesión ni exposición de otro rol |
| Identidad | Comparar manifest, origen, iconos y entrada contra base aprobada | Sin cambios de identidad ni necesidad inducida de reinstalar |
| Pantalla | 360×800, 390×844, 768×1024, 1366×768, 1920×1080; ambos temas | Sin overflow horizontal; acciones ≥44×44; dos tarjetas completas al inicio bajo SC-001 |
| Uso diario | Materia → Evaluaciones/Asistencia; evaluación publicada → alumnos | Un toque hacia cada vista de materia; máximo dos selecciones hacia alumnos |
| Búsqueda | 30 materias, nombres largos, grado ausente, coincidencia y cero resultados | Filtrado correcto, texto completo consultable, limpieza funcional; teclado móvil no tapa control activo |
| Permisos | Docente limitado, estudiante y admin | Enlaces/consultas autorizados; inicios actuales de otros roles conservados |
| Fallos | Materias vacías, consulta lenta y error; bandeja/materiales fallan independientemente | Carga/vacío/error distintos, reintento útil; materias disponibles siguen utilizables y no aparecen ceros ficticios |
| Ayuda/pendientes | Abrir/omitir/reabrir; teclado y movimiento reducido; almacenamiento bloqueado | Sin bloqueo/foco perdido ni reapertura involuntaria dentro de vista; casos consultados sin escrituras |
| Trabajos | Monitor activo, abrir/cerrar menú y scroll hasta última materia | No tapar acciones de forma irrecuperable, no cancelar trabajos ni perder sus enlaces |
| Red | Contabilizar métodos y destinos mientras se busca/consulta/ayuda | Cero mutaciones académicas, cero peticiones a IA y cero consultas de alumnos por cada materia |

Capturar pantallas de tamaños móviles representativos en ambos motores/temas y revisar jerarquía real, nombres, altura y último control; no limitarse a screenshots sin aserciones. Reutilizar mocks/suites; ejecutar motores secuencialmente para evitar conflictos del servidor 4175.

## Verificación física aparte

Registrar modelo, versión del sistema/navegador, modo instalado o navegador, commit y resultado; no datos de alumnos. En iPhone: Safari y añadir a pantalla de inicio como app; en Android: Chrome y app instalada. Comprobar entrada por icono con sesión de ese contexto, cierre/reapertura, sesión vencida, teclado, scroll, menú, tema y áreas seguras. También verificar acceso directo normal que abre navegador, no confundirlo con modo instalado.

La emulación de Chromium/WebKit no certifica Safari/Chrome en un teléfono real ni instalación real. Si un teléfono no está disponible, registrar su comprobación como pendiente y solicitarla antes de afirmar compatibilidad físicamente comprobada. Nunca presentar «sin errores garantizado». No instalar ni cambiar dispositivos del usuario sin autorización.

Producción solo tras aprobación de plan, implementación, tareas completas, PR, CI verde y autorización específica de fusión. La futura verificación productiva de este cambio es de lectura/navegación, sin modificar notas, asistencia o evidencias.

## Evidencia de ejecución local

- TypeScript y lint estricto: verdes.
- 43 pruebas unitarias focalizadas, seis archivos: guardas, landing, dashboard, helper instalado, ayuda inicial y assets SEO. Verdes.
- 16 casos E2E distintos por motor completados correctamente entre ejecución inicial y reejecuciones focalizadas: diez combinaciones de pantalla/tema, tres entradas instaladas por rol, navegador/app sin sesión, treinta materias con fallos independientes y guía automática con permisos limitados. Chromium y WebKit cubiertos; no se presenta esto como una única corrida final de toda la suite.
- Dos aserciones iniciales de prueba se corrigieron sin cambiar autenticación o animaciones: aceptar el destino vigente `login?reason=session-expired` y esperar la animación de entrada antes de medir los objetivos de 44 px. Sus reejecuciones pasaron en ambos motores. Las respuestas 401/500 sintéticas generan mensajes esperados; no se afirma ausencia total de mensajes de consola.
- Capturas inspeccionadas visualmente: `output/playwright/teacher-home/chromium-360x800-light.png` y `output/playwright/teacher-home/webkit-390x844-dark.png`. Dos primeras tarjetas completas, nombres legibles y acciones accesibles. Además hay capturas de ambos tamaños/temas por motor.
- Build de producción, `audit:build` y `audit:actions`: verdes; auditoría de acciones: 424 botones y 119 enlaces. Permanece el aviso heredado de chunk inicial mayor de 500 kB; no se suprimió ni cambió la partición del bundle.
- Inventario técnico regenerado por su script: mismo número de superficies, mismos propietarios y contratos; solo referencias de pruebas y digest derivados. No se crean tablas ni endpoints.
- Converge: cero brechas funcionales identificadas tras revisar 10 FR, 6 SC, 15 escenarios de aceptación, 6 decisiones de plan y 8 principios. No se añadieron tareas de convergencia. La apertura de PR y los controles remotos son pasos de entrega, no funcionalidad ausente.

## Disponibilidad física y límites

**Pendiente**: iPhone físico (Safari y app desde pantalla de inicio) y Android físico (Chrome y PWA instalada). No hay dispositivo disponible en este entorno para certificar instalación, teclado virtual, áreas seguras y cierre/reapertura reales. Solicitar esas comprobaciones con el protocolo anterior antes de afirmar validación física.

No se cambiaron backend, cuentas, notas, evidencias, asistencia, criterios, trabajos, claves, proveedores, manifest, rutas efectivas ni service workers. El bootstrap únicamente incluye la raíz instalada en la comprobación de sesión existente. CI remoto ejecutará las suites generales frontend/backend/E2E y contenedores antes de permitir una fusión; no se repiten localmente suites ajenas sin motivo.

## Entrega para revisión

PR [#185](https://github.com/Andres-back/Calificator/pull/185), enlazado a #184 y adjunto al chat, con etiquetas `spec-approved` y `plan-approved`. Primer estado remoto comprobado: Backend quality and tests, Frontend quality/build/E2E, Container builds y Spec governance en curso. No se certifica CI verde por haber abierto el PR; tampoco se habilita auto-merge o bypass. Se solicita autorización de fusión/despliegue por separado, condicionada a los controles completos en verde. Producción continúa sin este cambio.

## Corrección de validación autorizada — 2026-10-07

CI del HEAD inicial `e75775d`: backend y contenedores verdes; gobernanza falló por no incorporar 089 en ALL_SPECS. Frontend: 131 E2E pasaron y diez fallaron por clasificar el GET de `revision` como `vision`. No era evidencia de una llamada real a IA; el detector buscaba una subcadena sin límites. La espera de red añadida al cierre de la prueba permitió observar esa consulta y dejó visible el defecto del detector.

Se añadió 089 al conjunto estricto, sin excluir pruebas ni modificar propietarios. El detector distingue segmentos; una regresión verifica que revisión/lectura son válidas mientras generación, visión, chat y escritura de notas siguen siendo rechazados. Prueba focalizada: **22 casos verdes en una corrida**, diez distribuciones más una regresión por motor (Chromium y WebKit). TypeScript y lint estricto verdes. Gobernanza completa local: **41 pruebas verdes** e inventario vigente de 573 superficies. Converge posterior: los dos hallazgos parciales resueltos, cero brechas adicionales en el alcance de corrección; T019/T020 completas. No hubo cambios de código funcional, modelos, tiempos de calificación o datos. Se actualiza el inventario derivado de las pruebas y se vuelve a solicitar CI completo sobre el nuevo HEAD; la fusión sigue sin autorización.
