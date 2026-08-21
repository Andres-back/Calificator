# Validación ejecutada — 2026-08-21

## Resultado

La implementación se mantiene en adopción controlada: genera y muestra el desglose, pero `EXPLAINABLE_GRADING_AUTHORITY_ENABLED=false` conserva como autoridad el cálculo vigente. Solo una edición explícita del profesor recalcula la nota oficial.

## Evidencia automatizada

- Backend completo: `463 passed, 1 skipped`; incluye sanitización, visibilidad por rol, modalidades, modo salón, idempotencia, historial y edición versionada.
- Frontend: TypeScript y ESLint sin errores; `49` archivos y `186` pruebas Vitest pasan.
- E2E dirigido: `5 passed` en 360×800, 390×844, 768×1024, 1366×768 y recorrido estudiantil con reclamo por componente; sin desbordamiento horizontal.
- Build Vite de producción: completado.
- Imágenes Docker `tesis-backend` y `xcalificator-web`: construidas correctamente.
- Docker Compose de producción: configuración válida.

## Migración

La imagen de migraciones fue reconstruida y se ejecutó sobre PostgreSQL 16:

1. `202608140002 -> 202608210001` — correcto.
2. `downgrade -1` a `202608140002` — correcto.
3. `upgrade head` a `202608210001` — correcto.

Se verificó la existencia de `calificacion_desgloses`, `calificacion_componentes`, `calificacion_ajustes` y las columnas nullable `componente_id` y `desglose_version` en incidencias.

## Estabilidad y costo determinista

Diez ejecuciones equivalentes de cinco componentes produjeron siempre `5.00`. Mediana del consenso y fórmula: `0.0516 ms`; máximo: `0.1211 ms`. Este costo local es despreciable frente a la llamada ya existente a los proveedores de IA y no añade otra llamada de modelo.

## Seguridad académica comprobada

- DBA permanece como contexto y no genera puntos.
- Una rúbrica solo crea componentes si tiene peso/puntaje explícito.
- Respuestas objetivas verificadas conservan puntaje completo.
- Preguntas sin valoración quedan pendientes; no se convierten en cero.
- Campos desconocidos, prompts y razonamiento privado se eliminan antes de persistir.
- El DTO estudiantil oculta referencias y valoraciones independientes en servidor.
- En modo controlado, el DTO estudiantil también oculta cualquier desglose que no reproduzca exactamente la nota oficial.
- Notas históricas siguen visibles sin fabricar un desglose retroactivo.
- La actualización docente exige motivo interno y explicación estudiantil, crea versión nueva y rechaza versiones obsoletas con 409.
- El ajuste global queda como línea separada; el estudiante recibe su explicación pedagógica, nunca el motivo interno.
- El historial identifica versión, vigencia, origen, fecha, nota y docente actor.

## Despliegue progresivo

1. Desplegar con generación activa y autoridad desactivada.
2. Revisar una muestra docente comparando la nota vigente y `nota_calculada` del desglose.
3. Mantener bloqueada la autoridad mientras exista cualquier diferencia no explicada.
4. Activar autoridad mediante un cambio futuro especificado y aprobado, no en este PR.
