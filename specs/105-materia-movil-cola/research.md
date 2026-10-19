# Investigación: materia móvil y cola discreta

Fecha: 2026-10-18. Investigación local de código y revisión visual sintética; sin consultar producción ni evidencias reales. El usuario confirmó que el cuadro persistente dice «Calificando en segundo plano».

## Formulario de materia

`MateriasListPage.tsx` contiene el alta, sugerencias, límite de seis materias y navegación. El modal tiene ayuda extensa, descripción siempre visible y autofocus en nombre. La revisión anterior observó texto de entrada de 14 px y descripción parcialmente cortada con viewport reducido de WebKit. Se conserva el informe sintético en `output/playwright/mobile-review/REVISION_MOVIL_2026-10-18.md` (salida local ignorada).

Decisión: priorizar tres campos, plegar descripción/ayuda y reutilizar `useMobileFormViewport` y los parámetros móviles de Modal. No introducir otra implementación del teclado ni modificar validaciones.

## Causa del cuadro persistente

La revisión delegada de solo lectura confirmó: `MateriaCalificar.tsx` libera la selección y registra el trabajo después de aceptación; `api.ts` no espera el resultado del LLM y el endpoint devuelve 202. `GradingJobMonitor.tsx` permanece montado mientras existen trabajos y no tiene control para minimizar todo el panel. `detailsOpen` corresponde a casos de lote, no al monitor completo. El cierre existente de lotes finalizados retira pendientes y no sirve como minimizador.

AppShell muestra el monitor flotante fuera de `/app/calificaciones`; el workspace lo muestra embebido con altura limitada. Ambos requieren presentación compacta, sin duplicar instancias ni cambiar consultas cada tres segundos o reglas terminales.

Decisión: separar expansión visual de trabajos. Rechazado borrar pendientes, cancelar, detener seguimiento o fingir que terminó para liberar pantalla.

## Recuperación y cambio de cuenta

`gradingJobs.ts` utiliza la clave global `xcalificator.pending-gradings.v1`; la identidad local no incluye propietario. La recuperación consulta trabajos autorizados, pero conserva algunos resúmenes completados locales. No debe ampliarse la exposición al añadir otra preferencia persistente.

Decisión: verificar pertenencia en la cuenta actual, aislar pendientes locales cuando sea necesario y conservar el almacenamiento legado sin mostrar nombres no verificados. Recuperar desde el servidor y descartar respuestas de una sesión anterior. No migrar datos académicos ni borrar trabajos remotos.

## Éxito de generación

`GenerationWizard.tsx` muestra un toast de éxito al pasar al borrador generado. La revisión visual observó que puede cubrir cabecera/cierre. Decisión: señal contextual dentro de Revisar; conservar todos los errores y advertencias. No cambiar el sistema global de notificaciones.

## Validación propuesta

Extender las pruebas de MateriasListPage, MateriaCalificar, GradingJobMonitor, almacenamiento de trabajos y GenerationWizard. Reutilizar escenarios E2E de escritura móvil, aceptación de dos entregas y lotes. Probar Chromium/WebKit y ambos temas; no afirmar validación en dispositivo físico ni en producción.
