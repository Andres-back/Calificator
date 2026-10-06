# Diagnóstico inicial y referentes

Fecha: 2026-10-06. Solo lectura del código y captura del usuario; sin consulta ni modificación de expedientes reales en este trabajo.

## Hallazgos comprobados

- `CalificacionesWorkspace.tsx`: resumen numérico, explicación, advertencia manual y triage se presentan como bloques consecutivos. El texto «No se asignó cero ni se publicó la nota» es genérico y no explica el motivo concreto.
- `review-triage/ReviewTriagePanel.tsx`: la frase «Sin señales de incertidumbre» depende de que no haya excepciones individuales, no de que también estén vacíos los bloqueos generales. Es la contradicción de la captura.
- `review-triage/buildReviewTriage.ts`: `humanizeBlocker` sustituye guiones bajos, pero no traduce motivos como `feedback_quality:nota_global_no_coincide_con_suma`; el código queda expuesto como texto técnico.
- `GradeNoteExplanation` en `CalificacionesWorkspace.tsx`: puntos y nota proporcional se describen por separado y pueden repetir prácticamente la cifra principal. Debe conservarse la diferencia conceptual cuando la escala de puntos y de nota no sean iguales.
- `feedback_quality_guard` en `backend/app/modules/calificaciones/breakdown_policy.py`: compara la nota global del modelo con el cálculo. `breakdown_service.py` conserva trazabilidad y puede usar el cálculo completo como nota sugerida mientras sigue requiriendo revisión. No inferir una nota errónea únicamente de esa advertencia ni eliminar el control.

## Referentes públicos consultados

- [Canvas: What is SpeedGrader?](https://community.instructure.com/en/kb/articles/662775-what-is-speedgrader): evidencia, puntaje, rúbrica y comentarios en una misma experiencia. Adaptación propuesta: un resumen docente y detalles progresivos, especialmente en celular.
- [Gradescope: Grading a Bubble Sheet Assignment](https://guides.gradescope.com/hc/en-us/articles/22065675043341-Grading-a-Bubble-Sheet-Assignment), sección Insights panel: seleccionar avisos para investigar preguntas y acceder a rúbrica o clave. Adaptación propuesta: avisos comprensibles con acciones que llevan al detalle pertinente. No se adoptan sus métricas estadísticas ni se confunden con confianza de LLM.

## Distribución propuesta para aprobación

1. Cabecera compacta: estudiante, evaluación, nota y estado real.
2. Un bloque de revisión cuando sea necesario: qué ocurrió, qué falta y acción concreta; diferenciar aviso general y preguntas afectadas.
3. Explicación breve del cálculo; detalle de escala y ajustes bajo demanda.
4. Secciones progresivas: evidencia; respuestas y puntajes; criterios cuando existan; retroalimentación.
5. Acciones actuales claras, sin barra flotante alta que cubra contenido. Ubicación definitiva se define en el plan aprobado.

Ejemplo del aviso de la captura: «La valoración global de la IA y el cálculo por preguntas no coinciden. Revisa los puntajes antes de confirmar». No mostrar números comparativos si no están disponibles ni afirmar que la discrepancia sigue vigente después de una decisión docente.

## Decisiones de diseño (Plan)

### Reutilizar el detalle actual

- **Decisión**: usar `mobileTab`, `changeDetailView`, `openReviewComponent`, `showEvidencePage` y editor inline existentes, sin rutas ni dependencias nuevas.
- **Razón**: ya proporcionan detalle progresivo, enlaces a pregunta/hoja y protección de borradores; se evita reconstruir el flujo estable.
- **Alternativas**: modal nuevo o pestañas adicionales obligatorias, rechazados por más pasos y riesgo de desmontar un editor con cambios.

### Separar mensaje y política

- **Decisión**: catálogo de presentación dentro de `buildReviewTriage.ts`, preservando clasificador, umbral y datos originales. Avisos A/B, banderas de revisión y clave incompleta también se presentan cuando no existe desglose.
- **Razón**: `globalBlockers` y excepciones ya están separados; el defecto es de presentación. Workspace vuelve a imprimir alertas A/B fuera del triage. Un aviso no debe desaparecer por no haber desglose o texto de alerta.
- **Alternativas**: modificar `feedback_quality_guard`, ocultar bloqueos o generar traducciones con IA, rechazados por integridad y latencia innecesaria.

### Precedencia de estado y trazas

- **Decisión**: cabecera resuelta según estado vigente; `AIPipelineSummary` permanece como detalle técnico si no explica correctamente una decisión docente posterior. No convertir avisos previos en alertas activas ni declarar resuelta una incidencia sin evidencia.
- **Razón**: `gradePresentation` rotula como Confirmada la cifra de una nota publicada; el badge corrige el estado pero produce dos descriptores. La traza de pipeline tampoco conoce el estado vigente.
- **Alternativas**: sobrescribir resultado histórico o borrar avisos después de confirmar, rechazados por pérdida de trazabilidad.

### Scroll y guardado

- **Decisión**: conservar cadena de alturas del overlay móvil y su único scroll; conservar `useBodyScrollLock` y recuperación al cerrar. Mantener snapshots/versiones, `useBlocker`, `beforeunload` y protección de edición.
- **Razón**: el overlay usa altura dinámica y la barra inferior espacio reservado. Cambiar claves o desmontar editores puede limpiar estado dirty; verificar altura de barra, teclado, zoom y contenido largo, no solo ancho.
- **Alternativas**: segundo contenedor de scroll fijo o barra de avisos sticky, rechazados por antecedentes de bloqueo/tapado.

### Regresión focalizada, luego CI

- **Decisión**: extender suites actuales de triage, presentación y edición; después E2E mock, accesibilidad y capturas. Revisar snapshots antes de aceptar cambios.
- **Razón**: investigación paralela de código solicitada por Plan confirmó selectores obsoletos en pruebas visuales/accesibilidad: «Resumen de la valoración» y «Ver notas por respuesta» no corresponden al Workspace actual. Accesibilidad exige 40 px, pero este alcance exige 44 px y ambos temas.
- **Alternativas**: asumir que las pruebas actuales certifican el diseño o quitarlas, rechazados. Alinear contrato y comprobar ejecución real.

## Pendiente

El alcance fue aprobado el 2026-10-06. Revisar y aprobar el plan antes de Tasks e implementación. Sin cambios funcionales ni despliegue durante esta fase. No hay decisiones críticas o marcadores de aclaración pendientes.
