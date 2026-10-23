# Datos

- `ai_provider_models.runtime_profile` JSONB aditivo, vacío para heredados: protocolo, ruta relativa opcional, razonamiento y huella de comprobación. Sin credenciales.
- `ai_api_credentials`: revisión privada inmutable de credencial (`id`, `provider_id`, número de versión, `secret_encrypted`, `created_at`, `created_by`, `revoked_at`). Sin FK a settings porque publicación reemplaza filas. Solo servidor, nunca secreto en historial público. La conexión activa referencia su revisión actual.
- Conexión pública reutiliza settings: ID `api_...`, label, base_url HTTPS, timeout/reintentos/activo. No promete adaptadores imagen/embedding.
- Snapshot captura conexión/perfil de principal y respaldo y los incluye en hash. No reescribir snapshots anteriores.
- El snapshot puede referenciar la revisión privada de credencial, nunca su secreto. No enviar una clave nueva a una URL antigua capturada por un trabajo. Si su revisión fue revocada, producir error recuperable o usar el respaldo capturado explícito; no cambiar de destino silenciosamente.
- Prueba ligada a URL/modelo/perfil; modificar invalida comprobación. Clave solo indicador configurada y rotación exige prueba.
- La huella de preflight debe ser verificable por el servidor y estar ligada también a la revisión de credencial. Una marca enviada por el navegador no autoriza por sí sola una capacidad visual.
- Estados: configurar → consultar/editar → probar → publicar ruta → observar ejecución. Fallo conserva borrador y configuración previa.
