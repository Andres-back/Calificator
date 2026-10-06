# Contrato de comprobación

`POST /api/admin/ai-providers/{provider}/test`: conserva sesión y `admin_ai.manage`. Proveedor se busca en configuración persistida; inexistente devuelve respuesta completa con `status=error` y mensaje sin datos sensibles.

Para `ollama_internal`: texto sintético fijo; URL institucional del despliegue, no URL enviada por usuario; modelo configurado o modelo activo compatible solicitado. Debe obtener exactamente un vector de `EMBEDDING_DIMENSIONS` valores finitos. Éxito devuelve latencia y HTTP 200; error responde seguro sin vector. No persistencia ni cambio de rutas. Otros proveedores mantienen sus comprobaciones existentes.

Tarjeta: interno activo sin prueba = «Servicio interno»; nube con clave sin prueba = «Configurado»; sin clave = «Sin configurar»; éxito = «Conexión comprobada»; error = «Error»; inactivo conserva prioridad. El interno no ofrece API docente, edición URL ni refresco de catálogo cloud. Probar sigue disponible y con estado de carga.
