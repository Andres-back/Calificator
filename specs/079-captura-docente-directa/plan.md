# Plan: asistencia sin superposición y captura docente directa

**Rama**: `codex/079-captura-docente-directa` | **Fecha**: 2026-10-01 | **Spec**: [spec.md](./spec.md) | **Issue**: #165

**Estado**: plan aprobado por el usuario el 2026-10-01 mediante «aprove»; aprobación registrada en #165 con `plan-approved`. Implementación local y regresiones verificadas; PR/CI en preparación, sin fusión ni despliegue de 079.

## Resumen

Eliminar la superposición del resumen de asistencia a cualquier anchura y reducir la captura por evidencia a evaluación → alumno → evidencia → envío. Reutilizar los componentes, contratos y lógica existentes; sin nuevas rutas, dependencias, migraciones, proveedores ni cambios al cálculo o la publicación.

La simplificación elimina navegación y una confirmación repetida, no los controles de destinatario, calidad, multihoja o revisión humana. Los detalles de asistencia y la ayuda serán progresivos; el guardado seguirá siendo explícito y global.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6.x, React 18.3.x, React Router 7.x y Tailwind 3.4.x ya declarados en el frontend; sin actualización de versiones.
**Dependencias**: TanStack Query, componentes UI y selector de evidencia actuales. No se añaden paquetes.
**Persistencia**: mismos borradores locales de asistencia y captura; mismos servicios de asistencia, multipart de `/calificaciones/foto`, calificaciones y jobs. No se añaden tablas ni se escriben notas por navegar.
**Pruebas**: Vitest/Testing Library y suites Playwright existentes; regresiones de envío, filtros, permisos, montaje estable, scroll y resumen compacto. Pruebas con datos sintéticos y API simulada, sin consumir modelos reales.
**Plataforma objetivo**: escritorio y móvil desde 360 px, claro/oscuro, teclado y zoom/reflujo 200 %.
**Rendimiento y escala**: conservar búsqueda local de asistencia y selector de alumnos; cuatro acciones principales desde tarjeta hasta envío de una foto válida. Grupos de 30 alumnos y regresión existente de asistencia de 100. No se promete cambio en latencia de IA.

## Verificación de la constitución

- Separación de roles: el nuevo acceso requiere permisos actuales y evaluación publicada en modalidad `fisica` o `mixta`; no se concede captura desde el menú estudiantil ni desde lectura solamente. Backend mantiene su autorización.
- Integridad y trazabilidad: se conserva `calificarFoto`, el destinatario y el paquete inmutables para cada request. Consulta, ajuste, historial, reemplazo, nota manual y publicación no cambian. La IA continúa proponiendo y el docente decide.
- Asincronía e idempotencia: se reutilizan cola y monitor. Exclusión síncrona de doble pulsación en cliente, bloqueo durante envío y candidatos excluidos únicamente tras aceptación. Un fallo conserva evidencia y no anuncia éxito.
- Evolución de datos: cero migraciones o escrituras correctivas de registros previos; no se eliminan tablas, endpoints o adaptadores.
- Proveedores y secretos: cero cambios a modelos o credenciales; solo fixtures sintéticos en pruebas y documentos.
- Accesibilidad: resumen siempre `relative`/flujo normal; ayuda y detalles con controles nativos expandibles, foco y etiquetas, botones de 44 px o más y medición real de no superposición/reflujo.
- Gobernanza y pruebas: issue #165 y `spec-approved` registrados; aprobación del plan obligatoria antes de Checklist/Tasks/Analyze/Implement. Requisitos mapearán a pruebas y tareas; CI obligatorio y sin push directo a main.
- Producción reproducible: PR desde esta rama, fusión autorizada con CI verde y despliegue desde main; ninguna operación productiva durante la implementación local.

**Evaluación inicial y posterior al diseño**: conforme sin excepciones técnicas ni ampliación de permisos. Alcance y plan aprobados; completar la revisión de requisitos, tareas y análisis antes de implementar.

## Estructura del proyecto

- `frontend/src/modules/materias/MateriaAsistencia.tsx`: quitar todas las clases sticky/fixed del resumen, compactarlo y plegar ayuda/desglose; mantener handlers y modelo de asistencia.
- `frontend/src/modules/materias/MateriaAsistenciaReporte.tsx`: ajuste de presentación de los controles ya existentes si la verificación de zoom detecta desbordamiento; sin cambios de filtros, consulta o exportación.
- `frontend/src/modules/materias/MateriaEvaluaciones.tsx`: añadir acceso contextual directo a captura existente para papel/mixta, manteniendo consulta y todas las acciones previas.
- `frontend/src/modules/materias/MateriaCalificar.tsx`: un único envío, contexto y paquete visibles, selector inicial de alumnos sin un clic de apertura adicional, guardas de envío y calidad pendiente.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: pasar contexto explícito al panel, conservar montaje durante refetch y aviso de aceptación fuera del estado que se remonta por cambio de alumno; limpiar dirty tras aceptación antes de navegar.
- `frontend/src/components/evidence/MultiPageEvidencePicker.tsx`: acotar bloqueo de ingreso/callbacks tardíos durante envío y por generación de captura. No sustituir el selector ni sus controles de orden, rotación, vista previa y reemplazo.
- Pruebas existentes: `MateriaCalificar.test.tsx`, `MateriaEvaluaciones.test.tsx`, `MultiPageEvidencePicker.test.tsx`, `CalificacionesWorkspace.mobile.test.tsx`, `attendanceModel.test.ts`, `frontend/e2e/explainable-grading.spec.ts`, `frontend/e2e/p2-responsive.spec.ts` y `frontend/e2e/mock/grading-review.mock.spec.ts`.
- `specs/079-captura-docente-directa/`, `specs/README.md` e inventario/gobernanza solo según trazabilidad que corresponda; actualizar intención de 078 como evolución, no duplicar contratos contradictorios.

## Decisiones y complejidad

1. **Resumen en flujo normal**: retirar `lg:sticky`, `lg:bottom-4` y capas destinadas a superposición; ninguna versión flotante en otro breakpoint. Guardado al final de la lista, compacto, sin autosave. Desglose y ayuda cerrados por defecto, con su contenido actual accesible.
2. **Captura contextual, no pantalla nueva**: `modo=carga` en la ruta ya existente de calificaciones con materia y evaluación. «Calificar por foto» y «Notas y entregas» son destinos distintos. La creación de evaluaciones y el detalle de cuatro secciones no se rediseñan.
3. **Alumno elegido explícitamente**: al entrar sin alumno, mostrar las opciones del selector en flujo normal junto al buscador, sin apertura previa ni superponerlas a la evidencia; conservar límite local de opciones y búsqueda. No autoseleccionar al primero. Desde una fila se respeta el alumno elegible.
4. **Único envío con resumen inline**: retirar solo el `ConfirmDialog` redundante de captura, no los diálogos de descarte/reemplazo/publicación. Mostrar alumno, evaluación y fotos ordenadas o «1 PDF» con su nombre; no inferir páginas inexistentes en `EvidencePage`.
5. **Guardas dentro del handler**: revalidar alumno candidato, paquete válido, calidad terminada y bloqueo activo; usar una exclusión síncrona además de `isPending`. Capturar evaluación, alumno, nombre, archivos/orden y rotaciones al pulsar; liberar bloqueo en resultado/fallo. No borrar hojas en error.
6. **Calidad local antes de habilitar**: una imagen con `quality === undefined` aún está siendo analizada; mostrar estado y bloquear el envío hasta el resultado. `warning` conserva el aviso sin paso obligatorio nuevo; `unusable` bloquea; `null` significa análisis no disponible (o documento) y no se confunde con pendiente. No introducir un timeout de IA.
7. **Montaje estable durante refetch**: tras la primera consulta válida, no ocultar/desmontar el panel solo por `isFetching` o error de refresco. Conservar evidencia y aviso de dirty; bloquear envío mientras los candidatos no estén verificados y mostrar estado/reintento. Error inicial sin datos continúa sin habilitar captura.
8. **Aislamiento por contexto**: conservar la `key` por evaluación–alumno–descarte. Cambiar destinatario o evaluación con hojas mantiene el descarte explícito. Tras éxito, limpiar dirty sincrónicamente antes de borrar la selección; guardar el aviso de aceptación en el workspace, identificado por evaluación, para que no desaparezca al remount. No relajar el blocker global.
9. **Callbacks tardíos**: impedir que una selección de cámara/archivo abierta antes del envío ingrese durante pending, y que un análisis antiguo repueble una captura enviada o perteneciente al siguiente alumno. Guardas acotadas al selector y generación/contexto, con pruebas de promesas diferidas.
10. **Pruebas conservadas**: actualizar los pasos del modal únicamente donde ya se esperaba envío real; mantener afirmaciones de destinatarios, paquetes, rotaciones, historial, bloqueos, cola y permisos. No eliminar tests ni aumentar timeouts para ocultar errores.

### Orden previsto y validación

1. Añadir/ajustar regresiones en archivos existentes: panel no superpuesto y compacto; captura directa/modalidad/permiso; envío único/doble pulsación/calidad pendiente; refetch conservando paquete; éxito/error/cambio de contexto.
2. Implementar asistencia sin tocar `attendanceModel` ni sus contratos. Comprobar plegado, búsqueda, pendientes ocultos y payload completo.
3. Implementar entrada contextual y captura usando componentes existentes, guardas y estados previstos. Verificar los dos alumnos y fallo/reintento en la regresión principal actual.
4. Medir cinco tamaños y dos temas, zoom/reflujo 200 %, altura inicial a 390 px y scroll con puntero sobre lista y resumen. La captura normal de una foto válida se mide con cuatro acciones; diálogos del dispositivo se excluyen, no la identidad o el envío explícito.
5. Ejecutar tipos, lint estricto, pruebas unitarias focales, regresiones Playwright focales, auditorías y build; luego mantener las suites obligatorias de CI antes de merge. No efectuar llamadas de IA ni escribir datos de producción para estas pruebas.
6. Actualizar tareas y documentación con evidencia real, ejecutar Analyze/Converge en sus momentos respectivos y abrir PR cuando el trabajo esté listo. Fusión y producción requieren autorización independiente.

**Complejidad**: cambios limitados a componentes existentes y estados de captura; cero nuevos servicios/dependencias. No hay deuda o excepción constitucional nueva. Las decisiones y alternativas están respaldadas en [research.md](./research.md), el modelo en [data-model.md](./data-model.md), la interfaz en [contracts/ui.md](./contracts/ui.md) y la verificación en [quickstart.md](./quickstart.md).

**Precisiones de ejecución (2026-10-01)**: la medición al 200 % encontró desbordamiento en fecha y reporte de asistencia. Se corrigen solo restricciones de ancho/distribución del mismo flujo, conforme FR-012/SC-001; no se cambian comportamientos. La regresión de montaje/refetch se realiza en el workspace real mediante Playwright (`grading-review.mock.spec.ts`); `CalificacionesWorkspace.mobile.test.tsx` conserva sus pruebas unitarias de contexto/acciones/nota. Así se comprueba conservación de archivos y blocker reales, no una sustitución del workspace por mocks de componente.
