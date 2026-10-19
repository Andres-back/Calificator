# Validación de Xali docente

Alcance y plan aprobados por el usuario el 2026-10-17; listas base 16/16 y UX 6/6 revisadas con autorización. Los escenarios de esta guía se verificaron con cuentas/materias sintéticas, LLM simulado y base aislada. No se accedió a producción, imágenes reales, claves ni APIs de IA. Resultados y límites al final.

## Backend

1. Profesor propietario, docente ajeno, administrador y estudiante: chat/historial/borrado rechazan lo no autorizado antes de RAG/LLM; regresiones estudiantiles existentes intactas.
2. Materia sin documentos, metadatos incompletos y RAG no disponible: nombre/área/grado conocidos en prompt docente, general explícito y sin fuentes inventadas; timeout no rompe transacción ni guardado posterior.
3. Historial A/B/general con mensajes antiguos: lectura/borrado solo del contexto solicitado, sin migración ni borrado cruzado. Persistir intercambio/metadata y reconstruir visuales tras recarga en base aislada.
4. Dos conexiones reales de prueba: un chat en curso impide segundo chat/borrado en ese contexto con conflicto recuperable; otro contexto no se bloquea; excepciones liberan lock y no dejan media pareja de mensajes.
5. Formato visual válido/excesivo/malicioso/desconocido: mismo corpus en Python/TypeScript; no URLs ni código/expresiones ejecutables. Figura inválida conserva texto, sin generar otra respuesta automáticamente.

## Frontend y visuales

1. A(-2,3), O(0,0), B(3,-1) en plano/tablas; barras y líneas [2,4,3]; círculo de radio 2 y rectángulo 4×2. Comprobar signos, origen, proporciones, etiquetas/unidades y tabla equivalente.
2. Cambiar materia/cuenta mientras llegan respuesta, error, historial o borrado; verificar guardas en todas las finalizaciones. Sin duplicación visible por doble toque; fallo incierto consulta historial antes de reenviar.
3. 360/390/1440, claro/oscuro, Chromium/WebKit: cinco representaciones legibles/ampliables, foco/Escape/cierre y teclado simulado, sin overflow de página. Tabla/fórmula con scroll local; lector alternativo no depende de hover/color. Guardar y revisar capturas.
4. Mensajes previos de texto y metadata ajena/desconocida: conservar lectura y no interpretar mensajes del estudiante como visuales docentes.
5. Comprobar cero peticiones de generación por seleccionar materia/ampliar, cero modificaciones a notas/evaluaciones/evidencias y carga diferida de charts sin precarga pública.

## Cierre después de aprobar e implementar

Ejecutar pytest focalizado y pruebas de integración aislada; Vitest del módulo Xali/visuales y regresiones estudiantiles; E2E dedicado; tipos, lint, build y auditorías. Registrar comandos/resultados/limitaciones, ejecutar Converge y esperar CI remoto antes de proponer merge. No declarar dispositivos físicos o producción verificados a partir de emulación. Fusión y despliegue requieren autorización separada.

## Resultados locales — 2026-10-17

- Migraciones existentes aplicadas sin cambios a PostgreSQL/pgvector 16 sintético, contenedor etiquetado para Spec 104, puerto loopback 55404, sin volumen ni datos de producción.
- `python -m pytest tests/unit -q`: 956 aprobadas, una omitida; advertencias preexistentes de deprecación y de cancelación del driver en una prueba de transporte. Las nuevas rutas, roles, fuentes, esquema visual y política estudiantil están incluidas.
- `SPEC104_TEST_DATABASE_URL=<base aislada> python -m pytest tests/integration/test_xali_teacher_visual.py tests/unit/test_xali_teacher_context.py -q`: 17 aprobadas. Persistencia/recarga de metadata, Matemáticas sexto y Lenguaje cuarto sin RAG, texto antiguo, borrado general aislado, dos conexiones/locks, rollback del LLM y recuperación tras error SQL de RAG. Filas académicas comparadas antes/después, sin modificaciones.
- Vitest focalizado de Xali y regresión de PresentacionForm: 32 aprobadas; incluye 30 de Xali y dos de presentación, con cambios de cuenta/materia, éxito/error/historial/borrado tardíos, doble toque y recuperación sin reenvío automático. El corpus Python/TypeScript comparte cinco visuales válidos y ocho inválidos.
- `npx playwright test e2e/xali-teacher-visual.spec.ts --workers=2 --reporter=line`: 14 aprobadas. Chromium/WebKit × 360/390/1440 × claro/oscuro, más fallo incierto por motor. Comprueba los cinco tipos, valores, proporciones, foco/Escape, botón de 44 px, escritura en viewport reducido, ausencia de overflow y cero generación al seleccionar/ampliar.
- Capturas locales en `frontend/test-results/xali-teacher-visual-*/{plano-ampliado,escritura}.png`, revisadas visualmente. En celular el dibujo ampliado permite desplazamiento local y muestra la indicación correspondiente; la tabla conserva todos los valores. WebKit en Windows se ejercita por teclado para evitar sus esperas de estabilidad del puntero; Chromium también usa clic.
- `npm run typecheck`, `npm run lint:strict`, `npm run build`, `npm run audit:actions`, `npm run audit:build` y Ruff F401/F821/F822/F823/F841: aprobados. Build con aviso de tamaño preexistente del chunk principal; gráficos y geometría se cargan por separado, sin precarga pública de charts.
- `python -m pip_audit -r requirements.txt`: sin vulnerabilidades conocidas. `npm audit --omit=dev --audit-level=moderate`: sin moderadas/altas/críticas; informa cuatro bajas en KaTeX y dependientes. No se aplicó una actualización forzada incompatible dentro de este alcance.

## Limitaciones y entrega

Las ejecuciones amplias iniciales de Vitest coincidieron con navegadores/compilaciones y tuvieron timeouts en pruebas de otras pantallas; una de ellas terminó con 723/725 aprobadas. Los casos de Xali y presentaciones afectados pasaron aislados, sin modificar sus aserciones ni la vista estudiantil. La repetición final y CI remoto deben distinguirse de estas ejecuciones: no se presenta una ejecución fallida como verde.

Repetición amplia final, sin navegadores concurrentes: `node node_modules/vitest/vitest.mjs run --maxWorkers=2 --testTimeout=15000 --reporter=dot`: **115 archivos y 725 pruebas aprobadas**. El margen local de 15 segundos se aplicó por CLI, sin modificar la configuración ni aserciones del repositorio. CI remoto conserva sus parámetros normales y sigue siendo obligatorio. El aviso de la conversación vacía se elimina solo para docentes: no ofrece «Ir al mensaje más reciente» cuando aún no existen mensajes.

No se midió velocidad ni corrección pedagógica de un LLM real. La validación garantiza representación fiel de datos aceptados, no infalibilidad del modelo. No acredita hardware físico iPhone/Android ni producción. Sin migración de mensajes, cambio de proveedor, coste de imágenes, ni cambios de notas/evaluaciones/evidencias. CI remoto y revisión requeridos antes de fusión; este incremento no está autorizado para desplegarse.

## Convergencia y gobernanza

Converge realizado sobre el código actual y los artefactos aprobados, sin ampliar alcance: 11 requisitos, cinco criterios de éxito, 13 escenarios de aceptación, ocho decisiones del plan y ocho principios constitucionales revisados. Cero hallazgos missing/partial/contradicts/unrequested de código; no se añadió una fase vacía ni se reescribieron tareas por Converge. Inventario regenerado mecánicamente para las nuevas referencias de pruebas y catálogo de specs actualizado; revisión documental del propietario 009 enlaza este incremento. No hay hooks de extensiones registrados. PR y CI no equivalen a autorización de fusión o despliegue.

Cierre local: `python -m pytest tests/spec_governance -q`: 41 aprobadas; inventario vigente con 573 superficies. Revalidación final del módulo Xali backend: 51 aprobadas y Ruff sin incidencias. Frontend Xali: 30 aprobadas, tipos y lint sin avisos; comprobación adicional 360 px claro en ambos motores: dos E2E aprobadas. No se alteró el alcance para lograr estos resultados.

## Corrección autorizada del PR #217 — 2026-10-17

CI del HEAD `cf3cf60859e012e67065604c78cf9e4b0ea3c0df`: backend, contenedores y gobernanza aprobados; 223 de 224 E2E aprobadas. La única fallida exigía altura visual exactamente ≥44 y recibió `43.999969482421875` para un botón CSS de 44 px. No fue un fallo de calificación ni de IA.

El usuario autorizó corregir y actualizar el PR. La comprobación ahora exige altura CSS ≥44 sin tolerancia y usa polling para la altura visual con margen exclusivo de 0,001 px. Regresión sintética por motor: acepta el caso subpíxel, rechaza CSS de 43 px y rechaza una transformación que reduzca de verdad el área táctil. No se redondean indiscriminadamente valores hacia arriba, no se omiten pruebas y no cambian componentes, estilos, datos o APIs del producto.

Revalidación: 16 E2E aprobadas con Chromium/WebKit, 360/390/1440 y ambos temas; tipos y lint estricto aprobados. Inventario sincronizado, manteniendo 573 superficies. El nuevo HEAD debe pasar su propia ejecución de CI: no hereda los verdes del anterior. Sin autorización de fusión ni despliegue.
