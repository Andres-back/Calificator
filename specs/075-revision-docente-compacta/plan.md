# Plan: Revisión docente compacta y progresiva

**Rama**: `codex/075-revision-docente-compacta` | **Fecha**: 2026-09-28 | **Spec**: [spec.md](./spec.md) | **Issue**: [#158](https://github.com/Andres-back/Calificator/issues/158)

**Estado**: Diseño preparado, pendiente de aprobación humana; implementación no iniciada.

## Resumen

Reorganizar el centro existente desde sus componentes actuales. En celular, el detalle del alumno empieza con resumen de nota, estado, alertas y criterios disponibles, seguido de accesos «Ver notas por respuesta» y «Ver evidencia». El detalle de una respuesta compara estudiante y referencia en una sola superficie compacta y conserva el editor contextual. No se crea otro workspace, store ni proceso de IA.

En la materia, el acceso habitual pasa por cada evaluación no borrador. Se oculta la pestaña redundante «Calificar» cuando el usuario puede leer Evaluaciones; el rol personalizado sin ese permiso conserva la entrada actual. Las rutas anteriores permanecen y siguen convergiendo al centro.

## Contexto técnico

**Lenguajes/versiones**: TypeScript 5.6, React 18.3 y React Router 7, según las versiones vigentes del frontend.
**Dependencias**: Componentes UI y Tailwind existentes, TanStack Query, estado local React y parámetros de búsqueda actuales. Ninguna dependencia nueva.
**Persistencia**: Ninguna migración, tabla o endpoint nuevo. `CalificacionDetalle`, `GradeBreakdownData` y los borradores actuales son las fuentes de datos.
**Pruebas**: Vitest/Testing Library y Playwright existentes; pruebas focales durante implementación, CI completo antes del merge. Datos sintéticos exclusivamente.
**Plataforma objetivo**: Navegador móvil y escritorio en las cinco resoluciones de la especificación, claro/oscuro; comparación con comportamiento estudiantil compartido.
**Rendimiento y escala**: Plegar/desplegar no inicia inferencias ni descarga evidencia de otros alumnos. Se mantienen búsqueda diferida y selección paginada. Para respuestas de uno a tres dígitos, medir reducción de altura de al menos 30 % en el mismo caso a 360 px, sin achicar tipografía o controles para alcanzarla.

## Verificación de la constitución

- Separación de roles: cumple en diseño. La compactación docente será opt-in de `GradeBreakdown`; el consumidor `student` conserva liberación de referencias y ausencia de controles docentes. Los botones siguen los permisos actuales.
- Integridad y trazabilidad: cumple en diseño. Se reutilizan `updateGradeBreakdown`, versión esperada, snapshots de edición, conflictos, suma e historial; no hay recálculo local alternativo ni recalificación de registros.
- Asincronía e idempotencia: cumple en diseño. Se conservan cola, estados de procesamiento y reintentos; abrir una sección es exclusivamente una interacción de presentación.
- Datos y secretos: cumple en diseño. Sin cambios persistidos ni uso de evidencia real; capturas y mocks sintéticos.
- Accesibilidad: cumple en diseño. Botones con `aria-expanded`/`aria-controls`, foco al panel abierto, controles de 44 px y flujo normal de documento. No se añaden modales ni paneles sticky altos.
- Gobernanza y pruebas: especificación aprobada con `spec-approved`. Plan pendiente; Checklist, Tasks, Analyze e Implement siguen después de su aprobación. PR y CI requeridos, sin push directo a main ni despliegue en esta fase.

La comprobación posterior al diseño mantiene estos mismos gates. Ninguna excepción constitucional ni ampliación de permisos.

## Estructura del proyecto

- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx`: resumen, criterios disponibles, secciones progresivas, retorno contextual y coordinación de borradores/foco.
- `frontend/src/modules/calificaciones/components/GradeBreakdown.tsx`: variante docente compacta y selección con puntaje/estado; experiencia estudiantil intacta por defecto.
- `frontend/src/modules/materias/MateriaEvaluaciones.tsx`: acción contextual principal según lectura/calificación y estado.
- `frontend/src/modules/materias/MateriaDetailPage.tsx`: menú sin pestaña redundante en el recorrido habitual, manteniendo fallback autorizado.
- `frontend/src/config/routes.ts`: solo si se requiere enriquecer el helper existente con materia opcional; compatibilidad de sus llamadas actuales. No retirar rutas ni redirects.
- Pruebas existentes `CalificacionesWorkspace.mobile.test.tsx`, `components/GradeBreakdown.test.tsx`, `components/GradeComponentEditor.test.tsx`, `MateriaEvaluaciones.test.tsx`, `MateriaDetailPage.test.tsx`, `frontend/e2e/explainable-grading.spec.ts` y `frontend/e2e/p2-responsive.spec.ts`: ampliar casos aplicables, no replicar suites.
- Especificaciones responsables 008/016/033, índice, baseline e inventario: actualización de trazabilidad cuando se implemente. Backend, modelos, prompts y migraciones fuera de alcance.

Se favorecerán helpers locales y archivos existentes. La documentación de diseño requerida por Spec Kit no justifica crear un segundo sistema de revisión.

## Decisiones y complejidad

1. **Resumen móvil como estado inicial**: ampliar la selección de presentación del detalle a resumen/respuestas/evidencia. En escritorio ancho se conserva comparación junto a evidencia. El despliegue de secciones se mantiene por `cal.id`, no se reinicia por cada refetch.
2. **Una instancia de los editores**: el editor de pregunta, el global y la retroalimentación mantienen estado/snapshot. Ocultar paneles no desmonta un editor con cambios; plegar, cambiar pregunta/alumno o regresar pasa por las protecciones existentes. Un editor activo se despliega de forma visible.
3. **Enlaces y alertas coordinados**: `openReviewComponent`, el acceso de PQRS y un enlace entrante con `pregunta` abren la revisión antes de enfocar; el salto se programa después del render. No usar un efecto que reabra continuamente el panel por un parámetro que el docente decidió mantener al plegar.
4. **Comparación breve sin tarjetas apiladas**: superficie compartida con filas etiquetadas «Estudiante» y «Referencia», valores de altura natural y separación discreta. Los textos largos usan ajuste de línea y contenido completo; el cero escrito es válido. El puntaje y «Ajustar» permanecen junto a la pregunta.
5. **Criterios sin fabricar pesos**: usar componentes `tipo === 'rubrica'` con título/puntaje/máximo. Si solo hay preguntas, mostrar un resumen de puntos por pregunta con aviso de valoración por criterio no disponible. Sin desglose se puede mostrar `grader_a.criterios` guardado, validando nombres y números; valores ausentes se muestran como «—», no cero. Identificar ese contenido como valoración inicial/histórica cuando proceda: un ajuste global docente no significa que sus criterios originales hayan sido recalculados. El contrato actual no contiene un peso separado: no inventarlo.
6. **Información avanzada progresiva**: fórmula, verificaciones/modelos, fuentes, historial, liberación de referencias y PQRS se agrupan sin eliminar funciones. Retroalimentación abre su editor existente. Bloqueos, procesamiento y presencia de reclamos no dependen de expandir esas secciones.
7. **Navegación en contexto**: tarjeta con «Calificar» para `grading.grade` o «Revisar notas» para lector autorizado. Conservar recepción abierta/cerrada y edición/publicación separadas. «Volver a evaluaciones» usa la materia resuelta y permiso de lectura; el rol sin ese permiso mantiene acceso y retorno autorizado equivalente.
8. **Pruebas proporcionales**: medir el caso de respuestas cortas antes/después con Playwright en datos sintéticos; probar el recorrido de 0.7/1 y conflicto en mocks, roles, enlace directo, textos largos y scroll/teclado. CI completo una vez el cambio esté listo; no llamadas reales de IA para validar este cambio visual.

Alternativas rechazadas: nuevos modales por respuesta (foco/scroll y espacio), un segundo centro de calificación (duplicación), eliminar redirects (enlaces rotos), ocultar toda alerta (riesgo docente), resumir criterios inventando agrupaciones (falsa transparencia) y desmontar editores al plegar (pérdida de borradores).

## Fases de entrega y aprobación

1. Diseño y aprobación de plan: este documento, investigación, modelo de presentación, contrato UI y guía de validación. Sin cambio funcional.
2. Tras `plan-approved`: Checklist, Tasks y Analyze; resolver inconsistencias antes de implementar.
3. Implementación incremental: resumen y secciones; comparación/edición; accesos desde evaluación; funciones avanzadas y regresión.
4. Validación focal, medición y trazabilidad; Converge; PR enlazado a #158 y CI completo.
5. Fusión/despliegue solo cuando se autorice y los controles estén verdes. Verificación productiva de lectura sin cambiar notas reales.

## Artefactos de diseño

- [Investigación](research.md): fuentes locales, decisiones y riesgos.
- [Modelo de presentación](data-model.md): proyecciones y estado efímero, sin esquema nuevo.
- [Contrato UI](contracts/revision-progresiva.md): interacciones, permisos y compatibilidad.
- [Validación](quickstart.md): escenarios y comandos previstos; no resultados ficticios.
