# Contrato administrado

Para calificación admitida se requiere ruta capturada. Solo principal y respaldo declarados; perfiles API116 y conexión capturada, con origen de clave propio. No se reusa clave de otro proveedor ni se consulta fallback global por fallo. Una configuración inválida termina claramente sin inferencia.

Límites tipados por etapa se validan al publicar y ejecutar. Uno o dos intentos totales por página, incluyendo respaldo; respaldo preferido tras fallo; sin respaldo, un segundo intento solo transitorio. Deadline de inferencia máximo60s, independiente de espera en cola/capacidad. Controles inválidos no se convierten silenciosamente en valores ilimitados.

Respuesta completa se normaliza como antes. `length`/`max_tokens` o salida incompleta son error específico; no aceptar JSON parcial ni omitir páginas para puntuar. Registrar solo códigos cerrados y uso/tiempos disponibles. Estados de error conservan incertidumbre y evidencia.

Publicación administrativa conserva autorización, perfil comprobado, versión esperada y auditoría. Campo omitido por cliente anterior mantiene su valor; null explícito vuelve a recomendado. Controles para etapas no soportadas se rechazan.

Nota histórica se consulta por el endpoint114 privado, solo en detalle autorizado y sin nota nueva. Última nota finita disponible, incluso0, con etiqueta «Referencia anterior; no es una nota nueva». Nunca alimenta confirmar/publicar/exportar ni aparece en enlaces públicos.
