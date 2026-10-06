# Diagnóstico inicial de los seis puntos

Fecha: 2026-10-05. Revisión estática, no prueba nueva en producción.

Base: `origin/main` confirmado en `8ccedc5ea4aec6bd31f4abd93ca47c8aa21f8687`.

## Vista previa

`frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx` carga un PDF y lo incrusta en un `iframe`. No renderiza páginas ni preguntas dentro de la aplicación por otro mecanismo. «Abrir PDF» es su alternativa explícita, consistente con el problema reportado. La ausencia de visor móvil no debe confundirse con que la evaluación carezca de preguntas.

## Criterios después de digitalizar

`DigitalizarEvaluacionModal.tsx` envía archivo, materia, nombre, escala, modalidad y descripción. No ofrece selección de criterios ni edición de rúbrica.

`generationWizardModel.ts`, función `evaluationToWizardState`, abre una evaluación existente en el paso 5. La selección de criterios de materia está en el paso 2 de `GenerationWizard.tsx`, mientras la rúbrica editable en el paso 5 depende de `state.useRubric`. Por ello la capacidad existente puede quedar oculta o ser difícil de descubrir en un examen digitalizado. Debe evitarse regenerar preguntas por el solo hecho de editar criterios.

## Saturación en materias

`MateriaDetailPage.tsx` muestra encabezado grande, icono, estado, área/grado, contador y descripción sobre la navegación móvil. `MateriaVistaGeneral.tsx` añade una ruta guiada, recomendación y acciones frecuentes antes del código de inscripción y alumnos. Hay mensajes de apoyo y controles repetidos. Se pueden compactar sin eliminar las capacidades de las otras secciones ni ocultar errores.

## Credenciales y altas manuales

`RosterCredentials.tsx` ya ofrece «Imprimir», pero llama a `window.print()` sobre toda la página y no define por sí mismo fichas privadas o aislamiento de impresión. Las claves nuevas se muestran una sola vez.

`RosterImportDialog.tsx` solo ofrece foto y confirmación revisada. `ExistingStudentsDialog.tsx` matricula cuentas ya existentes. En los controles revisados de la vista general no hay alta manual docente nueva por nombre.

Existe renovación de clave temporal en `rosterImportApi.ts`, expuesta desde la vista general. El servidor la restringe en `backend/app/modules/importacion_estudiantes/service.py`: debe conservarse su ámbito y protegerse de cambios involuntarios al imprimir. No se guarda la clave en texto recuperable.

## Perfil

Existe `PATCH /users/me` en `backend/app/modules/users/router.py` para nombre, correo y contraseña. La actualización valida correo único e incrementa versión de autenticación al cambiar contraseña. El menú de cuenta de `Topbar.tsx` no enlaza un editor de perfil, y no se identificó una página propia en `router.tsx`.

El contrato actual de actualización propia no incluye contraseña actual. Habilitar una interfaz para cambios sensibles necesita definir reautenticación y continuidad de sesión antes de implementarla, sin afectar el flujo administrativo de usuarios.

## Conservación

No se han cambiado datos productivos, código funcional, modelos, notas, usuarios ni credenciales. La siguiente fase debe reutilizar estos componentes y cubrirlos con regresiones dirigidas en celular, sin efectuar altas reales para probar la interfaz.
