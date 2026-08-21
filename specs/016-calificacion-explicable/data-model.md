# Modelo de datos: Calificación explicable y auditable

## Diagrama lógico

```text
Calificacion 1 ── N CalificacionDesglose 1 ── N CalificacionComponente
      │                    │
      │                    └── N CalificacionAjuste (versión anterior → nueva)
      │
      └── N CalificacionIncidencia ── 0..1 Componente publicado
```

`Calificacion` continúa siendo la identidad y nota vigente usada por boletines y reportes. El desglose activo explica esos campos; las versiones anteriores son inmutables.

## CalificacionDesglose

Tabla propuesta: `calificacion_desgloses`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `calificacion_id` | UUID | FK `calificaciones.id`, CASCADE |
| `version` | integer | >= 1; único por calificación |
| `pipeline_run_id` | string nullable | único por calificación cuando procede de worker |
| `origen` | string | `automatico`, `docente`, `manual` |
| `activo` | boolean | una sola versión activa por calificación |
| `cobertura_estado` | string | `completa`, `incompleta`, `inconsistente` |
| `puntos_obtenidos` | numeric(12,4) | 0..puntos posibles cuando no hay ajuste |
| `puntos_posibles` | numeric(12,4) | > 0 |
| `nota_maxima` | numeric(6,2) | > 0 |
| `nota_base` | numeric(8,4) | resultado proporcional antes de ajuste |
| `ajuste_global` | numeric(8,4) | delta visible; 0 por defecto |
| `nota_antes_redondeo` | numeric(8,4) | base + ajuste limitado al rango |
| `regla_redondeo` | string | inicialmente `half_up` |
| `decimales` | smallint | 0..4; inicialmente 2 |
| `nota_final` | numeric(6,2) | coincide exactamente con la fórmula |
| `requiere_revision` | boolean | verdadero si hay bloqueos o discrepancias |
| `bloqueos_json` | JSONB | códigos estructurados, sin texto privado |
| `procedencia_json` | JSONB | proveedor/modelo/tiempos permitidos y hashes |
| `creado_por` | UUID nullable | FK usuario; null para sistema |
| `created_at` | datetime UTC | inmutable |

Índices y restricciones:

- `UNIQUE(calificacion_id, version)`.
- índice único parcial `calificacion_id WHERE activo`.
- `UNIQUE(calificacion_id, pipeline_run_id)` cuando no sea nulo.
- checks de rango y cobertura.

## CalificacionComponente

Tabla propuesta: `calificacion_componentes`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK y referencia estable dentro de una versión |
| `desglose_id` | UUID | FK, CASCADE |
| `clave` | string | identidad canónica de blueprint |
| `orden` | integer | >= 0 |
| `tipo` | string | `pregunta`, `rubrica`, `manual` |
| `numero` | string nullable | etiqueta humana |
| `titulo` | text | enunciado o criterio |
| `respuesta_estudiante` | text nullable | recibido/detectado, nunca inventado |
| `respuesta_referencia` | text nullable | clave o descriptor aprobado |
| `puntos_obtenidos` | numeric(12,4) nullable | nulo si pendiente no evaluable |
| `puntos_maximos` | numeric(12,4) | > 0 |
| `estado` | string | `correcta`, `parcial`, `incorrecta`, `sin_respuesta`, `ilegible`, `no_evaluable`, `revision_pendiente` |
| `explicacion_verificable` | text | conclusión breve para docente |
| `explicacion_estudiante` | text nullable | versión aprobada para publicación |
| `origen` | string | `objetivo`, `consenso_ia`, `docente`, `manual` |
| `requiere_revision` | boolean | bloquea confirmación si verdadero |
| `evidencia_json` | JSONB | páginas y fuentes online, sin binarios |
| `valoraciones_json` | JSONB | A/B sanitizadas y discrepancia |
| `created_at` | datetime UTC | inmutable |

Restricciones:

- `UNIQUE(desglose_id, clave)` evita duplicados.
- puntos dentro de 0..máximo cuando no sean nulos.
- estados ilegible/no evaluable/revisión requieren revisión y no se convierten en cero.

## CalificacionAjuste

Tabla propuesta: `calificacion_ajustes`.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | UUID | PK |
| `calificacion_id` | UUID | FK, CASCADE |
| `desglose_anterior_id` | UUID | FK versión inmutable |
| `desglose_nuevo_id` | UUID | FK versión inmutable |
| `componente_clave` | string nullable | null para ajuste global |
| `tipo` | string | `componente`, `global`, `explicacion`, `resolucion` |
| `valor_anterior_json` | JSONB | instantánea permitida |
| `valor_nuevo_json` | JSONB | instantánea permitida |
| `motivo_interno` | text | obligatorio, no se entrega al estudiante |
| `explicacion_estudiante` | text | obligatoria y pedagógica |
| `actor_id` | UUID | FK usuario |
| `created_at` | datetime UTC | inmutable |

## CalificacionIncidencia

Evolución aditiva de `calificacion_incidencias`:

- `componente_id UUID NULL` con FK al componente de la versión publicada.
- `desglose_version INTEGER NULL` para conservar contexto aunque haya una nueva versión.
- Las solicitudes generales existentes mantienen ambos campos nulos.
- Resolver la incidencia no cambia la nota por sí solo.

## Objetos embebidos permitidos

### Evidencia de componente

```json
{
  "paginas": [1, 2],
  "fuente": "vision",
  "respuesta_online_id": null
}
```

### Valoración automática sanitizada

```json
{
  "evaluador": "A",
  "puntaje": 1.5,
  "estado": "parcial",
  "explicacion": "Identifica el procedimiento, pero omite la unidad.",
  "confianza": 0.87,
  "proveedor": "opencode",
  "modelo": "modelo-configurado",
  "tiempo_ms": 1240
}
```

No se admiten mensajes crudos, prompts, `_reasoning`, instrucciones o secretos.

## Transiciones

```text
propuesta automática v1
  ├─ bloqueo/discrepancia ──> revisión docente
  ├─ confirmación ──────────> Calificacion.confirmada (v1)
  └─ edición ───────────────> v2 docente + ajuste auditable

vN confirmada/ajustada ─────> publicada (esa versión queda visible)
publicada + nueva decisión ─> vN+1 ajustada ─> republicada
```

Un worker solo puede sustituir una propuesta automática no revisada. Nunca modifica una versión docente o publicada.

## Compatibilidad y migración

1. Crear tablas e índices y agregar columnas nulas a incidencias.
2. No copiar ni repartir notas históricas.
3. Los lectores buscan desglose activo; si no existe, responden `legacy_unavailable` y conservan la nota actual.
4. Los productores nuevos crean desglose en la misma transacción que actualiza `Calificacion`.
5. El downgrade elimina únicamente las estructuras nuevas; no altera las filas históricas de `calificaciones`.
