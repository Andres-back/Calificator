# Validación prevista

**Estado**: Especificación, plan y revisión asistida aprobados; implementación comprobada con datos sintéticos. Sin fusión ni despliegue autorizado.

## Preparación

Checkout `codex/085-asistencia-autoguardado`, dependencias actuales y PostgreSQL exclusivo de pruebas con migraciones actuales. `SPEC085_TEST_DATABASE_URL` debe apuntar solo a esa base; no usar producción ni alumnos reales. Integraciones nuevas sin omisiones en CI.

## Backend

Desde `backend`, después de implementar:

```powershell
python -m pytest tests/unit/test_asistencia_service.py tests/unit/test_asistencia_report.py tests/unit/test_authorization_contracts.py tests/integration/test_attendance_autosave.py
python -m ruff check --select F401,F821,F822,F823,F841 app/modules/asistencia tests
```

Esperado: PATCH guarda un alumno, deja otros pendientes y preserva omitidos; rechaza matrícula ajena/duplicados/fecha futura/falta de permiso. PUT completo válido, incompleto rechazado. Solicitudes simultáneas no duplican ni generan errores de unicidad. Comprobar también timestamps/actor y conservación de ID.

## Frontend

Desde `frontend`, después de implementar:

```powershell
npm run typecheck
npm run lint:strict
npm run test:run -- src/modules/materias/attendanceModel.test.ts src/modules/materias/useAttendanceAutosave.test.tsx
npx playwright test e2e/p2-responsive.spec.ts --grep "asistencia"
npx playwright test --config=e2e/mock e2e/mock/grading-review.mock.spec.ts --grep "asistencia|grupo"
```

Si cambian nombres de escenarios, registrar comandos efectivos. Mocks persistentes por PATCH, no jornada ficticia completa tras cada escritura.

## Recorrido de aceptación

1. Marcar uno de 30; esperar Guardado, volver al día y comprobar otros pendientes.
2. Demorar respuestas, corregir alumno dos veces (incluido volver al estado original) y marcar otros; comprobar últimas selecciones persistidas.
3. Simular error, conservar selección, Reintentar y comprobar un solo registro.
4. Añadir observación; sin envío por cada tecla ni pérdida de foco. Escribir sin estado: aviso y protección de salida.
5. Buscar/marcar uno; otros estados intactos. Marcar pendientes como presentes preservando tardanza/observación previas.
6. Refetch mientras se guarda; intentar salir/cambiar fecha: aislamiento, aviso y ningún éxito falso.
7. Abrir reporte y comprobar datos persistidos.
8. Recorrer en claro/oscuro a 360×800, 390×844, 768×1024 y escritorio; ampliar al 200 % y verificar controles/scroll sin superposición.

CI completo y gobernanza verdes antes de merge. No ejecutar calificaciones ni escrituras de asistencia en producción.

## Resultados ejecutados — 2026-10-06

| Verificación | Resultado |
|---|---|
| pytest asistencia/resumen/autorización enfocado | 39 aprobadas |
| pytest integración PostgreSQL aislada, migraciones hasta head | 3 aprobadas: parcial/reintento/lectura/reporte, validación atómica y PUT compatible, concurrencia inicial y PATCH/PUT |
| Vitest modelo/cola/cliente HTTP | 18 aprobadas: 30 selecciones/correcciones, observación, refetch, error/sesión, contexto y cancelación intencional |
| TypeScript y lint estricto | Aprobados, cero advertencias de lint |
| Build Vite y auditorías acciones/build | Aprobados; advertencia preexistente de chunk principal >500 kB |
| Docker backend/frontend | Ambas imágenes construidas con éxito, sin nuevas dependencias/migraciones |
| Chromium flujo docente 360/390/1366 claro/oscuro | 6 aprobadas; recarga confirma tardanza y observación, marcado masivo conserva otras marcas |
| Chromium scroll/teclado/reflujo 200 % 360/390/768/1366/1920 claro/oscuro | 10 aprobadas; resumen relativo, 118 px a 390 px oscuro |
| WebKit flujo docente 360 claro/oscuro | 2 aprobadas |
| Chromium/WebKit fallo 500 simulado, reintento y salida/fecha con observación pendiente | Aprobados en ambos motores |

Comandos efectivos de navegador:

```powershell
npx playwright test --config=e2e/mock grading-review.mock.spec.ts --grep 'flujo docente progresivo' --workers=1
npx playwright test e2e/p2-responsive.spec.ts --grep 'asistencia sin superposición' --workers=1
npx playwright test --config=e2e/mock grading-review.mock.spec.ts --grep 'flujo docente progresivo 360px' --browser=webkit --workers=1
npx playwright test --config=e2e/mock grading-review.mock.spec.ts --grep 'asistencia recupera' --browser=webkit --workers=1
docker build -t xcalificator-spec085-backend ./backend
docker build -f frontend/Dockerfile -t xcalificator-spec085-web .
```

Incidencias del entorno resueltas: fixture de reporte inicialmente sin fechas (corregida a contrato real); select móvil localizado por etiqueta en lugar de valor de ruta; ejecución concurrente reutilizó un dev server que el otro proceso cerró (repetida en secuencia); Docker reiniciado por el usuario y PostgreSQL de prueba reactivado, integración final 3/3. Firefox no instalado: intento `--browser=all` no constituye validación Firefox; Chromium y WebKit sí pasaron. No iPhone físico ni Brave validado en este alcance.

Artefactos visuales locales ignorados en `output/playwright/teacher-flow/`. Ningún dato escolar real, secreto, escritura productiva ni llamada de IA se usó. Pruebas de regresión permanecen en el repositorio.

## Convergencia

Primer análisis: 12 FR, 6 SC, 11 escenarios de aceptación, 9 decisiones del plan y 8 principios revisados. Una brecha HIGH/partial: registro de nueva especificación en listado de gobernanza. T023 añadida y registro corregido. Cierre documental/PR/CI se conserva como gate T022 antes de fusión. Sin cambios fuera del alcance funcional ni de APIs de calificación.

PR [#177](https://github.com/Andres-back/Calificator/pull/177) abierto. Controles completos backend y contenedores aprobaron en la primera ejecución; batería frontend remota y gobernanza del cierre documental pendientes al redactar. Usuario autorizó fusión/producción **solo con todos los controles verdes**. Estado remoto definitivo y revisión desplegada se registrarán en comentarios del PR/issue, sin certificar por adelantado. Convergencia posterior sin brechas de código; las tareas de repositorio están completas, no el gate externo.
