# Validación: recursos docentes claros

Fecha: 2026-10-18. Rama `codex/106-recursos-vista-clara`, base main `73b85af`, issue #220. Spec/plan aprobados antes de implementar; checklist base 16/16 y UX 8/8 revisadas con autorización. Alcance frontend; no se ha fusionado ni desplegado.

## Implementado

- Biblioteca con búsqueda, filtros combinados materia/tipo, Sin materia y limpieza. «Ver recurso» explícito; ayudas/contadores plegados. Páginas de 50 con «Cargar más», unión por ID y aviso de búsqueda parcial; no descarga automática de todo el catálogo.
- Lector compacto, contenido protagonista, estado común en biblioteca/materia. Alertas críticas conservadas; criterios y contexto IA consultables a petición. «Más» reúne gestión ocasional; abrir menús no escribe.
- «Descargar» distingue PDF estudiantil y solucionario del autor. Imprimir abre el PDF sin respuestas, no imprime el DOM docente con soluciones reveladas. Compartir usa enlace canónico sin action ni filtros; no concede acceso.
- Autoría comprobada por respuesta válida y vigente de la consulta existente de evaluaciones vinculadas, además del permiso efectivo. Un admin ajeno no hereda edición/solucionario. La ausencia de permisos de escritura no envía a un profesor al lector estudiantil.
- Editor único amplio, foco no textual o sección criterios, desplazamiento interno, 16 px móvil, Listo sin enviar y pie accesible. Error conserva borrador; descarte/navegación/recarga protegidos; envío único y respuestas tardías aisladas por cuenta/recurso. No se redondean valores ni se eliminan campos desconocidos.
- Estudiantes y juegos conservan sus rutas y lógica. No hay cambios en backend, paquetes, modelos, notas, evidencias ni asociaciones automáticas.

## Resultados locales

- Frontend: **119 archivos / 752 pruebas unitarias aprobadas**.
- Tipos, lint estricto, build, audit:actions y audit:build: aprobados.
- Backend existente: **69 pruebas aprobadas** de PDF, asignación de recursos y autorización, con fixtures sintéticas/FakeDB. No se probó persistencia con registros reales ni se conectó a producción.
- Navegadores: **26 pruebas E2E aprobadas**, sin omitidas ni reintentos, en Chromium/WebKit; incluye regresión de creación y entrega estudiantil.
- Converge: 12 requisitos funcionales, 6 criterios de éxito, 12 escenarios, 8 decisiones y 8 principios revisados. F1 (scroll de criterios) y F2 (lector docente de solo lectura) corregidos; ningún hallazgo restante. Inventario de 573 superficies vigente; **41 pruebas de gobernanza aprobadas**.

La matriz comprende Chromium/WebKit, 360×800, 390×844 y 1440×844, ambos temas, altura 440, foco, selección conservada al redimensionar, error de guardado/descarte, documentos, contexto de materia y biblioteca, lector docente de solo lectura y regresión de creación/entrega estudiantil. Diez formatos se recorren también en 360 y 1440 px. Abrir lectura/filtros/menús produce cero mutaciones de negocio; solo guardar explícitamente envía el cuerpo original con los cambios solicitados.

Se corrigió el retorno de foco en Safari y la combinación rápida de filtros. Las capturas de la matriz usan DPR 1 local: la superficie de 2880 px de Desktop Safari en Windows provocaba esperas de estabilidad; el caso aislado pasó con el mismo viewport CSS de 1440 px y sin saltar assertions, forzar clics ni reducir tamaños mínimos. Se admite hasta 1 px de reposo del resorte compartido únicamente para registrar posición; los objetivos táctiles mantienen el umbral de 44 px con tolerancia de redondeo 0,001 px. Los 503 del guardado son fallos sintéticos deliberados para verificar recuperación.

El build conserva una advertencia sobre un chunk global de más de 500 kB; la auditoría de presupuesto aprueba. Backend conserva una advertencia de deprecación de dateutil; no es un fallo.

## Comparación visual y pulsaciones

Mismo conjunto sintético de seis recursos de la revisión previa, títulos de hasta 80 caracteres, sin alertas bloqueantes. Coordenadas CSS aproximadas a 390×844:

| Elemento | Antes | Ahora |
| --- | --- | --- |
| Primera tarjeta | Y=1141 | Y=308–344 |
| Comienzo de guía | Y=1160 | Y=436 |
| Editor tras pulsar Editar | Y=1079, fuera de pantalla | Diálogo en el viewport, Y≈0 |

Abrir lectura conserva una pulsación, ahora con «Ver recurso» inequívoco. Editar conserva una pulsación, pero ya no exige buscar el formulario mediante scroll. Elegir PDF pasa de botones directos a «Descargar → documento» (dos pulsaciones): se gana espacio y se distingue estudiante/solucionario. Volver conserva búsqueda/filtros u origen de materia de la misma cuenta. No se afirma un ahorro de tiempo docente o mejora de exactitud de IA a partir de estas medidas.

Capturas e informes generados, no versionados: `output/playwright/106-recursos/`. Incluye biblioteca/detalle/editor por navegador/tamaño/tema y `results-final.json`.

## Reproducción

Desde `frontend/`:

```powershell
node node_modules/vitest/vitest.mjs run --maxWorkers=2
npm run lint:strict
npm run typecheck
npm run audit:actions
npm run build
npm run audit:build
node node_modules/@playwright/test/cli.js test e2e/resources-responsive.spec.ts e2e/resources-creation.spec.ts e2e/student-activity-delivery.spec.ts --workers=2 --reporter=line
```

Desde `backend/`: `python -m pytest tests/unit/test_herramientas_render_contracts.py tests/unit/test_material_classroom_assignment.py tests/unit/test_authorization_contracts.py -q`.

Desde raíz: `python scripts/build_system_inventory.py --check` y `python -m pytest tests/spec_governance -q`. En Windows, Vitest/pytest pueden necesitar ejecución fuera del sandbox por bloqueo de archivos temporales, no por permisos de la aplicación.

## Límites de la entrega

Solo datos sintéticos; sin IA pagada, VPS, imágenes de alumnos ni cambios académicos. Emulación no acredita teclado/teléfono físico Android/iPhone. Queda una prueba posterior con docentes: encontrar → revisar → editar → preparar PDF sin guía, registrando tiempo, dudas y errores. CI remoto y una autorización separada son obligatorios antes de fusionar o desplegar.

## Entrega conjunta autorizada — 2026-10-19

El usuario autorizó la actualización en producción de los iconos administrativos y el PR pendiente de recursos. Se incorpora la rama de Spec 103 (PR #216) en este PR #221 para comprobar ambos cambios juntos y efectuar una sola actualización web. Se conservan los contratos y escenarios de ambas especificaciones y los cambios vigentes de `main`; no se incorpora Spec 101 ni otro trabajo en curso.

La entrega mantiene todas las comprobaciones CI requeridas. Los fallos intermitentes de animación/navegación se documentan en la guía de 103 y se sincronizan sin eliminar aserciones ni activar reintentos del runner. Tras la fusión se verificará que los archivos funcionales de #216 están incluidos en `main` antes de cerrar ese PR como incorporado; no se confundirá ese cierre con una segunda fusión independiente. Hasta entonces no se acredita producción actualizada.
