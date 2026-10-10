# Plan: criterios de recursos y vista docente compacta

**Rama**: `codex/093-recursos-vista-docente` | **Fecha**: 2026-10-10 | **Spec**: [spec.md](./spec.md) | **Issue**: #196

**Estado**: alcance y plan aprobados por el usuario el 2026-10-10. Checklist y análisis previos a implementación. Sin autorización de fusión o despliegue.

## Resumen

Separar criterios observables de preguntas y soluciones en los 16 tipos evaluables existentes; ocultar reclamos realmente vacíos; compactar las filas de asistencia sin modificar el guardado automático. Reutilizar los contratos y editores actuales, sin migraciones ni cambios retrospectivos en evaluaciones, notas o matrículas.

La validación estructural no certifica por sí sola la calidad pedagógica. El docente conserva la revisión final antes de publicar. No se añadirá una llamada obligatoria de IA por recurso ni se regenerarán preguntas para corregir únicamente criterios.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 en contenedores; TypeScript 5.6 y React 18.
**Dependencias**: FastAPI/Pydantic/SQLAlchemy; React Query, Tailwind, Vitest y Playwright existentes. Sin añadir ni actualizar dependencias.
**Persistencia**: PostgreSQL y JSON de recursos/evaluaciones actuales; Redis/Celery no cambian. Sin nuevas tablas o migraciones.
**Pruebas**: pruebas unitarias de adaptador/conversión/calificación, pruebas de bandeja y guardado automático, E2E mock y controles CI existentes.
**Plataforma objetivo**: navegador Android/iPhone y escritorio; modo claro/oscuro; anchuras 360, 390, 768 y 1280 px.
**Rendimiento y escala**: criterios deterministas cuando no hay propuesta explícita, sin nuevas llamadas de IA; al menos 8 alumnos en 600 px de lista a 1280×800, excluyendo cabecera y observaciones expandidas; controles de al menos 44×44 px. Sin cambiar frecuencia de consultas o cola de guardado.

## Verificación de la constitución

- Separación de roles: conservar comprobaciones de propietario/gestión de materia y filtrado de soluciones para estudiantes. Probar permisos y ausencia de claves en criterios visibles.
- Integridad y trazabilidad: las preguntas siguen siendo los componentes canónicos de nota; los criterios son guía, no una segunda suma. No modificar claves, escala ni registros históricos. Conservar procedencia de criterios y revisión docente.
- Asincronía e idempotencia: mantener retorno de evaluación ya vinculada, transacción de conversión y cola de asistencia por estudiante/revisión. No tocar workers ni procesamiento de evidencias.
- Datos y secretos: sin migraciones, secretos, imágenes de alumnos o producción en la validación. Usar datos sintéticos y pruebas aisladas.
- Accesibilidad: distribución adaptable, nombres identificables, controles etiquetados, teclado, estados de guardado y observaciones accesibles. Sin panel flotante que tape alumnos.
- Gobernanza y pruebas: issue #196 con `spec-approved` y `plan-approved`; checklist, tareas y Analyze antes de implementar, pruebas y Converge después. PR/CI verde y autorización separada antes de fusionar; nunca push directo a main.

Revisión posterior al diseño: sin excepciones constitucionales ni ambigüedades bloqueantes. No hay hooks de extensiones configurados.

## Estructura del proyecto

- `backend/app/modules/herramientas/`: política pura de criterios compartida por generación y conversión; `evaluation_adapter.py`, `service.py`, `content_quality.py` y generadores que descarten criterios explícitos.
- `frontend/src/modules/herramientas/`: `DetailPage.tsx` y `MaterialContentEditor.tsx`, para mostrar propuesta/errores y permitir corregirlos con el editor existente.
- `frontend/src/modules/dashboard/`: `TeacherInbox.tsx` y pruebas de `DashboardPage.test.tsx`.
- `frontend/src/modules/materias/`: presentación de `MateriaAsistencia.tsx`; conservar `useAttendanceAutosave.ts` y su contrato.
- `backend/tests/unit/`, `frontend/e2e/mock/`: ampliar regresiones existentes, no duplicar suites o infraestructura.
- `specs/093-recursos-vista-docente/`: especificación, artefactos de diseño, checklist y tareas posteriores a la aprobación del plan.

## Secuencia de implementación propuesta

1. Criterios: sustituir el respaldo que copia enunciados por una política compartida, consciente del tipo de actividad. Recuperar criterios docentes persistidos y aprovechar criterios de logro válidos existentes. Validar antes de transformar pesos, sin corregir silenciosamente una rúbrica inválida.
2. Propuestas nuevas: conservar preguntas/grillas/soluciones; completar solo la propuesta de criterios. Si es inválida, identificar qué debe corregir el docente en el borrador, sin convertirlo en evaluación lista ni rehacer el material. Un recurso de apoyo no exige rúbrica.
3. Conversión: usar criterios explícitos válidos, respetar los del docente y bloquear conflictos con un mensaje accionable antes de escribir. Mantener la evaluación vinculada existente sin repararla ni validarla retroactivamente. La evaluación nueva permanece dentro de su flujo de revisión/publicación actual.
4. Bandeja: renderizar reclamos solo si hay elementos o un contador positivo. Cero verificado no ocupa una columna; error/carga o contador incoherente conservan estado y recuperación. No ocultar revisiones pendientes de notas.
5. Asistencia: filas compactas en escritorio, disposición sencilla en celular y observaciones desplegables con indicador cuando existen. Mantener input y borrador controlados por la cola actual; búsqueda, fecha, acciones masivas, reintento y navegación protegida no cambian.
6. Verificación focalizada y CI: comprobar contratos, conservación, permisos y matriz visual antes de solicitar merge. No ejecutar pruebas costosas repetidamente durante la fase de diseño.

## Decisiones y complejidad

- Una política pura pequeña evita dos reglas diferentes entre generar y convertir. No reescribir el adaptador de preguntas ni el evaluador.
- Los criterios pueden referenciar números de preguntas para orientar, pero no cambian `pregunta:<numero>` ni la fórmula de nota. Una respuesta objetiva correcta sigue recibiendo su puntaje.
- Distinguir criterio simple de rúbrica con niveles: no inventar niveles o penalizaciones ajenos a lo solicitado. Pesos explícitos defectuosos se rechazan antes de normalizarlos.
- No volver a llamar al generador completo para corregir criterios: modificaría preguntas o grilla. Reutilizar contenido válido y edición docente.
- No recalificar, migrar o arreglar masivamente material histórico. Los cambios aplican a propuestas nuevas y conversiones futuras solicitadas.
- No ocultar fallos de carga bajo «sin reclamos», ni reducir la asistencia a iconos sin texto o blancos táctiles pequeños.

Detalle y decisiones verificadas: [research.md](./research.md), [data-model.md](./data-model.md), [contratos](./contracts/interfaces.md) y [guía de validación](./quickstart.md).
