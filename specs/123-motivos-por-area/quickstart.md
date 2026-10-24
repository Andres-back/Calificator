# Validación: biblioteca de motivos por área

**Estado**: implementación local y catálogo completo `123-644b82ea8744f74c`: 300 motivos nuevos más 20 generales. Tres consumidores implementados y probados. Sin fusión, despliegue, datos académicos reales ni llamadas a APIs de producción.

## Alcance y dependencia

- Issue #259, Spec123 y rama `codex/123-motivos-por-area`. Alcance, plan y las listas de requisitos recibieron aprobación antes de implementar.
- Treinta diseños nuevos por cada una de diez áreas; trescientos nuevos, más veinte generales conservados. No son ilustraciones académicas validadas ni premios por desempeño.
- Una biblioteca sirve a fichas de retroalimentación, imágenes revisadas de preguntas y cabeceras opcionales de recursos. Insertar en una pregunta conserva preparación, consentimiento, guardado y versionado; decorar un recurso no reconstruye preguntas, criterios, rúbrica o evaluación vinculada.
- La rama parte del commit `fd52380113b78bb140e32d5a7eb8960f5797fd0c` del PR258. Con autorización expresa de fusionar primero258 y después260, ambos con CI verde, el PR258 se fusionó por squash el2026-10-24 en `069aa818e22dc2d031f4c4be0e9b0093c5db9d73` y cerró el issue257. Se comprobó que el árbol de ese squash coincide exactamente con la dependencia revisada antes de reconciliar `main` en260; no se descartaron cambios nuevos de `main` ni se incluyeron borradores ajenos.

## Creación, revisión y presupuestos

Se utilizó exclusivamente la herramienta incorporada de imágenes, con una composición por solicitud, sin nombres, fotos, documentos de estudiantes ni claves de producción. Los prompts y la procedencia aceptada están en [generated-prompts.json](./generated-prompts.json); los originales de trabajo y checkpoints se conservan en `output/imagegen/spec123/`, fuera de Git.

Cada dibujo se revisó visualmente en hojas de contacto. La comprobación mecánica exige fuente de al menos1024px en ambos ejes, alfa real y esquinas transparentes, hash íntegro, IDs únicos y exactamente30 por área. Los derivados nuevos completos no superan300KiB y las miniaturas60KiB. Se preservan los veinte PNG generales byte por byte.

Ajustes acotados documentados, sin rebajar controles:

- Naturales006: compresión mecánica para el presupuesto. Naturales010: margen transparente mecánico; no se eliminó ni repintó un fondo.
- Sociales013: el primer resultado1774×887 no cumple resolución; una corrección de encuadre cuadrado conserva el original rechazado.
- Artística024: la herramienta bloqueó la salida de un títere. No se repitió ese contenido; el usuario autorizó sustituirlo por cuaderno y materiales de dibujo.
- Física023: “disco volador” produjo una nave espacial, rechazada por pertinencia. Se sustituyó con una única composición explícita de disco deportivo; se conserva el primer original.
- Religiosa021: cuatro cuencos salieron2172×724. Una corrección de composición en dos filas conserva sus diseños y genera1254×1254 RGBA.
- Una interrupción del registro local de dos imágenes se recuperó comparando hashes de los archivos ya existentes, sin nuevas llamadas. El límite de salida de la herramienta tampoco produjo regeneración: los checkpoints conservaron los resultados.

La optimización es local y reanudable mediante `scripts/build_motif_catalog.py`. `--check-complete` pasó con 320 motivos y once colecciones; no se desactiva ni se sustituye por una muestra. El máximo observado es 285390 bytes por imagen completa y 30850 por miniatura; el paquete suma 45292387 bytes. Los 23 derivados intermedios no referenciados se archivaron de forma recuperable en `output/imagegen/spec123/intermediates/`, conservando originales y archivos activos.

Se revisaron las 300 composiciones también en grises y pequeñas, mediante diez páginas a 24 mm: `output/pdf/spec123-catalogo-{color,grises}.pdf` y `output/spec123/grayscale-pair-v2-*.png`. La revisión de un adorno no constituye validación científica de un gráfico de examen.

## Pruebas ejecutadas

| Control | Resultado observado |
| --- | --- |
| Backend unitario completo |1429/1429 pasadas con catálogo definitivo, contenedor aislado y sin red (277.25 s) |
| Integraciones propias PostgreSQL |8/8 pasadas: permisos, presentación transaccional y versionado/conservación |
| Frontend completo |902/902 en147 archivos |
| Frontend calidad |TypeScript, lint con cero avisos, build, audit:build y audit:actions pasados |
| E2E consolidado |56/56 en6.6min: galería, dos editores e impresión |
| Impresión reforzada posterior |8/8: nota exacta de cada alumno, incluido cero, y contexto exacto en cada continuación |
| Regresión de publicación/enlaces/fichas |32/32 pasadas en6.5min, Chromium y WebKit, cuatro anchos y ambos temas; dos trabajadores aislados |
| Ruff y compilación Python |Pasados, mismos códigos de nombres/variables/importaciones que exige CI |
| Inventario técnico |643 superficies; generación y `--check` pasados |
| Gobernanza completa |49/49 pasadas en46.61s sobre instantánea limpia de entrega, sin excluir pruebas |
| Contenedores |Backend y frontend construidos; runtime backend contiene 320 motivos y resolvió sus 320 miniaturas por hash sin red |

Las suites focalizadas anteriores se solapan con las completas; no se suman para inflar el total. La regresión de cantidad320, orden y hashes únicos está incluida en las1429 unitarias finales.

### Navegación y pantalla

Chromium y WebKit cubren360/390/768/1440px, ambos temas, teclado, controles de44px, foco y ausencia de desbordamiento. La galería carga hasta doce miniaturas por página y permite recorrer las áreas; el test de navegación usa metadatos sintéticos, mientras la existencia real y sus bytes se comprueban con el catálogo del servidor. Las capturas están en `output/playwright/spec123-*.png`.

Los editores verifican cancelar sin guardar, elegir/confirmar, guardar/reabrir y conservación del contenido. Las imágenes de pregunta se preparan por la ruta de subida autorizada, no mediante un enlace público que evita el control de versión. Las pruebas prohíben llamadas inesperadas de generación y escrituras académicas por decoración.

### Impresión y exportaciones

- Ocho PDFs A4/Carta con treinta alumnos: fijo, mezcla, sin decoración y fallo404. Son80 páginas en total por la devolución extensa sintética y sus continuaciones.
- Se comprobó el100% de nombres, notas y mensajes, identidad de contexto y nota exacta por ficha, fuente12pt y límites de caracteres dentro del papel. La imagen pequeña utiliza miniatura; no descarga originales para imprimir.
- PDFs y hojas de revisión: `output/pdf/spec123-fichas-*.pdf` y `output/pdf/spec123-feedback-qa/`. Se revisaron vistas generales y páginas representativas completas; la extracción/bounding boxes cubre las80 páginas y complementa la inspección visual.
- Recurso guía con/sin decoración, cuento con ilustración principal y juego de sopa de letras: PDF real del producto. Cabecera separada, sin sustituir narración, imagen primaria, preguntas o cuadrícula.
- Evaluación sintética: PDF y Word con lectura, preguntas e imagen de biblioteca, sin clave privada. Word se convirtió con el servicio aislado `xcalificator-document-renderer:spec101` y se revisó su página PNG completa. No se usó LibreOffice del escritorio.
- Se detectó que python-docx no admite WebP. La corrección convierte únicamente la copia de exportación a PNG RGBA; las regresiones verifican píxeles, alfa, dimensiones, bytes/hash de origen e historial intactos.
- No se añadió Word a tipos de recursos que no lo ofrecen actualmente.

## Entorno, fallos y recuperación

Base propia `xcal-spec123-db`, pgvector/PostgreSQL16, puerto127.0.0.1:55417 y datos sintéticos; migraciones existentes hasta202610240001, sin migración nueva. No se accedió a calificaciones ni evidencias de producción.

Las primeras ejecuciones completas de backend fallaron por fixtures del repositorio sin montar; se montaron los directorios necesarios y pasaron1428 pruebas, sin debilitar tests. El primer frontend completo obtuvo901/902: una regresión intentaba guardar sin editar. Se actualizó su fixture para editar el título y conservar la comprobación de doble envío/cambio de cuenta; la suite completa posterior pasó902/902.

El intento de gobernanza dentro del árbol de trabajo encontró borradores ajenos115/121 y cambios no relacionados de Spec034, además de restricciones temporales/bash de Windows. No se incorporan ni alteran esos cambios: se usa una instantánea limpia de los archivos de entrega, sin omitir pruebas. La primera pasada limpia dio47/49: únicamente quedaron los marcadores de tareas aún en curso y cinco referencias abreviadas `FR-001/002/...` que el validador no interpreta como IDs completos. Se desarrollaron las referencias en `tasks.md` como `FR-001, FR-002, ...`, sin modificar requisitos ni debilitar el validador.

La repetición final completa pasó49/49 y el inventario limpio pasó `--check` con643 superficies. No se incorporaron los borradores115/121 ni la edición ajena de Spec034. El catálogo quedó adscrito al dominio funcional existente de Recursos, con consumidores de Evaluaciones y Calificaciones; no se creó otro dominio propietario para una ampliación transversal.

### Auditorías de dependencias

El control frontend que exige CI, `npm audit --audit-level=moderate --omit=dev`, terminó con código0: cuatro avisos bajos existentes de KaTeX. La revisión adicional con dependencias de desarrollo detectó15 avisos, cinco altos; se solicitó autorización para un tratamiento separado. No se cambiaron dependencias, no se usó `audit fix --force` y no se presentan esos avisos como un fallo del control de producción.

La auditoría Python completa `pip_audit -r requirements.txt` terminó sin vulnerabilidades conocidas. Los dos primeros intentos fallaron por caché de solo lectura y carpeta temporal no ejecutable; no fueron hallazgos de vulnerabilidades. Se corrigió exclusivamente el entorno efímero, conservando todas las dependencias en la auditoría.

## Comandos reproducibles

Desde la raíz, con Python/Pillow y FFmpeg instalados:

```powershell
python scripts/build_motif_catalog.py --check-complete
python scripts/build_system_inventory.py --check
python -m pytest tests/spec_governance -q
```

Desde `frontend/`:

```powershell
npm run typecheck
npm run lint:strict
npm run test:run
npm run build
npm run audit:build
npm run audit:actions
npm audit --audit-level=moderate --omit=dev
npx playwright test e2e/motif-library.spec.ts e2e/motif-editors.spec.ts e2e/motif-print.spec.ts --workers=1 --reporter=line
```

Backend: `pytest tests/unit -q`; las tres integraciones propias requieren PostgreSQL aislado mediante `SPEC101_TEST_DATABASE_URL` y `SPEC107_TEST_DATABASE_URL`. Nunca apuntar a producción.

## Cierre pendiente

Converge añadió T035 para cerrar una regresión visual de WebKit: la ejecución adicional de32 casos obtuvo28 pasados y cuatro timeouts de estabilidad a1440px; una repetición focalizada reprodujo el problema. Los cuatro casos de escritorio posteriores y la suite completa32/32 pasaron con preferencia de movimiento reducido, manteniendo clics reales, aserciones, capturas y tiempos originales; no se usó `force` ni se omitieron escenarios. No se modificó la animación de producción.

Converge final revisó16 requisitos,6 criterios de éxito,12 escenarios de aceptación,7 decisiones del plan y8 principios de la constitución: cero brechas funcionales restantes tras T035, sin nuevas tareas ni cambios durante la revisión. La base PostgreSQL sintética propia se retiró tras verificar ID y etiqueta; los originales y documentos de prueba siguen disponibles, sin tocar otros contenedores.

La entrega es el PR260 hacia `main`, con dependencia explícita del PR258 ya fusionado. El usuario autorizó su reparación de CI y la fusión por squash únicamente con todos los controles verdes del HEAD final. No se autorizan bypass, push directo a `main` ni despliegues manuales, y no se declara producción actualizada.

### Reparación del presupuesto de CI (T036)

La ejecución40127256341 del PR260 agotó los30minutos de la suite general cuando había alcanzado343 de406casos. Calidad frontend, backend, contenedores y suite contextual habían pasado; el agregado frontend falló correctamente. No se incrementan timeouts ni se reducen casos.

Se implementaron cuatro particiones Playwright en runners independientes, conservando los contextos requeridos `Frontend E2E (general)`, `Frontend E2E (contextual)` y el agregado final. Todos rechazan resultados fallidos, saltados o cancelados. Los artefactos de diagnóstico tienen nombres distintos por partición.

`node scripts/verify-e2e-shards.mjs 4` enumeró406casos repartidos en112,103,90y101, sin omisiones, ajenos ni duplicados. La enumeración verifica cobertura, no equivale a ejecutar ni aprobar los406casos. Las17pruebas locales de los controles de CI pasaron; también pasó la gobernanza completa58/58 en29.30s desde un árbol limpio. Inventario643, Ruff, lint frontend, auditoría de acciones, sintaxis Node y `git diff --check` pasaron. La ejecución completa remota del HEAD reparado sigue siendo obligatoria antes de fusionar. La reparación no modifica código de producción ni expectativas de los tests E2E.
