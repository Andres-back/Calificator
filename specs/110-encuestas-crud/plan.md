# Plan: CRUD administrativo de encuestas

**Rama**: `codex/110-encuestas-crud` | **Fecha**: 2026-10-20 | **Spec**: [spec.md](./spec.md) | **Issue**: #228

**Estado**: Aprobado por el usuario el 2026-10-21 («adelante»); implementación y validación local completas, CI remoto pendiente, sin despliegue.

## Resumen

Completar los dos paneles de `encuesta-docente`: controles visibles de registro, consulta, corrección, retirada y restauración. Conservar `responses.receipt_json`, hashes, firmas y consentimientos sin UPDATE/DELETE. Añadir eventos administrativos como capa separada; no cambiar la evaluación académica ni preguntas del instrumento. Versión de software 5.1.0, diagnóstico 5.0 y piloto 1.0 intactos.

## Contexto técnico

**Lenguajes/versiones**: Python 3.11 y JavaScript nativo, como la aplicación independiente actual.
**Dependencias**: SQLite estándar y WSGI/Gunicorn existentes; sin paquetes nuevos ni llamadas a IA.
**Persistencia**: Dos bases aisladas existentes; migración aditiva y repetible con tabla `response_admin_events`, restricciones e índices. Transacciones para revisión e idempotencia.
**Pruebas**: unittest y Node; navegación sintética Chromium/WebKit, 360/390 px y escritorio; construcción y smoke Docker sin red ni datos productivos; gobernanza e inventario del sistema.
**Plataforma objetivo**: Contenedor Linux no privilegiado y navegadores de celular/computador.
**Rendimiento y escala**: Una transacción corta por comando, sin bloqueo de la navegación. Validar listado con 100 respuestas sintéticas y lecturas de estados en lote, evitando una consulta de historial por fila. Ventana de red del cliente de 20 s con resultado incierto recuperable, no confirmación falsa.

## Verificación de la constitución

- Separación de roles: sesión del panel y CSRF/origen comprobados en cada cambio; pruebas de autorización negativa y aislamiento diagnóstico/piloto.
- Integridad y trazabilidad: originales inmutables; historial anexado con cuenta, motivo, revisión y diferencias. No atribuir firma a correcciones administrativas.
- Asincronía e idempotencia: operaciones HTTP acotadas, `request_id` estable para reintento idéntico y revisión esperada para impedir sobrescrituras concurrentes.
- Datos y secretos: migración aditiva, FK, transacciones, copia previa al despliegue; solo muestras sintéticas en pruebas y ningún contenido sensible en logs/CI.
- Accesibilidad: formularios etiquetados, foco y mensajes accesibles; confirmar retirada, papelera y restauración; QA desde 360 px en ambos navegadores.
- Gobernanza y pruebas: issue #228 creado y requisitos revisados. Aprobación humana de spec/plan recibida el 2026-10-21. Checklist/Tasks/Analyze, pruebas, PR y CI antes de fusión. No reutilizar PR #227.

Reevaluación posterior al diseño: no excepciones propuestas; aprobación recibida. La publicación requerirá commit de main, copia de ambas bases y verificación de originales sin cambios.

## Estructura del proyecto

```text
encuesta-docente/
├── administration.py            # migración, comandos, estado e historial, validación de correcciones
├── app.py                       # integración con autenticación, rutas, informes y exportaciones
├── measurement.py               # versión de software, sin cambiar metodología
├── public/admin.html            # acciones visibles, papelera, editor e historial
├── public/admin.js              # consulta y organización actuales
├── public/administration.js     # controles de corrección/retirada/restauración y recuperación de errores
├── public/styles.css            # disposición adaptable de formularios y diálogos
├── Dockerfile                   # incluir nuevo módulo Python en la imagen
└── tests/                       # casos sintéticos y persistencia
specs/110-encuestas-crud/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/admin.md
├── quickstart.md
└── checklists/requirements.md
```

El módulo administrativo encapsula comandos/historial; `app.py` mantiene el límite HTTP y la autorización existente. No introducir framework ni mezclar bases.

## Decisiones y complejidad

1. Validar preguntas con `schema_snapshot` y ajustes originales, no con la versión vigente. Reusar validación del instrumento sin tratar la corrección como una nueva firma; validar identificación por separado. Si falta contexto fiable, devolver `editable=false` con explicación, no reconstruir un formulario supuesto.
2. Historial append-only con `UNIQUE(response_id, revision)` y `UNIQUE(request_id)` dentro de cada base. `BEGIN IMMEDIATE` coordina comandos concurrentes. Guardar huella canónica del comando; reintento idéntico devuelve su revisión original, reutilización distinta o revisión obsoleta devuelve 409 sin escribir.
3. `receipt/{id}` y su descarga continúan originales. `manage/{id}` expone original/efectivo/historial diferenciados. Corregir solo identificación y `answers`; firmas, consentimientos, tiempos históricos separados y métricas no editables.
4. Retirada reversible, confirmada por código y motivo. Impedir correcciones en papelera. Las revisiones de organización existentes son independientes.
5. Informe principal conserva valores originales activos. Añadir recibidas/activas/retiradas por versión, incluso versiones con todas sus respuestas retiradas. `corrections.csv` exporta datos efectivos claramente rotulados, sin identidad/contactos, firmas ni motivos. No sustituir silenciosamente el CSV original.
6. Alta abre el formulario del mismo instrumento. Autenticación de investigador no sustituye el consentimiento del participante.

## Validación y entrega

- FR-001/010: pruebas de los controles y recorrido completo en ambos paneles desde 360 px y escritorio; constancias descargables y foco recuperado.
- FR-002/003/004: comparar bytes/huellas originales, migrar base anterior dos veces, versiones 4/5 y piloto, límites de campos y diff completo, cuenta compartida identificada como cuenta.
- FR-005/006: confirmación errónea, retirada repetida, restauración, carrera de revisiones, repetición tras pérdida de confirmación, error de almacenamiento sin éxito falso.
- FR-007/008: recuentos originales por versión, exportaciones separadas con escape de fórmulas, sin contactos/firmas/motivos; estado retirado no contribuye al análisis activo.
- FR-009: sesión, CSRF, origen, métodos, tipos y límites de cuerpo; imposibilidad de acceder a otro instrumento.
- FR-011: versión de software nueva, pruebas e imagen aisladas, instrumentos y consentimientos sin cambios.
- Antes de producción: todos los controles CI verdes, commit de main aprobado y autorización de publicación. Snapshot SQLite de ambas bases, huellas y recuentos originales; conservar imagen previa. Comprobar salud, assets y recuentos de solo lectura; no crear/corregir/retirar respuestas reales como prueba.
- Reversión: imagen anterior sin borrar tabla/eventos; originales continúan legibles. Si hubo eventos, el software anterior no comprende la papelera ni las correcciones: mantener el acceso administrativo y las exportaciones bloqueados temporalmente o corregir hacia delante, para no presentar respuestas retiradas como activas.
