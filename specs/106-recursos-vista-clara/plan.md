# Plan: biblioteca y visualización docente de recursos

**Rama**: `codex/106-recursos-vista-clara` | **Fecha**: 2026-10-18 | **Spec**: [spec.md](./spec.md) | **Issue**: [#220](https://github.com/Andres-back/Calificator/issues/220)

## Resumen

Reorganizar la biblioteca, detalle y edición para encontrar, leer y decidir con menos desplazamiento y ambigüedad. El recurso ocupa el espacio principal; las acciones se separan de la lectura y los avisos críticos se conservan. Alcance exclusivamente frontend, reutilizando contratos y permisos existentes. Aprobado el 2026-10-18; implementación autorizada, sin autorización de fusión ni despliegue.

## Cómo ayuda al profesor y por qué

| Cambio | Problema observado | Beneficio esperado y mecanismo |
| --- | --- | --- |
| Búsqueda, filtros y tarjetas antes de contadores | Primer recurso en Y=1141 a 390 px | Encontrar antes el material: menos desplazamiento repetitivo y filtros que acotan la lista. |
| Ver recurso explícito | Destacan Editar/Asignar, aunque la tarjeta abre lectura | Disminuir dudas y entradas involuntarias a edición: la acción expresa exactamente su propósito. |
| Contenido amplio y cabecera breve | Guía en Y=1160, ocho acciones encima | Revisar la calidad del material antes de actuar, sin buscarlo entre mensajes administrativos. |
| Editar lleva a su sección | Editor en Y=1079 sin movimiento de pantalla | Evitar la sensación de botón averiado y la búsqueda manual; foco al encabezado, no al campo que abre teclado. |
| Guardar/Cancelar accesibles y descarte confirmado | Cambios locales sin protección de salida | Reducir trabajo repetido por pérdida accidental, conservando valores ante errores. |
| Descarga diferenciada y acciones por permiso | Acciones de escritura visibles en solo lectura | Reducir selecciones equivocadas y errores de autorización; cada opción refleja el contrato existente. |
| Controles táctiles, claro/oscuro y mismo vocabulario | Botones de 40 px y Recursos/Herramientas/Material | Facilitar uso en teléfonos y reconocimiento de acciones sin exigir recordar nombres distintos. |

Son beneficios esperados de usabilidad, no una eficacia docente demostrada. Se medirá primero desplazamiento, pulsaciones y conservación de contexto con ejemplos idénticos; posteriormente, docentes del piloto podrán realizar encontrar → revisar → editar → preparar documento sin guía, registrando tiempo, dudas y errores. No se atribuirá al cambio una reducción de tiempo de calificación o mejora de exactitud de IA que no modifica.

## Contexto técnico

**Lenguajes/versiones**: TypeScript y React 18 del proyecto.
**Dependencias**: React Query, React Router, componentes Button/Modal/CollectionControls, useMobileFormViewport y estilos existentes. Sin dependencias nuevas ni cambios globales de botones/menús/modales.
**Persistencia**: recursos y escrituras existentes sin cambios. Filtros/origen en estado de navegación válido para cuenta/ruta; edición en memoria por cuenta/recurso. Sin migraciones ni almacenamiento duradero de contenido sensible.
**Pruebas**: Vitest; Playwright con fixtures sintéticos en Chromium/WebKit, 360/390/1440 px, claro/oscuro, altura reducida y teclado. Pruebas backend existentes de permisos/PDF solo en entorno aislado, sin modificar sus políticas.
**Plataforma objetivo**: navegador y acceso instalado en Android/iPhone y escritorio; emulación no acredita teclado/cámara físicos.
**Rendimiento y escala**: filtrar y abrir menús no inicia IA ni mutaciones. Render de una sola vista/editor, sin duplicar materiales por cada viewport. Con más de 50 registros, carga incremental explícita usando limit/offset existentes y unión por ID; avisar cuando filtros solo cubren lo cargado. Sin descargar automáticamente todo el catálogo.

## Verificación de la constitución

- Separación de roles: permiso efectivo + autoría comprobada + estado; no asumir que ser profesor/admin permite modificar todo. Fallo o carga de comprobación deja lectura, no acciones nuevas.
- Integridad y trazabilidad: lectura/filtros/menús no escriben; editar/asignar/duplicar/eliminar conservan confirmaciones, endpoints y cachés relacionados. No cambiar notas, evidencia, criterios o publicación automáticamente.
- Asincronía e idempotencia: error/carga/espera visibles, bloqueo de doble envío, operaciones de generación y conversión intactas.
- Datos y secretos: mocks/base aislada; no alumnos, claves, VPS ni APIs pagadas. Edición en memoria y aislamiento en cambio de cuenta; URL sin contenido ni credenciales.
- Accesibilidad: 44×44 px, entradas móviles 16 px, foco restaurado, menús sin recortes, área activa visible con teclado y scroll local de formatos anchos. Avisos críticos prioritarios.
- Gobernanza y pruebas: aprobación humana de spec/plan y revisión de requisitos registradas en el chat e issue #220; listas base 16/16 y UX 8/8 completas. Tasks/Analyze realizados antes de implementar. Converge, PR y CI cierran la entrega. Sin excepción ni permiso implícito de merge/despliegue.

## Estructura del proyecto

- `frontend/src/modules/herramientas/ListPage.tsx`: jerarquía, filtros, resultados parciales/carga incremental, tarjeta con Ver recurso y estado compartido.
- `frontend/src/modules/materias/MateriaRecursos.tsx`: tarjeta/acciones coherentes conservando origen y contexto de la materia.
- `frontend/src/modules/herramientas/DetailPage.tsx`: coordinar carga/error, acciones autorizadas, lectura, estado, descargas, foco y edición. Extraer presentación en componentes locales pequeños en vez de añadir más JSX administrativo al mismo bloque.
- Nuevos módulos locales previstos: `resourcePresentationModel.ts` (filtros/estado/acciones como funciones puras) y `components/ResourceActions.tsx`, `ResourceLibraryToolbar.tsx`, `ResourceEditorPanel.tsx` según la separación necesaria. Mantener un único formulario y una única fuente de datos.
- `frontend/src/modules/herramientas/MaterialContentEditor.tsx`: adaptación visual/entrada móvil únicamente; mantener esquema y transformaciones. `views/*`: regresión de contenido/juegos, sin reescribir lógica pedagógica.
- `frontend/src/modules/herramientas/api.ts`: solo parámetros de paginación ya aceptados y claves de consulta; no contratos nuevos.
- `frontend/src/hooks/useMobileFormViewport.ts`, `components/ui/Modal.tsx`, `CollectionControls.tsx`: reutilización opt-in; cualquier necesidad de ajuste global exige justificar consumidores y regresiones antes de ampliarlo.
- Tests correspondientes a ListPage/DetailPage/modelo/editor/MateriaRecursos y E2E de recursos. Documentación propietaria 006/003, índice, catálogo de specs y regeneración del inventario al implementar.

## Decisiones y complejidad

1. **Biblioteca**: cabecera mínima, Crear recurso, búsqueda/filtros, tarjetas; Resumen y Acerca de evaluaciones desplegables. Filtros materia y tipo, Sin materia, limpiar y estado parcial. Conservar todos los tipos y alias, sin presentar borradores antiguos cuando no hay registros salvo dentro de filtros/opciones secundarias.
2. **Lectura**: cabecera breve y un solo retorno al origen. Editar, Asignar/Abrir actividad y Descargar según contexto; Más agrupa duplicar, compartir, visibilidad y eliminar. En móvil deben caber sin envolver ocho acciones; en escritorio usar el ancho del documento, sin panel lateral permanente que lo reduzca. Títulos largos se parten, no recortan el contenido.
3. **Descarga/impresión**: conservar PDF original y solucionario existentes; opción claramente identificada, sin descarga al abrir menú. No exportar al estudiante el contenido completo de la vista docente para fabricar otro documento. Impresión administrativa permanece excluida; si el estado de revelar soluciones afecta el documento, ofrecer ruta PDF estudiantil explícita antes de imprimir, sin tocar renderizadores backend.
4. **Permisos sin ampliar API**: los DTO de material no incluyen profesor_id. Reutilizar la consulta existente `GET /herramientas/{id}/evaluaciones`, que verifica autoría antes de devolver arreglo (incluso vacío), como comprobación documentada para acciones de autor. Solo una respuesta válida, fresca para cuenta/recurso y exitosa acredita esa condición; nunca un ID de URL, un tipo de rol, caché ajena o un 403/404. No inferir autoría de la ausencia en la primera página de biblioteca. PDF solucionario exige lectura+autor; editar exige resources.update; duplicar resources.create; borrar resources.delete; apoyo/visibilidad resources.assign; actividad además evaluations.create. Espera/fallo oculta acciones dependientes y ofrece reintento, sin bloquear lectura permitida. Backend sigue siendo autoridad final.
5. **Edición enfocada**: presentar el editor en panel amplio con modo móvil adaptado (Modal/hook existentes), foco inicial en encabezado no editable y sección criterios al solicitarla. Pie de Guardar/Cancelar fuera del scroll de contenido, sin superponer teclado. Mientras escribe reducir ayudas, ofrecer Listo sin enviar y preservar DOM/valores/selección al redimensionar. No duplicar formulario de escritorio y celular.
6. **Cambios pendientes**: comparación contra original normalizado sin alterar su contenido. Confirmación separada en cancelar/salir/acción ocasional; bloqueo local de navegación y beforeunload cuando hay cambios, siguiendo patrones del proyecto. Error de guardado conserva borrador; éxito invalida material/biblioteca/materia relacionados. Si cambia cuenta/recurso o se pierde permiso, impedir respuesta tardía y no trasladar edición; no introducir autoguardado ni publicación implícita.
7. **Navegación**: conservar filtros/origen mediante contexto de Router validado y acotado a rutas internas de biblioteca/materia y cuenta actual. Enlace compartido canónico sin `action=edit/assign` ni filtros del docente; publicado apunta a lectura estudiantil existente, no publicado deja claro que compartir no publica ni concede acceso.
8. **Menús y estilos locales**: reutilizar patrones accesibles existentes; verificar colisiones, cierre/foco, teclado y altura móvil antes de reutilizar un menú tal cual. Si hace falta, envoltorio específico de recursos; no cambiar ActionMenu/Button para toda la app ni añadir animaciones o iconos nuevos en este incremento.

## Secuencia prevista

1. Aprobar spec/plan y revisar checklist de requisitos; generar tareas y análisis de consistencia.
2. Modelo puro de filtros/estados/acciones y pruebas de permisos/autoría, rutas antiguas, paginación y regresiones.
3. Biblioteca y tarjetas de materia; lectura/acciones/descargas; después editor con foco, escritura y descarte.
4. Pruebas funcionales y visuales, tipos/lint/build/auditorías, contratos de permiso/PDF existentes con datos sintéticos. Resolver cualquier defecto del alcance; backend fuera de alcance se informa por separado.
5. Actualizar propietarios/inventario, Converge y PR con CI. No fusionar ni desplegar sin autorización separada.

## Fuera de alcance

Generación IA, calidad de rúbricas, nuevos renderizadores/PDF/Word, OCR/RAG, publicaciones automáticas, cambios de datos o de reglas de autorización, rediseño estudiantil/juegos y paginación/búsqueda global del servidor. No se implementa ningún control de negocio backend descubierto de forma incidental. La validación docente posterior no se sustituye por pruebas visuales sintéticas.
