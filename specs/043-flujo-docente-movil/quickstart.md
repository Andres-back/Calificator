# Validación rápida

## Preparación

```powershell
cd frontend
npm ci
npm run typecheck
```

Iniciar el frontend y un backend local con datos docentes disponibles.

## Escenario 1: búsqueda a 360×800

1. Abrir el centro de calificaciones como docente.
2. Seleccionar una evaluación con varios estudiantes.
3. Escribir rápidamente un nombre en el buscador.
4. Verificar que el foco no se pierde, aparece “Buscando” y la lista no parpadea en vacío.
5. Abrir un estudiante y volver a la lista; comprobar que se conserva búsqueda y filtro.

## Escenario 2: revisión móvil

1. Abrir una calificación con evidencia y desglose.
2. Desplazarse hasta el final del detalle.
3. Alternar entre Evidencia y Revisar respuestas desde el control fijo.
4. Confirmar que la barra inferior permanece visible y no tapa contenido.
5. Editar una respuesta y comprobar que no se puede avanzar sin guardar o descartar.

## Escenario 3: estados y permisos

1. Abrir una entrega en procesamiento y verificar que dice “Analizando evidencia” sin nota cero.
2. Abrir una nota por revisar, confirmarla y comprobar que luego aparece Publicar.
3. Abrir como usuario sin permiso de publicación y confirmar que no aparece esa acción.

## Verificación automática

```powershell
cd frontend
npm run test:run -- CalificacionesWorkspace.mobile
npm run typecheck
npm run lint
```

Completar la inspección visual con Playwright CLI en 360×800 y 390×844, en modos claro y oscuro.

## Resultados de validación

- Pruebas unitarias completas: 78 archivos y 394 pruebas aprobadas.
- Pruebas focalizadas del flujo móvil: 3 archivos y 10 pruebas aprobadas.
- TypeScript, lint y compilación de producción: aprobados.
- E2E con API simulada del flujo de revisión: 2 escenarios aprobados.
- Regresión visual móvil: 4 escenarios aprobados (360×800 y 390×844, claro y oscuro).
- Inspección en navegador real con Playwright CLI: contexto compacto, búsqueda, detalle, pestañas persistentes y barra inferior verificados sin desbordamiento horizontal ni errores de consola en la ruta de calificaciones.
- El cambio no modifica contratos del backend, cálculo de notas ni datos existentes.
- Convergencia Spec Kit: los requisitos FR-001 a FR-012 y los criterios SC-001 a SC-006 cuentan con implementación o evidencia de regresión; no quedaron tareas funcionales abiertas.
