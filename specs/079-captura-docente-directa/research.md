# Investigación: captura directa y asistencia no superpuesta

**Fecha**: 2026-10-01 | **Issue**: #165 | **Estado**: diseño, sin implementación ni pruebas ejecutadas en esta fase.

La investigación utiliza el código y pruebas actuales de la rama basada en main. No exige tecnología externa ni cambio de versiones. La investigación delegada de solo lectura confirma los riesgos de captura; las decisiones se consolidan aquí.

## 1. Resumen de asistencia

- **Decisión**: flujo normal en todas las anchuras y estadísticas/ayuda progresivas.
- **Motivo**: `MateriaAsistencia.tsx` todavía tiene `lg:sticky lg:bottom-4`; el test de scroll de `p2-responsive.spec.ts` solo comprobaba 390 px. No es un fallo de datos o de guardado.
- **Alternativas**: reducir tamaño conservando sticky deja el riesgo de tapar filas; un resumen flotante distinto añade complejidad. Se descartan ambos.
- **Reutilización**: `summarizeAttendanceDraft`, `buildAttendancePayload`, guardas de fecha/salida y acciones globales permanecen intactos.

## 2. Entrada desde la evaluación

- **Decisión**: dirigir el nuevo acceso a la ruta de revisión existente con `modo=carga`, contexto explícito y permisos/modalidades actuales.
- **Motivo**: el workspace ya interpreta este modo y renderiza `GradingUploadPanel`; hoy el botón «Notas y entregas» exige abrir después «Añadir entregas».
- **Alternativas**: pantalla o ruta nuevas duplican carga, permisos y navegación. Usar el mismo nombre para consulta/captura confunde la finalidad. No se introduce ninguna.

## 3. Envío único y doble pulsación

- **Decisión**: mostrar resumen inline, enviar desde un handler validado con bloqueo síncrono y `isPending`, capturando identidad, archivos ordenados y rotaciones.
- **Motivo**: `MateriaCalificar.tsx` repite el envío en `ConfirmDialog`; depender solo de un rerender puede dejar una ventana de doble activación al quitarlo.
- **Alternativas**: envío automático al tomar la foto elimina la revisión de identidad; mantener el modal no cumple la reducción aprobada. Se mantiene la decisión explícita, no su repetición.
- **Contrato**: `calificarFoto` envía `evaluacion_id`, `estudiante_id`, archivos `foto` y `rotaciones`; no se modifica el multipart ni el endpoint.

## 4. Conteo y calidad de evidencia

- **Decisión**: contar fotos; para documento mostrar «1 PDF» sin afirmar número de páginas. Esperar el análisis local de imágenes para habilitar envío.
- **Motivo**: `EvidencePage` tiene `id`, `file`, `rotation` y `quality`, sin `pageCount`. El picker emite las páginas antes de terminar `analyzeEvidenceImage`, de modo que `undefined` distingue pendiente de `null` (documento/sin canvas) y `unusable` (incluido fallo al abrir imagen).
- **Alternativas**: añadir lector PDF o nueva dependencia no es necesario; habilitar envío mientras se analiza podría saltarse los controles al eliminar la espera incidental del diálogo.
- **Límites**: conservar hasta diez fotos, un solo PDF, tamaños actuales, no mezcla foto/PDF, deduplicación local, orden, rotación, vista previa y reemplazo.

## 5. Refetch y borrador de captura

- **Decisión**: mantener montaje después de primera consulta válida y congelar el envío cuando se revalidan candidatos o falla el refresco.
- **Motivo**: la condición actual `isSuccess && !isFetching` desmonta el panel en una consulta de fondo, puede borrar hojas y ejecutar cleanup de dirty. La consulta inicial fallida sí debe seguir bloqueando la captura.
- **Alternativas**: quitar refetch oculta entregas de otro proceso; ignorar el resultado permitiría cargar candidatos ya enviados. Se mantiene actualización sin perder el borrador.

## 6. Contexto, aceptación y callbacks tardíos

- **Decisión**: conservar aislamiento keyed por evaluación/alumno/descarte, limpiar dirty antes de navegación aceptada y mostrar aviso de éxito en el workspace por evaluación. Bloquear entradas tardías y resultados de análisis ajenos a la generación actual.
- **Motivo**: `savedName` vive dentro del panel que cambia de key al borrar alumno; puede desaparecer. El blocker consulta `dirtyRef` antes de que se ejecute el efecto de limpieza. Los inputs ocultos y callbacks del selector requieren protección aunque sus botones estén disabled.
- **Alternativas**: quitar la key sin un reset equivalente puede transferir hojas entre alumnos; desactivar globalmente el blocker elimina una protección útil. Ninguna se adopta.

## 7. Cobertura reutilizable

- **Decisión**: ampliar suites existentes, sin retirar afirmaciones ni llamar modelos reales.
- **Motivo**: `explainable-grading.spec.ts` ya prueba dos paquetes y error/reintento con propietarios `s1`, `s2`, `s2`, exclusión del aceptado y jobs persistidos; también conserva contexto al volver de captura. `MateriaCalificar.test.tsx` cubre alumno/éxito/error; `MultiPageEvidencePicker.test.tsx` cubre orden, rotación, cámara, reemplazo y límites. Faltan envío único/doble clic, calidad pendiente, refetch estable y callbacks tardíos.
- **Alternativas**: sustituir por tests nuevos sin regresiones pierde garantías; medir con alumnos reales no se necesita para comprobar UI y persistencia de paquetes.

## Cierre de investigación

Sin incógnitas técnicas pendientes ni cambios de arquitectura. Los hallazgos se incorporan como salvaguardas del plan; no son correcciones ya implementadas. El plan debe aprobarse antes de generar y ejecutar tareas.
