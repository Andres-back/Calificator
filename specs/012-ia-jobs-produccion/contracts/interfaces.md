# Contratos vigentes

| Superficie | Familias o módulos | Actores | Regla |
|---|---|---|---|
| Backend | /admin/ai-*, /profesor/ai-config, /jobs/* y /health | administrador, profesor y servicios | Autorización según operación |
| Frontend | Configuración IA, estados de job y observabilidad | administrador, profesor y servicios | Acciones permitidas y estados visibles |
| Persistencia | jobs, configuración cifrada, auditoría y colas Redis | Servicios | Acceso transaccional |

No se modifican contratos públicos; este mapa asigna propiedad al dominio.
