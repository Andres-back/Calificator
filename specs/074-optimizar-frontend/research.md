# Investigación: Optimizar fluidez y organización del frontend

## Decisión 1: distinguir datos estables de procesos activos

**Decisión**: retirar intervalos fijos de las listas de evaluaciones, boletines y contexto de Xali cuando no existe un trabajo transitorio; mantener actualización al recuperar foco e invalidaciones tras mutaciones. Conservar intervalos condicionales para entregas, presentaciones e importaciones en proceso.

**Razón**: las listas estables no necesitan una solicitud cada diez segundos. TanStack Query ya conserva caché, cancelación por clave e invalidaciones; el seguimiento condicional mantiene la expectativa de progreso sin tráfico permanente.

**Alternativas consideradas**:

- Aumentar todos los intervalos: reduce, pero no elimina trabajo innecesario.
- Desactivar toda actualización: rompería la visibilidad de trabajos asíncronos.
- WebSocket global: ampliaría backend, despliegue y riesgo fuera del alcance.

## Decisión 2: proteger el debounce existente

**Decisión**: conservar `useDebouncedValue(..., 300)` y `placeholderData` ya presentes en `CalificacionesWorkspace`, y añadir una prueba de integración que demuestre una consulta por ráfaga y estabilidad del resultado previo.

**Razón**: el código actual ya resuelve el problema; reimplementarlo duplicaría lógica. La carencia real es una regresión que impida volver a consultar por tecla.

**Alternativas consideradas**:

- Nuevo hook o estado duplicado: rechazado por redundancia.
- Debounce del servidor: no evita renders ni solicitudes del navegador.

## Decisión 3: WebP ajustado al uso y carga diferida

**Decisión**: generar WebP desde los PNG originales con dimensiones máximas acordes a su presentación y usar carga diferida para imágenes no críticas. El logo tendrá una variante pequeña; héroes/patrones una variante amplia; personajes y estados vacíos una variante media.

**Razón**: los PNG actuales son 1024×1024 y pesan entre 700 KB y 1,2 MB aunque se muestran entre 40 y 320 px. WebP reduce transferencia manteniendo transparencia y calidad suficiente.

**Alternativas consideradas**:

- Borrar originales: rechazado; son fuentes recuperables.
- AVIF exclusivo: rechazado por mayor coste y compatibilidad menos uniforme.
- Mantener PNG con `loading=lazy`: no reduce peso de imágenes críticas.

## Decisión 4: precarga fina en Vite 8

**Decisión**: usar `build.modulePreload.resolveDependencies` para excluir `charts`, `markdown` y `document-export` solo cuando el host es la entrada HTML. Las dependencias de importaciones dinámicas conservan su precarga al navegar.

**Razón**: la [documentación oficial de Vite 8](https://v8.vite.dev/config/build-options#build-modulepreload) confirma que el resolvedor recibe `hostType: 'html' | 'js'` y puede devolver una lista filtrada. Es más seguro que desactivar `modulepreload` completo.

**Alternativas consideradas**:

- Desactivar toda precarga: empeora rutas posteriores.
- Eliminar grupos manuales: pierde caché semántica sin garantizar la entrada.
- Mantener el HTML actual: descarga bibliotecas ajenas al acceso público.

## Decisión 5: selector nativo para navegación móvil de materia

**Decisión**: mostrar un select con la sección activa por debajo de `md` y mantener las pestañas visuales desde `md`.

**Razón**: siete pestañas horizontales son funcionales pero poco descubribles. El select nativo es familiar para docentes, accesible con teclado/lector y no requiere manejar foco de un menú personalizado.

**Alternativas consideradas**:

- Flechas laterales sobre el carrusel: todavía ocultan opciones.
- Menú personalizado: añade estados, cierre, foco y más riesgo.
- Mostrar las siete en varias filas: ocupa demasiado espacio antes del contenido.

## Decisión 6: compactar sin retirar funciones

**Decisión**: cuando la bandeja docente esté vacía, mostrar un único resumen compacto; mantener dos listas cuando exista al menos un caso. En el inicio docente, las acciones primarias del héroe no se repiten en la cuadrícula. En el inicio estudiante, Xali se presenta una sola vez como acción principal y se retira su duplicado complementario. En admin, las métricas usan dos columnas desde móvil cuando el ancho lo permite.

**Razón**: reduce longitud y repetición conservando destinos y contexto.

**Alternativas consideradas**:

- Eliminar secciones completas: podría ocultar capacidades.
- Solo reducir márgenes: no resuelve duplicación semántica.

## Decisión 7: CSP segura

**Decisión**: no modificar la CSP para permitir GTM o dominios publicitarios no configurados. Los errores `ERR_BLOCKED_BY_CLIENT` de extensiones y scripts inyectados se consideran ruido no funcional. Cualquier analítica futura requiere configuración explícita y su propia especificación.

**Razón**: ampliar `script-src`, `connect-src` o `img-src` con comodines rebajaría seguridad sin mejorar funciones educativas.

**Alternativas consideradas**:

- `unsafe-inline`: rechazado por seguridad.
- Permitir todos los dominios observados: rechazado por privacidad y mantenimiento.
