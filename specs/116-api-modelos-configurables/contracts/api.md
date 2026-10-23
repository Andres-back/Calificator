# Contratos compatibles

Todos los endpoints nuevos requieren `admin_ai.manage`. Lecturas nunca devuelven secretos.

- Conexión compatible: ID `api_...`, label, URL base y clave `SecretStr` solo escritura. Omitida conserva clave, sin reutilizar secretos ajenos.
- Catálogo/publicación incorporan `runtime_profile` opcional. Ausente conserva legado. Formatos enumerados, ruta relativa mismo host.
- Preflight de proveedor/modelo/capacidad/perfil: texto o imagen ficticios, una llamada, éxito/latencia/error seguro/huella. No genera nota.
- Publicar con versión esperada y rollback; credenciales resueltas en servidor. Validar selección y dependencias modificadas sin exigir reparar rutas ajenas.
- Runtime conserva `choices[0].message.content`, usage/modelo/finalización; Responses incompleta/rechazada/vacía es error.
- Contratos de notas, archivos, imágenes y embeddings sin cambios.
