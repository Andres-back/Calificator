# Investigación: revisión docente compacta

**Fecha**: 2026-09-28 | **Estado**: decisiones de diseño, no implementación.

## Fuentes primarias locales

- `CalificacionesWorkspace.tsx`: detalle, `mobileTab`, `activeBreakdown`, snapshots, apertura de pregunta/hoja, barra móvil y protecciones de navegación.
- `components/GradeBreakdown.tsx`: cajas de respuesta/referencia, navegación por componente, fuentes y valoraciones.
- `types/api.ts`: contratos `GradeComponentData`, `GradeBreakdownData`, `CalificacionDetalle`.
- `MateriaEvaluaciones.tsx` y `MateriaDetailPage.tsx`: acceso ya existente «Calificar y revisar» y pestaña duplicada.
- `ResolverEvaluacionPage.tsx`: consumidor estudiantil de `GradeBreakdown`.
- Tests existentes de revisión explicable, móvil y componentes; sin ejecutar inferencias ni usar datos reales.

## Decisión: reutilizar el centro con detalle progresivo

**Motivo**: el ciclo de notas y edición ya existe. La incomodidad procede de jerarquía y tarjetas, no de falta de endpoints.
**Alternativas**: pantalla nueva o modal por pregunta; rechazados por duplicación, menor espacio y dificultad de mantener borradores.

## Decisión: compactación docente explícita

**Motivo**: `GradeBreakdown` también sirve a estudiantes. Una opción docente evita modificar liberación de referencias, relato motivador o permisos de la vista estudiantil.
**Alternativas**: alterar el comportamiento por defecto o detectar solo ancho; rechazados porque el ancho no identifica el rol.

## Decisión: mostrar únicamente valoración real por criterio

**Motivo**: el componente tiene `tipo`, título y puntos, pero no un peso separado ni relación de pregunta a criterio. El histórico conserva `grader_a.criterios` con datos menos estructurados. No es correcto producir una rúbrica nueva desde preguntas.
**Alternativas**: agrupar por palabras del título o convertir máximo en porcentaje; rechazados porque atribuyen intención no registrada.
**Tratamiento**: rúbrica guardada primero; preguntas como preguntas si no hay rúbrica; valor ausente como «—». No representar ausencia como cero ni sumar preguntas y rúbrica conjuntamente.

**Evidencia adicional**: `backend/app/modules/calificaciones/breakdown_policy.py` crea realmente componentes `rubrica` cuando no hay preguntas y hay criterios puntuados. El máximo puede provenir de puntaje, máximo o peso, pero el contrato no registra cuál; por ello se presentará como máximo, no como peso conocido. `Evaluacion.criterios` es configuración, no valoración del alumno. Tras ajuste docente no se atribuirá al pipeline histórico una valoración vigente recalculada.

## Decisión: conservar borradores, parámetros y scroll normal

**Motivo**: `editingSnapshot`, `version_esperada`, `editingComponentDirty` y bloqueo de navegación ya protegen ajustes. Condicionar el montaje del editor a un panel plegado podría borrar el texto.
**Alternativas**: remount al desplegar o efectos de reinicio en cada refetch; rechazados. La apertura por alerta/enlace debe ocurrir antes de enfocar y los editores activos deben permanecer visibles o pedir descarte explícito.

**Evidencia adicional**: el cleanup de `GradeComponentEditor` informa `onDirtyChange(false)` al desmontarse; plegarlo mediante un render condicional podría tanto borrar el texto como quitar la protección. Preservar también las anclas `grade-component-ID` que utiliza el relato Xali estudiantil.

## Decisión: retirar redundancia sin perder accesos de roles personalizados

**Motivo**: la evaluación ya ofrece una ruta al centro. Un usuario con `grading.read`/`grading.grade` puede no tener `evaluations.read`, por lo que ocultar su única entrada sería una regresión.
**Tratamiento**: ocultar pestaña solo cuando la lectura de Evaluaciones sea autorizada; conservar helper y redirects antiguos, y retorno acorde a permisos.

## Incertidumbres y límites

- No quedan decisiones técnicas bloqueantes; no se propone biblioteca nueva ni cambio de contrato público.
- El objetivo de reducción de altura no está medido todavía: se acreditará con el mismo fixture, ancho y tipografía durante la implementación.
- El teclado real y la comprensión de un docente se validan como comprobaciones físicas distintas de la emulación de viewport; no se declararán realizadas por una captura de navegador.
