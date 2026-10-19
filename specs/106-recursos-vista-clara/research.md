# Investigación de diseño

Fecha: 2026-10-18. Código base main `73b85afc82d4d48778441a484163bec3d98e772d`; diagnóstico local y revisión delegada de solo lectura de permisos. No se ejecutaron pruebas nuevas de implementación en esta fase.

## Jerarquía y biblioteca

**Evidencia**: ListPage antepone banner de evaluaciones y cuatro contadores a CollectionToolbar y tarjetas. Revisión anterior sintética en Chromium: primer recurso Y=1141 a 390×844; no overflow horizontal observado. Cards priorizan Editar/Asignar y usan enlaces anidando botones. Detalle acumula ocho acciones y avisos; cuerpo de guía Y=1160. Medidas/capturas locales en output/playwright/resources-review/REVISION.md, no versionadas.

**Decisión**: búsqueda/tarjetas primero y Ver recurso explícito; estadísticas/ayudas desplegables, semántica de enlace o botón única por acción, tamaños locales 44 px. No ocultar errores ni criterios importantes.
**Alternativas**: más decoración no resuelve búsqueda; reescribir componentes globales añade riesgo ajeno al incremento.

## Catálogo parcial

**Evidencia**: router herramientas listar_materiales acepta limit/offset (50 por defecto, máximo 100). ListPage actual no pagina. Filtros locales no prueban ausencia en todo el catálogo.
**Decisión**: carga incremental explícita con contrato existente, unión por ID e indicador de resultados cargados. No afirmar búsqueda completa si queda contenido pendiente; filtros no envían mutaciones. No añadir endpoint de búsqueda ni cargar todo automáticamente.

## Autoría y permisos

**Evidencia verificada**: router.py exige resources.read/update/create/delete/assign. service.py list_materials filtra autor; list_evaluations_for_material exige get_material por material_id/current_user.id y devuelve solo vínculo propio o arreglo vacío. Los DTO MaterialRead/MaterialListItem no exponen profesor_id. El PDF con soluciones comprueba autor además de lectura. No hay bypass admin para el solucionario directo de recurso.

**Decisión**: reutilizar la consulta vinculada ya presente en DetailPage como prueba de autoría, con respuesta válida y contexto de cuenta/recurso. Combinar con permisos y estado; lectura no depende de ser autor. Error/espera no habilitan escritura ni solucionario. Backend permanece sin cambios.
**Alternativas rechazadas**: asumir profesor/admin=autor; usar campos que el DTO no entrega; inferir autor por ausencia en lista paginada; añadir capabilities al backend en un cambio frontend.

La revisión delegada confirmó que apoyo conserva contenido completo para práctica y puede mostrar solución interactiva; actividad estudiantil se sanea. No equiparar ese uso con descargar PDF solucionario. Los posibles controles de negocio adicionales de retirar/borrar recursos vinculados no se modifican ni se consideran demostrados como defecto funcional por esta UX.

## Editor y móvil

**Evidencia**: startEditing solo copia contenido/título y activa estado. Editor en Y=1079 y Guardar Y=1163 tras pulsar en 390 px; no hay salto al editor ni protección propia de salida en DetailPage. Existen Modal y useMobileFormViewport opt-in, y patrones useBlocker/beforeunload en asistencia y calificaciones.

**Decisión**: editor único en panel amplio adaptado, foco al encabezado/sección, campos móviles 16 px y acciones fuera del scroll; cambios en memoria con confirmación de descarte. Reutilizar patrones, no introducir autosave o persistencia compartida. La respuesta tardía se ignora si cambió cuenta/recurso.
**Alternativas**: barra fija sobre contenido tapa teclado; autofocus de input vuelve a abrir teclado antes de elegir; dos formularios duplican estado.

## Descargas y comprobaciones

**Evidencia**: pdfUrl ya distingue soluciones/descargar; StudentResourcePage usa versión sin soluciones. Tests reutilizables: backend/tests/unit/test_herramientas_render_contracts.py, test_material_classroom_assignment.py, test_authorization_contracts.py, test_evaluation_exports.py; backend/tests/integration/test_resource_assignment_access.py. Son pruebas con mocks/doubles y algunas verificaciones SQL, no una matriz HTTP exhaustiva con datos reales.

**Decisión**: conservar documentos actuales, probar enlaces y contratos de soluciones; impresión de estado revelado se revisa expresamente. No modificar saneamiento estudiantil ni renderer backend. Crear regresiones frontend de permisos, foco, errores y contenido para tipos canónicos/históricos; comparar en Chromium/WebKit sin afirmar validación física.

## Beneficio y medición

**Decisión**: documentar desplazamiento y pulsaciones con la misma fixture antes/después; son indicadores de usabilidad. Tiempo ahorrado en tareas docentes debe medirse con personas en piloto. No atribuir exactitud, velocidad del LLM o calidad de feedback a una reorganización visual.
