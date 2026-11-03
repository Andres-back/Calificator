# Contrato del flujo y operaciones privadas

Contrato del alcance aprobado e implementado. Las comprobaciones locales se registran en quickstart.md; no cambia la API pública del estudiante ni se acredita un despliegue por este documento.

## Acceso individual y grupal

- Misma superficie desde evaluación y revisión, dentro del contexto de Spec138.
- Individual: bloque «Enlace para el estudiante», fecha de vencimiento y botón Copiar visible después de recuperar. No enterrarlo en Opciones avanzadas.
- Grupo: Revisar → Generar enlaces → Copiar y compartir. Enlaces existentes omiten generación. Barra con número seleccionado y copia de N accesos confirmados, sin saltos de scroll.
- Paginación completa, permisos, borradores y cancelación existentes se conservan. Cualquier error incompleto evita concluir ausencia.

## Operaciones que se reutilizan

| Operación privada existente | Uso | Prohibido |
| --- | --- | --- |
| GET evaluación/devoluciones/accesos | Metadatos, paginación y estado al entrar/volver | Emitir, aprobar, reconstruir URL desde id |
| POST evaluación/devoluciones/accesos/copiar | Recuperar copia autorizada | Cambiar token, vencimiento, nota o cuota |
| POST evaluación/devoluciones/aceptar-publicar y GET lotes/request_id | Confirmación/recuperación expresa Spec135 | Ejecutar por abrir/cambiar selección/copiar |
| POST evaluación/devoluciones/accesos | Emitir faltantes tras confirmación | Duplicar activo por perder datos locales |
| POST devoluciones/accesos/id/reactivar | Republicar expresamente según reglas | Reabrir revocado/vencido por copiar |

Las rutas son las de api.ts, con el prefijo de evaluación existente; nombres abreviados aquí no son endpoints nuevos.

## Extensiones privadas compatibles propuestas

1. `AccessCreate.solo_si_falta`: booleano estricto opcional, false por defecto para consumidores antiguos. Nuevo flujo lo envía true. Tras comprobar permiso/identidad/fingerprint y recibo de request_id, dentro del bloqueo de calificación buscar accesos guardados. Uno vigente compatible: devolver el acceso existente sin emitir/publicar/extender; después copiar por el endpoint autorizado. Múltiples/opciones incompatibles/cierre: conflicto accionable y ninguna creación automática. Cero accesos: emitir. Misma opción forma parte de la identidad del nuevo flujo y debe ser reintentable sin romper recibos históricos.
2. `ReactivateInput.mantener_vencimiento`: booleano estricto opcional, false por defecto. True exige acceso activo, publicación suspendida, vencimiento futuro y sin desactivación voluntaria; expected_version y fingerprint vigentes. Reautoriza contenido explícito con mismo accessId/token/generation/expires_at/cuota. No cambia la duración histórica ni aplica a revocados/vencidos; sin opción mantiene el comportamiento actual.

La implementación debe resolver el digest de ambas variantes de entrada con compatibilidad de recibos antiguos; no añadir un valor por defecto a un digest existente y rechazar sus reintentos. Probar cuerpo antiguo, nuevo y reutilización de request_id con opciones distintas.

Para mantener vencimiento, el servidor comprueba el estado persistido del acceso y la suspensión real de su publicación. El estado «suspended» proyectado por el listado también puede representar otros fallos de autorización: por sí solo no habilita republicar ni evita los guards actuales.

## Copia y canales

- Individual: mensaje con nombre, evaluación y URL completa incluido su fragmento; sin nota/feedback. Accesible para selección/copia manual.
- Lista: «Nombre: URL», una línea por confirmado; aviso de uso privado y reparto individual. No publicar lista de enlaces con acceso a notas en un grupo.
- Copiar requiere gesto propio, revalidación del acceso y resultado de portapapeles; si esa revalidación hace perder activación del navegador, ofrecer gesto adicional o selección manual sin fingir éxito.
- WhatsApp individual elige destinatario fuera del sistema; compartir nativo solo con soporte, detección al usar y cancelación sin éxito. No registrar «Enviado», contactos ni aperturas.

## Errores y seguridad

- Conservar resultado/código por acceso; distinguir lista fallida, recuperación fallida, legacy_unrecoverable, expiración, desactivación, suspensión, conflicto y permiso denegado.
- Degradar a una acción segura: reintentar lectura, revisar, elegir o reemplazar explícitamente. No mostrar una credencial privada fuera de su contexto.
- Logs y artefactos sin tokens, nombres reales ni mensajes; copias solo en memoria. No cambios de claves/configuración ni garantías de descifrado de históricos indescifrables.
