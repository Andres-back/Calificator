# Plan: calificación móvil y digitalización segura

**Rama**: `codex/063-mobile-grade-digitization` | **Fecha**: 2026-09-23 | **Spec**: [spec.md](./spec.md)

## Resumen

Eliminar el bloqueo perceptible de la búsqueda móvil con entrada local inmediata, consulta diferida y resultados estables; reemplazar el selector de estudiantes del cargador por un selector buscable. En backend, sanear la transcripción y verificar las claves aritméticas sobre el enunciado final normalizado antes de persistir el borrador.

## Contexto técnico

**Lenguajes**: Python 3.11 y TypeScript/React 18  
**Dependencias**: FastAPI, React Query, React Router, Tailwind CSS  
**Persistencia**: PostgreSQL existente; sin cambios de esquema  
**Pruebas**: pytest, Vitest/Testing Library y Playwright CLI  
**Plataforma**: Web responsiva, prioridad 360×800 y 390×844  
**Rendimiento**: una consulta de búsqueda tras 300 ms de inactividad; escritura sin espera de red  
**Restricciones**: preservar evaluaciones históricas, contratos públicos y flujo asíncrono actual

## Comprobación constitucional

- **Roles**: el cambio permanece limitado al docente y reutiliza permisos existentes.
- **Trazabilidad de calificación**: las correcciones automáticas de clave generan advertencia visible y siguen requiriendo revisión humana.
- **Procesamiento recuperable**: no se cambia la cola ni la idempotencia de calificación.
- **Evolución segura**: no hay migración ni reescritura histórica.
- **Accesibilidad móvil**: objetivos táctiles de 44 px, etiquetas accesibles y validación en viewports móviles.
- **IA configurable**: no se fija proveedor ni modelo; la verificación aritmética es determinista.
- **Calidad**: regresiones automatizadas y validación visual antes del PR.

## Causa raíz

1. `CalificacionesWorkspace` incorpora el texto crudo en la clave de React Query, por lo que cada pulsación cancela/crea una petición y sustituye el estado de la lista.
2. `GradingUploadPanel` usa un `select` con toda la matrícula, sin búsqueda ni información del resultado seleccionado.
3. La extracción visual etiqueta respuestas manuscritas, pero el texto completo todavía llega al estructurador y al recuperador local.
4. La normalización acepta la clave del modelo sin volver a contrastar operaciones deterministas contra el enunciado final que será persistido.

## Diseño

### Frontend

- Mantener `searchTerm` como valor inmediato del campo y derivar `debouncedSearchTerm` a 300 ms para la consulta.
- Conservar los datos anteriores durante una actualización para evitar parpadeo, mostrando un indicador no bloqueante.
- Añadir en el cargador un campo buscable con lista de coincidencias, selección explícita, limpieza y estado vacío.
- Mantener la protección actual cuando existen hojas seleccionadas y la compatibilidad con un estudiante preseleccionado desde la lista.

### Backend

- Sanear marcas `[RESPUESTA DEL ESTUDIANTE: …]` antes de estructurar, recuperar o reparar claves.
- Sanear también el enunciado normalizado como última barrera.
- Después de normalizar preguntas y la clave propuesta, calcular únicamente respuestas objetivas deterministas desde cada enunciado final.
- Reemplazar discrepancias verificables y anexar una advertencia; no tocar preguntas abiertas.

## Contratos y datos

- Sin cambios en endpoints, tablas ni esquemas públicos.
- `reglas_feedback.advertencias` puede incluir una advertencia adicional ya admitida por el contrato existente.
- La evaluación histórica de Edby no será modificada por despliegue ni migración.

## Estructura afectada

```text
frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx
frontend/src/modules/materias/MateriaCalificar.tsx
frontend/src/modules/materias/MateriaCalificar.test.tsx
frontend/src/modules/calificaciones/CalificacionesWorkspace.test.tsx
backend/app/modules/evaluaciones/digitalize_service.py
backend/tests/unit/test_evaluation_digitalization.py
specs/063-mobile-grade-digitization/
```

## Riesgos y mitigaciones

- **Buscar menos de lo esperado**: el filtro sigue siendo remoto y cubre toda la matrícula paginada.
- **Sobrescribir respuestas abiertas**: la verificación solo actúa cuando el enunciado puede resolverse de forma determinista.
- **Eliminar contenido impreso**: el saneamiento se limita a etiquetas explícitas de respuesta estudiantil.
- **Cambiar datos previos**: no se incluye migración ni tarea de reparación masiva.
