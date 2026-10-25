# Plan: edición e impresión de evaluaciones claras

**Rama**: `codex/125-edicion-impresion-evaluaciones` | **Fecha**: 2026-10-24 | **Spec**: [spec.md](./spec.md) | **Issue**: [#262](https://github.com/Andres-back/Calificator/issues/262)

**Estado**: aprobado por el usuario el2026-10-24; revisión de calidad autorizada y realizada8/8. Autorización posterior para entrega en producción con PR/CI verde; implementación y validación local antes de desplegar.

## Resumen

Cuatro entregas verificables dentro de la misma función: visor con escala apropiada, edición enfocada, composición imprimible persistente e ilustraciones aisladas reutilizables. Se conserva el digitalizador y la biblioteca ya entregados. Spec124 / issue261 seguirá siendo propietaria de la extracción fiel del documento; esta entrega define la presentación posterior que podrá reutilizar.

## Contexto técnico

**Lenguajes/versiones**: TypeScript/React18, Vite y Tailwind existentes; Python3.11, FastAPI/Pydantic2 y SQLAlchemy2 existentes.
**Dependencias**: PDF.js y cola de renderizado actual; exportadores PDF/Word y Pillow actuales; biblioteca de motivos y enrutador institucional de imágenes. Sin dependencias nuevas por defecto.
**Persistencia**: PostgreSQL, columna JSONB nullable `configuracion_impresion` con contrato tipado y versión1; inclusión explícita en snapshots de contenido futuros, sin reescribir los históricos.
**Pruebas**: Vitest, Playwright, pytest, PostgreSQL aislado, render e inspección visual de PDF/Word y auditorías/builds actuales.
**Plataforma objetivo**: web/PWA, Chromium Android, WebKit iPhone y computador; 360–1920px, claro/oscuro y teclado.
**Rendimiento y escala**: conservar el render activo de páginas cercanas y el presupuesto de píxeles; editor enfocado con veinte preguntas de prueba. La búsqueda de composición usa hasta cuatro candidatos deterministas, un trabajo cancelable/expirable y cero llamadas a IA. Exportaciones lentas fuera de la navegación principal, reutilizando la infraestructura de trabajos y descargas autenticadas.

## Verificación de la constitución

- Separación de roles: permisos de lectura/edición/exportación y solucionario se aplican en servidor; pruebas de propietario, otro docente, estudiante y acceso anónimo. No basta ocultar botones.
- Integridad y trazabilidad: no tocar notas/evidencias/entregas, claves ni orden por un ajuste de presentación. Snapshots históricos inmutables y conflicto de edición explícito. La presentación no entra en la comparación que invalida claves visuales.
- Asincronía e idempotencia: render del visor cancelable; preparación/paginación mediante trabajos reutilizables por huella de borrador+ajustes, sin duplicar guardados ni generar imágenes por cambios de tamaño. Generación de ilustración solo por acción expresa y sin reintento oculto.
- Datos y secretos: fixtures sintéticas; migración aditiva con nulos para existentes. No registrar textos privados o imágenes en telemetría ni cambiar claves, proveedores o modelos. Ninguna llamada pagada de prueba incluida en esta aprobación.
- Accesibilidad: navegación y foco de teclado, controles44px, entradas móviles16px y safe-area; separar zoom de visualización de letra del documento. Mantener texto accesible alternativo y cancelación del visor.
- Gobernanza y pruebas: issue262, spec/plan aprobados, revisión base16/16 y lista personalizada8/8 revisada con autorización. Después: Tasks, Analyze, implementación, pruebas, Converge y PR/CI. Esta planificación no certifica pruebas futuras.

Revisión de diseño posterior: no hay excepción constitucional propuesta; las ocho condiciones anteriores siguen siendo puertas de aceptación, no resultados de implementación.

## Estructura del proyecto

- `frontend/src/modules/evaluaciones/components/EvaluationPreviewModal.tsx`, `EvaluationPdfViewer.tsx`, `EvaluationPdfPage.tsx`: escala inicial, modos de ajuste, herramientas y área de documento, sin retirar la ventana de renderizado.
- `frontend/src/modules/evaluaciones/components/GenerationWizard.tsx` y componentes de preguntas: extraer navegación enfocada y ajustes de impresión en componentes pequeños; no ampliar aún más el monolito del asistente.
- `frontend/src/modules/evaluaciones/components/QuestionVisualEditor.tsx`: revisión ampliable, propósito del material, biblioteca y propuesta aislada; conservar confirmación antes de añadir.
- Tipos, API y hooks del módulo de evaluaciones: contrato opcional, conflicto, trabajos de composición y descarga de borrador sin guardarlo automáticamente.
- `backend/app/modules/evaluaciones/{models,schemas,service,router,visual_service,export_service,print_layout,visual_generation}.py`: configuración, autorización/versionado, resolución compartida, exportación y propuestas.
- `backend/app/modules/herramientas/pdf_render.py`: aplicar composición solo al formato evaluación; no cambiar globalmente cuentos, crucigramas u otros recursos.
- `backend/app/services/image_router.py`: únicamente adaptar capacidades comprobadas de la ruta existente si hace falta; no incrustar nombres de modelo en el flujo de preguntas.
- Directorio de migraciones y pruebas unitarias/integración/E2E existentes: cobertura aditiva y regresiones. No introducir un renderizador paralelo ni modificar CI para aceptar fallos.

## Secuencia propuesta

1. **Visor y edición**: página completa en escritorio, ancho en celular; navegación de pregunta única, controles progresivos, material ampliable y conservación de borrador. Sin migración para esta primera parte.
2. **Presentación persistente**: contrato/migración, bloqueo optimista y compatibilidad legacy/versionada antes de mostrar «Guardar presentación». El formato no crea por sí solo la primera versión académica de una evaluación antigua.
3. **Impresión**: resolver común de distribución compacta/media/amplia, letra, espacio, columnas y color independiente para PDF/Word; preparación de borrador y búsqueda acotada de meta de hojas. PDF autoritativo para el conteo; Word puede repaginar. Trabajo `evaluacion_impresion` en cola existente `presentations`, con presupuesto durable de cuatro renders y caducidad24h, sin IA.
4. **Materiales**: biblioteca primero; propuesta de figura aislada, revisión de transparencia real y derivados para impresión, sin alterar el original ni transformar información académica sin decisión docente.
5. **Cierre**: pruebas sintéticas, migración en base aislada, visuales en ambas pantallas y formatos, CI completo y revisión/merge autorizados. Verificación posterior con demo, sin modificar evaluaciones reales.

## Decisiones y complejidad

- **Presentación separada del contenido académico**: campo tipado de raíz, no `reglas_feedback`, respuestas ni bloques científicos. En evaluaciones con versiones, se crea una revisión inmutable copiando el snapshot anterior y cambiando solo presentación bajo bloqueo; no se fabrican manifiestos visuales, se invalidan claves ni se reasignan entregas. En legacy sin versión, solo se actualiza el campo raíz con control de concurrencia. Véase [data-model.md](./data-model.md).
- **No garantizar «cabe en dos hojas»**: se prueban como máximo cuatro composiciones, sin borrar contenido, cambiar orden o bajar de10pt. El docente ve hojas reales y ajustes propuestos antes de aceptar. El perfil compacto reduce cabeceras decorativas, no lecturas o explicaciones necesarias.
- **Columnas conservadoras**: reutilizar `option_columns` y ampliar mediante reglas compartidas para grupos consecutivos de preguntas cerradas cortas. Lectura y numeración de arriba abajo y luego siguiente columna, nunca reordenar por tamaño ni separar figura de pregunta. Si no cabe un bloque, pasa a ancho completo o a la siguiente página.
- **Figura lateral acotada**: ofrecer disposición apilada o lateral dentro de una pregunta, con ancho proporcional y conservación de relación de aspecto. Un bloque de dos celdas mantiene juntos enunciado/espacio y figura sin envolver texto alrededor de siluetas. No aplicar automáticamente a tablas extensas, hojas completas o figuras cuyos rótulos requieran mayor ancho. La muestra de alimentos permite contrastar menor tamaño y cabecera compacta antes de integrar los controles persistentes.
- **Espacios explícitos**: normalizar los actuales `lineas_respuesta` y la nueva preferencia por pregunta en el resolvedor; prioridad al ajuste docente. Acabar con la discrepancia de dos líneas fijas de PDF frente al Word, pero solo en evaluaciones con configuración explícita para no reformatear automáticamente las existentes.
- **Blanco y negro no equivale a transparencia**: el primero es una presentación derivada; la segunda requiere alpha real. Las imágenes originales y sus hashes no cambian. Si el color contiene información académica, pedir confirmación o conservarlo con advertencia.
- **Sin gasto escondido**: reutilizar320 motivos existentes. Alinear el prompt de nueva ilustración con una figura, no una hoja completa; verificar documentación oficial/capacidades del destino antes de programar parámetros. Si no soporta transparencia, explicar la limitación y ofrecer biblioteca/subida; no cambiar silenciosamente de proveedor ni hacer llamadas adicionales.
- **Sin editor libre**: se mantienen bloques y tamaños/alineación acotados; arrastrar capas o envolver texto alrededor de siluetas queda fuera. La nueva disposición se puede probar independientemente de Spec124.
