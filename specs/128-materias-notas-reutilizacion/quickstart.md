# Validación 128

Implementación aprobada en el PR #271, sin fusión ni producción. Usar datos/archivos sintéticos, no notas/fotos/nombres reales.

## Evidencia de implementación (2026-10-25)

- Primera regresión RED: nuevo modelo aún inexistente. Tras implementarlo, 26/26 Vitest de modelo/exportación/seguimiento/CSV y TypeScript aprobados; posteriormente 24/24 de gestión/lista/exportación/modelo.
- CSV real: 12/12 Playwright Chromium/WebKit, 360/390/1440, claro/oscuro, 40 estudiantes/10 evaluaciones; BOM, comillas/acentos, cero, ajuste 4.25, sugerencia 3.5, pendiente y ausencia reconciliados, sin escritura. Captura revisada: se plegó/resumió la muestra para evitar saturación. Repetición final conjunta con materias/copia registrada abajo.
- Backend exportación: 11/11 (10 unitarias ACL/solo_lectura/política y 1 persistencia PostgreSQL). La API mantiene mejor/último intento sin mutar historial.
- Base sintética local exclusiva `xcal-spec128-db`, puerto loopback 55428, sin volúmenes de producción. Cada caso usa y retira solo su schema aleatorio. CI registra SPEC128_TEST_DATABASE_URL y cada prueba crea su propio schema; nunca fallback a DATABASE_URL.
- Materias: 6/6 iniciales (3 integración/3 cupo) y luego 4/4 integración con API real: metadatos/archivo/restauración, concurrencia crear/restaurar, conflicto de versión/otro dueño; denegadas creación/publicación/recepción/foto en archivada, histórico legible y resultado previamente admitido persistible. Primer fallo fue acceso a un objeto expirado por rollback en el test, corregido sin cambiar aplicación.
- Regresión general inicial: 1522 backend aprobadas, 5 omitidas por sus condiciones existentes; 977 frontend aprobadas. Los dobles de permisos antiguos se adaptaron al parámetro explícito de admisión, sin omitir controles. WebKit de flujo completo superó 60 s de presupuesto bajo carga; se amplió solo el test a 120 s y sus 6 casos pasaron, sin alterar timeouts del producto.
- Copia: 4/4 pruebas UI, después 24/24 conjuntas de los cuatro componentes/modelos. Reintento incierto conserva el mismo cuerpo/key; recuperación sin storage, doble clic y permiso retirado comprobados. Los 12 casos E2E de copia iniciales pasaron, incluida recarga sin duplicar POST. Se hizo opaco el diálogo y se esperó el fin de animación antes de la captura; revisión visual móvil satisfactoria.
- Linux aislado (imagen de pruebas backend, sin credenciales/red externa/volúmenes productivos): 13/13 integración aprobadas (8 copia, 4 materia, 1 exportación), incluidas serialización PDF/Word, conservación real de nota/entrega/archivo/asistencia/cuentas, compensación y limpieza recuperada de staging, permisos actuales del worker e idempotencia. Caso adicional de original PDF de dos páginas, lectura, ABCD/VF/abierta y tabla: 1/1 aprobado. Texto legacy copiado puede publicarse manteniendo sus claves previamente listas.
- PDF requiere Pango/WeasyPrint: la falta de biblioteca en Windows no se trató como éxito ni se omitió el caso; se ejecutó en Linux y CI instala explícitamente sus bibliotecas. Un arranque de la suite Linux no tenía fixtures externos de conector/specs: se corrigió el montaje del entorno, no el producto.
- Ruff (F401/F821/F822/F823/F841) y compileall aprobados. Build frontend y auditorías de acciones/recursos aprobados; sin cambios en dependencias ni proveedores.

### Cierre local

- `npm run typecheck`, `npm run lint:strict`, `npm run test:run`: 157 archivos/977 pruebas aprobadas en la repetición final. Ruido AggregateError de jsdom ya presente no cambió el resultado (exit 0).
- `npx playwright test e2e/gradebook-export.spec.ts e2e/materia-lifecycle.spec.ts e2e/evaluation-copy.spec.ts --project=chromium --project=webkit-subject-tools --workers=2`: 36/36 aprobadas en 8.4 minutos. Son emulación de navegador, no dispositivos físicos.
- `python -m pytest tests/unit -q --tb=short --show-capture=no -p no:cacheprovider` en Linux con código, conector, scripts, assets sintéticos y configuración estática montados de solo lectura: 1478/1478 aprobadas. Los primeros montajes incompletos no se contaron como prueba exitosa.
- Persistencia final: 15 casos únicos aprobados (10 copia, 4 materias, 1 CSV), ejecutados en 13 iniciales + multipágina + concurrencia; permisos y guardia del reintento genérico se volvieron a ejecutar después de su último cambio. El doble envío concurrente produce un solo ai_job. El reintento genérico remite al contrato de copia, sin eludir permisos/límite ni limpiar archivos de otro intento.
- `python scripts/build_system_inventory.py --write` y `--check`: 661 superficies, vigente. Las tres rutas de copia documentan intersección de permisos con evidencia ACL; no se debilitó el extractor ni una prueba.
- Gobernanza preliminar: 57 aprobadas y un fallo esperado por tareas aún sin marcar; repetición completa tras cerrar tareas: 58/58 aprobadas, sin excluir controles. CI remoto se inicia con el PR y no se declara verde anticipadamente.
- Converge (solo lectura): 18 FR, 5 SC, 12 escenarios, 10 decisiones técnicas y 8 principios constitucionales revisados; cero hallazgos missing/partial/contradicts/unrequested y cero críticos/altos/medios/bajos. No añadió tareas ni cambió tasks.md durante el análisis (SHA256 antes/después 740413B3EBFD1FCB99D62060E4CD5FEA17AB122E3799C9F33EF981A98C7F83D8). El cierre de marcas se realizó después en Implement.

## Aprobación y análisis previo

Usuario aprobó spec/plan y revisión el 2026-10-25. Checklist propio 8/8 y documental 16/16. Hooks ausentes; ignorados Git/Docker/ESLint cubren artefactos, dependencias y secretos. Analyze solo lectura: 18/18 FR y 5/5 SC cubiertos por 25 tareas; cero hallazgos críticos/altos, sin requisitos sin tareas ni conflicto constitucional. T004–008 cubren FR001–006; T009–014 FR007–010; T015–022 FR011–015; T007/013/021/023–025 cubren FR016–018/SC005. Autorizada implementación, no fusión/despliegue.

## Diagnóstico ejecutado

2026-10-25, main 4f15ce3:

`npm run test:run -- src/modules/materias/GradebookExport.test.tsx src/modules/materias/gradebookModel.test.ts src/lib/csvExport.test.ts`

3 archivos, 17 casos aprobados. Prueban contrato actual con exclusión de sugeridas y mocks; no demuestran reparación. El usuario confirmó CSV con notas vacías, no fallo de descarga. Sin inspección de datos de producción.

## Tras aprobar

1. Checklist autorizado, Tasks y Analyze antes de implementar. Hooks: .specify/extensions.yml ausente durante planificación.
2. CSV: 40 alumnos/10 evaluaciones sintéticas, confirmada/ajustada/publicada, sugerida/requiere revisión, cero, Decimal serializado, proceso, fallo, ausencia y anulación. Homónimos, títulos repetidos, acentos, delimitadores y texto fórmula. Reconciliar cada celda con la referencia.
3. Final/provisional, conteos/vista previa, cero finales, fallo parcial, logout/cambio de actor, renovación del mismo actor y permiso revocado. Cero mutaciones académicas o IA.
4. Archivo real con Playwright Chromium/WebKit registrado en CI real: esperar download, leer/parsear y verificar bytes/nombre/encabezados/filas/notas. UI360/390/1440 claro/oscuro. No afirmar Excel físico probado por parsear CSV.
5. API+DB aisladas: política de intento vigente, solo_lectura sin ceros por vencimiento, autorización y matrícula activa declarada.
6. Materia: editar/archivar/consultar-exportar/restaurar, comparación de cuentas/notas/evidencias/asistencias. Denegar terceros/alumnos; cerrar nueva admisión y preservar trabajos ya aceptados. PATCH heredado/repetición/concurrencia/cupo sin saltos de regla.
7. Copia con lectura multipágina, ABCD/VF/abiertas, figura/tabla, criterios/clave revisada y pendiente, DBA propio y formato. Guardar/reabrir/PDF/Word; editar sin alterar origen; ACL/original privado y ausencia de alumnos/notas. Fuente archivada/legacy y rechazo claro de material no reproducible.
8. Idempotencia/concurrencia, caída antes/después del commit, archivo perdido/hash incorrecto/conflicto y destino archivado durante trabajo. Una copia completa, sin éxito parcial o borrado de origen. Compatibilidad del esquema ai_jobs existente en DB aislada, sin migración redundante ni volúmenes reales.
9. TS/lint/pruebas frontend/backend/E2E/build/auditorías, inventario/gobernanza/Converge y PR/CI verde. No omitir controles ni hacer push directo a main.

## Estado

Issue #270, aprobación humana del alcance/plan/revisión registrada el 2026-10-25; calidad documental 16/16 y checklist específico 8/8. [PR #271](https://github.com/Andres-back/Calificator/pull/271) abierto; no autoriza fusión ni despliegue. No se han usado datos reales, APIs IA ni cuentas de producción. Una comprobación posterior con demo necesita su alcance autorizado; no se presume realizada por CI ni se afirma Excel o teclado físico probado.

## Corrección de CI autorizada: T026

- La ejecución 40244013116 falló antes de las pruebas backend: apt de Ubuntu 22.04 no encuentra libharfbuzz-subset0 (exit 100). Frontend, E2E, contenedores y gobernanza sí terminaron verdes para ese HEAD; eso no sustituye su repetición en el nuevo commit.
- Se retira únicamente ese paquete opcional para WeasyPrint 70 y se declaran libharfbuzz0b y libpangoft2-1.0-0, además de Pango/Cairo/fuentes. No se cambia versión de Python, WeasyPrint, runner ni dependencias de la app. La [ficha oficial de Ubuntu Jammy](https://packages.ubuntu.com/jammy/libpango-1.0-0) y la inspección local de ffi.py de WeasyPrint 70 respaldan el conjunto; harfbuzz_subset se carga con allow_fail=True y su ausencia emite advertencia de compatibilidad futura, no un fallo actual.
- Prueba RED de workflow: dos fallos esperados (paquete no disponible y ausencia de smoke), un caso aprobado. Después de corregir: 3/3 aprobadas. Las pruebas de integración completas permanecen habilitadas, sin exclusiones ni continue-on-error.
- Ubuntu 22.04 limpio, sin montajes ni credenciales: apt-get update y apt-get install --simulate resolvieron satisfactoriamente todos los paquetes corregidos. Se comprobó disponibilidad/resolución, no se presenta esa simulación como un render allí.
- El mismo smoke de CI generó y leyó en memoria un PDF de una página con WeasyPrint 70/Python 3.11 en el contenedor local sin red, verificando firma PDF y texto con PyMuPDF. CI lo ejecuta obligatoriamente después de instalar bibliotecas, antes de auditoría y pruebas. No se produce ni se usa un archivo de estudiante.
- Inventario sin cambios: 661 superficies vigentes; YAML válido y gobernanza completa 61/61 aprobada. Converge del seguimiento revisó FR-018/T026, decisiones de bibliotecas/prueba PDF y los ocho principios: cero brechas nuevas, sin escribir tareas durante su análisis. La corrección se publica en el mismo PR para iniciar todos los controles, sin fusionar ni desplegar.
