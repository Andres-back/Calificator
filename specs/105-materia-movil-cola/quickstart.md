# Guía de verificación propuesta

Estado: implementación y verificaciones locales realizadas el 2026-10-18. CI remoto pendiente; sin fusión ni despliegue.

## Preparación y comandos

Usar el worktree de la rama `codex/105-materia-movil-cola`, dependencias instaladas con el lockfile y navegadores de Playwright disponibles. Ejecutar desde `frontend/`:

```powershell
npm run test:run -- src/modules/materias/MateriasListPage.test.tsx src/modules/materias/MateriaCalificar.test.tsx src/modules/calificaciones/GradingJobMonitor.test.tsx
npm run typecheck
npm run lint:strict
npm run build
npx playwright test e2e/evaluation-ai-wizard.spec.ts --grep '096 creación en dos pantallas (360|390)px|097' --workers=2 --reporter=line
```

Agregar a las tareas los comandos de las nuevas pruebas de 105 una vez definidos sus archivos; correr también almacenamiento, GenerationWizard, auditorías y regresiones aplicables. Los E2E usan mocks, nunca una cuenta real. Resultado esperado: todas las aserciones verdes y revisión visual sin superposición.

## Recorridos de aceptación

1. **Crear materia**: abrir sin teclado automático; completar nombre/área/grado, abrir descripción, escribir, plegar y reabrir. Conservar valores, sugerencias, validaciones, límite, permisos, payload y destino. Listo no envía. Un fallo no cierra como éxito.
2. **Aceptación de foto**: simular 202 con trabajo pendiente, comprobar que libera captura y permite otro estudiante. Doble toque produce una sola petición; fallo conserva evidencia y contexto.
3. **Monitor**: compacto dentro/fuera de calificaciones, Ver progreso y Minimizar con foco correcto. Consultas siguen funcionando; cero altas/cancelaciones/reintentos extra por acciones visuales. Nuevos estados, navegación y trabajos no expanden. Cubrir éxito, fallo, cancelación, inexistente y lote parcial.
4. **Recuperación**: recargar, recuperar varios trabajos, simular servidor inaccesible y cambiar de cuenta con respuesta tardía. No mostrar datos ajenos ni borrar el almacenamiento legado para ocultar problemas.
5. **Borrador generado**: señal de éxito contextual sin cubrir cabecera; errores/advertencias intactos y sin generación adicional.
6. **Visual**: Chromium y WebKit, 360/390/1440 px, ambos temas, viewport reducido, orientación y teclado/foco. Verificar campos visibles, 16 px, acciones de 44 px, ausencia de overflow y captura no cubierta. Capturas bajo `output/playwright/105-materia-cola/`.
7. **Regresión y gobernanza**: unitarias focalizadas, tipos, lint, build y E2E pertinentes; inventario/documentación de módulos según cambios reales. Registrar resultados, limitaciones y convergencia antes de PR/CI. No usar producción, APIs pagadas ni datos reales; no acreditar dispositivos físicos con emulación.

## Resultados locales

- Suite completa frontend: 116 archivos, 734 pruebas aprobadas. Después se añadió una regresión de limpieza de avisos con nombres al cambiar de cuenta: monitor/almacenamiento 16/16 aprobadas.
- Matriz nueva: `npx playwright test e2e/materia-queue-mobile.spec.ts --workers=2 --reporter=line --max-failures=2`: 12/12 aprobadas en Chromium/WebKit, 360/390/1440 px, claro/oscuro. Incluye adaptación con altura 440 px, valores opcionales, foco, 16 px, objetivos de 44 px, seguimiento minimizado y ausencia de operaciones académicas extra.
- Regresiones de creación y captura: `npx playwright test e2e/evaluation-ai-wizard.spec.ts e2e/explainable-grading.spec.ts --grep '096 creación en dos pantallas (360|390)px|097|dos paquetes quedan en cola' --workers=2 --reporter=line --max-failures=2`: 19/19 aprobadas. El 503 del escenario de subida es simulado intencionadamente y conserva las hojas para reintentar.
- Lote de 30 casos: `npx playwright test --config=e2e/mock e2e/mock/grading-review.mock.spec.ts --grep 'lote largo' --workers=1 --reporter=line`: 1/1 aprobada; reintento y cierre accesibles.
- TypeScript y lint estricto aprobados; build y auditorías de acciones/assets aprobados. Advertencia de chunk grande ya existente; no bloquea el presupuesto público.
- Inventario regenerado y comprobado: 573 superficies. La lista de specs activas incorpora 105; referencias FR de tareas escritas completas para el validador.
- Gobernanza: `python -m pytest tests/spec_governance -q`: 41/41 aprobadas tras incorporar 105 al catálogo y completar referencias/tareas. `git diff --check` sin incidencias. Converge sin brechas.
- Capturas revisadas en `output/playwright/105-materia-cola/`: formulario 390 claro, cola 390 claro y formulario 1440 oscuro de WebKit. Sin superposición horizontal; indicador en flujo normal, sin flotar sobre captura.

Limitaciones: la emulación no acredita cámara/teclado físicos, red de producción ni velocidad de IA. No se usaron registros reales, VPS ni APIs de pago. Los primeros intentos de Vitest/pytest encontraron restricciones de temporales del sandbox; se repitieron fuera del aislamiento. No se modificó el backend ni la cola del servidor.
