# Validación: asistencia y captura directa

**Estado**: implementación local verificada el 2026-10-01; PR y CI en preparación. No se ha fusionado ni desplegado 079.

## Preparación

- Usar la rama `codex/079-captura-docente-directa` y el contexto `.specify/feature.json` correspondiente.
- Dependencias existentes instaladas; no se necesitan credenciales de IA ni alumnos reales.
- Fixtures: profesor autorizado, lectura sin gestión, estudiante, evaluaciones papel/mixta/online/borrador, grupos de 30/100 alumnos, notas anteriores, fotos válidas/inutilizables y documento sintéticos.
- Completar Checklist/Tasks/Analyze después de aprobación humana y antes de implementar.

## Regresiones focales

Desde `frontend/`:

```powershell
npm run typecheck
npm run lint:strict
npx vitest run src/modules/materias/MateriaCalificar.test.tsx src/modules/materias/MateriaEvaluaciones.test.tsx src/modules/materias/attendanceModel.test.ts src/components/evidence/MultiPageEvidencePicker.test.tsx src/modules/calificaciones/CalificacionesWorkspace.mobile.test.tsx --maxWorkers=1
npm run test:e2e -- explainable-grading.spec.ts p2-responsive.spec.ts
npm run test:mock -- grading-review.mock.spec.ts
npm run audit:actions
npm run build
npm run audit:build
```

Antes de merge, también mantener suites unitarias/frontend/backend, gobernanza y construcción Docker de CI en verde. Actualizar solo selectores y pasos legítimamente cambiados por este alcance; no retirar afirmaciones, saltar pruebas ni ampliar timeouts para silenciar fallos.

## Casos de aceptación

1. Asistencia de 30 alumnos, cinco tamaños y ambos temas: recorrer filas con rueda sobre el contenido y resumen; comprobar posición normal y que ninguna fila o control queda tapado. Repetir al 200 % de zoom/reflujo documentando el método; no considerar un cambio de densidad de píxeles como prueba de zoom. A 390 px y zoom 100 % medir resumen cerrado ≤160 px para cifras de hasta dos dígitos; al ampliar zoom se exige acceso/reflujo, no idéntica altura física.
2. Marcar presente/ausente/tarde/excusa y añadir observación; buscar, limpiar, expandir/cerrar detalle/ayuda y comprobar borrador completo. Con un pendiente oculto no guarda; lista completa envía todos los alumnos. Guardado/error/salida/fecha mantienen reglas actuales.
3. Tarjeta papel/mixta autorizada: clic «Calificar por foto», alumno visible, seleccionar evidencia en dispositivo, «Enviar a calificar». Medir cuatro acciones de aplicación, excluyendo escritura de búsqueda y pasos del selector/cámara del dispositivo. No hay elección repetida de materia/evaluación ni modal de confirmación.
4. Online/borrador/lector/estudiante: sin nuevo acceso de captura; «Notas y entregas» y permisos previos funcionan.
5. Enviar una foto, varias fotos con rotación y un PDF. Comprobar dueño y contenido/orden/rotaciones exactos; PDF se identifica como documento, no como página fabricada. Calidad pendiente bloquea y al terminar conserva advertencias o bloqueo inutilizable.
6. Mantener promesa de envío pendiente, doble activar, intentar cambiar alumno/hojas y resolver. Un único request; aceptación excluye candidato y conserva aviso/monitor sin publicar. Repetir con dos alumnos y fallo/reintento usando el paquete exacto guardado.
7. Refetch de candidatos con hojas preparadas: no desmonta ni pierde archivos/dirty; muestra actualización y no permite enviar hasta validar. Error inicial bloquea; error de refresco conserva hojas y ofrece reintentar.
8. Salir o cambiar contexto con hojas requiere descarte; cancelar conserva paquete y aceptar no transfiere hojas al nuevo alumno. Éxito no dispara falso descarte. Cámara y análisis tardíos no añaden hojas durante envío ni repueblan una captura aceptada.
9. Consultar resultado: nota/explicación y cuatro secciones progresivas siguen disponibles; ningún request de confirmar/ajustar/publicar por abrir, filtrar o subir evidencia.

## Producción y cierre

La fase actual no toca producción. Tras implementación, evidencia de tests y PR, obtener autorización separada de fusión/despliegue. Verificar commit, salud y navegación de lectura con cuenta demo; no usar registros reales para probar envíos o asistencia sin consentimiento específico.

## Evidencia ejecutada (2026-10-01)

- TypeScript y lint estricto: verdes. Auditoría de acciones: 397 botones y 117 enlaces con propósito; build y auditoría pública: verdes en la pasada local. Vite conserva el aviso previo de un chunk inicial >500 kB; no se añaden dependencias ni se amplía el alcance a dividir el bundle.
- Unitarias completas: 449/449 en la pasada general; tras añadir la protección de éxito tardío, 43/43 focales de seis archivos y 11/11 del panel, incluido envío PDF y request sin duplicados. CI ejecutará de nuevo la suite completa del commit final.
- Navegación/nota/revisión: 52 casos anteriores pasaron en `p2-responsive` + `explainable-grading`; la primera pasada detectó seis fallos nuevos de zoom en asistencia. Se corrigieron restricciones de ancho de fecha/reporte y se repitieron los diez casos de resumen: 10/10 verdes, cinco tamaños y dos temas.
- Medición a 390 px, tema oscuro: resumen cerrado **142 px**, sin sticky/fixed. Captura PNG sintética en `output/playwright/teacher-flow/attendance-079-390-dark.png`. Los detalles se abren/cierran con Enter.
- Zoom: `document.documentElement.style.zoom = '2'`, que amplía contenido y requiere reflujo; se comprueba scroll/client width, resumen en flujo normal y botón accesible. No se usa `deviceScaleFactor` como sustituto. Es una comprobación de zoom de contenido en Chromium, no certificación de zoom nativo en iPhone/Brave.
- Regresiones docentes existentes simuladas: 10/10, incluido guardado de asistencia con **100 alumnos**, un estado/observación filtrado y todos los pendientes. La nueva captura pasó por separado con actualización bloqueada/fallida, reintento, mismo archivo y blocker real del historial.
- Recorrido normal de captura: cuatro acciones de aplicación (acceso desde tarjeta, elegir alumno, abrir selector/cámara, enviar). Escritura y diálogo del dispositivo no se cuentan; recuperar un error puede requerir acciones adicionales. Opciones iniciales visibles, sin selección automática ni modal repetido.
- Dos paquetes y fallo/reintento: destinatarios `s1`, `s2`, `s2`; bytes de imagen, nombres, orden y rotaciones `[0,90]`/`[0]` comprobados en multipart. Jobs persisten tras recarga; aceptación no abre falso descarte ni publica notas.
- No se invocaron proveedores de IA ni se alteraron usuarios, asistencias, entregas o notas de producción. Backend, contratos multipart, base de datos, escala y publicación no cambian.

Inventario técnico regenerado por su herramienta existente: 565 superficies, mismos contratos y nuevas referencias de pruebas de captura; `--check` verde. Se incorpora 079 al registro de especificaciones de la prueba de gobernanza existente, sin omitir verificaciones: **41/41 pruebas de gobernanza verdes**. `git diff --check` sin incidencias.

Converge (2026-10-01): 19 requisitos, 16 escenarios de aceptación, 10 decisiones del plan y 8 principios constitucionales revisados; cero hallazgos de implementación ausente, parcial, contradictoria o ajena al alcance. No se añade una fase vacía ni tareas nuevas. Las 16 tareas de implementación/validación/preparación del PR quedan completas. El build final y su auditoría pasan, y la última captura focal también pasa con selección por Enter y objetivo táctil ≥44 px.

Pruebas backend, contenedores y suite completa final quedan bajo CI obligatorio antes de cualquier merge. Estas tareas completas no equivalen a aprobación de fusión, resultado verde de CI ni despliegue: los tres siguen sujetos a sus controles independientes.
