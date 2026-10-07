# Contrato de interfaz docente móvil

## Entrada (FR-001/002, SC-003)

| Contexto | Resultado |
|---|---|
| Navegador en `/`, cualquier sesión | Landing pública sin redirección automática por ser un teléfono |
| Raíz instalada, sesión por comprobar | Estado de inicio; no mostrar contenido docente ni redirigir prematuramente a login |
| Raíz instalada, sesión vigente | `/app` con inicio del rol existente |
| Raíz instalada, sin sesión válida | Acceso vigente mediante guardas existentes, sin contenido protegido |
| Contraseña inicial obligatoria | Cambio obligatorio antes de acceder al trabajo |
| Enlace profundo protegido | Mantener contexto y guardas actuales; no forzar regreso al inicio |

La detección de modo instalado no concede permisos. No garantizar transferencia de sesión entre contextos ni extender su duración. No cambiar identidad, entrada u origen del manifest.

## Orden y acciones (FR-003/004/008/009, SC-001/002/004)

Inicio docente: saludo breve, resumen compacto de pendientes, búsqueda de materias, tarjetas de materias y nivel secundario. Sin hero promocional grande ni listas completas de casos antes de las materias al cargar.

Tarjeta: nombre consultable completo, grado si existe, enlaces autorizados «Evaluaciones» y «Asistencia», cada uno con objetivo de al menos 44×44. Usar destinos centralizados con id de materia. Para materia archivada, respetar comportamiento existente, no ofrecer nuevas escrituras. Acceso al listado general conserva las materias no priorizadas.

Búsqueda con etiqueta accesible, limpieza y estado de cero coincidencias; no menú flotante ni scroll anidado que impida llegar al final. Con tres materias ficticias y condiciones SC-001, dos tarjetas completas quedan visibles en 360×800 y 390×844 tras cargar y cerrar ayuda.

Nivel secundario preserva recursos, presentaciones, reportes, Xali, configuración y demás enlaces actuales según permisos. No añade sección Calificar global ni barra inferior fija. Otros roles no reciben dashboard docente.

## Pendientes, fallos y ayuda (FR-005/006/007/010, SC-005/006)

- Resumen legible con botón de detalle y `aria-expanded`; cerrado inicial. Abrir puede desplazar voluntariamente la lista, no dispara acción académica.
- Casos enlazan a revisión existente. No publicar, confirmar, reintentar ni modificar una calificación desde la exploración.
- Materias, bandeja y recursos tienen estados independientes. Error tiene mensaje específico y reintento de esa consulta; no mostrar falso «Todo al día». Respuesta vacía válida tiene texto distinto de error.
- Ayuda breve, omisible, cierre accesible y retorno de foco. Control «Cómo empezar» para reabrir. No simular botones funcionales dentro del tutorial.
- Claro/oscuro, teclado, zoom y nombres largos sin controles cortados; monitores de trabajos y navegación permanecen funcionales. Evitar posicionamiento fijo nuevo que tape contenido.

## Interfaces existentes, no ampliadas

Sesión: `/api/auth/me`, `/api/users/me/authorization`, mediante bootstrap/store actuales. Materias: `/api/materias`, con caché existente. Bandeja/materiales: funciones actuales `getBandejaDocente` y `listMaterials`, sin cambiar payloads, rutas ni frecuencia por esta feature.

Explorar este inicio no realiza mutaciones académicas, peticiones a IA ni obtención de alumnos por cada materia. La navegación y permisos del backend siguen siendo autoridad final.
