# Plan: materia móvil y cola discreta

**Rama**: `codex/105-materia-movil-cola` | **Fecha**: 2026-10-18 | **Spec**: [spec.md](./spec.md) | **Issue**: [#218](https://github.com/Andres-back/Calificator/issues/218)

## Resumen

Simplificar Crear materia en celular, reutilizando el comportamiento de escritura móvil existente; convertir el monitor «Calificando en segundo plano» en un indicador compacto ampliable sin afectar los trabajos. Sustituir únicamente el aviso de éxito redundante del borrador de evaluación por una señal contextual. Especificación y plan aprobados por el usuario el 2026-10-18, junto con autorización de revisar la lista y continuar.

## Contexto técnico

**Lenguajes/versiones**: TypeScript y React 18 del proyecto.
**Dependencias**: Modal, Field, Button, useMobileFormViewport, React Query y seguimiento de trabajos existentes; sin paquetes nuevos.
**Persistencia**: formulario y presentación en frontend; pendientes locales aislados por cuenta cuando corresponda, con recuperación autorizada desde servidor. Sin migraciones de base de datos.
**Pruebas**: Vitest y Playwright con datos sintéticos; Chromium/WebKit, 360/390/1440 px y ambos temas.
**Plataforma objetivo**: navegador móvil Android/iPhone y computador; emulación no equivale a prueba física.
**Rendimiento y escala**: minimizar no añade envíos, consultas ni llamadas de IA; conserva el intervalo actual de seguimiento y admite varios trabajos/lotes.

## Verificación de la constitución

- Separación de roles: conservar permisos y no mostrar trabajos de otra cuenta; probar cambio de sesión y respuestas tardías.
- Integridad y trazabilidad: ninguna acción visual modifica notas, evidencias, criterios ni identidades de trabajo.
- Asincronía e idempotencia: conservar aceptación 202, protección contra doble toque y seguimiento independiente del panel visible.
- Datos y secretos: pruebas sintéticas, sin producción ni APIs pagadas; no borrar pendientes para ocultar el monitor.
- Accesibilidad: campos móviles de 16 px, objetivos táctiles de 44 px, foco predecible y sin apertura automática del teclado.
- Gobernanza y pruebas: aprobar este plan antes de implementar; revisar lista, generar tareas, analizar consistencia y verificar regresiones y CI. Sin excepciones ni autorización de fusión/despliegue.

## Estructura del proyecto

- `frontend/src/modules/materias/MateriasListPage.tsx`: conservar mutación, validación, sugerencias, límite y navegación. Extraer `components/CreateMateriaDialog.tsx` si permite aislar presentación sin duplicar lógica.
- `frontend/src/hooks/useMobileFormViewport.ts` y `frontend/src/components/ui/Modal.tsx` existentes: reutilización opt-in, sin cambiar el comportamiento global de otros formularios.
- `frontend/src/modules/calificaciones/GradingJobMonitor.tsx`: presentación compacta/detallada independiente de los detalles de lotes.
- `frontend/src/modules/calificaciones/gradingJobs.ts`: aislamiento local por cuenta y recuperación segura solo si es necesario para cumplir FR-007; sin cambios del contrato público.
- `frontend/src/modules/calificaciones/CalificacionesWorkspace.tsx` y `frontend/src/components/layout/AppShell.tsx`: ajustar contenedor únicamente si lo exige el espacio; no montar monitores duplicados.
- `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx`: eliminar o sustituir solo el éxito redundante al pasar a Revisar.
- Pruebas unitarias de esos componentes y `frontend/e2e/`; documentación de módulos propietarios 003/005/008, índice/inventario de gobernanza según cambios reales.

## Decisiones y complejidad

1. **Formulario breve**: nombre, área y grado visibles; descripción y ayuda bajo Más opciones. Conservar valores al plegar, acciones accesibles y Listo sin enviar. Rechazado eliminar validaciones o modificar payload para simplificar la interfaz.
2. **Escritura móvil existente**: reutilizar la adaptación de viewport de Spec 097, sin autofocus editable. Probar reducción de altura, orientación, foco y selección de texto.
3. **Monitor compacto por defecto**: cantidad/estado y Ver progreso; detalle con Minimizar tanto dentro como fuera de calificaciones. Las incidencias mantienen señal visible y acceso a resolución. No reutilizar el cierre de lotes finalizados, que retira trabajos.
4. **Seguimiento independiente**: consultas y transiciones continúan ampliado o minimizado. Actualizaciones, trabajos nuevos y navegación no expanden ni toman foco automáticamente. Al minimizar desde el detalle, devolver foco a Ver progreso.
5. **Cuenta actual**: no confiar en nombres guardados bajo una clave local global como prueba de pertenencia. Preservar almacenamiento legado, recuperar trabajos autorizados del servidor y evitar presentar datos sin propietario verificable. Proteger respuestas tardías y reiniciar preferencia visual al cambiar de cuenta; sin cancelar trabajos remotos.
6. **Subida ya asíncrona**: el servidor acepta con 202 y la vista libera captura tras aceptar. Mantener ese flujo y cubrir errores, doble toque y selección siguiente con regresiones; no rehacerlo como una espera al LLM.
7. **Aviso local**: el paso Revisar ya muestra el borrador; comunicar éxito allí sin toast superpuesto. Mantener errores/advertencias y no cambiar globalmente las notificaciones.

## Secuencia de entrega

Aprobación humana del plan → revisión de lista de requisitos → tareas y análisis de consistencia → pruebas y cambios acotados → validación visual y regresiones → convergencia, PR y CI. No fusionar ni desplegar por esta aprobación.
