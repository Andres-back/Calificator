# Modelo de datos

## Usuario

Campos nuevos anulables en `users`:

- `solicitud_docente_estado`: `pendiente | aprobada | rechazada`.
- `solicitud_docente_solicitada_at`: fecha de solicitud.
- `solicitud_docente_resuelta_at`: fecha de decisión.
- `solicitud_docente_revisada_por`: administrador decisor.
- `solicitud_docente_motivo`: explicación opcional de hasta 500 caracteres.

```text
sin solicitud --registro docente--> pendiente
pendiente --aprobar--> aprobada  rol profesor
pendiente --rechazar--> rechazada  rol estudiante
```

Usuarios existentes conservan `NULL` y su rol. No se cambia una decisión terminal mediante el endpoint de solicitudes.

## Mapa conceptual

Se mantiene en `contenido_json`:

- `titulo`, `concepto_principal` y `descripcion`.
- `nodos`: 6–12 objetos con `id`, `concepto`, `descripcion_breve`, `nivel` 1–3 y opcionales `categoria` y `ejemplo`.
- `relaciones`: objetos con `origen`, `destino` y `etiqueta` verbal.

Reglas: IDs únicos, destinos existentes, sin autorrelaciones, duplicados eliminados y cada rama útil conectada.