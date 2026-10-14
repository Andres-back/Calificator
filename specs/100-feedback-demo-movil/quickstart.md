# Validación de retroalimentación y acceso al inicio

Estado: implementación y validación local el 2026-10-14. CI remoto pendiente; sin fusión ni despliegue.

## Preparación

Fixtures sintéticos y servidor mock existentes desde `frontend/`, dependencias instaladas. No requiere Docker, API real ni créditos IA para presentación. No copiar nombres/fotos reales ni incluir propuesta untracked 098 en PR.

## Casos

1. Feedback 2000 caracteres en 360/390/1440, ambos temas: lectura íntegra; Editar crece; teclado no tapa acciones; cancelar/guardar/error y navegación conservan borrador/permisos.
2. Sugerida 2.5, cálculo 1.85, dos null: provisional/dos pendientes sin atribución docente; cero evaluado no pendiente. Cobertura incompleta con puntos presentes no dice «faltan 0». Sin desglose/nota confirmada preservan significado.
3. 0.0000/0.7000/0.6250 → 0/0.7/0.625, montaje limpio, rechazo de 0.63 con máximo 0.625, cursor estable al escribir. Guardado conserva motivo, explicación y cálculo.
4. Guía desde tres entradas/todos roles: Android/iPhone seleccionables, cierre/foco correctos, standalone oculta botón, ningún efecto en login. Sin eventos de instalación ni afirmación de descarga/instalación lograda.
5. Foco/Escape/retorno y guía fuera del menú condicional; 44 px, ambos temas/tamaños. Manifest/iconos vigentes y limpieza service workers intacta. Cero mutaciones académicas por consulta/instalación.

## Comandos de referencia

Desde `frontend/`:

```powershell
npm run typecheck
npm run lint:strict
npm run test:run -- src/modules/calificaciones src/lib/installedApp.test.ts
npm run test:mock -- --list
npm run audit:actions
npm run build
npm run audit:build
```

Elegir nuevos tests de instalación/feedback y casos mock relevantes una vez creados; --list enumera, no ejecuta. Regresión Chromium/WebKit con proyectos existentes; no repetir suites completas locales sin motivo. CI obligatorio no se omite.

Desde raíz después de implementar:

```powershell
python scripts/build_system_inventory.py --write
python scripts/build_system_inventory.py --check
git diff --check
```

Agregar 100 a ALL_SPECS. Baseline local puede detectar 098 no versionada: validar en snapshot aislado de archivos del PR sin mover/borrar 098. Registrar resultados reales y límites de emulación.

## Entrega posterior

CI verde, aprobación separada de fusión, despliegue automático desde main y verificar commit/servicios/assets. Instalación y teclado físicos solo se acreditan tras prueba real. Sin cambios académicos, evidencias, claves ni modelos durante validación visual.

## Evidencia ejecutada

- Unidades finales: 28 archivos / 160 pruebas verdes de calificaciones, guía, portada, AppShell, standalone y guardas, incluida reserva de altura y éxito/error de guardado. No se afirma ejecución de toda la suite frontend/backend.
- Chromium final tras ajustar barra/desplazamiento: 29 escenarios de `e2e/explainable-grading.spec.ts`, dos de accesibilidad en 360/1366 y tres `099 accesos` en 360×800, 390×664 y 1366×900 verdes. En poca altura se comprueba alcance tras scroll normal, no que todos los controles quepan simultáneamente sobre el pliegue; sin clic forzado.
- TypeScript, lint sin warnings, build y audits de acciones/assets verdes. Auditoría: 454 botones, 119 enlaces. Advertencia de chunk >500 kB ya existente; sin aumentar dependencias ni eludir presupuesto de assets.
- Revisión CLI Chromium 360/390/1440 y WebKit emulando iPhone 390×664. Mensaje sintético 2176 caracteres: lectura con altura igual al scrollHeight y overflow visible; editor escritorio 1140 px / iPhone 2260 px, scrollHeight igual, sin recuadro interno. Durante escritura la reserva de barra mide 0 px.
- Hallazgo F1: la barra interceptaba Retroalimentación en iPhone de poca altura. Reserva de altura real mediante ResizeObserver y liberación al ocultarla; desplazamiento a feedback descontando la identidad fija. Nueva comprobación: botón alcanzable, encabezado/Editar visibles. Sin clic forzado ni cambios académicos.
- Artefactos locales ignorados: `frontend/output/playwright/100/home-screen-390.png`, `home-screen-iphone.png`, `feedback-iphone.png`, `feedback-1440.png`, `editor-1440.png`, `editor-iphone-dark.png`, `feedback-iphone-dark.png`. Fixtures existentes adaptados mecánicamente en carpeta ignorada para CLI; no forman parte del producto/PR.
- Inventario vigente: 573 superficies. Gobernanza del PR validada sin errores; ocho comprobaciones puras de baseline pasan sobre snapshot aislado de HEAD más archivos del PR. No equivale a ejecutar toda la suite pytest. Baseline incluye 100; propuesta 098 no se añade ni se modifica.

Limitaciones: WebKit es emulación, no instalación ni teclado físicos. No se recalificó ni consultó contenido de alumnos reales; ninguna llamada LLM o escritura en producción. La guía es manual; no registra ni promete instalación automática.

Converge final: 10 requisitos funcionales, 5 resultados y 7 decisiones del plan cubiertos; ocho principios constitucionales conservados. F1 corregido, sin trabajo implementable restante. CI remoto, fusión y verificación de despliegue son entrega posterior, no acreditada por las pruebas locales.

## Seguimiento del primer CI remoto

HEAD 6e506e4: backend y contenedores aprobados. En frontend pasaron auditoría, TypeScript, lint, unidades, build y el bloque general E2E. El bloque contextual terminó 42/43: una expectativa de mensaje histórico no incluía «cálculo provisional» pese a un componente sin puntaje. Se actualiza únicamente esa expectativa al contrato FR-003, FR-004, sin retirar comprobaciones de avisos, estado ni cero escrituras. No hay cambios en código de aplicación.

Gobernanza del mismo HEAD: el evento inicial de apertura falló por ausencia de etiquetas antes de aplicarlas; la ejecución posterior 38625177383 pasó con ambas aprobaciones. No se omiten ni se alteran reglas. Un nuevo commit vuelve a ejecutar todos los controles sobre su HEAD exacto.

Corrección T016 validada: `npm.cmd run test:mock -- grading-review.mock.spec.ts` termina **43/43 verdes** en 6.0 minutos, usando datos sintéticos. Inventario regenerado/verificado: 573 superficies; únicamente cambia source_digest por la expectativa del test. No se repiten llamadas IA ni pruebas de backend/compilación locales porque el código de aplicación no cambió; CI remoto completo permanece obligatorio.
