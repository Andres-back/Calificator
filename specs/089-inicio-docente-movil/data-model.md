# Modelo de datos y estados

No hay entidades persistentes nuevas, cambios de esquema o contratos de API. Referencia: FR-001–010.

| Entidad existente | Datos usados | Relación y validación |
|---|---|---|
| `User`/autorización | nombre, rol, permisos efectivos, debe_cambiar_password | Decide inicio y accesos tras autenticación; nunca deducir permisos de estar instalado |
| `Materia` | id, profesor_id, nombre, grado opcional, área opcional, estado | Enlaces conservan id y propiedad que valida el servidor; no inventar conteos ni tratar materia archivada como activa |
| Bandeja docente | totales existentes, pendientes y reclamos con evaluación/calificación/materia | Resumen y detalle provienen de la misma respuesta; caso navega a revisión existente, no altera datos |
| Recursos | lista existente de materiales recientes | Nivel secundario y permisos actuales; fallo no bloquea materias |
| Identidad de ayuda | tourId, rol, versión; marcador completed | Reutiliza clave `xcalificator:tour:<rol>:<id>:v<versión>`; no contiene nombres, emails o evidencias |

## Estado transitorio

- Contexto de ejecución: navegador o instalado, obtenido de señales del navegador, no guardado como credencial.
- Sesión: `idle → loading → authenticated/unauthenticated`, según store existente. Cualquier contraseña inicial obligatoria mantiene su ruta antes del trabajo.
- Consulta por sección: carga, éxito con datos, éxito vacío o error recuperable. Éxito vacío no equivale a fallo; información anterior en caché no se presenta como recién actualizada si falla el refresco.
- Búsqueda local: texto y lista derivada de materias autorizadas; limpiar devuelve la lista; cero coincidencias ofrece limpieza, no un alta automática.
- Paneles de pendientes y herramientas: cerrado inicial, abierto por decisión del usuario, cierre voluntario. Sin registro de actividad académica o reintentos al abrir.
- Ayuda: no presentada → presentada (marcador existente) → cerrada; reapertura manual disponible. Un navegador sin almacenamiento puede perder el marcador tras recargar; dentro de la vista no reabrir tras omitir.

No añadir historial de materias recientes, notas locales, cookies nuevas, duración de sesión, estados de trabajos ni datos de alumnos. Los nombres largos se consultan completos; grado ausente no se rellena artificialmente.
