# Validación de 084

Estado: cinco historias implementadas y validación local terminada. PR y CI remoto pendientes. En fase de plan no se ejecutaron pruebas; los resultados posteriores están separados abajo. Las instrucciones previstas restantes no son evidencia de finalización.

## Evidencia local del primer incremento (2026-10-05)

- Revisión autorizada de requisitos: requirements 16/16 y ux-integridad 10/10. Issue #174 tiene spec-approved y plan-approved. Análisis documental previo: 35 tareas, 22 requisitos/criterios con cobertura, sin contradicciones detectadas.
- Node 22.14.0, npm install con pdfjs-dist 6.4.299 fijado. Auditoría de dependencias de producción: 0 vulnerabilidades. Auditoría completa: 11 alertas en herramientas de desarrollo (3 moderadas, 8 altas), no resueltas por este incremento ni atribuidas al visor; no ejecutar audit fix --force. Validación del runtime Docker fijado pendiente.
- Tests dirigidos de EvaluationPdfViewer/EvaluationPreviewModal: **11 aprobados**. Incluyen navegación/texto, canvas acotado, limpieza/cancelación, cierre antes de bytes y regresión de ancho con scrollbar Safari.
- Playwright Chromium: **4 aprobados** (360×800, 390×844 oscuro, 1366×768 y separación estudiante). WebKit: **4 aprobados** en esos mismos recorridos. Son navegadores reales sobre datos/API ficticios locales; no prueba física Brave/iPhone ni medición de producción.
- E2E comprueba píxeles no blancos realmente dibujados, texto de primera/última página, ampliar, descargas y ausencia de mutaciones académicas. Incluye connect-src self y worker-src self; el visor recibe bytes del blob autorizado, sin fetch(blob:) ni cambios en CSP productiva.
- Build (incluye TypeScript) y audit:build aprobados. ESLint dirigido sin errores. PDF.js lazy separado (~150 kB gzip), worker generado como .js (MIME compatible) y recursos copiados del mismo origen; el visor no entra en precargas iniciales. Aviso existente de tamaño del chunk principal >500 kB, no eliminado.
- Backend Python local 3.13: test_evaluation_exports.py **31 aprobados, 1 omitido**. Omitido: render PDF real por falta de WeasyPrint/entorno Linux; no equivale a aprobado. Producción usa Python 3.11; resta ejecutar en contenedor/CI aplicable.
- Docker inicialmente sin motor disponible. Se intentó iniciar Docker Desktop; consulta del motor pendiente de respuesta. No se crearon bases, cuentas ni registros reales.
- No se modificó código backend, preguntas, criterios, IA, calificaciones ni evidencias en este incremento. US2–US5, pruebas completas, PR/CI y despliegue siguen pendientes.

Corrección detectada por WebKit: medir clientWidth ocasionaba redibujado continuo cuando aparecía/desaparecía su scrollbar. Se mide el borde externo estable, con margen para scrollbar, y se añadió regresión unitaria. Los selectores móviles usan etiquetas cortas para evitar texto cortado.

## Preparación

- Checkout `codex/084-docente-mobile-first`, dependencias de frontend y entorno pytest del repo.
- Base PostgreSQL aislada y migraciones actuales. `SPEC061_TEST_DATABASE_URL` debe apuntar solo a esa base para las integraciones de registro; nunca producción. Test omitido no equivale a aprobado.
- Fixtures ficticias: docente propietario, otro docente, alumno, administrador; materia vacía/poblada; examen digitalizado de varias páginas y evaluación de recurso con metadatos especiales; cuentas internas y de correo real.
- Worker PDF.js empaquetado localmente; validar runtime Node de CI/Docker, lockfile y auditoría al introducir dependencia. No capturar contraseñas ni datos reales.

## Verificaciones dirigidas

Desde `frontend`:

```powershell
npm run typecheck
npm run lint
npm run test:run -- src/modules/evaluaciones/components/EvaluationPreviewModal.test.tsx src/modules/evaluaciones/components/GenerationWizard.test.tsx src/modules/materias/RosterReview.test.tsx src/modules/materias/ExistingStudentsDialog.test.tsx
npm run build
npm run test:e2e -- e2e/evaluation-preview.spec.ts e2e/roster-import.spec.ts e2e/p2-responsive.spec.ts
```

Extender suites existentes y añadir a la selección únicamente pruebas reales del editor, impresión y perfil implementados. Confirmar nombres actuales antes de ejecutar; no crear un test vacío para completar la lista. Desde `backend`, ampliar y ejecutar suites de exports, ciclo de evaluación, autorización, recuperación e importación:

```powershell
python -m pytest tests/unit/test_evaluation_exports.py tests/unit/test_evaluation_lifecycle_actions.py tests/unit/test_material_evaluation_adapter.py tests/unit/test_authorization_contracts.py tests/unit/test_password_recovery.py tests/integration/test_roster_import_flow.py
```

Ejecutar también las suites nuevas de perfil/criterios manuales que se implementen. CI aplicable completo antes de merge; no repetir builds pesados por cambios solo documentales.

## Escenarios y resultados exigidos

1. **Visor**: abrir PDF representativo en 360×800 y 390×844 sin visor externo; comprobar píxeles renderizados y texto, no solo canvas/iframe presente. Recorrer página última, ampliar y cerrar. Cambiar documento/solucionario durante carga no mezcla contenidos. Alumno/otro docente no accede a solucionario. Sin preguntas muestra estado honesto.
2. **Criterios**: desde revisión seleccionar dos, crear uno y editar rúbrica. Queries/refrescos no borran borradores. PATCH no lleva preguntas/claves. Reabrir conserva selecciones. Pesos inválidos y 409 conservan trabajo local. Comparación DB antes/después confirma preguntas, respuestas, material, entregas, notas, estado e historial intactos; notas no se recalculan.
3. **Materia**: visitar todas las secciones vacías/pobladas en tamaños del plan, claro/oscuro. Nombre y selector en primera pantalla, ayudas cerradas, errores visibles. Búsqueda, teclado, foco, scroll hasta último control, giro y objetivos >=44×44. No otra sección Calificar.
4. **Alumnos**: foto/manual de 1 y varios nombres; revisar antes de confirmar; homónimos requieren decisión. Replay y concurrencia no crean duplicados; misma UUID con otro payload se rechaza. Asociar a otra materia no cambia clave. Simular respuesta perdida tras commit y recuperar lote confirmado sin repetir PUT ni generar usuarios.
5. **Fichas**: seleccionar subset/todos; emular medio print y comprobar que solo salen esas fichas. Cancelar/imprimir/cerrar generan cero llamadas de renovación. Asegurar claves ausentes de local/session storage, URL, logs y artefactos. Renovación requiere confirmación y afecta solo cuenta interna autorizada; alumno ajeno/correo real se deniega. Clave anterior nunca se revela.
6. **Perfil**: editar nombre, email, contraseña; comprobar error de clave actual y email duplicado sin mutación parcial. Campos rol/estado/ID ajeno rechazados. Nueva contraseña limpia sesión; access/refresh anteriores inválidos, nuevo login correcto, recovery anterior inválido. Relaciones educativas intactas.

## Registro de evidencia posterior

### Segundo incremento (2026-10-05): Docker activo y cinco historias

- Base PostgreSQL/pgvector aislada, sin puertos publicados ni volumen compartido con el usuario; migraciones hasta `202609240001`. La imagen PostgreSQL creó un volumen anónimo exclusivo. Solo datos sintéticos; no conexión ni escrituras productivas.
- Backend Python 3.11 en contenedor: **849 pruebas aprobadas**, sin omisiones en esta ejecución: suite unitaria completa y tres integraciones de criterios/perfil/registro. Incluye render PDF real (antes omitido en Windows), bloqueo concurrente de versión, blueprint/preguntas complejas intactas, nota histórica 3.8 preservada, replay concurrente de altas, asociación sin cambio de clave y revocación access/refresh/recovery del perfil. Dos advertencias existentes de deprecación.
- Frontend `npm run check`: **487 pruebas / 91 archivos aprobados**, TypeScript, lint, auditoría de acciones y build/audit:build aprobados. Regresión adicional de abrir el código de inscripción: 6/6 pruebas de vista general aprobadas.
- Construcciones reales de ambos Dockerfiles aprobadas. El lock generado inicialmente en Windows omitía dependencias opcionales requeridas por npm 10 del Dockerfile: se corrigió mediante instalación/`npm ci` en Linux con el runtime fijado. Se completó el árbol opcional de canvas/wasm (incluidas resoluciones transitivas emnapi/wasi); no se actualizaron dependencias directas ajenas. Auditoría de producción: **0 vulnerabilidades**; continúan 11 alertas existentes de herramientas de desarrollo. Huella auditada actualizada en CI.
- El editor envía únicamente criterios realmente modificados y versión; no reserializa preguntas. Una rúbrica histórica sin porcentajes permanece intacta si solo se seleccionan referencias. 409 conserva borrador y exige confirmación para descartar/recargar.
- Alta manual reutiliza lote revisable y confirmación actuales. Impresión usa portal privado seleccionado; cancelar/imprimir no renueva claves. Renovación explícita advierte efecto global. Credenciales efímeras se limpian al cerrar/cambiar sesión/contexto.
- Perfil propio reutiliza identidad y relaciones; email/password exigen clave actual, extras administrativos se rechazan, errores no cierran sesión. Password exitoso elimina cookies/cachés y lleva a login.
- Navegadores: matriz final en ejecución. El primer recorrido WebKit confirmó las seis dimensiones de materia docente (incluye 1024×768 adicional). Un caso de exportación agotó el presupuesto de 30 s bajo carga local: se amplió a 60 s únicamente el test, no las solicitudes del producto. Un fallo de fixture de catálogo al reabrir criterios se corrigió para representar `/materias/{id}/dba`, endpoint combinado real. No se ignoran errores ni se declaran verdes ejecuciones fallidas.
- Brave/iPhone físicos, teclado virtual nativo y producción **no probados**. WebKit/viewport reducido aportan regresión automatizada, no equivalencia física. No se han cambiado modelos ni tiempos de calificación.

### Rollback y despliegue

No hay migración ni tabla/columna nueva. Tras aprobación de PR/CI y autorización de fusión, el despliegue seguirá main. Si hubiera regresión, revertir el merge mediante otro PR y reconstruir las imágenes anteriores; conservar base, archivos privados y registros. Los lotes manuales usan el esquema previo y no deben eliminarse ni regenerar contraseñas al revertir. No ejecutar `down -v` ni restaurar una base antigua como rollback de interfaz.

La revisión final debe completar inventario/gobernanza, matriz y Converge antes de solicitar merge. Los resultados anteriores describen únicamente el checkout local.

### Cierre de permisos y accesibilidad (2026-10-05)

- Se añadieron cinco regresiones que fallaron antes de corregir el código: foto, cancelación, edición de filas, confirmación y matrícula de cuentas existentes sin `subjects.update`. El servidor ahora rechaza esas escrituras antes de acceder a datos, además de comprobar propiedad. Suite dirigida de autorización y registro con PostgreSQL aislado: **43 aprobadas**. Regresión final de todas las pruebas unitarias y las tres integraciones de este alcance: **854 aprobadas**, cero omitidas y dos advertencias existentes, en Python 3.11/Docker. La fixture de confirmación paralela carga explícitamente los permisos que normalmente aporta la autenticación; no se añadió un bypass al servicio.
- Los campos de revisión/búsqueda usan 16 px; añadir/eliminar mantienen objetivos de 44 px. La matriz comprueba dimensiones computadas y foco, no solo clases CSS.
- La traza WebKit mostró solicitudes canceladas al recargar `/app` inmediatamente después del login. Se eliminó esa recarga duplicada en el test; los errores siguen comprobándose, sin filtros ni silenciamiento. La matriz completa se repite antes de cerrar T018/T031.
- Editor/perfil se prueban también con altura reducida a 420 px, campo enfocado y scroll hasta guardar. Es regresión de espacio disponible, no prueba del teclado virtual de un iPhone físico.
- La matriz WebKit detectó desbordamiento a zoom 200 % en asistencia: campo de fecha nativo, nombres/etiquetas y filas sin reflujo suficiente. Se ajustaron espacios, separación de filas y grid según ancho disponible, con texto que puede partirse; no se oculta el overflow para pasar la prueba. La cabecera conserva menú, tema y cuenta y retira solo decoración en anchos móviles estrechos. Se comprobó visualmente un texto cortado en «Completa la lista» y se hizo crecer el botón según contenido; el test verifica también `scrollHeight` frente a su altura disponible.
- Los primeros tests de modo oscuro navegaban antes de que acabasen módulos/consultas y no comprobaban errores de consola. Se reforzaron esperas y comprobación de errores, igual que la matriz clara; sus resultados previos con errores no se consideran evidencia de navegación sana.
- Se retiraron únicamente `xcalificator-spec084-db`, su volumen anónimo y la red `xcalificator-spec084-tests` después de las 854 pruebas de backend. No se eliminaron contenedores, volúmenes o datos del usuario. La base ficticia puede recrearse con fixtures y migraciones.

### Matriz final de navegador y paquete

- Última pasada WebKit sobre código estable: **29 aprobadas**, en 6,7 minutos. Comando desde `frontend`: `npx playwright test e2e/p2-responsive.spec.ts e2e/profile.spec.ts e2e/roster-import.spec.ts --browser=webkit --workers=1 --grep 'asistencia|estudio|oscuro y responsive|perfil propio|importación revisada|reutiliza una|registro manual|respuesta perdida|profesor es usable en (360|390)' --max-failures=1`.
- Comprueba encabezado/selector en primera pantalla 360/390, diez recorridos de asistencia (claro/oscuro y zoom 200 %), aislamiento del estudio por rol, navegación docente oscura 390/1366 con consola comprobada, perfil en cinco tamaños y ocho recorridos de registro/impresión/replay. Los 422 por clave actual incorrecta y la pérdida de respuesta son errores provocados por las fixtures, no fallos inesperados.
- La pasada WebKit anterior completó los 18 recorridos generales de profesor/estudiante/admin en seis dimensiones, los cinco de criterios y la ayuda opcional; después falló la prueba de asistencia a zoom 200 %. No se declara esa ejecución íntegramente verde: el caso se corrigió y las diez pruebas de asistencia pasaron en la última ejecución. El visor PDF también completó previamente sus cinco tamaños en WebKit; el permiso de solucionario tiene cobertura backend y de recorrido estudiantil.
- Paquete final: `npm run build`, `npm run audit:build`, `npm run audit:actions` y `npm run lint:strict` aprobados después de los ajustes de reflujo. Inventario generado y verificado: **571 superficies**. Sin nueva migración ni cambios de IA.
- Chromium final de los cuatro archivos del alcance: **41 aprobadas**, en 4,9 minutos. Comando: `npx playwright test e2e/p2-responsive.spec.ts e2e/profile.spec.ts e2e/roster-import.spec.ts e2e/evaluation-preview.spec.ts --workers=1 --grep-invert 'es usable en (768|1024|1366|1920)|estudiante es usable|admin es usable' --max-failures=1`. Incluye PDF realmente pintado y descargas en cinco tamaños, separación estudiantil, editor en cinco tamaños, encabezado móvil, asistencia, modo oscuro, perfil e impresión/replay. Los aborts al cerrar el visor son cancelaciones esperadas de solicitudes; no se amplió CSP ni se omitieron permisos. La matriz general de otros roles/escritorio fue ejecutada en WebKit y volverá a correr completa en CI Chromium.
- Gobernanza previa a abrir PR: **40 aprobadas**, excluida temporalmente solo la comprobación de tareas totalmente terminadas porque abrir/adjuntar el PR y comprobar CI todavía es T035. La trazabilidad ahora enumera individualmente los quince FR, no abreviaturas de rangos que el validador no reconoce. El gate no se debilitó; debe pasar íntegro tras completar la entrega.
- PR y CI remoto pendientes; nada de lo anterior autoriza fusión o demuestra funcionamiento en producción. No se probaron Brave/iPhone físicos ni se realizaron llamadas reales a proveedores.

Registrar comando, fecha, resultado, entorno y suites omitidas; imágenes solo con fixtures no sensibles. Automatización WebKit no reemplaza prueba física iOS: declarar qué se probó y qué no. No prometer reproducción productiva basada en mocks.

Antes de producción: PR relacionado con issue #174, `spec-approved`, `plan-approved`, Spec governance y CI verde; fusión/despliegue solo con autorización correspondiente. Validación productiva de lectura, salvo autorización explícita de prueba controlada; no renovar claves ni crear estudiantes reales para probar impresión.
